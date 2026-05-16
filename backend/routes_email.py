"""Routes for email-to-task functionality."""
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Form, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import get_current_user, get_db
from email_service import create_task_from_email
from resend_service import send_email as resend_send_email
from models import TaskOut

logger = logging.getLogger("email_routes")
router = APIRouter(prefix="/api/email", tags=["email"])


def _serialize(doc: dict) -> dict:
    """Serialize MongoDB document to API response."""
    if not doc:
        return None
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


@router.post("/incoming", response_model=Optional[TaskOut])
async def handle_incoming_email(
    request: Request,
    # These fields are sent by SendGrid Inbound Parse webhook
    from_email: str = Form(..., alias="from"),
    from_name: str = Form(default="", alias="sender"),
    to_email: str = Form(..., alias="to"),
    subject: str = Form(default=""),
    text: str = Form(default=""),
    html: str = Form(default=""),
    # Webhook token verification
    token: Optional[str] = Form(None),
):
    """
    Handle incoming email webhook from SendGrid Inbound Parse or similar service.
    
    Configuration for SendGrid:
    1. Go to Settings > Inbound Parse
    2. Set webhook URL to: {your-domain}/api/email/incoming
    3. Set hostname to: tasks.yourdomain.com (or similar)
    4. Include raw message body
    
    The email should be sent to: tasks-{project_id}@yourdomain.com
    """
    db = request.app.state.db

    # Verify webhook token if configured
    configured_token = os.environ.get("EMAIL_WEBHOOK_TOKEN")
    if configured_token and token != configured_token:
        logger.warning(f"Invalid email webhook token from {from_email}")
        raise HTTPException(status_code=401, detail="Invalid webhook token")

    # Use text version of body, fall back to HTML if not available
    body = text or html or ""
    if not text and html:
        # Strip HTML tags to plain text
        try:
            from html.parser import HTMLParser
            class MLStripper(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.reset()
                    self.strict = False
                    self.convert_charrefs = True
                    self.text = []
                def handle_data(self, d):
                    self.text.append(d)
                def get_data(self):
                    return ''.join(self.text)
            
            stripper = MLStripper()
            stripper.feed(html)
            body = stripper.get_data()
        except Exception:
            body = html  # Fallback to HTML if stripping fails

    # Create task from email
    task = await create_task_from_email(
        db,
        from_email=from_email,
        from_name=from_name,
        to_email=to_email,
        subject=subject,
        body=body,
    )

    if not task:
        raise HTTPException(status_code=400, detail="Could not create task from email")

    return _serialize(task)


@router.get("/config", response_model=dict)
async def get_email_config():
    """
    Get email-to-task configuration info for frontend display.
    Returns the format expected for email forwarding setup.
    """
    domain = os.environ.get("EMAIL_DOMAIN", "yourdomain.com")
    return {
        "enabled": True,
        "format": f"tasks-{{project_id}}@{domain}",
        "example": f"tasks-abc123@{domain}",
        "description": "Forward emails to create tasks. Use [HIGH], [MEDIUM], or [LOW] prefix in subject for priority.",
        "instructions": [
            "Copy the task email address from your project settings",
            "Forward emails to that address to create tasks",
            "Subject becomes task title (optionally use [PRIORITY] prefix)",
            "Email body becomes task description",
            "The sender will be added as a project member",
        ],
    }


@router.post("/send-test", response_model=dict)
async def send_test_email(payload: dict, request: Request, current_user: dict = Depends(get_current_user)):
    """Send a test transactional email via Resend. Pass {to, subject, html, enqueue:false}.

    If `enqueue` is true, the send will be enqueued to the background queue (requires Redis).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    to = payload.get("to")
    subject = payload.get("subject", "Test from TeamUP")
    html = payload.get("html", "<p>Test email</p>")
    enqueue = payload.get("enqueue", False)

    if not to:
        raise HTTPException(status_code=400, detail="'to' is required")

    if enqueue:
        # If REDIS_URL is not configured, fall back to synchronous send to keep things simple.
        if not os.environ.get("REDIS_URL"):
            try:
                resp = resend_send_email(to=to, subject=subject, html=html)
                return {"enqueued": False, "sent": True, "response": resp, "note": "Redis not configured; sent synchronously"}
            except Exception as e:
                logger.exception("Test email failed (sync fallback)")
                raise HTTPException(status_code=500, detail=str(e))

        # Enqueue a background job (worker must be running). Import lazily so Redis/RQ aren't required.
        try:
            from tasks_queue import enqueue_task
        except Exception as e:
            logger.exception("Failed to import tasks_queue for enqueueing")
            raise HTTPException(status_code=500, detail="Background queue not available")

        job = enqueue_task("resend_service.send_email", kwargs={"to": to, "subject": subject, "html": html})
        if not job:
            raise HTTPException(status_code=500, detail="Failed to enqueue email send")
        return {"enqueued": True, "job_id": job.id}

    # Send synchronously
    try:
        resp = resend_send_email(to=to, subject=subject, html=html)
        return {"sent": True, "response": resp}
    except Exception as e:
        logger.exception("Test email failed")
        raise HTTPException(status_code=500, detail=str(e))
