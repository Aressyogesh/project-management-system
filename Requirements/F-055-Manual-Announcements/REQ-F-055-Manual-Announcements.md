# REQ-F-054-Manual-Announcements

Feature ID   : F-054
Feature Name : Manual Announcements
Epic         : PMS
Priority     : High
Roles        : SUPER_USER, ADMIN (create/delete), all authenticated users (view)

---

## User Story

As an Admin or Super User, I want to post manual announcements with a title and message body
so that all team members can see important updates, notices, and news in the system.

As a team member, I want to view posted announcements
so that I stay informed about company or project-level communications.

---

## Business Rules

BR-1: Only SUPER_USER and ADMIN system roles can create announcements.
BR-2: Only SUPER_USER and ADMIN system roles can delete announcements.
BR-3: All authenticated users (EMPLOYEE, ADMIN, SUPER_USER) can view announcements.
BR-4: Announcements are shown in reverse chronological order (newest first).
BR-5: Announcement title is required (1–200 characters); content is required (1–2000 characters).
BR-6: Each announcement records the author (createdBy) and timestamp (createdAt).
BR-7: There is no edit capability — delete and re-create if changes are needed.
BR-8: The announcements list on the dashboard widget shows the 5 most recent entries.
BR-9: The full Announcements page shows all announcements with pagination (20 per page).

---

## Acceptance Criteria

AC-1: A SUPER_USER or ADMIN can open the Announcements page and click "Add Announcement" to post a new announcement with title and content.
AC-2: All authenticated users can navigate to the Announcements page and view all posted announcements.
AC-3: An EMPLOYEE (non-admin) receives HTTP 403 when attempting POST /announcements.
AC-4: A SUPER_USER or ADMIN can delete any announcement; deletion removes it immediately from the list.
AC-5: Each announcement card displays: title, content, author full name, and relative date (e.g. "2 days ago").
AC-6: The Dashboard Announcements widget shows the 3 most recent announcements (read-only for all users).
AC-7: The sidebar shows an "Announcements" nav item visible to all authenticated users.
AC-8: The "Add Announcement" form validates that title and content are non-empty before submission.
AC-9: After posting, the new announcement appears at the top of the list without requiring a page refresh.

---

## Dependencies

- JWT authentication (JwtAuthGuard) — already in place
- RolesGuard for SUPER_USER/ADMIN role checks — already in place
- User model with `fullName` field — already in place
- Dashboard page with announcements widget — already exists (static data, will be wired to live API)

---

## Out of Scope

- Rich-text / HTML content in announcements (plain text only for MVP)
- Announcement read/unread tracking per user
- Pinned or priority announcements
- Announcement expiry / scheduled publishing
- File attachments on announcements
- Edit capability (delete and re-post is the workflow)
- Email notifications on new announcement

---

## Database / Schema Design (Step 4)

### New Entity: Announcement

```prisma
model Announcement {
  id          String   @id @default(uuid())
  title       String   @db.VarChar(200)
  content     String   @db.Text
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())

  @@map("announcements")
}
```

### Modified Entity: User

Add reverse relation:
```prisma
announcements   Announcement[]
```

### Relationships

- Announcement belongs_to User (createdById → users.id)
- User has_many Announcements

### Enumerations

None new.

### Migration

Name   : add_announcements
Command: npx prisma db push (local); migration file created for production deploy

---

## API Contract Design (Step 5)

─────────────────────────────────────────
Endpoint : GET  /api/v1/announcements
─────────────────────────────────────────
Auth Required : Yes (any authenticated user)
Roles Allowed : All

Query Params:
  page?  : number  // default 1
  limit? : number  // default 20, max 50
  latest?: boolean // if true, return only 3 most recent (for dashboard widget)

Success Response   HTTP 200
  {
    "data": [
      {
        "id"          : string,
        "title"       : string,
        "content"     : string,
        "createdAt"   : string (ISO 8601),
        "createdBy"   : { "id": string, "fullName": string }
      }
    ],
    "total"    : number,
    "page"     : number,
    "lastPage" : number
  }

Error Responses
  401  Unauthorized — missing or invalid token

─────────────────────────────────────────
Endpoint : POST  /api/v1/announcements
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Request Body:
  {
    "title"   : string   // required, 1–200 chars
    "content" : string   // required, 1–2000 chars
  }

Success Response   HTTP 201
  {
    "id"        : string,
    "title"     : string,
    "content"   : string,
    "createdAt" : string,
    "createdBy" : { "id": string, "fullName": string }
  }

Error Responses
  400  Bad Request  — title or content missing / exceeds length
  401  Unauthorized — not authenticated
  403  Forbidden    — EMPLOYEE role

─────────────────────────────────────────
Endpoint : DELETE  /api/v1/announcements/:id
─────────────────────────────────────────
Auth Required : Yes
Roles Allowed : SUPER_USER, ADMIN

Success Response   HTTP 204 No Content

Error Responses
  401  Unauthorized — not authenticated
  403  Forbidden    — EMPLOYEE role
  404  Not Found    — announcement does not exist
