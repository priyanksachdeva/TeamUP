"""Project endpoints with role-based access."""
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_admin
from models import ProjectCreate, ProjectOut, ProjectUpdate
from models import MembersUpdate

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
    if current_user["role"] != "admin" and current_user["id"] not in doc.get("members", []) and current_user["id"] != doc.get("created_by"):
        raise HTTPException(status_code=403, detail="Access denied to this project")
    return _serialize(doc)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Allow admins or the project creator to update project metadata."""
    db = request.app.state.db
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only admin or project creator may update
    if current_user["role"] != "admin" and current_user["id"] != project.get("created_by"):
        raise HTTPException(status_code=403, detail="Only admin or project creator can update project")

    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.projects.update_one({"_id": project_id}, {"$set": update})
    doc = await db.projects.find_one({"_id": project_id})
    return _serialize(doc)



@router.post("/{project_id}/members", response_model=ProjectOut)
async def add_project_members(
    project_id: str,
    payload: MembersUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Add one or more members to a project. Allowed for admins or project creators."""
    db = request.app.state.db
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only admin or project creator can add members
    if current_user["role"] != "admin" and current_user["id"] != project.get("created_by"):
        raise HTTPException(status_code=403, detail="Only admin or project creator can add members")

    # Ensure users exist
    users = await db.users.find({"_id": {"$in": payload.members}}).to_list(None)
    found_ids = {u["_id"] for u in users}
    missing = [m for m in payload.members if m not in found_ids]
    if missing:
        raise HTTPException(status_code=400, detail=f"missing users: {missing}")

    await db.projects.update_one({"_id": project_id}, {"$addToSet": {"members": {"$each": payload.members}}})
    doc = await db.projects.find_one({"_id": project_id})
    return _serialize(doc)


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: str,
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Remove a member from a project. Allowed for admins or project creators; cannot remove the creator."""
    db = request.app.state.db
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if user_id == project.get("created_by"):
        raise HTTPException(status_code=400, detail="Cannot remove project creator")

    if current_user["role"] != "admin" and current_user["id"] != project.get("created_by"):
        raise HTTPException(status_code=403, detail="Only admin or project creator can remove members")

    await db.projects.update_one({"_id": project_id}, {"$pull": {"members": user_id}})
    return {"success": True}


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
