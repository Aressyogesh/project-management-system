# Code Review — [Feature ID]: [Feature Name]

**Reviewer:**  
**Date:**  
**Branch:**  
**PR / Commit:**  
**Scope (files reviewed):**

```
backend/src/...
frontend/src/...
```

---

## 1. Naming & Readability

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1.1 | Functions/methods named as verb-noun (e.g. `getShifts`, `createHoliday`) | | |
| 1.2 | Variables and constants have meaningful, self-documenting names | | |
| 1.3 | No magic numbers — literals extracted to named constants | | |
| 1.4 | Components/classes are single-responsibility | | |
| 1.5 | Files grouped by feature, not by type | | |

---

## 2. Code Quality (SOLID / DRY / KISS)

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 2.1 | No duplicated logic — DRY applied where it adds clarity | | |
| 2.2 | Single Responsibility — each function/class has one reason to change | | |
| 2.3 | Open/Closed — new behaviour added by extension, not mutation of existing code | | |
| 2.4 | No unnecessary abstractions — three similar lines beats a premature helper | | |
| 2.5 | Functions are short (< 30 lines is a guideline, not a rule) | | |
| 2.6 | No dead code, commented-out blocks, or TODO left in | | |

---

## 3. Type Safety

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 3.1 | `tsc --noEmit` exits clean (no type errors) | | |
| 3.2 | No untyped `any` in new code (acceptable only with justification comment) | | |
| 3.3 | DTOs/interfaces declared and used consistently | | |
| 3.4 | Prisma/library return types used, not re-declared | | |
| 3.5 | Enums used for finite sets (e.g. `ShiftType`, `SystemRole`) | | |

---

## 4. Error Handling

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 4.1 | All error paths return appropriate HTTP status (400/404/409/500) | | |
| 4.2 | Error messages are user-friendly and do not leak stack traces | | |
| 4.3 | Frontend shows error state (not silent failure) | | |
| 4.4 | Loading states handled (skeleton / spinner) | | |
| 4.5 | Mutations have `onError` handlers where user feedback is needed | | |

---

## 5. API Design

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 5.1 | RESTful routes follow `GET /resource`, `POST /resource`, `PUT /resource/:id`, `DELETE /resource/:id` | | |
| 5.2 | Correct HTTP verbs and status codes used | | |
| 5.3 | `@Roles()` guard applied to mutating endpoints | | |
| 5.4 | Swagger `@ApiOperation`, `@ApiTags`, `@ApiBearerAuth` present | | |
| 5.5 | Query params validated / parsed before use | | |

---

## 6. Testing

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 6.1 | Happy path covered by unit tests | | |
| 6.2 | Error / edge cases covered (not found, conflict, empty list) | | |
| 6.3 | Tests are isolated — no real DB or network calls | | |
| 6.4 | Test names follow `Unit_Condition_ExpectedOutcome` convention | | |
| 6.5 | All tests pass (`npm test` / `vitest run`) | | |

---

## 7. Style & Linting

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 7.1 | Consistent indentation (2-space) | | |
| 7.2 | No unused imports | | |
| 7.3 | No `console.log` in production code | | |
| 7.4 | Prettier formatting applied | | |
| 7.5 | Max one blank line between blocks | | |

---

## 8. Summary

### Verdict
- [ ] **Approved** — ready to merge
- [ ] **Approved with minor comments** — merge after addressing notes
- [ ] **Needs changes** — blocking issues listed below

### Blocking Issues
> List any issues that must be fixed before merge. Leave blank if none.

| # | File | Line | Issue | Fix Required |
|---|------|------|-------|--------------|
| | | | | |

### Non-Blocking Observations
> Suggestions, style notes, or improvements for future iterations.

-
-

---

*Status values: **PASS** / **FAIL** / **N/A** / **NOTE***
