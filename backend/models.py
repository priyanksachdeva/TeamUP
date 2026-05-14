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
    created_by: str
    created_at: datetime
    updated_at: datetime
