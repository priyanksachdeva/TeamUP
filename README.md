# LinearTasks — Team Task Manager

Production-quality full-stack task & project management app with role-based access, Kanban drag-and-drop, dashboard analytics, and dark mode.

## Tech Stack
- **Frontend**: React (CRA) + Tailwind CSS + shadcn/ui + Recharts + @dnd-kit + sonner
- **Backend**: FastAPI (Python) + Motor (async MongoDB driver) + PyJWT + bcrypt
- **Database**: MongoDB
- **Auth**: JWT (Bearer token) with bcrypt-hashed passwords

> The original PRD requested Node.js + Express. The Emergent platform runs a FastAPI template, so the backend is implemented in FastAPI while preserving the full API surface defined in the PRD.

## Features
- JWT authentication (signup, login, persistent session)
- Role-based access control: **admin** vs **member**
- Project CRUD with team membership
- Task CRUD with priority, status, due date, assignee
- Kanban board with drag-and-drop (Todo / In Progress / Done)
- Overdue task detection with visual indicators
- Dashboard with stat cards, status pie chart, productivity bar chart, upcoming deadlines, recent activity, project progress bars
- Light / dark mode toggle (persistent)
- Responsive layout (desktop sidebar + mobile bottom-nav)
- Toast notifications via sonner

## Folder Structure
```
backend/
  server.py            # FastAPI entry, lifespan, routers
  auth.py              # bcrypt + JWT + dependencies
  models.py            # Pydantic models
  routes_auth.py       # /api/auth/*
  routes_projects.py   # /api/projects/*
  routes_tasks.py      # /api/tasks/*
  routes_users.py      # /api/users/*
  routes_dashboard.py  # /api/dashboard/*
  requirements.txt
  .env

frontend/
  src/
    components/        # Layout, KanbanBoard, dialogs, UserAvatar, shadcn ui/
    context/           # AuthContext, ThemeContext
    pages/             # Login, Signup, Dashboard, Projects, ProjectDetail, Members
    services/api.js    # axios instance with JWT interceptor
    lib/taskHelpers.js
    App.js
    index.css
```

## Environment Variables

### backend/.env
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="task_manager"
CORS_ORIGINS="*"
JWT_SECRET="<random-64-char-hex>"
ADMIN_EMAIL="admin@demo.com"
ADMIN_PASSWORD="Admin@123"
MEMBER_EMAIL="member@demo.com"
MEMBER_PASSWORD="Member@123"
```

### frontend/.env
```
REACT_APP_BACKEND_URL=<your-backend-url>
```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | – | Create member account |
| POST | `/api/auth/login`  | – | Returns `{ user, token }` |
| GET  | `/api/auth/me`     | Bearer | Current user |

### Projects (admin-only writes)
| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/projects` | Bearer |
| POST | `/api/projects` | Admin |
| GET | `/api/projects/:id` | Member of project |
| PUT | `/api/projects/:id` | Admin |
| DELETE | `/api/projects/:id` | Admin |

### Tasks
| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/tasks?project_id=` | Bearer |
| POST | `/api/tasks` | Admin |
| PUT | `/api/tasks/:id` | Admin |
| PATCH | `/api/tasks/:id/status` | Bearer (project member) |
| DELETE | `/api/tasks/:id` | Admin |

### Users
| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/users` | Bearer |
| PATCH | `/api/users/:id/role` | Admin |

### Dashboard
| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/dashboard/stats` | Bearer |
| GET | `/api/dashboard/upcoming` | Bearer |
| GET | `/api/dashboard/recent` | Bearer |

## Demo Credentials (auto-seeded)
- **Admin** — `admin@demo.com` / `Admin@123`
- **Member** — `member@demo.com` / `Member@123`

## Running Locally
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend
yarn install
yarn start
```

## Deployment Notes
- Backend listens on `0.0.0.0:8001`; ingress routes `/api/*` to it.
- Frontend calls `${REACT_APP_BACKEND_URL}/api/*`.
- MongoDB collections (`users`, `projects`, `tasks`) auto-index on startup.
- Admin & member demo accounts are seeded idempotently on startup.
