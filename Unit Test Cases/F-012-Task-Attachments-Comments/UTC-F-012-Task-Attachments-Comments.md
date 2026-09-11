# Unit Test Cases — F-012: Task Attachments & Comments

**Feature:** F-012  
**Date:** 2026-05-26

---

## Backend — TaskAttachmentsService

| ID | Test Name | Method | Expected |
|----|-----------|--------|----------|
| UTC-F-012-B-001 | UploadAttachment_ValidFile_ReturnsAttachment | `create()` | Returns attachment record with correct metadata |
| UTC-F-012-B-002 | UploadAttachment_TaskNotFound_ThrowsNotFound | `create()` | NotFoundException; DB create never called |
| UTC-F-012-B-003 | ListAttachments_ValidTask_ReturnsList | `findAll()` | Returns array with correct originalName |
| UTC-F-012-B-004 | DownloadAttachment_ValidId_ReturnsAttachment | `findOne()` | Returns attachment with filename |
| UTC-F-012-B-005 | DownloadAttachment_NotFound_ThrowsNotFound | `findOne()` | NotFoundException |
| UTC-F-012-B-006 | DeleteAttachment_ValidId_RemovesRecord | `remove()` | Prisma delete called once; fs.unlink called |

---

## Backend — TaskCommentsService

| ID | Test Name | Method | Expected |
|----|-----------|--------|----------|
| UTC-F-012-B-007 | CreateComment_ValidData_ReturnsComment | `create()` | Returns comment with content and author |
| UTC-F-012-B-008 | CreateComment_TaskNotFound_ThrowsNotFound | `create()` | NotFoundException; DB create never called |
| UTC-F-012-B-009 | ListComments_ValidTask_ReturnsList | `findAll()` | Returns array ordered by createdAt |
| UTC-F-012-B-010 | DeleteComment_Author_DeletesComment | `remove()` | Prisma delete called when requestingUserId === authorId |
| UTC-F-012-B-011 | DeleteComment_Admin_DeletesComment | `remove()` | Prisma delete called when role is ADMIN |
| UTC-F-012-B-012 | DeleteComment_UnauthorizedUser_ThrowsForbidden | `remove()` | ForbiddenException; delete never called |

---

## Frontend — TaskDetailModal

| ID | Test Name | Component | Expected |
|----|-----------|-----------|----------|
| UTC-F-012-FE-001 | TaskDetail_DetailsTab_ShowsTaskInfo | `TaskDetailModal` | Task title and "Status" / "Priority" labels visible |
| UTC-F-012-FE-002 | TaskDetail_AttachmentsTab_ShowsAttachmentsList | `TaskDetailModal` | After clicking Attachments tab, attachment filename rendered |
| UTC-F-012-FE-003 | TaskDetail_CommentsTab_ShowsCommentsList | `TaskDetailModal` | After clicking Comments tab, comment content rendered |
| UTC-F-012-FE-004 | TaskDetail_AdminRole_ShowsUploadButton | `TaskDetailModal` | Upload File button visible for ADMIN |
| UTC-F-012-FE-005 | TaskDetail_EmployeeRole_HidesUploadButton | `TaskDetailModal` | Upload File button absent for EMPLOYEE (canEdit=false) |
