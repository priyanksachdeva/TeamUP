"""Task endpoints with role-based access."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth import get_current_user
from models import TaskCreate, TaskOut, TaskStatusUpdate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


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
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create tasks")
    await _ensure_project_access(db, payload.project_id, current_user)
    now = datetime.now(timezone.utc)
    doc = {
        "_id": str(uuid.uuid4()),
        "title": payload.title.strip(),
        "description": (payload.description or "").strip(),
        "project_id": payload.project_id,
        "assigned_to": payload.assigned_to,
        "status": payload.status,
        "priority": payload.priority,
        "due_date": payload.due_date,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.tasks.insert_one(doc)
    return _serialize(doc)


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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can edit task details")
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
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # admin OR assignee OR project member can update status
    if current_user["role"] != "admin":
        project = await db.projects.find_one({"_id": task["project_id"]})
        if not project or current_user["id"] not in project.get("members", []):
            raise HTTPException(status_code=403, detail="Access denied")
    await db.tasks.update_one(
        {"_id": task_id},
        {"$set": {"status": payload.status, "updated_at": datetime.now(timezone.utc)}},
    )
    doc = await db.tasks.find_one({"_id": task_id})
    return _serialize(doc)


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete tasks")
    res = await db.tasks.delete_one({"_id": task_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}
