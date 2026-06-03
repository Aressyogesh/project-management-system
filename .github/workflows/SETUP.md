# Local Server Deployment — Setup Guide (F-035)

This workflow (`deploy-local.yml`) builds, tests, and deploys the PMS application to your
local Windows machine automatically on every push to `main`.

**Stack:** NestJS backend (port 3000) + React/Vite frontend (port 5173) + PostgreSQL (port 5432)

---

## Pipeline Overview

```
push to main  (or workflow_dispatch)
    │
    ▼
┌─────────────────────────────┐
│  Job 1 — test (runs always) │
│  npm ci                     │
│  npm test                   │  ← GATE: deploy skipped if this fails
└────────────┬────────────────┘
             │ needs: test
             ▼
┌─────────────────────────────────────┐
│  Job 2 — deploy (main branch only)  │
│  backend: npm ci → prisma migrate   │
│           → npm run build           │
│           → pm2 restart             │
│  frontend: npm ci → npm run build   │
│            → pm2 restart            │
│  health check (retry ×3, 5s delay)  │
│  pm2 list summary                   │
└─────────────────────────────────────┘
```

---

## Prerequisites

- Node.js 18+ installed (`node --version`)
- PostgreSQL running locally on port 5432
- Git configured on the machine
- PowerShell 7+ (`pwsh --version`) — used by the workflow steps

---

## Step 1 — Install PM2 (once)

PM2 keeps the backend and frontend running as background services and restarts them
after each deploy.

```powershell
npm install -g pm2
pm2 --version   # verify
```

---

## Step 2 — Register the Self-Hosted Runner

1. Open your browser and go to:
   ```
   https://github.com/Aressyogesh/project-management-system/settings/actions/runners/new
   ```

2. Select **Windows → x64**

3. GitHub will show you three commands. Run them in PowerShell **as Administrator**:

   ```powershell
   # a) Create a folder for the runner
   mkdir C:\actions-runner; cd C:\actions-runner

   # b) Download the runner (GitHub gives the exact URL with current version)
   Invoke-WebRequest -Uri <GITHUB_PROVIDED_URL> -OutFile actions-runner-win-x64.zip

   # c) Extract
   Add-Type -AssemblyName System.IO.Compression.FileSystem
   [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD\actions-runner-win-x64.zip", "$PWD")

   # d) Configure (GitHub gives the exact token — valid for 1 hour)
   .\config.cmd --url https://github.com/Aressyogesh/project-management-system --token <TOKEN_FROM_GITHUB>
   ```

   Accept all defaults when prompted (runner name, work folder).

---

## Step 3 — Install Runner as a Windows Service

This makes the runner start automatically when Windows boots.

```powershell
# Run from inside C:\actions-runner
.\svc.cmd install
.\svc.cmd start
```

Verify it is running:
```powershell
.\svc.cmd status
```

You should see **Active: running** in the output, and the runner will appear as **Idle**
in the GitHub runners page.

---

## Step 4 — Add GitHub Repository Secrets

1. Open:
   ```
   https://github.com/Aressyogesh/project-management-system/settings/secrets/actions
   ```

2. Click **New repository secret** and add each of the following:

   | Secret Name         | Value                                                       |
   |---------------------|-------------------------------------------------------------|
   | `DATABASE_URL`      | `postgresql://postgres:postgres@localhost:5432/pms_db`      |
   | `DIRECT_URL`        | `postgresql://postgres:postgres@localhost:5432/pms_db`      |
   | `VITE_API_BASE_URL` | `http://localhost:3000/api/v1`                              |

   > **Never** put these values directly in the workflow file.

---

## Step 5 — Trigger Your First Deployment

**Option A — Push a commit:**
```powershell
git push origin main
```

**Option B — Manual trigger:**
```
GitHub → Actions → Deploy to Local Server → Run workflow → Run workflow
```

Watch the workflow run in GitHub Actions. You should see:
1. `Run Backend Unit Tests` job passes ✅
2. `Build & Deploy (self-hosted)` job runs and passes ✅
3. Health check confirms backend is live ✅

---

## Monitoring

```powershell
# View all PM2 processes
pm2 list

# Live logs — backend
pm2 logs pms-backend

# Live logs — frontend
pm2 logs pms-frontend

# Restart manually
pm2 restart pms-backend
pm2 restart pms-frontend

# Stop everything
pm2 stop all

# Delete all (force clean state before re-deploy)
pm2 delete all
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Runner shows **Offline** in GitHub | Run `.\svc.cmd start` inside `C:\actions-runner` |
| `pm2: command not found` | Run `npm install -g pm2` in a new terminal |
| Migration step fails | Check `DATABASE_URL` secret matches your local Postgres credentials; ensure DB is running |
| Frontend blank after deploy | Check `VITE_API_BASE_URL` secret — must be `http://localhost:3000/api/v1` |
| Port already in use (3000 / 5173) | Run `pm2 delete all` then trigger the workflow again |
| Runner token expired | Generate a new token from the GitHub runners page (tokens expire after 1 hour) |
| `pwsh` not found | Install PowerShell 7+: `winget install Microsoft.PowerShell` |
| Health check fails after 3 retries | Check `pm2 logs pms-backend` for startup errors; ensure `DATABASE_URL` is set correctly in PM2 env |
| Test job fails unexpectedly | Run `npm test` locally in `backend/` to diagnose; check for missing env vars |
