import asyncio
import os
import pytest
from discord_service import notify_task_created

webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
if not webhook_url:
    pytest.skip("DISCORD_WEBHOOK_URL not set; skipping direct Discord test", allow_module_level=True)

async def test_notification():
    test_task = {
        "id": "test-123",
        "title": "Test Task from Direct Call",
        "description": "This is a direct test",
        "status": "todo",
        "priority": "high"
    }

    print("Sending Discord notification directly...")
    result = await notify_task_created(webhook_url, test_task, "Test Project", "admin@demo.com")
    print(f"Result: {result}")

asyncio.run(test_notification())
