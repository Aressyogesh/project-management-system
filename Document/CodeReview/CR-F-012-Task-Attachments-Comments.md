# Code Review — F-012: Task Attachments & Comments

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-012-task-attachments-comments  
**Status:** APPROVED

---

## Files Reviewed

| File | Type |
|------|------|
| `backend/prisma/schema.prisma` | Schema — TaskAttachment + TaskComment models |
| `backend/src/task-attachments/task-attachments.service.ts` | Business Logic |
| `backend/src/task-attachments/task-attachments.controller.ts` | HTTP Controller |
| `backend/src/task-attachments/task-attachments.module.ts` | Module |
| `backend/src/task-attachments/__tests__/task-attachments.service.spec.ts` | Unit Tests |
| `backend/src/task-comments/dto/create-task-comment.dto.ts` | DTO / Validation |
| `backend/src/task-comments/task-comments.service.ts` | Business Logic |
| `backend/src/task-comments/task-comments.controller.ts` | HTTP Controller |
| `backend/src/task-comments/task-comments.module.ts` | Module |
| `backend/src/task-comments/__tests__/task-comments.service.spec.ts` | Unit Tests |
| `frontend/src/types/taskAttachment.types.ts` | Types |
| `frontend/src/types/taskComment.types.ts` | Types |
| `frontend/src/api/taskAttachments.api.ts` | API Client |
| `frontend/src/api/taskComments.api.ts` | API Client |
| `frontend/src/features/projects/components/TaskDetailModal.tsx` | UI Component |
| `frontend/src/features/projects/__tests__/TaskDetailModal.test.tsx` | Frontend Tests |
| `frontend/src/features/projects/pages/ProjectDetailPage.tsx` | Page (extended) |

---

## Review Summary

### Schema

- `TaskAttachment`: cascade delete on task FK (attachment removed with task); RESTRICT on uploadedBy (prevents deleting a user who has uploaded files — deactivation preferred).
- `TaskComment`: cascade delete on task FK; RESTRICT on author FK; `updatedAt` tracked for future edit support.
- Named relations `"UploadedAttachments"` / `"AuthoredComments"` on User correctly disambiguate multiple FKs.
- Indexes on `taskId` in both tables — covers the primary `findMany` query pattern.

### Backend — Attachments

- `onModuleInit` creates `uploads/attachments/` directory with `{ recursive: true }` — idempotent on restart.
- `diskStorage` filename uses `crypto.randomUUID()` + original extension — collision-resistant, no dependency on `uuid` package.
- `fileFilter` validates MIME type against an allowlist of 7 types — unknown types rejected before writing to disk.
- `limits: { fileSize: 10MB }` enforced by Multer before the controller body runs.
- `remove` uses `{ code !== 'ENOENT' }` guard so delete is idempotent if the file is already gone.
- `findOne` used internally by both download and remove — single source of NotFoundException.
- `ATTACHMENT_SELECT` restricts response to minimal fields; `updatedAt` excluded from response.

### Backend — Comments

- `CreateTaskCommentDto`: `@IsString`, `@IsNotEmpty`, `@MaxLength(2000)` — matches DB column size.
- `authorId` taken from `req.user.id` (JWT) — no body field accepted; creator spoofing impossible.
- `remove` checks three conditions before deleting: author match, SUPER_USER, or ADMIN — clean ownership guard.
- `findAll` ordered `asc` by `createdAt` — natural chronological thread ordering.
- `COMMENT_SELECT` returns only `id`, `content`, `createdAt`, and `author` — no internal FK fields exposed.

### Frontend

**Types** — `TaskAttachment` and `TaskComment` match API response shapes exactly.

**API Clients**
- `taskAttachmentsApi.upload` sends `FormData` with `Content-Type: multipart/form-data` — correct for Multer.
- `taskAttachmentsApi.download` uses Axios `responseType: 'blob'`, creates an object URL, triggers browser download, then revokes URL — no memory leak.
- `taskCommentsApi.remove` sends DELETE to `/comments/:id` — correct flat route.

**TaskDetailModal**
- Three-tab layout: Details / Attachments / Comments — tab counts shown as badges when > 0.
- `fileRef` on hidden `<input type="file">` — upload triggered by "Upload File" button click; input value reset after selection to allow re-upload of the same file.
- `formatBytes` utility for human-readable file sizes.
- Comment delete visible only for comment author (`c.author.id === currentUserId`) or `canEdit` users.
- `addCommentMutation` button disabled when textarea is empty or mutation is pending — prevents double-submit.

**ProjectDetailPage**
- Task title changed to `<button>` that sets `selectedTask` — triggers `TaskDetailModal`.
- `currentUserId={user?.id ?? ''}` passed down from auth store — modal correctly determines delete ownership.

---

## Issues Found

None.

---

## Verdict

**APPROVED — Ready to merge.**
