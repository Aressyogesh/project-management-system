# Requirements — F-032: Edit Profile Page

```
Feature ID   : F-032
Feature Name : Edit Profile Page
Epic         : PMS
Priority     : High
Roles        : All authenticated users (SUPER_USER, ADMIN, EMPLOYEE)
```

---

## User Story

As any authenticated user, I want to access an Edit Profile page from the gear icon
so that I can update my personal information (name, email, profile photo, and password)
without requiring admin intervention.

---

## Business Rules

BR-1: The Edit Profile page is accessible to ALL authenticated users regardless of system role.  
BR-2: The gear icon in the Topbar must show a dropdown menu; "Edit Profile" appears as the first item, "Company Settings" below it (admin only).  
BR-3: "Company Settings" is visible in the dropdown only to SUPER_USER and ADMIN roles.  
BR-4: Users may update their own fullName, email address, and profile photo.  
BR-5: Email must be valid format and unique — if the email is already taken by another user, return a 409 Conflict.  
BR-6: Password change requires the current password to be supplied and verified; if incorrect, return 400.  
BR-7: New password must be at least 6 characters.  
BR-8: New password and confirm password must match (validated on the frontend).  
BR-9: Profile photo upload accepts JPEG and PNG only; max size 2 MB.  
BR-10: Profile photo is stored as a URL string on the User record (same mechanism as existing uploads).  
BR-11: A user may update any subset of fields (name/email/photo/password) independently — all are optional per request.  
BR-12: After a successful save, the Zustand auth store is updated so the new fullName is reflected in the Topbar immediately without a page reload.

---

## Acceptance Criteria

AC-1: An "Edit Profile" option appears in the gear icon dropdown for all authenticated users (above "Company Settings").  
AC-2: Clicking "Edit Profile" navigates to `/profile` (accessible to all roles).  
AC-3: The profile page shows a form pre-filled with the current user's fullName and email.  
AC-4: Submitting a valid name/email update saves the changes and shows a success toast.  
AC-5: After a successful update the Topbar displays the updated fullName without page reload.  
AC-6: A profile photo can be uploaded; preview is shown before saving; the updated photo appears in the Topbar avatar after save.  
AC-7: Password change requires current password; incorrect current password returns an error message.  
AC-8: New password must be ≥ 6 characters; mismatch between new and confirm returns a validation error.  
AC-9: If the new email is already registered to another user, a "Email already in use" error is displayed.  
AC-10: The gear icon dropdown shows "Company Settings" only to SUPER_USER and ADMIN.  
AC-11: Unauthenticated access to `GET /users/profile` or `PATCH /users/profile` returns 401.

---

## Dependencies

- User model (`backend/prisma/schema.prisma`) — fullName, email, profilePhoto, passwordHash
- AuthStore (`frontend/src/store/authStore.ts`) — must update after successful save
- Topbar component (`frontend/src/components/layout/Topbar.tsx`) — gear icon dropdown
- Existing file-upload pattern (multer) in backend

---

## Out of Scope

- Admin editing another user's profile.
- Two-factor authentication setup.
- Social/OAuth profile linking.
- Deleting profile photo (can be replaced but not removed in this feature).

---

## Database / Schema Design (Step 4)

### Modified Entities

No schema changes required. The `User` model already has:
- `fullName String @db.VarChar(100)`
- `email String @unique @db.VarChar(255)`
- `passwordHash String`
- `profilePhoto String?`

### Migration

**Not required** — no schema changes.

---

## API Contract Design (Step 5)

### New Endpoints

```
─────────────────────────────────────────
Endpoint : GET  /users/profile
─────────────────────────────────────────
Auth Required : Yes (any role)
Roles Allowed : All authenticated users

Success Response   HTTP 200
  {
    "id"           : string,
    "fullName"     : string,
    "email"        : string,
    "profilePhoto" : string | null,
    "systemRole"   : string,
    "phone"        : string | null,
    "joinDate"     : string | null
  }

Error Responses
  401  Unauthorized — missing/invalid token

─────────────────────────────────────────
Endpoint : PATCH  /users/profile
─────────────────────────────────────────
Auth Required : Yes (any role)
Roles Allowed : All authenticated users

Request (multipart/form-data)
  fullName      : string   // optional, max 100 chars
  email         : string   // optional, valid email format
  currentPassword : string // required only when changing password
  newPassword   : string   // optional, min 6 chars
  photo         : file     // optional, JPEG/PNG, max 2 MB

Success Response   HTTP 200
  {
    "id"           : string,
    "fullName"     : string,
    "email"        : string,
    "profilePhoto" : string | null,
    "systemRole"   : string
  }

Error Responses
  400  Bad Request      — validation failed / incorrect current password
  401  Unauthorized     — missing/invalid token
  409  Conflict         — email already taken by another user
```
