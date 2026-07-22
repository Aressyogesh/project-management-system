# Unit Test Cases — F-035 CI/CD On-Premise Deployment

**Feature ID:** F-035  
**Date:** 2026-06-03  

> F-035 is a DevOps / infrastructure feature with no new service or controller code. Unit test coverage focuses on the one new/modified code path: the health check endpoint (`GET /api/v1/health`).

---

## UTC-035-01 — Health endpoint returns status ok

**Layer:** Controller  
**Arrange:** Mount `AppController` (or `HealthController`) with no dependencies  
**Act:** Call `getHealth()`  
**Assert:** Returns `{ status: 'ok' }` with an ISO timestamp and numeric uptime

---

## UTC-035-02 — Health endpoint uptime is a positive number

**Layer:** Controller  
**Arrange:** Mount health controller; record `process.uptime()` before call  
**Act:** Call `getHealth()`  
**Assert:** `response.uptime` is a number greater than 0

---

## UTC-035-03 — Health endpoint timestamp is a valid ISO 8601 string

**Layer:** Controller  
**Arrange:** Mock `Date.now()` to a known value  
**Act:** Call `getHealth()`  
**Assert:** `new Date(response.timestamp).toISOString()` equals the mocked date string

---

## UTC-035-04 — GET /api/v1/health returns HTTP 200

**Layer:** E2E-unit (supertest)  
**Arrange:** Bootstrap NestJS test app  
**Act:** `GET /api/v1/health`  
**Assert:** Status code 200; body contains `status: 'ok'`

---

## UTC-035-05 — Health endpoint is public (no JWT required)

**Layer:** Controller  
**Arrange:** Make request without Authorization header  
**Act:** `GET /api/v1/health`  
**Assert:** Returns 200 (not 401); confirms `@Public()` decorator is applied

---

## UTC-035-06 — Workflow YAML is valid (schema check)

**Layer:** CI config  
**Arrange:** Load `.github/workflows/deploy-local.yml` as text  
**Act:** Parse with `js-yaml`  
**Assert:** Parses without error; contains keys `on`, `jobs`; `jobs.deploy.runs-on` equals `'self-hosted'`

---

## UTC-035-07 — Workflow has test job before deploy job

**Layer:** CI config  
**Arrange:** Parse `deploy-local.yml`  
**Act:** Inspect `jobs` keys  
**Assert:** `jobs.test` exists; `jobs.deploy.needs` includes `'test'`

---

## UTC-035-08 — Workflow secrets are not hard-coded

**Layer:** CI config  
**Arrange:** Read `deploy-local.yml` as raw text  
**Act:** Search for patterns matching PostgreSQL connection strings or localhost URLs  
**Assert:** No hard-coded `postgresql://` or `localhost:3000` strings appear; only `${{ secrets.* }}` references

