# Code Review — F-005: Department Management

**Reviewer:** Claude Code (AI-assisted)
**Date:** 2026-05-26
**Branch:** feature/F-005-department-management
**Status:** ✅ Approved

---

## Summary

F-005 introduces full Department Management CRUD — NestJS backend module, Prisma schema extension, and React frontend page. Departments are now dynamic (no seeded data); they are created and managed entirely through the UI.

---

## Files Reviewed

| File | Change Type | Verdict |
|---|---|---|
| `backend/prisma/schema.prisma` | Modified | ✅ Pass |
| `backend/prisma/seed.ts` | Modified | ✅ Pass |
| `backend/src/departments/dto/department.dto.ts` | New | ✅ Pass |
| `backend/src/departments/departments.service.ts` | Modified | ✅ Pass |
| `backend/src/departments/departments.controller.ts` | Modified | ✅ Pass |
| `backend/src/departments/__tests__/departments.service.spec.ts` | New | ✅ Pass |
| `backend/src/app.module.ts` | Modified | ✅ Pass |
| `frontend/src/api/departments.api.ts` | Modified | ✅ Pass |
| `frontend/src/features/departments/pages/DepartmentsPage.tsx` | New | ✅ Pass |
| `frontend/src/features/departments/__tests__/DepartmentsPage.test.tsx` | New | ✅ Pass |
| `frontend/src/App.tsx` | Modified | ✅ Pass |

---

## Backend Review

### Schema (Prisma)

- `Department` model uses `@unique` on `name` — enforced at DB level.
- `@db.VarChar(100)` cap matches DTO `maxLength` validation.
- Soft-delete pattern via `isActive` Boolean is consistent with User and Shift models.
- FK `departmentId` on User is nullable — correct for backward compatibility.

### DTO Validation

- `CreateDepartmentDto.name`: `@IsString`, `@IsNotEmpty`, `@MaxLength(100)` — covers all error cases.
- `SetDepartmentStatusDto.isActive`: `@IsBoolean` prevents type coercion attacks.
- `UpdateDepartmentDto` uses `PartialType` — consistent with project convention.

### Service

- Case-insensitive duplicate check (`mode: 'insensitive'`) prevents "Digital" vs "digital" duplicates.
- `name.trim()` applied before save — prevents whitespace-only names passing validation.
- Duplicate check on update excludes the record being updated (`NOT: { id }`) — correct.
- `DEPT_SELECT` constant limits response fields — no sensitive data leakage.
- All mutations check existence first and throw typed NestJS exceptions.

### Controller

- `@Roles(SystemRole.SUPER_USER, SystemRole.ADMIN)` at class level — all endpoints protected.
- `@ApiBearerAuth()` on controller — Swagger correctly shows auth requirement.
- `includeInactive === 'true'` string comparison — correct for query-string coercion.
- `@HttpCode(200)` on PATCH status endpoint — consistent REST convention.

---

## Frontend Review

### DepartmentsPage

- `departmentsApi.list(true)` correctly passes `includeInactive: true` — admin sees all departments.
- Inline `DepartmentFormModal` keeps component file self-contained and avoids unnecessary abstraction.
- `statusMutation.isPending` disables toggle button during in-flight request — prevents double-fire.
- `qc.invalidateQueries({ queryKey: ['departments-all'] })` on success — cache stays fresh.
- Empty state rendering is correct and provides clear CTA.

### API Client

- `departmentsApi` uses `apiClient` (not `client`) — consistent with fixed import convention.
- `includeInactive` param only appended when `true` — no unnecessary query params.

---

## Issues Found

| # | Severity | Description | Resolution |
|---|---|---|---|
| 1 | Low | No loading indicator on status toggle button | Acceptable; `isPending` disables button |
| 2 | Info | No delete (hard) endpoint | Per requirements — soft-delete only via status toggle |

---

## Conclusion

All critical paths are covered. Code follows established patterns. **Approved for merge.**
