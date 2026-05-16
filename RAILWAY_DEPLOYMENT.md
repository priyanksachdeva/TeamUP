# TeamUP Railway Deployment Guide

This repo is a two-service monorepo:

- `backend/` is a FastAPI app with MongoDB, JWT auth, optional Redis/RQ, Resend/SMTP email, Google OAuth, and Discord/webhook integrations.
- `frontend/` is a React app built with CRACO and served as a static production build.

The cleanest Railway setup is:

1. one Railway service for the backend API
2. one Railway service for the frontend UI
3. optional managed plugins for MongoDB, Redis, and any other external dependencies you want hosted in Railway

If you are already using MongoDB Atlas, you can keep it. Railway only needs to host the app services.

---

## 1. What Railway Needs To Run This App

### Backend entrypoint

The backend app lives in `backend/server.py` and exposes the FastAPI `app` object. For Railway, do not start it with a hardcoded port. Use the platform port:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

### Frontend build and start

The frontend is a Create React App app using CRACO. In production, it should be built and served as static files.

Recommended Railway start command:

```bash
npx serve -s build -l $PORT
```

Recommended build command:

```bash
npm install
npm run build
```

The frontend uses `REACT_APP_BACKEND_URL` at build time, so that variable must be set before the build runs.

---

## 2. Repository Structure To Use On Railway

Use the repo as a monorepo with two services:

- Backend service root: `backend`
- Frontend service root: `frontend`

Do not point both services at the repository root unless you explicitly want Railway to guess the package managers and commands. Setting the root directory per service keeps builds deterministic.

---

## 3. Backend Environment Variables

These are the backend variables referenced by the codebase.

### Required

- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - database name, usually `task_manager`
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGINS` - comma-separated list of allowed frontend origins

### Demo seed users

The backend seeds two accounts on startup if they do not already exist.

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `MEMBER_EMAIL`
- `MEMBER_PASSWORD`

If these are not set, the app falls back to the demo values used in local development.

### Google OAuth

- `GOOGLE_CLIENT_ID`

This must match the client ID configured in Google Cloud Console. The backend verifies Google ID tokens against this value.

### Email delivery

The app supports two paths:

1. Resend API
2. SMTP fallback

Use whichever fits your setup.

Resend:

- `RESEND_API_KEY`
- `RESEND_FROM` - optional sender address, defaults to `no-reply@teamup.local`

SMTP fallback:

- `SMTP_HOST`
- `SMTP_PORT` - optional, defaults to `587`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_USE_TLS` - optional, defaults to `true`

Important: SMTP is only useful if the provider allows sending from the address you configure. For Gmail, you typically need an app password.

### Email-to-task webhook

- `EMAIL_WEBHOOK_TOKEN` - optional shared secret for inbound email webhook verification
- `EMAIL_DOMAIN` - optional, used to format the user-facing email address examples

### Discord and other webhooks

- `DISCORD_WEBHOOK_URL` - used by test utilities and local verification scripts
- `SLACK_WEBHOOK_URL` - if your webhook routes support Slack notifications

### Queue / background jobs

- `REDIS_URL` - optional, used for the RQ queue helper

If `REDIS_URL` is missing, the app falls back to synchronous email sending in the test email route.

### Mongo helper / scripts

- `MONGODB_URI` - used by helper scripts such as `check_webhooks.py`

### Local development only

- `TEST_JWT_TOKEN` - used by manual test scripts

Do not set this in Railway unless you intentionally want those scripts available there.

---

## 4. Frontend Environment Variables

### Required

- `REACT_APP_BACKEND_URL` - public backend base URL, for example `https://your-backend.up.railway.app`

This is baked into the frontend build. If the backend URL changes, rebuild the frontend.

### Optional

- `ENABLE_HEALTH_CHECK` - only needed for local dev health endpoints in the CRACO config

You do not normally need this in Railway production.

---

## 5. Suggested Railway Service Setup

## Service A: Backend API

### Root directory

`backend`

### Build command

```bash
pip install -r requirements.txt
```

### Start command

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

### Environment variables to set on Railway

At minimum:

- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `MEMBER_EMAIL`
- `MEMBER_PASSWORD`

For integrations, add as needed:

- `GOOGLE_CLIENT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_USE_TLS`
- `REDIS_URL`
- `EMAIL_WEBHOOK_TOKEN`
- `EMAIL_DOMAIN`
- `DISCORD_WEBHOOK_URL`
- `SLACK_WEBHOOK_URL`

### Health check

Use:

```text
/api/health
```

The backend already exposes a simple healthy response there.

---

## Service B: Frontend UI

Important: do not use `npm start` on Railway. That runs the CRA/CRACO development server and is a common cause of the 502 "Application failed to respond" error in production.

### Root directory

`frontend`

### Build command

If you want explicit commands:

```bash
npm install
npm run build
```

If Railway uses the lockfile automatically, that is fine too. This repo has `frontend/package-lock.json`, so npm is the safest choice.

### Start command

```bash
npm run railway-start
```

If you prefer to keep the build output truly static, you can also deploy it as a Railway static site if your Railway project type supports that workflow. The above command works reliably in a normal service.

### Environment variables to set on Railway

- `REACT_APP_BACKEND_URL` = the public backend URL

Example:

```text
REACT_APP_BACKEND_URL=https://teamup-backend-production.up.railway.app
```

Rebuild the frontend after setting this.

---

## 6. Recommended Deployment Order

Deploy in this order:

