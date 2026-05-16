"""Pydantic models for Team Task Manager."""
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- Users ----------
class UserSignup(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Optional[Literal["admin", "member"]] = "member"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: Literal["admin", "member"]
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserOut
    token: str


class RoleUpdate(BaseModel):
    role: Literal["admin", "member"]


# ---------- Projects ----------
class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = ""
    members: List[str] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    members: Optional[List[str]] = None


class MembersUpdate(BaseModel):
    members: List[str] = Field(min_items=1)


class ProjectOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    members: List[str]
    created_by: str
    created_at: datetime


# ---------- Tasks ----------
TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]


class SubtaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    completed: Optional[bool] = False


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None


class SubtaskOut(BaseModel):
    id: str
    title: str
    completed: bool
    created_at: datetime


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = ""
    project_id: str
    assigned_to: Optional[str] = None
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskReorder(BaseModel):
    position: int = Field(ge=0)  # New position index in the column (0-based, >= 0)


class TaskOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    project_id: str
    assigned_to: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    order: Optional[int] = None
    subtasks: List[SubtaskOut] = []
    created_by: str
    created_at: datetime
    updated_at: datetime


# ---------- Comments ----------
class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    task_id: str
    user_id: str
    user_name: str
    body: str
    created_at: datetime


# ---------- Webhooks ----------
class WebhookType:
    SLACK = "slack"
    DISCORD = "discord"


class WebhookCreate(BaseModel):
    url: str = Field(min_length=10, max_length=2000)  # Webhook URL
    type: Literal["slack", "discord"]
    enabled: bool = True
    events: List[Literal[
        "task_created",
        "task_updated",
        "task_status_changed",
        "task_assigned",
        "subtask_created",
        "project_activity"
    ]] = Field(default_factory=lambda: ["task_created", "task_status_changed", "task_assigned"])


class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    type: Optional[Literal["slack", "discord"]] = None
    enabled: Optional[bool] = None
    events: Optional[List[Literal[
        "task_created",
        "task_updated",
        "task_status_changed",
        "task_assigned",
        "subtask_created",
        "project_activity"
    ]]] = None


class WebhookOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    project_id: str
    type: Literal["slack", "discord"]
    url: str
    enabled: bool
    events: List[str]
    created_by: str
    created_at: datetime
    updated_at: datetime


class DiscordWebhookTest(BaseModel):
    webhook_url: str = Field(min_length=10, max_length=2000)


class WebhookOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    project_id: str
    url: str
    type: Literal["slack", "discord"]
    enabled: bool
    events: List[str]
    created_by: str
    created_at: datetime
    last_triggered: Optional[datetime] = None


# ---------- Email-to-Task ----------
class EmailForwardingConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    email_address: str  # Generated: tasks-{project_id}@yourdomain.com
    enabled: bool
    created_at: datetime
