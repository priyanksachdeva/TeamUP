"""Project endpoints with role-based access."""
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_admin
from models import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


@router.get("", response_model=List[ProjectOut])
async def list_projects(request: Request, current_user: dict = Depends(get_current_user)):
    db = request.app.state.db
    if current_user["role"] == "admin":
        query = {}
    else:
        query = {"$or": [{"members": current_user["id"]}, {"created_by": current_user["id"]}]}
    docs = await db.projects.find(query).sort("created_at", -1).to_list(1000)
    return [_serialize(d) for d in docs]


@router.post("", response_model=ProjectOut)
async def create_project(
    payload: ProjectCreate,
    request: Request,
    current_user: dict = Depends(require_admin),
):
    db = request.app.state.db
    members = list({*payload.members, current_user["id"]})
    doc = {
        "_id": str(uuid.uuid4()),
        "title": payload.title.strip(),
        "description": (payload.description or "").strip(),
        "members": members,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await db.projects.insert_one(doc)
    return _serialize(doc)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    db = request.app.state.db
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user["role"] != "admin" and current_user["id"] not in doc.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied to this project")
    return _serialize(doc)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    request: Request,
    current_user: dict = Depends(require_admin),
):
    db = request.app.state.db
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        doc = await db.projects.find_one({"_id": project_id})
    else:
        await db.projects.update_one({"_id": project_id}, {"$set": update})
        doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return _serialize(doc)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    request: Request,
    current_user: dict = Depends(require_admin),
):
    db = request.app.state.db
    res = await db.projects.delete_one({"_id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.tasks.delete_many({"project_id": project_id})
    return {"success": True}
