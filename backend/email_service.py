"""Email-to-task service for converting emails to tasks."""
import logging
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("email_service")


def parse_email_subject_for_task(subject: str) -> Tuple[str, Optional[str]]:
    """
    Parse email subject to extract task title and priority.
    Examples:
      - "New Feature: Dashboard" -> ("New Feature: Dashboard", None)
      - "[HIGH] Bug: Login broken" -> ("Bug: Login broken", "high")
      - "[MEDIUM] Refactor" -> ("Refactor", "medium")
    """
    priority_match = re.match(r"\[(HIGH|MEDIUM|LOW|high|medium|low)\]\s*(.+)", subject.strip())
    if priority_match:
        priority = priority_match.group(1).lower()
        title = priority_match.group(2).strip()
        return title, priority
    return subject.strip(), None


def parse_email_body_for_description(body: str, max_length: int = 1000) -> str:
    """Extract plain text description from email body, limiting length."""
    # Remove quoted text and signatures
    lines = []
    for line in body.split("\n"):
        # Skip common quote/signature patterns
        if line.strip().startswith(">") or line.strip().startswith("--"):
            continue
        # Gmail reply pattern: "On {date} {person} wrote:"
        if re.match(r"^On\s+.*wrote:$", line.strip()):
            break
        lines.append(line)

    description = "\n".join(lines).strip()
    # Limit to max_length
    if len(description) > max_length:
        description = description[:max_length] + "..."
    return description


def extract_project_id_from_email(email_address: str) -> Optional[str]:
    """
    Extract project ID from email address.
    Expected format: tasks-{project_id}@yourdomain.com
    """
    match = re.match(r"tasks-([a-z0-9-]+)@", email_address)
    if match:
        return match.group(1)
    return None


async def create_task_from_email(
    db: AsyncIOMotorDatabase,
    from_email: str,
    from_name: str,
    to_email: str,
    subject: str,
    body: str,
) -> Optional[dict]:
    """
    Create a task from an incoming email.
    Returns the created task document or None if email couldn't be processed.
    """
    try:
        # Extract project ID from email address
        project_id = extract_project_id_from_email(to_email)
        if not project_id:
            logger.warning(f"Could not extract project ID from email {to_email}")
            return None

        # Verify project exists
        project = await db.projects.find_one({"_id": project_id})
        if not project:
            logger.warning(f"Project {project_id} not found")
            return None

        # Find user based on email (must already exist)
        user = await db.users.find_one({"email": from_email})
        if not user:
            # Reject emails from unknown senders - require sender to be a member
            logger.warning(f"Email from unknown sender {from_email} - user not found")
            return None
        
        user_id = user["_id"]
        
        # Verify sender is a member of the project
        if user_id not in project.get("members", []) and project.get("created_by") != user_id:
            logger.warning(f"User {from_email} is not a member of project {project_id}")
            return None

        # Parse subject for title and priority
        title, priority = parse_email_subject_for_task(subject)
        if not title:
            title = "(No subject)"
        if not priority:
            priority = "medium"

        # Extract description from body
        description = parse_email_body_for_description(body)

        # Create task
        now = datetime.now(timezone.utc)
        task = {
            "_id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "project_id": project_id,
            "assigned_to": None,  # Admin or project owner should assign
            "status": "todo",
            "priority": priority,
            "due_date": None,
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
            "email_source": from_email,  # Track that this came from email
        }

        await db.tasks.insert_one(task)
        logger.info(f"Created task '{title}' from email {from_email}")

        return task

    except Exception as e:
        logger.error(f"Error creating task from email: {e}")
        return None
