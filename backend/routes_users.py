"""User listing & role management endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_admin
from models import RoleUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    doc.pop("password_hash", None)
    return doc


@router.get("", response_model=List[UserOut])
async def list_users(request: Request, current_user: dict = Depends(get_current_user)):
    db = request.app.state.db
    docs = await db.users.find({}).sort("created_at", -1).to_list(1000)
    return [_serialize(d) for d in docs]


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_role(
    user_id: str,
    payload: RoleUpdate,
    request: Request,
    current_user: dict = Depends(require_admin),
):
    db = request.app.state.db
    res = await db.users.update_one({"_id": user_id}, {"$set": {"role": payload.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    doc = await db.users.find_one({"_id": user_id})
    return _serialize(doc)
