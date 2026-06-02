# Local Server Deployment — Setup Guide

This workflow (`deploy-local.yml`) deploys the PMS app to your local machine
automatically on every push to `main`.

**Stack:** NestJS backend (port 3000) + React/Vite frontend (port 5173) + PostgreSQL (port 5432)

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running locally
- Git configured on the machine

---

## Step 1 — Install PM2 (once)

PM2 keeps the backend and frontend running as background services.

```powershell
npm install -g pm2
```

---

## Step 2 — Register the Self-Hosted Runner

1. Open your browser and go to:
   ```
   https://github.com/Aressyogesh/project-management-system/settings/actions/runners/new
   ```

2. Select **Windows → x64**

3. GitHub will show you three commands. Run them in PowerShell:

   ```powershell
   # a) Create a folder for the runner
   mkdir actions-runner; cd actions-runner

   # b) Download the runner (GitHub gives the exact URL with version)
   Invoke-WebRequest -Uri <GITHUB_PROVIDED_URL> -OutFile actions-runner-win-x64.zip

   # c) Extract
   Add-Type -AssemblyName System.IO.Compression.FileSystem
   [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64.zip", "$PWD")

   # d) Configure (GitHub gives the exact token — valid for 1 hour)
   ./config.cmd --url https://github.com/Aressyogesh/project-management-system --token <TOKEN_FROM_GITHUB>
   ```

---

## Step 3 — Install Runner as a Windows Service

This makes the runner start automatically when Windows boots.

```powershell
# Run from inside the actions-runner folder
./svc.cmd install
./svc.cmd start
```

Verify it is running:
```powershell
./svc.cmd status
```

---

## Step 4 — Add GitHub Repository Secrets

1. Open:
   ```
   https://github.com/Aressyogesh/project-management-system/settings/secrets/actions
   ```

2. Click **New repository secret** and add each of the following:

   | Secret Name        | Value                                                      |
   |--------------------|------------------------------------------------------------|
   | `DATABASE_URL`     | `postgresql://postgres:postgres@localhost:5432/pms_db`     |
   | `DIRECT_URL`       | `postgresql://postgres:postgres@localhost:5432/pms_db`     |
   | `VITE_API_BASE_URL`| `http://localhost:3000/api/v1`                             |

---

## Step 5 — Trigger Your First Deployment

Push any commit to `main`:

```powershell
git push origin main
```

Or trigger it manually:
```
GitHub → Actions → Deploy to Local Server → Run workflow → Run workflow
```

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
```

---

## Workflow Overview

```
push to main
    │
    ▼
self-hosted runner (your machine)
    │
    ├── backend/
    │   ├── npm ci
    │   ├── prisma migrate deploy
    │   ├── nest build  →  dist/
    │   └── pm2 restart pms-backend
    │
    ├── frontend/
    │   ├── npm ci
    │   ├── vite build  →  dist/
    │   └── pm2 serve dist 5173 (pms-frontend)
    │
    └── health check  →  GET /api/v1/ai/health
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Runner shows **Offline** in GitHub | Run `./svc.cmd start` inside the actions-runner folder |
| `pm2: command not found` | Run `npm install -g pm2` again in a new terminal |
| Migration fails | Check `DATABASE_URL` secret matches your local Postgres credentials |
| Frontend blank after deploy | Check `VITE_API_BASE_URL` secret — must match backend port |
| Port already in use (3000/5173) | Run `pm2 delete all` then let the workflow restart services |
| Runner token expired | Generate a new token from the GitHub runners page (tokens expire in 1 hour) |
