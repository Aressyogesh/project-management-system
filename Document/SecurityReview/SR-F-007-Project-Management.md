# Security Review — F-007: Project Management

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-007-project-management  
**Status:** APPROVED

---

## Threat Model

| Asset | Risk |
|-------|------|
| Project records (name, budget, dates) | Unauthorized read, unauthorized write |
| Project status transitions | Unauthorized archive/restore |
| Decimal budget field | Numeric injection, overflow |
| Date fields (startDate, endDate) | Invalid date strings, logic bypass |

---

## Authentication & Authorization

| Check | Result |
|-------|--------|
| All endpoints require JWT (`JwtAuthGuard` global) | PASS |
| Read endpoints (`GET /projects*`) open to any authenticated user | PASS — appropriate; all staff may view projects |
| Write endpoints (`POST`, `PATCH`) require `SUPER_USER` or `ADMIN` | PASS |
| Status-change endpoint (`PATCH /:id/status`) also role-gated | PASS |
| Frontend `canEdit` hides edit/archive UI for non-admin roles | PASS — defence in depth |

---

## Input Validation

| Field | Validation | Result |
|-------|-----------|--------|
| `name` | `@IsString`, `@IsNotEmpty`, `@MaxLength(200)` | PASS |
| `projectType` | `@IsEnum(ProjectType)` — rejects unknown values | PASS |
| `clientId` / `departmentId` | `@IsOptional`, `@IsUUID` — rejects malformed IDs | PASS |
| `description` | `@IsString`, `@MaxLength(1000)` | PASS |
| `startDate` / `endDate` | `@IsDateString` — rejects non-ISO strings | PASS |
| `budget` | `@IsNumber`, `@IsPositive`, `@Transform(Number)` — rejects negatives and strings | PASS |
| Date logic | Service throws `BadRequestException` when `endDate < startDate` | PASS |
| Query params (`status`, `type`) | `@IsEnum` — rejects arbitrary filter values | PASS |

---

## Injection & Data Safety

**SQL Injection:** Prisma uses parameterised queries for all operations — not vulnerable.

**XSS:** React escapes all interpolated values. No `dangerouslySetInnerHTML` used.

**Budget precision:** Prisma maps budget to `Decimal(12,2)` — no float precision issues stored; API receives a JS number which Prisma safely coerces.

**UUID validation on FK fields:** `@IsUUID` on `clientId` and `departmentId` prevents path-traversal style IDs.

---

## Data Exposure

- `PROJECT_SELECT` constant restricts response to business fields only — `updatedAt` is excluded.
- `client` and `department` selections return only `{ id, name }` — no sensitive client/department fields leak.
- `budget` is stored as `Decimal` and serialised as a string — no float rounding in responses.

---

## Business Logic

- `getSummary()` computes `overdue` server-side using `endDate < now` — not manipulable by client input.
- `setStatus` is a discrete endpoint — status cannot be set via the generic PATCH, preventing accidental mass-update.

---

## Issues Found

None.

---

## Verdict

**APPROVED — No security issues identified.**
