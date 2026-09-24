# UTC-F-054-Manual-Announcements
# Unit Test Case Specifications

Feature ID   : F-054
Feature Name : Manual Announcements
Framework    : Jest (backend) + Vitest + React Testing Library (frontend)

---

## Backend Unit Tests

---

Unit Test ID : UTC-F054-B-001
Title        : AnnouncementsService_create_AdminRole_ReturnsCreatedAnnouncement
Layer        : Backend
Class / File : AnnouncementsService
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Mock PrismaService.announcement.create() → returns announcement object with createdBy user
  - Input: { title: "Team Meeting", content: "All hands on deck at 3pm" }, createdById: "user-uuid"

Act:
  - result = await announcementsService.create(dto, "user-uuid")

Assert:
  - result.title === "Team Meeting"
  - result.content === "All hands on deck at 3pm"
  - result.createdBy.id === "user-uuid"
  - prisma.announcement.create was called once with correct data

---

Unit Test ID : UTC-F054-B-002
Title        : AnnouncementsService_findAll_NoFilters_ReturnsPagedList
Layer        : Backend
Class / File : AnnouncementsService
AC Covered   : AC-2, AC-9
Framework    : Jest

Arrange:
  - Mock PrismaService.announcement.findMany() → returns array of 3 announcement objects
  - Mock PrismaService.announcement.count() → returns 3

Act:
  - result = await announcementsService.findAll({ page: 1, limit: 20 })

Assert:
  - result.data.length === 3
  - result.total === 3
  - result.page === 1
  - result.lastPage === 1
  - findMany called with orderBy: { createdAt: 'desc' }

---

Unit Test ID : UTC-F054-B-003
Title        : AnnouncementsService_findAll_LatestTrue_ReturnsThreeItems
Layer        : Backend
Class / File : AnnouncementsService
AC Covered   : AC-6
Framework    : Jest

Arrange:
  - Mock PrismaService.announcement.findMany() → returns array of 3 announcement objects
  - Mock PrismaService.announcement.count() → returns 10

Act:
  - result = await announcementsService.findAll({ latest: true })

Assert:
  - findMany called with take: 3
  - result.data.length === 3

---

Unit Test ID : UTC-F054-B-004
Title        : AnnouncementsService_remove_ExistingId_DeletesRecord
Layer        : Backend
Class / File : AnnouncementsService
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock PrismaService.announcement.findUnique() → returns announcement object
  - Mock PrismaService.announcement.delete() → returns deleted announcement

Act:
  - await announcementsService.remove("announcement-uuid")

Assert:
  - prisma.announcement.delete called once with { where: { id: "announcement-uuid" } }

---

Unit Test ID : UTC-F054-B-005
Title        : AnnouncementsService_remove_NonExistentId_ThrowsNotFoundException
Layer        : Backend
Class / File : AnnouncementsService
AC Covered   : AC-4
Framework    : Jest

Arrange:
  - Mock PrismaService.announcement.findUnique() → returns null

Act:
  - await announcementsService.remove("nonexistent-uuid")

Assert:
  - Throws NotFoundException with message "Announcement not found"

---

Unit Test ID : UTC-F054-B-006
Title        : AnnouncementsController_create_EmployeeRole_Returns403
Layer        : Backend
Class / File : AnnouncementsController (via guard metadata)
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - RolesGuard configured; request user has systemRole: EMPLOYEE
  - POST /announcements body: { title: "Test", content: "Content" }

Act:
  - guard.canActivate(context) where context.getHandler() = create

Assert:
  - canActivate returns false → controller returns 403

---

## Frontend Unit Tests

---

Unit Test ID : UTC-F054-F-001
Title        : AnnouncementsPage_AdminUser_ShowsAddButton
Layer        : Frontend
Class / File : AnnouncementsPage
AC Covered   : AC-1, AC-7
Framework    : Vitest + RTL

Arrange:
  - Mock useAuthStore → user with systemRole: "ADMIN"
  - Mock useQuery → returns empty announcements list

Act:
  - render(<AnnouncementsPage />)

Assert:
  - "Add Announcement" button is visible in the DOM
  - "Announcements" heading is visible

---

Unit Test ID : UTC-F054-F-002
Title        : AnnouncementsPage_EmployeeUser_HidesAddButton
Layer        : Frontend
Class / File : AnnouncementsPage
AC Covered   : AC-3
Framework    : Vitest + RTL

Arrange:
  - Mock useAuthStore → user with systemRole: "EMPLOYEE"
  - Mock useQuery → returns list of 2 announcements

Act:
  - render(<AnnouncementsPage />)

Assert:
  - "Add Announcement" button is NOT present in the DOM
  - Announcements list is still visible

---

Unit Test ID : UTC-F054-F-003
Title        : AnnouncementsPage_ListRendered_ShowsTitleAndAuthor
Layer        : Frontend
Class / File : AnnouncementsPage
AC Covered   : AC-5
Framework    : Vitest + RTL

Arrange:
  - Mock useQuery → returns [{ id: "1", title: "Hello", content: "World", createdAt: "2026-06-26T10:00:00Z", createdBy: { fullName: "Yogesh Lolage" } }]
  - Mock useAuthStore → EMPLOYEE user

Act:
  - render(<AnnouncementsPage />)

Assert:
  - "Hello" is visible
  - "World" is visible
  - "Yogesh Lolage" is visible

---

Unit Test ID : UTC-F054-F-004
Title        : AddAnnouncementModal_EmptyTitle_ShowsValidationError
Layer        : Frontend
Class / File : AddAnnouncementModal
AC Covered   : AC-8
Framework    : Vitest + RTL

Arrange:
  - render(<AddAnnouncementModal open={true} onClose={() => {}} onSuccess={() => {}} />)

Act:
  - Click "Save" button without filling title or content

Assert:
  - Validation error message "Title is required" is visible
  - useMutation.mutate was NOT called

---

Unit Test ID : UTC-F054-F-005
Title        : DashboardAnnouncementsWidget_ShowsLatestThree
Layer        : Frontend
Class / File : AnnouncementsWidget (Dashboard)
AC Covered   : AC-6
Framework    : Vitest + RTL

Arrange:
  - Mock useQuery → returns 3 announcement objects with titles: ["A1", "A2", "A3"]

Act:
  - render(<AnnouncementsWidget />)

Assert:
  - "A1", "A2", "A3" all visible
  - No 4th announcement rendered
