"""Discord webhook management routes."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo.errors import DuplicateKeyError

from auth import get_current_user, get_db
from models import WebhookCreate, WebhookUpdate, WebhookOut, DiscordWebhookTest
from discord_service import (
    send_to_discord,
    notify_task_created,
    notify_task_status_changed,
    notify_task_assigned,
    notify_project_activity,
)

router = APIRouter(prefix="/discord", tags=["discord"])


def _serialize(doc: dict) -> dict:
    """Convert MongoDB document to API response."""
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


@router.post("/test", summary="Test Discord webhook")
async def test_discord_webhook(
    payload: DiscordWebhookTest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Send a test message to Discord webhook to verify it works."""
    message = {
        "content": "🧪 Test message from TeamUP Task Manager",
        "embeds": [
            {
                "title": "✅ Discord Webhook Connected!",
                "description": "Your Discord webhook has been successfully configured.",
                "color": 5763719,
                "fields": [
                    {"name": "User", "value": current_user.get("name", "Unknown"), "inline": True},
                    {"name": "Email", "value": current_user.get("email", "unknown@example.com"), "inline": True},
                    {"name": "Timestamp", "value": datetime.now(timezone.utc).isoformat(), "inline": False},
                ],
            }
        ]
    }
    
    success = await send_to_discord(payload.webhook_url, message)
    if success:
        return {"status": "success", "message": "Test message sent to Discord! Check your channel."}
    else:
        raise HTTPException(status_code=400, detail="Failed to send message to Discord. Check the webhook URL.")


@router.post("/{project_id}/webhooks", response_model=WebhookOut, summary="Create Discord webhook for project")
async def create_discord_webhook(
    project_id: str,
    payload: WebhookCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Create a new Discord webhook for a project."""
    db = request.app.state.db
    
    # Verify project exists and user is admin
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("created_by") != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only project creator or admin can manage webhooks")
    
    # Validate webhook URL
    if not payload.url.startswith("https://discord.com/api/webhooks/"):
        raise HTTPException(status_code=400, detail="Invalid Discord webhook URL")
    if payload.type != "discord":
        raise HTTPException(status_code=400, detail="Discord webhook type must be 'discord'")
    
    webhook_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    webhook_doc = {
        "_id": webhook_id,
        "project_id": project_id,
        "type": "discord",
        "url": payload.url,
        "enabled": payload.enabled,
        "events": payload.events,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
    }
    
    try:
        await db.webhooks.insert_one(webhook_doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create webhook: {str(e)}")
    
    return _serialize(webhook_doc)


@router.get("/{project_id}/webhooks", response_model=list[WebhookOut], summary="List Discord webhooks for project")
async def list_project_webhooks(
    project_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Get all Discord webhooks for a project."""
    db = request.app.state.db
    
    # Verify project exists and user has access
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if current_user["role"] != "admin" and current_user["id"] not in project.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
    
    webhooks = await db.webhooks.find({"project_id": project_id}).to_list(None)
    return [_serialize(w) for w in webhooks]


@router.put("/{project_id}/webhooks/{webhook_id}", response_model=WebhookOut, summary="Update Discord webhook")
async def update_discord_webhook(
    project_id: str,
    webhook_id: str,
    payload: WebhookUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Update a Discord webhook configuration."""
    db = request.app.state.db
    
    # Verify project exists and user is admin
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("created_by") != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only project creator or admin can manage webhooks")
    
    webhook = await db.webhooks.find_one({"_id": webhook_id, "project_id": project_id})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Validate webhook URL if provided
    if payload.url and not payload.url.startswith("https://discord.com/api/webhooks/"):
        raise HTTPException(status_code=400, detail="Invalid Discord webhook URL")
    
    update_data = {}
    if payload.url is not None:
        update_data["url"] = payload.url
    if payload.enabled is not None:
        update_data["enabled"] = payload.enabled
    if payload.events is not None:
        update_data["events"] = payload.events
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.webhooks.update_one({"_id": webhook_id}, {"$set": update_data})
    
    updated = await db.webhooks.find_one({"_id": webhook_id})
    return _serialize(updated)


@router.delete("/{project_id}/webhooks/{webhook_id}", summary="Delete Discord webhook")
async def delete_discord_webhook(
    project_id: str,
    webhook_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Delete a Discord webhook."""
    db = request.app.state.db
    
    # Verify project exists and user is admin
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.get("created_by") != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only project creator or admin can manage webhooks")
    
    result = await db.webhooks.delete_one({"_id": webhook_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    return {"status": "deleted", "webhook_id": webhook_id}
