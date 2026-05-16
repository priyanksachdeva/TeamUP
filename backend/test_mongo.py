"""Test MongoDB connection."""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import pytest

# Skip Mongo tests when no MONGO_URL is configured in the environment
if not os.environ.get("MONGO_URL"):
    pytest.skip("MONGO_URL not set; skipping MongoDB connection test", allow_module_level=True)


async def _check_connection():
    mongo_url = os.environ.get("MONGO_URL")
    print(f"Testing MongoDB connection...")
    print(f"URL (redacted): mongodb+srv://***@{mongo_url.split('@')[1] if '@' in mongo_url else 'unknown'}")
    
    try:
        # Set a connection timeout of 10 seconds
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
        db = client[os.environ.get("DB_NAME", "task_manager")]
        
        # Try to execute a simple command
        result = await asyncio.wait_for(db.command("ping"), timeout=10)
        print(f"✅ Connection successful: {result}")
        client.close()
        return True
    except asyncio.TimeoutError:
        print("❌ Connection timed out after 10 seconds")
        return False
    except Exception as e:
        print(f"❌ Connection error: {type(e).__name__}: {e}")
        return False


def test_connection():
    # Run the async check synchronously so pytest doesn't require async plugins
    success = asyncio.run(_check_connection())
    assert success is True

if __name__ == "__main__":
    success = asyncio.run(test_connection())
    exit(0 if success else 1)
