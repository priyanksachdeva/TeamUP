"""Simple Resend integration for sending transactional emails.

Docs: https://resend.com/docs
"""
import os
import logging
from typing import Optional

import requests
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("resend")


def _resend_api_key() -> Optional[str]:
    return os.environ.get("RESEND_API_KEY")


def _from_address() -> str:
    return os.environ.get("RESEND_FROM", "no-reply@teamup.local")


def _smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"))


def _send_via_smtp(to: str, subject: str, html: str, text: Optional[str] = None) -> dict:
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", 587))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to
    if text:
        msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            if use_tls:
                server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return {"sent": True, "method": "smtp"}
    except Exception as e:
        logger.exception("SMTP send failed")
        raise


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> dict:
    """Send an email using either Resend (if configured) or SMTP fallback.

    Priority order:
    1. If SMTP env vars are configured, send via SMTP (allows sending from your own email address without domain verification).
    2. Else, if RESEND_API_KEY is present, attempt Resend API send.
    3. Otherwise raise RuntimeError.
    """
    # Prefer SMTP if configured (user's own email account)
    if _smtp_configured():
        return _send_via_smtp(to=to, subject=subject, html=html, text=text)

    api_key = _resend_api_key()
    if not api_key:
        logger.error("No SMTP or Resend configuration found; cannot send email")
        raise RuntimeError("No SMTP or Resend configuration found")

    payload = {
        "from": _from_address(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    resp = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
    try:
        resp.raise_for_status()
    except Exception as e:
        logger.exception("Resend email failed: %s %s", resp.status_code if resp is not None else "?", e)
        raise
    return resp.json()
