# TeamUp Team managing platform with webhook support

> Fast, delightful team task management with built-in webhook integrations — notify Slack or Discord when things matter.

Quick links: `backend/` • `frontend/` • Deployment: `RAILWAY_DEPLOYMENT.md`

---

## Hero — Webhooks First

TeamUp ships with first-class webhook support so you can trigger notifications, automations, and integrations the moment tasks change. Configure per-project webhooks (Slack/Discord/HTTP) for events like task completion, due-dates, and custom triggers — zero glue code required.

Buttons: [Get Started](#quick-start) • [Docs](#features) • [Deploy](#environment--deployment-backend)

---

## Why TeamUp?

- Built for teams: projects, roles, and lightweight RBAC out of the box
- Integrations-first: native webhooks, email-to-task, and optional Discord alerts
- Modern UX: fast Kanban, inline editing, analytics, dark mode
- Production-ready: environment examples and Railway deployment guide included

---

## Quick Start

1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# copy backend/.env.example -> backend/.env and fill values
python run_uvicorn.py
```

2. Frontend

```powershell
cd frontend
npm install
npm run build      # production build
npm run railway-start  # serve the build locally
```

> Note: In production, serve the static `build/` folder rather than running the CRA dev server.

---

## Features (short)

- Authentication: JWT with secure password hashing
- Projects & Tasks: create, assign, track, due-dates, priorities
- Kanban board: drag & drop with smooth animations
- Dashboard: productivity charts and status breakdowns
- Webhooks (first-class): per-project HTTP hooks for Slack/Discord/any endpoint
- Email-to-task: forward emails to auto-create tasks
- Extensible: optional Redis for background jobs and webhooks queueing

---

## Webhooks — spotlight

Configure webhooks per project and pick events to watch (e.g., `task_completed`, `task_due_today`). Each trigger sends a payload to your endpoint; retries and fallback to a background queue are supported when Redis is enabled.

Payload example (POST JSON):

```json
{
  "event": "task_completed",
  "project_id": "proj_123",
  "task": { "id": "t_456", "title": "Write spec", "status": "done" },
  "timestamp": "2026-05-16T12:00:00Z"
}
```

Use cases:

- Post a message to Slack or Discord when a milestone is reached
- Trigger CI or deployment pipelines when tasks move to Done
- Fire custom automations in Zapier/IFTTT or internal web services

---

## Environment & Deployment (backend)

Copy `backend/.env.example` -> `backend/.env` and set the required variables:

- `MONGO_URL` — MongoDB URI
- `DB_NAME` — default: `teamup`
- `JWT_SECRET` — 32+ characters
- `CORS_ORIGINS` — comma-separated list of allowed frontends (e.g., https://your-site.com)
- `RESEND_API_KEY` or SMTP settings for email fallback
- `REDIS_URL` — optional, recommended for webhook/queue reliability
- `DISCORD_WEBHOOK_URL` — optional global webhook for system notifications

Railway / Production notes:

- Service root: set the backend root directory to `backend`
- Build command: `pip install -r requirements.txt` (Railway will cache dependencies)
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

---

## Tests

Run backend tests from `backend/`:

```powershell
cd backend
python -m pytest -q
```

---

## Contributing

1. Fork & branch
2. Run tests and linting
3. Open a PR with a clear description and screenshots

---

## Support

If you want help deploying the app, configuring webhooks, or adding custom integrations, open an issue or DM me — I can assist with Railway setup, CI, or security review.

---

## License

MIT — see LICENSE file for details.

**_ End Patch _**

- **✨ Inline Task Editing** — Click to edit, press Enter to save or Escape to cancel
- **🎉 Confetti Celebrations** — Visual feedback when tasks move to Done status
- **🌓 Dark/Light Mode** — Persistent theme preference with smooth transitions
- **📱 Responsive Design** — Desktop sidebar + mobile bottom navigation
- **🔍 Command Palette** — Quick navigation with ⌘K shortcut
- **🔄 Optimistic UI** — Instant feedback before server confirmation
- **⏰ Overdue Detection** — Visual alerts for late tasks

---

## 🛠️ Tech Stack

### Frontend

| Technology          | Purpose                | Version |
| ------------------- | ---------------------- | ------- |
| **React**           | UI framework           | 19.0.0  |
| **React Router**    | Navigation             | 7.5.1   |
| **Tailwind CSS**    | Styling                | 3.4.1   |
| **shadcn/ui**       | Component library      | Latest  |
| **@dnd-kit**        | Drag-and-drop          | 6.3.1   |
| **Recharts**        | Data visualization     | 2.10.0  |
| **sonner**          | Toast notifications    | Latest  |
| **canvas-confetti** | Celebration animations | 1.9.0   |
| **axios**           | HTTP client            | Latest  |

### Backend

| Technology        | Purpose            | Version |
| ----------------- | ------------------ | ------- |
| **FastAPI**       | Web framework      | 0.110.1 |
| **Motor**         | Async MongoDB      | 3.3.1   |
| **python-jose**   | JWT tokens         | Latest  |
| **bcrypt**        | Password hashing   | Latest  |
| **httpx**         | Async HTTP client  | 0.25.0  |
| **python-dotenv** | Environment config | Latest  |

### Database & Infrastructure

| Technology           | Purpose             |
| -------------------- | ------------------- |
| **MongoDB**          | NoSQL database      |
| **SendGrid**         | Email service       |
| **Slack API**        | Webhook integration |
| **Discord Webhooks** | Webhook integration |

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- Git
- MongoDB Atlas account (free tier available at https://www.mongodb.com/cloud/atlas)

### Backend Setup

**1. Clone & navigate:**

```bash
git clone https://github.com/priyanksachdeva/TeamUP.git
cd TeamUP/backend
```

**2. Create virtual environment:**

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

**3. Install dependencies:**

```bash
pip install -r requirements.txt
```

**4. Set up MongoDB Atlas:**

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account (if needed)
3. Create a new project
4. Click "Build a Database" → Select Free tier (M0)
5. Choose your cloud provider & region
6. Create cluster
7. Go to "Security" → "Database Access" → Add database user
   - Username: `admin`
   - Password: `your-secure-password` (save this!)
8. Go to "Network Access" → Add IP Address
   - Click "Add Current IP Address" or add `0.0.0.0/0` for development
9. Go to "Databases" → Click "Connect"
   - Choose "Drivers" → Select "Python 3.9+"
   - Copy the connection string (looks like: `mongodb+srv://admin:<password>@cluster.mongodb.net/`)

**5. Configure environment:**
Create `.env` file:

```env
# MongoDB Atlas connection string (from step 4.9)
# Format: mongodb+srv://username:password@cluster.mongodb.net/database?appName=YourAppName
# Example: mongodb+srv://admin:your-password@<your-cluster>.mongodb.net/?appName=TeamUP1
MONGO_URL=mongodb+srv://admin:your-password@<your-cluster>.mongodb.net/?appName=TeamUP1

DB_NAME=task_manager
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=your-secret-key-here-min-32-chars
ADMIN_EMAIL=admin@demo.com
ADMIN_PASSWORD=Admin@123
MEMBER_EMAIL=member@demo.com
MEMBER_PASSWORD=Member@123

# For email-to-task feature (optional)
EMAIL_DOMAIN=yourdomain.com
EMAIL_WEBHOOK_TOKEN=your-secret-token

# For Slack/Discord webhooks (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
```

**6. Run backend:**

```bash
python server.py
# Backend runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

**Troubleshooting MongoDB Connection:**

If you see "MongoDB connection timed out", check:

1. **IP Whitelist** — In MongoDB Atlas, go to "Security" → "Network Access" and add your IP
   - For development: Click "Add Current IP Address"
   - Or allow all IPs: Add `0.0.0.0/0` (less secure, for dev only)

2. **Connection String** — Verify `MONGO_URL` in `.env` matches your credentials
   - Must include username and password
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/?appName=TeamUP1`

3. **Local MongoDB Alternative** — Use MongoDB Community Edition instead:

   ```bash
   # Install MongoDB (if not installed)
   # Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
   # macOS: brew install mongodb-community
   # Linux: Follow official MongoDB docs

   # Start MongoDB server (Windows)
   mongod.exe

   # Update .env to use local connection:
   MONGO_URL=mongodb://localhost:27017/task_manager
   ```

### Frontend Setup

**1. Navigate to frontend:**

```bash
cd ../frontend
```

**2. Install dependencies:**

```bash
npm install
```

**3. Configure environment:**
Create `.env` file:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**4. Start development server:**

```bash
npm start
# Frontend runs on http://localhost:3000
```

### Quick Start (Backend + Frontend)

**Terminal 1 - Backend:**

```bash
cd TeamUP/backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python server.py
# Backend runs on http://localhost:8000
```

**Terminal 2 - Frontend:**

```bash
cd TeamUP/frontend
npm start
# Frontend runs on http://localhost:3000
```

> No need to run MongoDB locally — it's managed by MongoDB Atlas cloud service!

---

## 📖 Usage

### First Login

1. Go to http://localhost:3000/login
2. Use demo credentials:
   - **Admin**: `admin@demo.com` / `Admin@123`
   - **Member**: `member@demo.com` / `Member@123`

### Create & Manage Projects

1. Click "New project" button
2. Enter title and description
3. Add team members from the members list
4. Click into project to see tasks

### Manage Tasks

1. Click project → Kanban board appears
2. Click "New task" → Fill in details
3. **Drag tasks** between columns to change status
4. **Click task title** to edit inline
5. When task moves to **Done** → 🎉 Confetti celebration!

### Set Up Webhooks

1. Navigate to project
2. Go to Settings → Webhooks
3. Click "Add Webhook"
4. Paste Slack/Discord webhook URL
5. Select events (Task Completed, Task Due Today)
6. Click "Test" to verify

### Email-to-Task

1. Get your project email: `tasks-{project-id}@yourdomain.com`
2. Send email with subject: `[HIGH] My task title`
3. Task auto-creates with extracted priority

---

## 🔌 API Quick Reference

### Authentication

```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","name":"John","password":"Pass@123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Pass@123"}'
```

### Tasks

```bash
# Create task
curl -X POST http://localhost:8000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id":"...",
    "title":"New task",
    "priority":"high",
    "due_date":"2026-05-20"
  }'

# Update task status (drag-and-drop)
curl -X PATCH http://localhost:8000/api/tasks/TASK_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Update task title (inline edit)
curl -X PATCH http://localhost:8000/api/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title"}'
```

### Webhooks

```bash
# Create webhook
curl -X POST http://localhost:8000/api/webhooks/PROJECT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://hooks.slack.com/services/...",
    "type":"slack",
    "enabled":true,
    "events":["task_completed"]
  }'

# Test webhook
curl -X POST http://localhost:8000/api/webhooks/PROJECT_ID/WEBHOOK_ID/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Full API docs available at: http://localhost:8000/docs

## 📁 Project Structure

```
TeamUP/
├── backend/
│   ├── server.py                 # FastAPI app, lifespan, router setup
│   ├── auth.py                   # JWT + bcrypt authentication
│   ├── models.py                 # Pydantic request/response models
│   ├── routes_auth.py            # /api/auth/* endpoints
│   ├── routes_projects.py        # /api/projects/* endpoints
│   ├── routes_tasks.py           # /api/tasks/* endpoints (with webhooks)
│   ├── routes_users.py           # /api/users/* endpoints
│   ├── routes_dashboard.py       # /api/dashboard/* analytics
│   ├── routes_webhooks.py        # /api/webhooks/* (Slack/Discord)
│   ├── routes_email.py           # /api/email/* (email-to-task)
│   ├── webhooks.py               # Webhook service (formatting, sending)
│   ├── email_service.py          # Email parsing, task creation
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx              # Main layout wrapper
│   │   │   ├── KanbanBoard.jsx         # Drag-drop task board
│   │   │   ├── CommandPalette.jsx      # ⌘K quick nav
│   │   │   ├── TaskDetailDrawer.jsx    # Task detail view
│   │   │   ├── TaskDialog.jsx          # Create/edit task modal
│   │   │   ├── ProjectDialog.jsx       # Create/edit project modal
│   │   │   ├── UserAvatar.jsx          # User avatar display
│   │   │   ├── InlineEditableTitle.jsx # Click-to-edit titles
│   │   │   ├── EmptyState.jsx          # Empty state illustrations
│   │   │   └── ui/                     # shadcn/ui components
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx               # Login page
│   │   │   ├── Signup.jsx              # Signup page
│   │   │   ├── Dashboard.jsx           # Analytics & stats
│   │   │   ├── Projects.jsx            # Projects list
│   │   │   ├── ProjectDetail.jsx       # Project detail + Kanban
│   │   │   ├── Members.jsx             # Team management
│   │   │   └── MyTasks.jsx             # Personal task view
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # Auth state + JWT
│   │   │   └── ThemeContext.jsx        # Dark/light mode
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                  # Axios instance + interceptors
│   │   │   └── webhooks.js             # Webhook API client
│   │   │
│   │   ├── lib/
│   │   │   ├── taskHelpers.js          # Task utilities
│   │   │   ├── utils.js                # General utilities
│   │   │   ├── celebrations.js         # Confetti animations
│   │   │   └── optimisticUI.js         # Optimistic update helpers
│   │   │
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
│
├── FEATURES.md                   # Advanced features documentation
├── README.md                     # This file
└── docker-compose.yml
```

---

## 🧪 Testing

### Manual Testing Scenarios

**Task Creation & Drag-Drop**

- [ ] Create new task with all fields
- [ ] Drag task between columns
- [ ] Task moves to Done → see confetti
- [ ] Verify Slack/Discord notification sent

**Email-to-Task**

- [ ] Send email with `[HIGH] Subject` format
- [ ] Verify task created with correct priority
- [ ] Sender added as project member

**Inline Editing**

- [ ] Click task title → enter edit mode
- [ ] Press Enter → save title
- [ ] Press Escape → cancel without saving
- [ ] Click blur → save title

**Dark Mode**

- [ ] Toggle dark/light mode
- [ ] Refresh page → preference persists
- [ ] All components render correctly

**Responsive Design**

- [ ] Desktop: Sidebar visible
- [ ] Mobile (375px): Bottom navigation
- [ ] Tablet: Hybrid layout

---

## 🔍 Troubleshooting

### Backend Issues

**MongoDB Atlas connection fails**

- Verify connection string in `.env` (check username, password, cluster name)
- Confirm IP address is whitelisted in MongoDB Atlas (Network Access)
- Test connection: `python -c "from motor.motor_asyncio import AsyncIOMotorClient; import asyncio; asyncio.run(AsyncIOMotorClient('your-connection-string').server_info())"`

**JWT token expired**

- Clear localStorage: `localStorage.clear()`
- Login again

**CORS errors**

- Update `CORS_ORIGINS` in `.env`
- Should match frontend URL

### Frontend Issues

**Blank dashboard**

- Check browser console for errors
- Verify `REACT_APP_BACKEND_URL` in `.env`
- Check network tab for API calls

**Drag-drop not working**

- Ensure `@dnd-kit` packages installed: `npm list | grep dnd-kit`
- Clear browser cache

**Webhooks not firing**

- Verify webhook URL is correct (test with curl)
- Check backend logs: `logs` or `docker logs`

---

## 📝 Environment Checklist

### Backend (.env)

- [ ] MONGO_URL configured (MongoDB Atlas connection string)
- [ ] JWT_SECRET set (min 32 chars)
- [ ] CORS_ORIGINS matches frontend
- [ ] Email credentials (if using email-to-task)

### Frontend (.env)

- [ ] REACT_APP_BACKEND_URL points to backend
- [ ] No localhost:3000 hardcoded

### MongoDB Atlas

- [ ] Free tier cluster created
- [ ] Database user created with credentials
- [ ] IP address whitelisted (0.0.0.0/0 for dev)
- [ ] Connection string copied to MONGO_URL

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Support

- 📖 [API Documentation](http://localhost:8000/docs) (when running)
- 📧 [Email Integration Guide](FEATURES.md#email-to-task-forwarding)
- 🔔 [Webhook Setup](FEATURES.md#slackdiscord-webhook-integration)

---

<div align="center">

**Built with ❤️ using React, FastAPI, and MongoDB**

⭐ Star this repo if you find it useful!

</div>

### Dashboard

| Method | Path                      | Auth   |
| ------ | ------------------------- | ------ |
| GET    | `/api/dashboard/stats`    | Bearer |
| GET    | `/api/dashboard/upcoming` | Bearer |
| GET    | `/api/dashboard/recent`   | Bearer |

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
