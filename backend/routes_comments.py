"""Task comments endpoints."""
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user
from models import CommentCreate, CommentOut

router = APIRouter(tags=["comments"])


async def _ensure_task_access(db, task_id: str, user: dict) -> dict:
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user["role"] != "admin":
        project = await db.projects.find_one({"_id": task["project_id"]})
        if not project or user["id"] not in project.get("members", []):
            raise HTTPException(status_code=403, detail="Access denied")
    return task


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


@router.get("/tasks/{task_id}/comments", response_model=List[CommentOut])
async def list_comments(task_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    db = request.app.state.db
    await _ensure_task_access(db, task_id, current_user)
    docs = await db.comments.find({"task_id": task_id}).sort("created_at", 1).to_list(500)
    return [_serialize(d) for d in docs]


@router.post("/tasks/{task_id}/comments", response_model=CommentOut)
async def create_comment(
    task_id: str,
    payload: CommentCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = request.app.state.db
    await _ensure_task_access(db, task_id, current_user)
    doc = {
        "_id": str(uuid.uuid4()),
        "task_id": task_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "body": payload.body.strip(),
        "created_at": datetime.now(timezone.utc),
    }
    await db.comments.insert_one(doc)
    return _serialize(doc)


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    db = request.app.state.db
    comment = await db.comments.find_one({"_id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if current_user["role"] != "admin" and comment["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete others' comments")
    await db.comments.delete_one({"_id": comment_id})
    return {"success": True}
