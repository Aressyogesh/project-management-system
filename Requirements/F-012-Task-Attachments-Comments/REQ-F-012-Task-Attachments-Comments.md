# Requirements — F-012: Task Attachments & Comments

**Feature ID:** F-012  
**Phase:** 5  
**Branch:** feature/F-012-task-attachments-comments  
**Date:** 2026-05-26

---

## User Stories

**US-F-012-01:** As a project member, I want to upload files to a task so that I can share relevant documents with my team.

**US-F-012-02:** As a project member, I want to download attachments from a task so that I can access shared files.

**US-F-012-03:** As an admin, I want to delete attachments from a task so that I can remove outdated or incorrect files.

**US-F-012-04:** As any authenticated user, I want to add comments to a task so that I can communicate status or feedback on the task.

**US-F-012-05:** As any authenticated user, I want to read all comments on a task so that I can follow the task discussion.

**US-F-012-06:** As a user, I want to delete my own comment (or as an admin delete any comment) so that I can correct mistakes.

---

## Acceptance Criteria

### Attachments

| ID | Criterion |
|----|-----------|
| AC-F-012-01 | `POST /tasks/:taskId/attachments` accepts a `multipart/form-data` upload with field name `file` |
| AC-F-012-02 | Only SUPER_USER and ADMIN may upload or delete attachments |
| AC-F-012-03 | Allowed MIME types: PDF, DOCX, XLSX, PNG, JPEG, TXT, MP4 — other types return 400 |
| AC-F-012-04 | Maximum file size is 10 MB — larger files return 400/413 |
| AC-F-012-05 | Files are stored on disk under `uploads/attachments/` with a UUID-based filename |
| AC-F-012-06 | `GET /tasks/:taskId/attachments` returns the list for all authenticated users |
| AC-F-012-07 | `GET /attachments/:id/download` streams the file with correct `Content-Disposition` |
| AC-F-012-08 | `DELETE /attachments/:id` removes both the DB record and the file from disk; returns 204 |
| AC-F-012-09 | Uploading to a non-existent task returns 404 |

### Comments

| ID | Criterion |
|----|-----------|
| AC-F-012-10 | Any authenticated user may post a comment (`POST /tasks/:taskId/comments`) |
| AC-F-012-11 | `content` is required, non-empty, max 2 000 characters |
| AC-F-012-12 | `authorId` is taken from the JWT payload — not from the request body |
| AC-F-012-13 | `GET /tasks/:taskId/comments` returns comments ordered oldest-first |
| AC-F-012-14 | `DELETE /comments/:id` succeeds for the comment's author; returns 204 |
| AC-F-012-15 | SUPER_USER and ADMIN may delete any comment |
| AC-F-012-16 | EMPLOYEE deleting another user's comment returns 403 |
| AC-F-012-17 | Commenting on a non-existent task returns 404 |

### Frontend

| ID | Criterion |
|----|-----------|
| AC-F-012-18 | Clicking a task title opens `TaskDetailModal` |
| AC-F-012-19 | `TaskDetailModal` has three tabs: Details, Attachments, Comments |
| AC-F-012-20 | Attachments tab shows upload button for ADMIN/SUPER_USER; hidden for EMPLOYEE |
| AC-F-012-21 | Each attachment shows filename, size, uploader and Download / Delete buttons |
| AC-F-012-22 | Comments tab shows existing comments with author and date |
| AC-F-012-23 | Any logged-in user can post a new comment via the textarea + Post button |

---

## Out of Scope

- Inline preview of images or PDFs
- Rich-text / markdown comment editor
- Comment editing (update)
- Attachment versioning
