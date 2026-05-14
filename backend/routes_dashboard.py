"""Dashboard analytics endpoints."""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request

from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _accessible_project_ids(db, user: dict) -> List[str]:
    if user["role"] == "admin":
        docs = await db.projects.find({}, {"_id": 1}).to_list(1000)
    else:
        docs = await db.projects.find(
            {"$or": [{"members": user["id"]}, {"created_by": user["id"]}]},
            {"_id": 1},
        ).to_list(1000)
    return [d["_id"] for d in docs]


@router.get("/stats")
async def stats(request: Request, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    db = request.app.state.db
    project_ids = await _accessible_project_ids(db, current_user)
    base_query: Dict[str, Any] = {"project_id": {"$in": project_ids}} if project_ids else {"project_id": "__none__"}

    now = datetime.now(timezone.utc)

    total = await db.tasks.count_documents(base_query)
    completed = await db.tasks.count_documents({**base_query, "status": "done"})
    in_progress = await db.tasks.count_documents({**base_query, "status": "in_progress"})
    todo = await db.tasks.count_documents({**base_query, "status": "todo"})
    overdue = await db.tasks.count_documents({
        **base_query,
        "status": {"$ne": "done"},
        "due_date": {"$ne": None, "$lt": now},
    })

    # productivity last 7 days
    productivity: List[Dict[str, Any]] = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = day + timedelta(days=1)
        count = await db.tasks.count_documents({
            **base_query,
            "status": "done",
            "updated_at": {"$gte": day, "$lt": next_day},
        })
        productivity.append({"day": day.strftime("%a"), "completed": count})

    total_projects = len(project_ids)

    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": total - completed,
        "in_progress_tasks": in_progress,
        "todo_tasks": todo,
        "overdue_tasks": overdue,
        "total_projects": total_projects,
        "status_breakdown": [
            {"name": "Todo", "value": todo, "key": "todo"},
            {"name": "In Progress", "value": in_progress, "key": "in_progress"},
            {"name": "Done", "value": completed, "key": "done"},
        ],
        "productivity": productivity,
    }


@router.get("/upcoming")
async def upcoming(request: Request, current_user: dict = Depends(get_current_user)):
    db = request.app.state.db
    project_ids = await _accessible_project_ids(db, current_user)
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=14)
    docs = await db.tasks.find({
        "project_id": {"$in": project_ids},
        "status": {"$ne": "done"},
        "due_date": {"$ne": None, "$gte": now, "$lte": end},
    }).sort("due_date", 1).limit(8).to_list(8)
    for d in docs:
        d["id"] = d.pop("_id")
    return docs


@router.get("/recent")
async def recent(request: Request, current_user: dict = Depends(get_current_user)):
    db = request.app.state.db
    project_ids = await _accessible_project_ids(db, current_user)
    docs = await db.tasks.find({"project_id": {"$in": project_ids}}).sort("updated_at", -1).limit(8).to_list(8)
    for d in docs:
        d["id"] = d.pop("_id")
    return docs
