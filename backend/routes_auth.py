"""Authentication endpoints."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import create_access_token, get_current_user, hash_password, verify_password
from models import AuthResponse, UserLogin, UserOut, UserSignup

router = APIRouter(prefix="/auth", tags=["auth"])


def _serialize_user(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    doc.pop("password_hash", None)
    return doc


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: UserSignup, request: Request):
    db = request.app.state.db
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "_id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": payload.role or "member",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["_id"], user_doc["email"], user_doc["role"])
    return {"user": _serialize_user(user_doc), "token": token}


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, request: Request):
    db = request.app.state.db
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["_id"], user["email"], user["role"])
    return {"user": _serialize_user(user), "token": token}


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
