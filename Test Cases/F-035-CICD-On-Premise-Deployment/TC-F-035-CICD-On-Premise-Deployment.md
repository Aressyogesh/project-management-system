# E2E Test Cases — F-035 CI/CD On-Premise Deployment

**Feature ID:** F-035  
**Date:** 2026-06-03  

---

## TC-035-01 — Push to main triggers workflow automatically

**AC:** AC-1  
**Given:** Self-hosted runner is online and registered; `deploy-local.yml` is on `main`  
**When:** A commit is pushed to `main`  
**Then:** GitHub Actions shows the `Deploy to Local Server` workflow triggered automatically within 30 seconds

---

## TC-035-02 — Test failure prevents deploy

**AC:** AC-2  
**Given:** A commit is pushed to `main` that intentionally breaks a unit test  
**When:** The `test` job runs  
**Then:** The `test` job fails; the `deploy` job shows **Skipped**; no PM2 restart occurs

---

## TC-035-03 — Health check returns 200 after deploy

**AC:** AC-3  
**Given:** A successful deploy has completed  
**When:** `GET http://localhost:3000/api/v1/health` is called  
**Then:** HTTP 200 with body `{ "status": "ok", "timestamp": "<ISO string>", "uptime": <number> }`

---

## TC-035-04 — PM2 shows both processes online after deploy

**AC:** AC-4  
**Given:** A successful deploy has completed  
**When:** `pm2 list` is run on the local machine  
**Then:** Both `pms-backend` (port 3000) and `pms-frontend` (port 5173) show status **online**

---

## TC-035-05 — Migration runs idempotently on redeploy

**AC:** AC-5  
**Given:** The database is already at the latest schema version  
**When:** A deploy is triggered (pushing any commit to `main`)  
**Then:** The `Run Prisma migrations` step completes with exit code 0 and "No pending migrations" or similar; no error is thrown

---

## TC-035-06 — Manual workflow dispatch triggers deploy

**AC:** AC-6  
**Given:** The runner is online  
**When:** The user clicks **Run workflow** on the GitHub Actions UI for `Deploy to Local Server`  
**Then:** The full pipeline (test → deploy → health check) runs successfully

---

## TC-035-07 — Secrets are not visible in workflow logs

**AC:** AC-7  
**Given:** A deploy has completed  
**When:** The workflow run logs are opened in GitHub Actions  
**Then:** No raw database URLs or API base URLs appear in any step output; only `***` masked values are visible

---

## TC-035-08 — Health check retries on slow start

**AC:** AC-9  
**Given:** The backend takes longer than 5 seconds to start after `pm2 restart`  
**When:** The health check step runs  
**Then:** The step retries up to 3 times; if the backend is up by the third attempt, the step passes

---

## TC-035-09 — Deployment summary shows PM2 list

**AC:** AC-10  
**Given:** A successful deploy has completed  
**When:** The `Deployment summary` step runs  
**Then:** The step output includes `pm2 list` output showing `pms-backend` and `pms-frontend` both online

---

## TC-035-10 — Setup guide is complete and accurate

**AC:** AC-8  
**Given:** A fresh Windows machine with Node.js 18+ and PostgreSQL installed  
**When:** The SETUP.md guide is followed step by step  
**Then:** The self-hosted runner registers successfully; the first deploy completes; the app is accessible at `http://localhost:5173`

