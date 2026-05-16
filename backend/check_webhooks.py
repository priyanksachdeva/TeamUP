import asyncio
import os
import motor.motor_asyncio

async def check_webhooks():
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is required")
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client.task_manager
    
    webhooks = await db.webhooks.find({"project_id": "4f053e60-78b5-4149-a7ac-887ca58cafb1"}).to_list(None)
    print(f"Found {len(webhooks)} webhooks for project")
    for w in webhooks:
        print(f"\nWebhook ID: {w['_id']}")
        print(f"  URL: {w['url'][:50]}...")
        print(f"  Events: {w['events']}")
        print(f"  Enabled: {w['enabled']}")
        print(f"  Type: {w['type']}")
    
    # Check tasks
    tasks = await db.tasks.find({"project_id": "4f053e60-78b5-4149-a7ac-887ca58cafb1"}).to_list(None)
    print(f"\nFound {len(tasks)} tasks for project")
    for t in tasks[:3]:
        print(f"  - {t['title']} (status: {t['status']})")

asyncio.run(check_webhooks())
