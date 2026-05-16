"""Routes for webhook management."""
import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import WebhookCreate, WebhookOut, WebhookUpdate
from auth import get_current_user_id, get_db
from webhooks import trigger_webhook

logger = logging.getLogger("webhooks_routes")
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


async def require_project_admin(user_id: str, project_id: str, db: AsyncIOMotorDatabase) -> dict:
    """Verify user is admin or project creator."""
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("role") != "admin" and project.get("created_by") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage webhooks for this project")

    return project


@router.post("/{project_id}", response_model=WebhookOut)
async def create_webhook(
    project_id: str,
    data: WebhookCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new webhook for a project (admin only)."""
    await require_project_admin(user_id, project_id, db)

    webhook = {
        "_id": str(uuid.uuid4()),
        "project_id": project_id,
        "url": data.url,
        "type": data.type,
        "enabled": data.enabled,
        "events": data.events,
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc),
        "last_triggered": None,
    }

    await db.webhooks.insert_one(webhook)
    webhook["id"] = webhook.pop("_id")
    return WebhookOut(**webhook)


@router.get("/{project_id}", response_model=List[WebhookOut])
async def list_webhooks(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List all webhooks for a project."""
    await require_project_admin(user_id, project_id, db)

    webhooks = await db.webhooks.find({"project_id": project_id}).to_list(None)
    for webhook in webhooks:
        webhook["id"] = webhook.pop("_id")
    return [WebhookOut(**w) for w in webhooks]


@router.patch("/{project_id}/{webhook_id}", response_model=WebhookOut)
async def update_webhook(
    project_id: str,
    webhook_id: str,
    data: WebhookUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update a webhook."""
    await require_project_admin(user_id, project_id, db)

    webhook = await db.webhooks.find_one({"_id": webhook_id, "project_id": project_id})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    update_data = data.model_dump(exclude_unset=True)
    await db.webhooks.update_one({"_id": webhook_id}, {"$set": update_data})

    webhook = await db.webhooks.find_one({"_id": webhook_id})
    webhook["id"] = webhook.pop("_id")
    return WebhookOut(**webhook)


@router.delete("/{project_id}/{webhook_id}", status_code=204)
async def delete_webhook(
    project_id: str,
    webhook_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a webhook."""
    await require_project_admin(user_id, project_id, db)

    result = await db.webhooks.delete_one({"_id": webhook_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")


@router.post("/{project_id}/{webhook_id}/test", status_code=200)
async def test_webhook(
    project_id: str,
    webhook_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Send a test message to the webhook."""
    await require_project_admin(user_id, project_id, db)

    webhook = await db.webhooks.find_one({"_id": webhook_id, "project_id": project_id})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    project = await db.projects.find_one({"_id": project_id})
    project_name = project["title"] if project else "Test Project"

    success = await trigger_webhook(
        db,
        webhook_id,
        "Test Task Title",
        "task_completed",
        project_name,
    )

    return {"success": success, "message": "Test message sent" if success else "Failed to send test message"}
