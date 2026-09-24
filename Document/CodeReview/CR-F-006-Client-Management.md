# Code Review — F-006: Client Management

**Reviewer:** Claude Code (AI-assisted)
**Date:** 2026-05-26
**Branch:** feature/F-006-client-management
**Status:** ✅ Approved

---

## Summary

F-006 introduces full Client Management CRUD — NestJS ClientsModule, Prisma Client model, and React ClientsPage. Follows the same patterns established in F-005 (Department Management). No seeded clients — fully dynamic via admin UI.

---

## Files Reviewed

| File | Change Type | Verdict |
|---|---|---|
| `backend/prisma/schema.prisma` | Modified — Client model added | ✅ Pass |
| `backend/src/clients/dto/client.dto.ts` | New | ✅ Pass |
| `backend/src/clients/clients.service.ts` | New | ✅ Pass |
| `backend/src/clients/clients.controller.ts` | New | ✅ Pass |
| `backend/src/clients/clients.module.ts` | New | ✅ Pass |
| `backend/src/clients/__tests__/clients.service.spec.ts` | New — 7 tests | ✅ Pass |
| `backend/src/app.module.ts` | Modified — ClientsModule added | ✅ Pass |
| `frontend/src/api/clients.api.ts` | New | ✅ Pass |
| `frontend/src/types/clients.types.ts` | New | ✅ Pass |
| `frontend/src/features/clients/pages/ClientsPage.tsx` | New | ✅ Pass |
| `frontend/src/features/clients/__tests__/ClientsPage.test.tsx` | New — 5 tests | ✅ Pass |
| `frontend/src/App.tsx` | Modified — /clients route wired | ✅ Pass |

---

## Backend Review

### Schema
- `Client` model uses `@unique` on `name` — DB-level enforcement.
- `contactPerson` and `email` required; `phone` and `address` optional (nullable).
- `@db.VarChar` lengths match DTO `@MaxLength` validation — consistent.
- No relations yet (projects will reference clients in Phase 4).

### DTOs
- `CreateClientDto` has `@IsEmail` on email — correct format validation.
- `SetClientStatusDto` uses `@IsBoolean` — prevents type coercion.
- `UpdateClientDto` extends `PartialType(CreateClientDto)` — consistent project pattern.

### Service
- Case-insensitive duplicate name check using `mode: 'insensitive'` — consistent with departments.
- `name.trim()` applied before comparison and persistence.
- Duplicate check on update excludes self via `NOT: { id }`.
- `CLIENT_SELECT` constant prevents accidental field leakage.
- All operations check existence before update, throwing typed NestJS exceptions.

### Controller
- `@Roles` at class level — all 4 endpoints protected by a single decorator.
- `@HttpCode(200)` on PATCH status endpoint — correct.

---

## Frontend Review

### ClientsPage
- Form state managed locally with a typed `FormState` interface — clean.
- Optional fields (`phone`, `address`) send `undefined` when empty — no empty strings stored.
- `statusMutation.isPending` disables toggle button — prevents double-fire.
- Address shown as sub-label under client name — good use of table real estate.
- `phone ?? '—'` renders a dash for null phone — correct.
- React Query cache invalidated on every mutation — UI stays fresh.

---

## Issues Found

| # | Severity | Description | Resolution |
|---|---|---|---|
| 1 | Info | No pagination on client list | Acceptable at this scale; add when client count grows |
| 2 | Info | Phone displayed in table but address is sub-label | Design choice; consistent with compact layout |

---

## Conclusion

All patterns are consistent with F-005. No critical or high issues. **Approved for merge.**
