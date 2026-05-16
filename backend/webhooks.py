"""Webhook service for Slack/Discord integrations."""
import logging
import httpx
from datetime import datetime, timezone
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("webhooks")


async def send_slack_message(webhook_url: str, task_title: str, event_type: str, project_name: str, assignee_name: Optional[str] = None) -> bool:
    """Send a message to Slack webhook."""
    try:
        if event_type == "task_completed":
            message = f"✅ Task completed in *{project_name}*: {task_title}"
            color = "#36a64f"
        elif event_type == "task_due_today":
            message = f"⏰ Task due today in *{project_name}*: {task_title}"
            color = "#ff9800"
        else:
            return False

        payload = {
            "attachments": [
                {
                    "color": color,
                    "text": message,
                    "footer": "TeamUP Task Manager",
                    "ts": int(datetime.now(timezone.utc).timestamp()),
                }
            ]
        }

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(webhook_url, json=payload)
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Slack webhook error: {e}")
        return False


async def send_discord_message(webhook_url: str, task_title: str, event_type: str, project_name: str, assignee_name: Optional[str] = None) -> bool:
    """Send a message to Discord webhook."""
    try:
        if event_type == "task_completed":
            message = f"✅ Task completed in **{project_name}**: {task_title}"
            color = 3581519  # Green
        elif event_type == "task_due_today":
            message = f"⏰ Task due today in **{project_name}**: {task_title}"
            color = 16763904  # Orange
        else:
            return False

        payload = {
            "embeds": [
                {
                    "description": message,
                    "color": color,
                    "footer": {"text": "TeamUP Task Manager"},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ]
        }

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(webhook_url, json=payload)
            return response.status_code in [200, 204]
    except Exception as e:
        logger.error(f"Discord webhook error: {e}")
        return False


async def trigger_webhook(
    db: AsyncIOMotorDatabase,
    webhook_id: str,
    task_title: str,
    event_type: str,
    project_name: str,
    assignee_name: Optional[str] = None,
) -> bool:
    """Trigger a webhook and update its last_triggered timestamp."""
    try:
        webhook = await db.webhooks.find_one({"_id": webhook_id, "enabled": True})
        if not webhook:
            return False

        # Check if event is subscribed
        if event_type not in webhook.get("events", []):
            return False

        # Send to appropriate platform
        success = False
        if webhook["type"] == "slack":
            success = await send_slack_message(webhook["url"], task_title, event_type, project_name, assignee_name)
        elif webhook["type"] == "discord":
            success = await send_discord_message(webhook["url"], task_title, event_type, project_name, assignee_name)

        # Update last_triggered timestamp
        if success:
            await db.webhooks.update_one(
                {"_id": webhook_id},
                {"$set": {"last_triggered": datetime.now(timezone.utc)}},
            )

        return success
    except Exception as e:
        logger.error(f"Error triggering webhook {webhook_id}: {e}")
        return False


async def trigger_project_webhooks(
    db: AsyncIOMotorDatabase,
    project_id: str,
    event_type: str,
    task_title: str,
    project_name: str,
    assignee_name: Optional[str] = None,
) -> int:
    """Trigger all active webhooks for a project. Returns count of successful triggers."""
    webhooks = await db.webhooks.find({"project_id": project_id, "enabled": True}).to_list(None)
    success_count = 0

    for webhook in webhooks:
        if await trigger_webhook(db, webhook["_id"], task_title, event_type, project_name, assignee_name):
            success_count += 1

    return success_count
