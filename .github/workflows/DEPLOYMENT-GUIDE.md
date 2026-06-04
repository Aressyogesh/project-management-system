# PMS On-Premise Deployment Guide

## Overview

The on-premise server uses a **self-hosted GitHub Actions runner** to automatically build and deploy the PMS application whenever code is pushed to `main`.

| Component | Location |
|-----------|----------|
| Runner machine | DEVLOPMNET (Windows 11) |
| Runner directory | `D:\Git\actions-runner` |
| Backend dist | `D:\Git\actions-runner\_work\project-management-system\project-management-system\backend\dist\src\main.js` |
| Frontend static files | `D:\pms-frontend` |
| Local database | `postgresql://postgres:postgres@localhost:5432/pms_db` |
| Backend port | 3000 |
| Frontend port | 5173 |

---

## Runner Management

The runner must be **running at all times** to pick up workflow jobs. If it is stopped, workflow jobs will stay queued indefinitely.

### Install as Windows Service (recommended — run once as Administrator)

```powershell
cd D:\Git\actions-runner
.\svc.ps1 install
.\svc.ps1 start
```

### Service commands

```powershell
cd D:\Git\actions-runner
.\svc.ps1 status    # check status
.\svc.ps1 start     # start
.\svc.ps1 stop      # stop
.\svc.ps1 uninstall # remove service
```

### Run interactively (temporary — closes when window closes)

```cmd
cd D:\Git\actions-runner\bin
Runner.Listener.exe run
```

### Re-register runner (if credentials expire)

Get a new token from **GitHub → repo → Settings → Actions → Runners → New self-hosted runner**, then:

```cmd
cd D:\Git\actions-runner
config.cmd --url https://github.com/Aressyogesh/project-management-system --token <new-token> --replace
```

---

## Workflow — What It Does

**Trigger:** Every push to `main` (also manual via GitHub → Actions → Run workflow)

**Job 1 — Test gate** (runs on every push and PR):
1. Stops PM2 processes
2. Checks out code
3. Installs backend dependencies
4. Runs unit tests

**Job 2 — Deploy** (runs only on push to `main`, requires Job 1 to pass):
1. Stops PM2 processes
2. Checks out code
3. Installs backend dependencies
4. Generates Prisma client
5. Runs database migrations (`prisma migrate deploy`)
6. Builds backend
7. Starts backend via PM2
8. Installs frontend dependencies
9. Builds frontend
10. Copies frontend dist to `D:\pms-frontend`
11. Starts frontend via PM2 ecosystem config (port 5173)
12. Health checks backend at `http://localhost:3000/api/v1/health`

---

## GitHub Secrets Required

Configure at **GitHub → repo → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/pms_db` |
| `DIRECT_URL` | `postgresql://postgres:postgres@localhost:5432/pms_db` |
| `JWT_SECRET` | `pms-local-jwt-secret-2026` |
| `JWT_REFRESH_SECRET` | `pms-local-refresh-secret-2026` |
| `VITE_API_BASE_URL` | `http://localhost:3000` |

---

## PM2 Process Management

### Check status

```cmd
pm2 list
pm2 logs pms-backend --lines 30
pm2 logs pms-frontend --lines 30
pm2 logs pms-backend --err --lines 30
```

### Restart processes

```cmd
pm2 restart pms-backend
pm2 restart pms-frontend
```

### Manual start (if PM2 has no saved processes)

```cmd
pm2 start "D:\Git\actions-runner\_work\project-management-system\project-management-system\backend\dist\src\main.js" --name pms-backend
```

For frontend, create ecosystem config first:

```cmd
powershell -Command "$c='module.exports={apps:[{name:\"pms-backend\",script:\"D:/Git/actions-runner/_work/project-management-system/project-management-system/backend/dist/src/main.js\",cwd:\"D:/Git/actions-runner/_work/project-management-system/project-management-system/backend\"},{name:\"pms-frontend\",script:\"C:/Users/user/AppData/Roaming/npm/node_modules/serve/build/main.js\",args:\"-s D:/pms-frontend -l 5173\",cwd:\"D:/\"}]};'; $c | Out-File D:/pms-apps.config.js -Encoding ASCII"
pm2 start D:\pms-apps.config.js
pm2 save
```

