# REQ-F-035 — CI/CD On-Premise Deployment

**Feature ID:** F-035  
**Epic:** PMS Infrastructure & DevOps  
**Author:** Yogesh Lolage  
**Date:** 2026-06-03  
**Status:** Draft  

---

## 1. User Story

> As a **developer**, I want every push to `main` to automatically build, test, and deploy the PMS application to my local Windows machine using a self-hosted GitHub Actions runner, so that the running local server always reflects the latest production-ready code without any manual steps.

---

## 2. Background

The PMS application runs locally on a Windows 11 machine:
- **Backend:** NestJS (port 3000), managed by PM2 (`pms-backend`)
- **Frontend:** React/Vite (port 5173), managed by PM2 (`pms-frontend`)
- **Database:** PostgreSQL (port 5432) — local `pms_db`

A basic `deploy-local.yml` workflow and `SETUP.md` guide already exist from earlier commits. F-035 formalises and hardens the pipeline by adding:
- A **test gate** (unit tests must pass before deploy runs)
- **Separate CI and Deploy jobs** (CI runs on every push/PR; Deploy only on `main`)
- **Improved health check** with retry logic
- **Workflow status badge** in README
- A complete, verified setup guide

---

## 3. Business Requirements

| ID | Requirement |
|----|-------------|
| BR-1 | Every push to `main` must trigger an automated build and deploy to the local server |
| BR-2 | Unit tests must pass before any deployment step executes |
| BR-3 | The backend must be restarted via PM2 after a successful build |
| BR-4 | The frontend must be rebuilt and re-served via PM2 after a successful build |
| BR-5 | A health check must confirm the backend is live after deploy |
| BR-6 | The pipeline must run on a self-hosted Windows runner registered to the repository |
| BR-7 | Database migrations must be applied automatically on every deploy |
| BR-8 | Secrets (DATABASE_URL, DIRECT_URL, VITE_API_BASE_URL) must never be hard-coded in workflow files |
| BR-9 | A setup guide must document every step required to register and run the self-hosted runner |
| BR-10 | The workflow must be idempotent — re-running it on the same commit must not break the running system |

---

## 4. Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-1 | Pushing a commit to `main` triggers the `Deploy to Local Server` workflow automatically |
| AC-2 | If backend unit tests fail, the deploy job does not start |
| AC-3 | After a successful deploy, `GET /api/v1/health` returns `200 OK` with `{ "status": "ok" }` |
| AC-4 | `pm2 list` shows both `pms-backend` and `pms-frontend` in **online** state after deploy |
| AC-5 | `npx prisma migrate deploy` runs without error on every deploy (idempotent) |
| AC-6 | Workflow can be triggered manually via `workflow_dispatch` (Run workflow button in GitHub Actions UI) |
| AC-7 | All three secrets (`DATABASE_URL`, `DIRECT_URL`, `VITE_API_BASE_URL`) are injected from GitHub repository secrets — no hard-coded values |
| AC-8 | The setup guide (`SETUP.md`) covers: PM2 install, runner registration on Windows, service install, secrets setup, first deploy trigger, monitoring commands, and troubleshooting |
| AC-9 | Health check retries up to 3 times with a 5-second delay before marking the deploy failed |
| AC-10 | The workflow file includes a deployment summary step that outputs PM2 process list on success |

---

## 5. Out of Scope

- Multi-environment pipelines (staging, production Render/Vercel — handled by Render/Vercel auto-deploy)
- Docker-based deployment
- Slack / email notifications on deploy
- Rollback automation
- Code coverage reporting

---

## 6. Pipeline Design

### 6.1 Workflow Trigger

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```

### 6.2 Jobs

```
Job 1: test (runs on self-hosted, every push/PR)
  ├── Checkout
  ├── Install backend deps
  ├── Run backend unit tests (npm test)
  └── GATE: deploy only if test passes

Job 2: deploy (runs on self-hosted, only on push to main)
  ├── Checkout
  ├── Backend: npm ci → prisma migrate deploy → npm run build → pm2 restart
  ├── Frontend: npm ci → npm run build → pm2 restart
  ├── Health check (retry x3, 5s delay)
  └── Summary: pm2 list
```

### 6.3 Secrets Required

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `DIRECT_URL` | Direct PostgreSQL URL (Supabase / local) |
| `VITE_API_BASE_URL` | Backend API base URL for frontend build |

### 6.4 PM2 Process Names

| Process | Name | Start Command |
|---------|------|---------------|
| NestJS backend | `pms-backend` | `pm2 start npm --name pms-backend -- run start:prod` |
| React/Vite frontend | `pms-frontend` | `pm2 serve dist 5173 --name pms-frontend --spa` |

---

## 7. Health Check Endpoint

`GET /api/v1/health`

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-06-03T10:00:00.000Z",
  "uptime": 42.5
}
```

This endpoint already exists (`34438db`). No schema change required.

---

## 8. Migration Status

**Not required** — no new Prisma models or schema changes. The health check endpoint already exists. The workflow runs `npx prisma migrate deploy` which applies any pending migrations idempotently.

---

## 9. Files Affected

| File | Action |
|------|--------|
| `.github/workflows/deploy-local.yml` | Update — add test job, retry health check, improve structure |
| `.github/workflows/SETUP.md` | Update — verify and enhance Windows setup guide |
