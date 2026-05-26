# E2E Test Cases — F-012: Task Attachments & Comments

**Feature:** F-012  
**Date:** 2026-05-26

| ID | Scenario | Role | Steps | Expected |
|----|----------|------|-------|----------|
| TC-F-012-001 | Upload attachment to task | ADMIN | POST /tasks/:id/attachments with valid PDF | 201; attachment record created; file saved on disk |
| TC-F-012-002 | Upload rejected — unsupported file type | ADMIN | POST with .exe file | 400 Bad Request |
| TC-F-012-003 | Upload rejected — file exceeds 10 MB | ADMIN | POST with 11 MB file | 400/413 |
| TC-F-012-004 | List attachments for a task | Any | GET /tasks/:id/attachments | 200; returns array with originalName, size, uploader |
| TC-F-012-005 | Download attachment | Any | GET /attachments/:id/download | 200; Content-Disposition header present; file streams |
| TC-F-012-006 | Delete attachment | ADMIN | DELETE /attachments/:id | 204; record removed from DB; file removed from disk |
| TC-F-012-007 | Add comment to task | EMPLOYEE | POST /tasks/:id/comments with content | 201; authorId taken from JWT |
| TC-F-012-008 | List comments ordered oldest-first | Any | GET /tasks/:id/comments after multiple posts | 200; array sorted by createdAt ascending |
| TC-F-012-009 | Author deletes own comment | EMPLOYEE | DELETE /comments/:id (own comment) | 204; comment removed |
| TC-F-012-010 | EMPLOYEE cannot delete another user's comment | EMPLOYEE | DELETE /comments/:id (other author) | 403 Forbidden |
