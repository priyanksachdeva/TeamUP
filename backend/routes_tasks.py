"""Task endpoints with role-based access."""
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from pymongo.errors import DuplicateKeyError

from auth import get_current_user
from models import (
    TaskCreate,
    TaskOut,
    TaskStatusUpdate,
    TaskUpdate,
    SubtaskCreate,
    SubtaskUpdate,
    SubtaskOut,
    TaskReorder,
)
from webhooks import trigger_project_webhooks
from discord_service import (
    notify_task_created,
    notify_task_updated,
    notify_task_status_changed,
    notify_task_assigned,
    notify_subtask_created,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


async def _send_discord_notifications_bg(db, project_id: str, event_type: str, task: dict, current_user: dict, **kwargs):
    """Send Discord notifications for project webhooks if enabled for this event."""
    try:
        # Query for webhooks where this event is in the events array
        webhooks = await db.webhooks.find({
            "project_id": project_id,
            "type": "discord",
            "enabled": True,
            "events": {"$in": [event_type]},  # Use $in operator to check if event_type is in array
        }).to_list(None)
        
        print(f"[Discord] Found {len(webhooks)} webhooks for event '{event_type}' in project {project_id}")
        
        if not webhooks:
            return
        
        project = await db.projects.find_one({"_id": project_id})
        project_title = project.get("title", "Unknown Project") if project else "Unknown Project"
        user_name = current_user.get("name", "Unknown User")
        
        for webhook in webhooks:
            print(f"[Discord] Sending {event_type} notification to webhook {webhook['_id']}")
            if event_type == "task_created":
                await notify_task_created(webhook["url"], task, project_title, user_name)
            elif event_type == "task_updated":
                await notify_task_updated(webhook["url"], task, project_title, user_name, kwargs.get("changed_fields", {}))
            elif event_type == "task_status_changed":
                await notify_task_status_changed(
                    webhook["url"], task, project_title,
                    kwargs.get("old_status", "unknown"),
                    kwargs.get("new_status", "unknown"),
                    user_name
                )
            elif event_type == "task_assigned":
                await notify_task_assigned(
                    webhook["url"], task, project_title,
                    kwargs.get("assigned_to", "Unknown"),
                    user_name
                )
            elif event_type == "subtask_created":
                await notify_subtask_created(
                    webhook["url"], task,
                    kwargs.get("subtask", {}),
                    project_title, user_name
                )
    except Exception as e:
        print(f"[Discord] Error sending notifications: {str(e)}")
        import traceback
        traceback.print_exc()
        # Don't fail the request if Discord notification fails


async def _ensure_project_access(db, project_id: str, user: dict) -> dict:
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user["role"] != "admin" and user["id"] not in project.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied to this project")
    return project


@router.get("", response_model=List[TaskOut])
async def list_tasks(
    request: Request,
    project_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    query: dict = {}
    if project_id:
        await _ensure_project_access(db, project_id, current_user)
        query["project_id"] = project_id
    elif current_user["role"] != "admin":
        # Members see tasks in accessible projects
        accessible = await db.projects.find(
            {"$or": [{"members": current_user["id"]}, {"created_by": current_user["id"]}]},
            {"_id": 1},
        ).to_list(1000)
        ids = [p["_id"] for p in accessible]
        query["project_id"] = {"$in": ids}
    docs = await db.tasks.find(query).sort("created_at", -1).to_list(2000)
    return [_serialize(d) for d in docs]


@router.post("", response_model=TaskOut)
async def create_task(
    payload: TaskCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    # Only admins may create tasks via API; members cannot create tasks
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create tasks")
    # ensure project exists
    project = await db.projects.find_one({"_id": payload.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    now = datetime.now(timezone.utc)
    
    # Get max order for this status to determine initial position (retry up to 3 times on duplicate)
    for attempt in range(3):
        last_task = (
            await db.tasks.find({"project_id": payload.project_id, "status": payload.status})
            .sort("order", -1)
            .limit(1)
            .to_list(1)
        )
        next_order = (last_task[0].get("order", 0) + 1) if last_task else 0
        
        doc = {
            "_id": str(uuid.uuid4()),
            "title": payload.title.strip(),
            "description": (payload.description or "").strip(),
            "project_id": payload.project_id,
            "assigned_to": payload.assigned_to,
            "status": payload.status,
            "priority": payload.priority,
            "due_date": payload.due_date,
            "order": next_order,
            "subtasks": [],
            "created_by": current_user["id"],
            "created_at": now,
            "updated_at": now,
        }
        
        try:
            await db.tasks.insert_one(doc)
            # Send Discord notifications in background
            background_tasks.add_task(_send_discord_notifications_bg, db, payload.project_id, "task_created", _serialize(doc), current_user)
            return _serialize(doc)
        except DuplicateKeyError:
            # Duplicate key on (project_id, status, order) - retry with incremented order
            if attempt < 2:
                continue
            raise HTTPException(status_code=500, detail="Failed to create task after multiple retries")
        except Exception as e:
            # Other exceptions should fail immediately
            raise HTTPException(status_code=500, detail=f"Failed to create task: {e}") from e


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Allow admin, the task creator, or the assignee to edit task details
    if current_user["role"] != "admin":
        if task.get("created_by") != current_user["id"] and task.get("assigned_to") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Only admin, task creator, or assignee can edit task details")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc)
    await db.tasks.update_one({"_id": task_id}, {"$set": update})
    doc = await db.tasks.find_one({"_id": task_id})
    return _serialize(doc)


@router.patch("/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: str,
    payload: TaskStatusUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # admin, project creator, or project member can update status
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": task["project_id"]})
        if (
            not project
            or (
                current_user["id"] not in project.get("members", [])
                and current_user["id"] != project.get("created_by")
            )
        ):
            raise HTTPException(status_code=403, detail="Access denied")
    
    # If status is changing to a different column, recalculate order
    if task["status"] != payload.status:
        # Get max order in new status column
        last_task = (
            await db.tasks.find({"project_id": task["project_id"], "status": payload.status})
            .sort("order", -1)
            .limit(1)
            .to_list(1)
        )
        new_order = (last_task[0].get("order", 0) + 1) if last_task else 0
    else:
        # Keeping same status, maintain order
        new_order = task.get("order", 0)
    
    # Update status and order
    await db.tasks.update_one(
        {"_id": task_id},
        {"$set": {"status": payload.status, "order": new_order, "updated_at": datetime.now(timezone.utc)}},
    )
    doc = await db.tasks.find_one({"_id": task_id})
    
    # Send Discord notifications for status change
    old_status = task["status"]
    new_status = payload.status
    if old_status != new_status:
        background_tasks.add_task(
            _send_discord_notifications_bg,
            db, task["project_id"], "task_status_changed", _serialize(doc), current_user,
            old_status=old_status, new_status=new_status
        )
    
    # Trigger webhooks if task moved to "done"
    if payload.status == "done" and task["status"] != "done":
        project = await db.projects.find_one({"_id": task["project_id"]})
        assignee_name = None
        if task.get("assigned_to"):
            assignee = await db.users.find_one({"_id": task["assigned_to"]})
            assignee_name = assignee["name"] if assignee else None
        
        # Fire webhook in background (non-blocking)
        webhook_task = asyncio.create_task(
            trigger_project_webhooks(
                db,
                task["project_id"],
                "task_completed",
                task["title"],
                project["title"] if project else "Project",
                assignee_name,
            )
        )
        _ = webhook_task
    
    return _serialize(doc)


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Allow admin or the creator of the task to delete it
    if current_user["role"] != "admin" and task.get("created_by") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only admin or task creator can delete tasks")
    res = await db.tasks.delete_one({"_id": task_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


# ---------- Subtasks ----------


@router.post("/{task_id}/subtasks", response_model=SubtaskOut)
async def create_subtask(
    task_id: str,
    payload: SubtaskCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Allow admin, project members, task creator, or assignee to add subtasks
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": task["project_id"]})
        if not project or (
            current_user["id"] not in project.get("members", [])
            and task.get("created_by") != current_user["id"]
            and task.get("assigned_to") != current_user["id"]
        ):
            raise HTTPException(status_code=403, detail="Only admin, project members, task creator, or assignee can add subtasks")
    
    subtask = {
        "id": str(uuid.uuid4()),
        "title": payload.title.strip(),
        "completed": payload.completed,
        "created_at": datetime.now(timezone.utc),
    }
    
    await db.tasks.update_one(
        {"_id": task_id},
        {"$push": {"subtasks": subtask}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return subtask


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskOut)
async def update_subtask(
    task_id: str,
    subtask_id: str,
    payload: SubtaskUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Allow admin, project members, task creator, or assignee to update subtasks
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": task["project_id"]})
        if not project or (
            current_user["id"] not in project.get("members", [])
            and task.get("created_by") != current_user["id"]
            and task.get("assigned_to") != current_user["id"]
        ):
            raise HTTPException(status_code=403, detail="Only admin, project members, task creator, or assignee can update subtasks")
    
    # Find subtask
    subtask = next((s for s in task.get("subtasks", []) if s["id"] == subtask_id), None)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    # Update subtask
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    subtask.update(update_data)
    
    await db.tasks.update_one(
        {"_id": task_id, "subtasks.id": subtask_id},
        {"$set": {"subtasks.$": subtask, "updated_at": datetime.now(timezone.utc)}},
    )
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}")
async def delete_subtask(
    task_id: str,
    subtask_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    # Allow admin, project members, task creator, or assignee to delete subtasks
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": task["project_id"]})
        if not project or (
            current_user["id"] not in project.get("members", [])
            and task.get("created_by") != current_user["id"]
            and task.get("assigned_to") != current_user["id"]
        ):
            raise HTTPException(status_code=403, detail="Only admin, project members, task creator, or assignee can delete subtasks")

    # Verify subtask is present
    subtask = next((s for s in task.get("subtasks", []) if s["id"] == subtask_id), None)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    res = await db.tasks.update_one(
        {"_id": task_id},
        {
            "$pull": {"subtasks": {"id": subtask_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return {"success": True}


# ---------- Task Reordering ----------


@router.patch("/{task_id}/reorder", response_model=TaskOut)
async def reorder_task(
    task_id: str,
    payload: TaskReorder,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Reorder a task within its column.
    position: new position index (0-based)
    """
    db = request.app.state.db
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Allow admin, project creator, or any project member to reorder tasks within the project
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": task["project_id"]})
        if (
            not project
            or (
                current_user["id"] not in project.get("members", [])
                and current_user["id"] != project.get("created_by")
            )
        ):
            raise HTTPException(status_code=403, detail="Only admin or project members can reorder tasks")
    
    # Get all tasks in same column, sorted by order
    same_status_tasks = (
        await db.tasks.find(
            {"project_id": task["project_id"], "status": task["status"], "_id": {"$ne": task_id}}
        )
        .sort("order", 1)
        .to_list(2000)
    )
    
    # Validate position is within valid range
    max_position = len(same_status_tasks)
    if payload.position > max_position:
        raise HTTPException(status_code=400, detail=f"Position {payload.position} exceeds max {max_position}")
    
    # Rebuild order array
    new_order = [t["_id"] for t in same_status_tasks]
    new_order.insert(payload.position, task_id)
    
    # Use bulk operations for atomic updates (more efficient than sequential updates)
    from pymongo import UpdateOne
    bulk_ops = [
        UpdateOne(
            {"_id": tid},
            {"$set": {"order": idx, "updated_at": datetime.now(timezone.utc)}}
        )
        for idx, tid in enumerate(new_order)
    ]
    
    if bulk_ops:
        await db.tasks.bulk_write(bulk_ops)
    
    doc = await db.tasks.find_one({"_id": task_id})
    return _serialize(doc)
