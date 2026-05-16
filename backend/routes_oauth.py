"""Google OAuth endpoint for social login.

POST /api/auth/google
  { "id_token": "..." }

Verifies token with Google's tokeninfo endpoint and creates or returns a local user + JWT.
"""
import logging
import os
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request

from auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("oauth")


async def _verify_google_id_token(id_token: str) -> dict:
    """Verify Google id_token using Google's tokeninfo endpoint."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
        resp.raise_for_status()
        info = resp.json()
        google_client_id = os.environ.get("GOOGLE_CLIENT_ID")
        if not google_client_id or info.get("aud") != google_client_id:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        return info
    except Exception as e:
        logger.exception("Google token verification failed")
        raise HTTPException(status_code=401, detail="Invalid Google token")


@router.post("/google")
async def google_login(payload: dict, request: Request):
    id_token = payload.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="id_token required")

    info = await _verify_google_id_token(id_token)
    # tokeninfo includes: email, email_verified, name, picture, sub
    email = info.get("email")
    if not email or info.get("email_verified") not in ("true", True):
        raise HTTPException(status_code=401, detail="Google account email not verified")

    db = request.app.state.db
    user = await db.users.find_one({"email": email.lower().strip()})
    now = datetime.now(timezone.utc)
    if not user:
        # Create a new user record
        user_doc = {
            "_id": str(uuid.uuid4()),
            "email": email.lower().strip(),
            "name": info.get("name") or email.split("@")[0],
            "role": "member",
            "created_at": now,
        }
        await db.users.insert_one(user_doc)
        user = user_doc
        logger.info("Created new user from Google login: %s", email)

    token = create_access_token(user["_id"], user["email"], user.get("role", "member"))
    user_clean = dict(user)
    user_clean["id"] = user_clean.pop("_id")
    user_clean.pop("password_hash", None)
    return {"user": user_clean, "token": token}
