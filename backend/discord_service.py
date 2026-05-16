"""Discord webhook notification service."""
import aiohttp
import aiohttp.resolver
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


async def send_to_discord(webhook_url: str, message_data: dict) -> bool:
    """Send a message to Discord webhook.
    
    Args:
        webhook_url: Discord webhook URL
        message_data: Message content (text, embeds, etc.)
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not webhook_url:
        logger.warning("Discord webhook URL is empty")
        return False
        
    try:
        # Use ThreadedResolver to respect system DNS settings (fixes Windows DNS issues)
        resolver = aiohttp.resolver.ThreadedResolver()
        connector = aiohttp.TCPConnector(resolver=resolver)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(webhook_url, json=message_data, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status in [200, 204]:
                    logger.info(f"Discord notification sent successfully (status: {response.status})")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Discord webhook failed with status {response.status}: {error_text}")
                    return False
    except Exception as e:
        import traceback
        logger.error(f"Failed to send Discord notification: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


async def notify_task_created(webhook_url: str, task: dict, project_title: str, created_by: str) -> bool:
    """Send task creation notification to Discord."""
    message = {
        "embeds": [
            {
                "title": "✅ New Task Created",
                "description": task.get("title", "Untitled"),
                "color": 5763719,  # Green
                "fields": [
                    {"name": "Project", "value": project_title, "inline": True},
                    {"name": "Priority", "value": task.get("priority", "medium").upper(), "inline": True},
                    {"name": "Status", "value": task.get("status", "todo").upper(), "inline": True},
                    {"name": "Created by", "value": created_by, "inline": False},
                    {"name": "Description", "value": task.get("description", "No description") or "No description", "inline": False},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }
    return await send_to_discord(webhook_url, message)


async def notify_task_updated(webhook_url: str, task: dict, project_title: str, updated_by: str, changed_fields: dict) -> bool:
    """Send task update notification to Discord."""
    changes = []
    for field, (old_val, new_val) in changed_fields.items():
        changes.append(f"• **{field}**: `{old_val}` → `{new_val}`")
    
    message = {
        "embeds": [
            {
                "title": "🔄 Task Updated",
                "description": task.get("title", "Untitled"),
                "color": 16776960,  # Yellow
                "fields": [
                    {"name": "Project", "value": project_title, "inline": True},
                    {"name": "Updated by", "value": updated_by, "inline": True},
                    {"name": "Changes", "value": "\n".join(changes) if changes else "No changes tracked", "inline": False},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }
    return await send_to_discord(webhook_url, message)


async def notify_task_status_changed(webhook_url: str, task: dict, project_title: str, old_status: str, new_status: str, updated_by: str) -> bool:
    """Send task status change notification to Discord."""
    status_colors = {
        "todo": 9807270,      # Gray
        "in_progress": 16776960,  # Yellow
        "done": 5763719,      # Green
    }
    
    message = {
        "embeds": [
            {
                "title": "📊 Task Status Changed",
                "description": task.get("title", "Untitled"),
                "color": status_colors.get(new_status, 9807270),
                "fields": [
                    {"name": "Project", "value": project_title, "inline": True},
                    {"name": "Status", "value": f"{old_status.upper()} → {new_status.upper()}", "inline": True},
                    {"name": "Updated by", "value": updated_by, "inline": False},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }
    return await send_to_discord(webhook_url, message)


async def notify_task_assigned(webhook_url: str, task: dict, project_title: str, assigned_to: str, assigned_by: str) -> bool:
    """Send task assignment notification to Discord."""
    message = {
        "embeds": [
            {
                "title": "👤 Task Assigned",
                "description": task.get("title", "Untitled"),
                "color": 3447003,  # Blue
                "fields": [
                    {"name": "Project", "value": project_title, "inline": True},
                    {"name": "Assigned to", "value": assigned_to, "inline": True},
                    {"name": "Assigned by", "value": assigned_by, "inline": False},
                    {"name": "Priority", "value": task.get("priority", "medium").upper(), "inline": True},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }
    return await send_to_discord(webhook_url, message)


async def notify_subtask_created(webhook_url: str, task: dict, subtask: dict, project_title: str, created_by: str) -> bool:
    """Send subtask creation notification to Discord."""
    message = {
        "embeds": [
            {
                "title": "✏️ Subtask Added",
                "description": subtask.get("title", "Untitled"),
                "color": 15844367,  # Light blue
                "fields": [
                    {"name": "Parent Task", "value": task.get("title", "Untitled"), "inline": False},
                    {"name": "Project", "value": project_title, "inline": True},
                    {"name": "Created by", "value": created_by, "inline": True},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]
    }
    return await send_to_discord(webhook_url, message)


async def notify_project_activity(webhook_url: str, project_title: str, activity_type: str, details: str, user: str) -> bool:
    """Send project activity notification to Discord."""
    colors = {
        "created": 5763719,  # Green
        "updated": 16776960,  # Yellow
        "deleted": 15158332,  # Red
        "member_added": 3447003,  # Blue
        "member_removed": 15158332,  # Red
    }
    
    message = {
        "embeds": [
            {
                "title": f"📋 Project {activity_type.title()}",
                "description": project_title,
                "color": colors.get(activity_type, 9807270),
                "fields": [
                    {"name": "Activity", "value": activity_type.replace("_", " ").title(), "inline": True},
                    {"name": "User", "value": user, "inline": True},
                    {"name": "Details", "value": details, "inline": False},
                ],
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        ]
    }
    return await send_to_discord(webhook_url, message)
