# Product Requirements Document — LinearTasks (Team Task Manager)

## Original Problem Statement

> Build a production-quality full-stack Team Task Manager web application using the attached PRD. Frontend: React + Tailwind + shadcn/ui. Backend: FastAPI + MongoDB (deviation from PRD's Node/Express). JWT auth + RBAC. Modern dashboard UI, Kanban drag-and-drop board, dark mode, charts, responsive, toast notifications.

## User Choices Confirmed

- Backend: **FastAPI + MongoDB** (PRD originally requested Node/Express — switched for platform compatibility)
- Frontend: CRA + Tailwind + shadcn/ui
- Auth: JWT (email + password with bcrypt)
- Seed accounts: Admin demo & Member demo
- Kanban: @dnd-kit

## Architecture

- **Backend** (`/app/backend`): FastAPI + Motor, JWT (PyJWT) + bcrypt, lifespan event seeds admin & member.
- **Frontend** (`/app/frontend`): React 19 + Tailwind + shadcn/ui + Recharts + @dnd-kit + sonner.
- **DB**: MongoDB collections — `users`, `projects`, `tasks`. UUID string `_id`.
- Bearer token in `Authorization` header (stored in `localStorage.ttm_token`).

## User Personas

- **Admin** — creates projects, assigns tasks, manages members, changes user roles.
- **Member** — views assigned projects, updates own task status (drag on Kanban).

## Core Requirements (Static)

- JWT signup/login/me with bcrypt + persistent sessions.
- Projects CRUD with team membership (admin writes; members read assigned).
- Tasks CRUD with priority/status/due date/assignee (admin writes; members can change status).
- Kanban with drag-and-drop across Todo / In Progress / Done.
- Dashboard: stat cards (total, in_progress, completed, overdue), pie chart status distribution, 7-day productivity bar chart, upcoming deadlines, recent activity, project progress bars.
- Members page with role management (admin).
- Light/dark theme toggle persisted to localStorage.
- Toast notifications via sonner.

## What's Been Implemented (Feb 14, 2026)

- Backend: auth, projects, tasks, users, dashboard routes; admin/member seed.
- Frontend: Login/Signup (glassmorphism), Dashboard (charts), Projects (CRUD + dialogs), Project Detail (Kanban + Task dialog), Members (role mgmt).
- Sidebar layout + mobile bottom-nav, dark mode default with persistence.
- RBAC tested end-to-end. Testing agent reports 25/25 backend tests pass and frontend critical flows pass.

## Prioritized Backlog

- **P1**: Comments/activity log per task, email notifications on assignment, attachments.
- **P2**: Project labels/tags, advanced filters & saved views, task subtasks, sprint planning.
- **P3**: Audit log, third-party integrations (Slack/Linear), API keys for service-to-service.

## Next Tasks

- Add real-time updates via WebSockets when team activity grows.
- Add per-project analytics page (velocity, burndown).
- Consider per-task comments & @-mentions.