1. Backend service
2. Frontend service
3. Optional Redis plugin
4. Optional custom domain

Why this order:

- The frontend needs the final backend URL at build time.
- The backend needs its own Railway URL or custom domain for CORS.
- OAuth and email integrations usually depend on the final public URLs.

---

## 7. Step-by-Step Railway Setup

### Step 1: Push your repo to GitHub

Railway deploys best from GitHub. Make sure the repo includes:

- `backend/`
- `frontend/`
- the code changes you want deployed

If you have local-only secrets in `backend/.env`, do not commit them.

### Step 2: Create a Railway project

In Railway:

1. Create a new project
2. Add the GitHub repo
3. Create the backend service first
4. Point it at the `backend` directory

### Step 3: Configure backend variables

Add all required backend env vars in Railway’s Variables panel.

Make sure `CORS_ORIGINS` includes your frontend domain. Example:

```text
CORS_ORIGINS=https://teamup-frontend-production.up.railway.app,http://localhost:3000
```

If you use a custom domain later, add that too.

### Step 4: Deploy the backend and copy its public URL

After deployment, Railway gives you a public URL like:

```text
https://teamup-backend-production.up.railway.app
```

Keep that value for the frontend build.

### Step 5: Create the frontend service

1. Add another service from the same repo
2. Set the root directory to `frontend`
3. Set the build command to `npm run build`
4. Set the start command to `npm run railway-start`
5. Set `REACT_APP_BACKEND_URL` to the backend URL from Step 4

Rebuild after setting the variable.

### Step 6: Verify auth and CORS

Open the frontend URL and confirm:

- login works
- API calls succeed
- browser console does not show CORS errors

If you see CORS failures, update `CORS_ORIGINS` in the backend and redeploy it.

---

## 8. Optional Railway Add-ons

### Redis

If you want queue-backed email sending or future background jobs, add Railway’s Redis plugin and set:

```text
REDIS_URL=<railway redis url>
```

The app can function without Redis, but queued jobs will be disabled or fallback to sync paths.

### MongoDB

If you do not want MongoDB Atlas, you can use another managed MongoDB provider and set `MONGO_URL` accordingly.

This repo does not require Railway-hosted MongoDB specifically.

---

## 9. External Service Setup You Still Need

Railway only hosts the app. You still need to configure the external integrations.

### MongoDB Atlas

If using Atlas:

- whitelist Railway outbound IPs if needed, or allow access appropriately
- use the Atlas connection string in `MONGO_URL`

### Google OAuth

In Google Cloud Console:

- add your Railway frontend domain to authorized origins
- add the correct redirect / allowed origin settings for the auth flow you use
- set `GOOGLE_CLIENT_ID` in Railway backend variables

### Email

Choose one:

- Resend with a verified sender/domain
- SMTP fallback with a provider that allows your chosen sender

If you keep using Gmail, ensure the app password and sender address are valid.

### Discord / Slack webhooks

Set the webhook URLs only if you want those notifications active in production.

---

## 10. Common Railway Pitfalls

### 1. Backend listens on the wrong port

Do not use `python server.py` on Railway.

Use uvicorn with `$PORT`:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

### 2. Frontend builds against the wrong API URL

If `REACT_APP_BACKEND_URL` is wrong at build time, the app will still compile, but all API calls will hit the wrong server.

Rebuild after changing it.

### 3. CORS errors

Backend `CORS_ORIGINS` must include the exact frontend origin, not just `*` if you need credentialed behavior later.

### 4. Missing OAuth or email secrets

Google login, email sending, and queueing will fail if the corresponding env vars are absent.

### 5. Old local `.env` values

This repository has a local `backend/.env` used for development. Railway will not read that file unless you intentionally ship it, which you should not do.

Move every production secret into Railway variables.

---

## 11. Post-Deploy Smoke Test Checklist

After both services are live:

1. Open backend `/api/health`
2. Open frontend homepage
3. Log in with the seeded admin account
4. Create a project
5. Open the Kanban board
6. Drag a task between columns
7. Confirm task status updates persist after refresh
8. If enabled, test email and webhook actions

If any of these fail, check the Railway logs for the relevant service.

---

## 12. Recommended Production Values

Use these defaults as a starting point:

- `DB_NAME=task_manager`
- `CORS_ORIGINS=https://your-frontend-domain` plus any custom domains
- `JWT_SECRET` as a long random secret
- `RESEND_FROM` as a verified sender or domain
- `SMTP_USE_TLS=true`

Do not reuse demo credentials in production.

---

## 13. Minimal Railway Config Summary

### Backend

```bash
Root: backend
Build: pip install -r requirements.txt
Start: uvicorn server:app --host 0.0.0.0 --port $PORT
```

### Frontend

```bash
Root: frontend
Build: npm install && npm run build
Start: npx serve -s build -l $PORT
```

### Frontend env

```text
REACT_APP_BACKEND_URL=https://your-backend-url
```

### Backend env

```text
MONGO_URL=...
DB_NAME=task_manager
JWT_SECRET=...
CORS_ORIGINS=https://your-frontend-url
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
MEMBER_EMAIL=...
MEMBER_PASSWORD=...
```

---

## 14. Short Recommendation

For this repo, the most stable Railway deployment is:

- backend service from `backend/`
- frontend service from `frontend/`
- MongoDB Atlas for the database
- optional Railway Redis if you want queueing

That matches the code structure, the current environment variables, and the fact that the frontend builds a static bundle while the backend is a separate FastAPI API.
