"""Team Task Manager - FastAPI entry point."""
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import hash_password, verify_password
from routes_auth import router as auth_router
from routes_projects import router as projects_router
from routes_tasks import router as tasks_router
from routes_users import router as users_router
from routes_dashboard import router as dashboard_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("server")


async def _ensure_indexes(db):
    await db.users.create_index("email", unique=True)
    await db.projects.create_index("created_by")
    await db.tasks.create_index("project_id")
    await db.tasks.create_index("assigned_to")


async def _seed_user(db, *, email_env: str, password_env: str, default_email: str, default_password: str, name: str, role: str):
    email = (os.environ.get(email_env) or default_email).lower().strip()
    password = os.environ.get(password_env) or default_password
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "_id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "password_hash": hash_password(password),
            "role": role,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Seeded %s user: %s", role, email)
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {"password_hash": hash_password(password)}})
        logger.info("Updated %s password: %s", role, email)


@asynccontextmanager
async def lifespan(app: FastAPI):
    mongo_url = os.environ["MONGO_URL"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ["DB_NAME"]]
    app.state.mongo_client = client
    app.state.db = db
    await _ensure_indexes(db)
    await _seed_user(
        db,
        email_env="ADMIN_EMAIL",
        password_env="ADMIN_PASSWORD",
        default_email="admin@demo.com",
        default_password="Admin@123",
        name="Demo Admin",
        role="admin",
    )
    await _seed_user(
        db,
        email_env="MEMBER_EMAIL",
        password_env="MEMBER_PASSWORD",
        default_email="member@demo.com",
        default_password="Member@123",
        name="Demo Member",
        role="member",
    )
    logger.info("Startup complete.")
    yield
    client.close()


app = FastAPI(title="Team Task Manager API", version="1.0.0", lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Team Task Manager API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(tasks_router)
api_router.include_router(users_router)
api_router.include_router(dashboard_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exc_handler(_: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exc_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