### Restore saved processes after reboot

```cmd
pm2 resurrect
```

---

## Database

### Run migrations manually

```cmd
cd D:\Git\actions-runner\_work\project-management-system\project-management-system\backend
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pms_db
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/pms_db
npx prisma migrate deploy
```

### Sync full schema (if tables are missing)

```cmd
npx prisma db push --accept-data-loss
```

### Seed initial data (pgAdmin SQL)

```sql
-- Departments
INSERT INTO departments (id, name, "isActive", "createdAt", "updatedAt")
VALUES
  ('2f7f293a-52bf-4773-9e9f-23795b4247b5', 'Development', true,  NOW(), NOW()),
  ('c9a662fa-7c65-4979-a2bf-a6864626e4ec', 'QA',          false, NOW(), NOW()),
  ('17a2cb5c-f00d-45af-8160-dbc45e44fb48', 'Design',      true,  NOW(), NOW()),
  ('d8c3ecfd-564e-4a99-a2be-a605e60fb09e', 'Mobile',      true,  NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Shifts
INSERT INTO shifts (id, name, "shiftType", "startTime", "endTime", "workHours", "isActive", "createdAt", "updatedAt")
VALUES
  ('621a1dd7-89da-4cf2-a4b3-ec1b6dc2e5a1', 'Day',       'DAY'::"ShiftType",       '10:00', '19:00', 8, true, NOW(), NOW()),
  ('4091d0d1-6c46-47dd-9796-ea1df9281794', 'Afternoon', 'AFTERNOON'::"ShiftType", '15:00', '00:00', 8, true, NOW(), NOW()),
  ('839cfba4-c284-42b5-a28e-470837f83b41', 'Night',     'NIGHT'::"ShiftType",     '23:00', '08:00', 8, true, NOW(), NOW())
ON CONFLICT ("shiftType") DO NOTHING;

-- Company Settings & Portal Config
INSERT INTO company_settings (id, "companyName", country, timezone, "backDateLogValue", "backDateLogUnit", "emailDomains", "updatedAt")
VALUES ('singleton', 'Aress', 'India', 'Asia/Kolkata', 8, 'Days', '{}', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO portal_config (id, "dateFormat", "timeFormat", "taskDurationIn", "firstDayOfWeek", "businessHoursStart", "businessHoursStartPeriod", "businessHoursEnd", "businessHoursEndPeriod", "workingDays", "updatedAt")
VALUES ('singleton', 'DD-MM-YYYY', '24', 'hours', 'Monday', '10:00', 'AM', '07:00', 'PM', '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}', NOW())
ON CONFLICT (id) DO NOTHING;
```

Superadmin login: `superadmin@aress.com` — see user seed SQL in project history for full user list.

---

## Common Issues & Fixes

### Workflow job stays queued
Runner is not running. Start it:
```powershell
cd D:\Git\actions-runner
.\svc.ps1 start
```

### ERR_CONNECTION_REFUSED on localhost:5173
Frontend is down. Check and restart:
```cmd
pm2 list
pm2 restart pms-frontend
netstat -ano | findstr ":5173"
```

### Backend EADDRINUSE crash loop (port 3000 conflict)
Something else is on port 3000 (often the frontend serve process). Find and kill it:
```cmd
netstat -ano | findstr ":3000"
taskkill /PID <pid> /F
pm2 restart pms-backend
```

### 401 Unauthorized after backend restart
JWT token in browser is stale. Log out and log back in to get a fresh token.

### 500 errors — table does not exist
Run schema sync:
```cmd
cd D:\Git\actions-runner\_work\project-management-system\project-management-system\backend
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pms_db
set DIRECT_URL=postgresql://postgres:postgres@localhost:5432/pms_db
npx prisma db push --accept-data-loss
pm2 restart pms-backend
```

### Runner credentials expired
Re-register using a new token from GitHub → repo → Settings → Actions → Runners.

---

## Quick Health Check

```cmd
pm2 list
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5173"
```

Expected:
- `pms-backend` → online, low restarts
- `pms-frontend` → online, low restarts
- Port 3000 → LISTENING
- Port 5173 → LISTENING

URLs:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/v1/health`
- Swagger docs: `http://localhost:3000/api`
