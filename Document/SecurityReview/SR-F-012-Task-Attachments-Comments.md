# Security Review — F-012: Task Attachments & Comments

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-05-26  
**Branch:** feature/F-012-task-attachments-comments  
**Status:** APPROVED

---

## Threat Model

| Asset | Risk |
|-------|------|
| Uploaded files | Malicious file upload (executable, script, oversized) |
| File download | Unauthorized access to attachment files |
| Comment content | XSS via user-supplied text |
| `authorId` | Creator spoofing via request body |
| Comment delete | Unauthorized deletion of another user's comment |
| Disk storage | Path traversal in filename |

---

## Authentication & Authorization

| Check | Result |
|-------|--------|
| All endpoints require JWT (`@UseGuards(JwtAuthGuard)`) | PASS |
| Upload and delete attachment gated to SUPER_USER / ADMIN | PASS |
| List attachments and download open to all authenticated users | PASS |
| Comment create open to all authenticated users | PASS |
| Comment delete: author or SUPER_USER/ADMIN only | PASS |
| EMPLOYEE deleting another user's comment → 403 Forbidden | PASS |

---

## File Upload Security

| Check | Result |
|-------|--------|
| MIME type allowlist (7 types) enforced in `fileFilter` | PASS |
| Max file size 10 MB enforced by Multer `limits` | PASS |
| Filename on disk is `crypto.randomUUID() + ext` — no user input in path | PASS |
| Path traversal via `originalname`: only extension used in stored filename | PASS |
| Upload directory created with `{ recursive: true }` — cannot be set by caller | PASS |
| Serving: `res.download(filePath, attachment.originalName)` — path built server-side from DB record | PASS |

---

## Input Validation

| Field | Validation | Result |
|-------|-----------|--------|
| `file` (upload) | MIME allowlist + 10 MB size limit via Multer | PASS |
| `content` (comment) | `@IsNotEmpty`, `@MaxLength(2000)` | PASS |
| `taskId` (path param) | UUID string; task existence verified before create | PASS |
| `id` (path param) | Record existence verified via `findOne` before action | PASS |

---

## Injection & Data Safety

**SQL Injection:** Prisma parameterised queries — not vulnerable.

**XSS:** React escapes all interpolated content (`att.originalName`, `c.content`, `c.author.fullName`). `whitespace-pre-wrap` on comment body does not render HTML.

**Path Traversal:** Stored filename is UUID-generated server-side; `originalName` is only used in the `Content-Disposition` response header (handled by `res.download`) — not in the filesystem path.

**Creator spoofing:** `authorId` (comment) and `uploadedById` (attachment) are always taken from `req.user.id` (JWT); no body fields accepted for these.

---

## Cascade Behaviour

- Both `TaskAttachment` and `TaskComment` have `onDelete: Cascade` on the task FK — cleaned up automatically when a task is deleted.
- `uploadedBy` and `author` FKs default to `RESTRICT` — prevents deleting a user who has attachments or comments (deactivation preferred).

---

## Issues Found

None.

---

## Verdict

**APPROVED — No security issues identified.**
