# REQ-F-001 — User Login

```
Feature ID   : F-001
Feature Name : User Login
Epic         : Authentication System
Priority     : High
Roles        : Super User, Admin, Employee
```

---

## User Story

As a system user (Super User / Admin / Employee),
I want to log in with my email and password
so that I can securely access the system with my assigned role privileges.

---

## Business Rules

| # | Rule |
|---|------|
| BR-1 | Passwords must be stored as bcrypt hashes — never plain text. |
| BR-2 | Access token expires after 15 minutes. |
| BR-3 | Refresh token expires after 7 days and is rotated on every use (old token revoked, new token issued). |
| BR-4 | Revoked or expired refresh tokens must never issue new access tokens. |
| BR-5 | Inactive accounts (`isActive = false`) must be rejected at login with HTTP 403. |
| BR-6 | Invalid credentials (wrong email or wrong password) must return the same HTTP 401 error — account enumeration must be prevented. |
| BR-7 | `lastLoginAt` is updated on every successful login. |
| BR-8 | Logout must revoke the provided refresh token server-side. |
| BR-9 | Accessing any protected route without a valid JWT must return HTTP 401. |
| BR-10 | JWT secret must be stored in environment variables — never in source code. |

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | The login page is the only page visible to unauthenticated users; all other routes redirect to `/login`. |
| AC-2 | Valid credentials return HTTP 200 with `accessToken`, `refreshToken`, and `user` (id, fullName, email, systemRole). |
| AC-3 | The password hash is never included in any API response. |
| AC-4 | Invalid credentials (wrong email or wrong password) return HTTP 401 with a generic message. |
| AC-5 | An inactive account returns HTTP 403. |
| AC-6 | Missing or malformed request fields return HTTP 400 with validation details. |
| AC-7 | After login, the user is redirected to `/dashboard` and the topbar shows their name and role. |
| AC-8 | Expired access tokens are silently refreshed using the refresh token (`POST /api/v1/auth/refresh`). |
| AC-9 | Refresh token rotation: using a valid refresh token issues new tokens and revokes the old one. |
| AC-10 | A previously used (revoked) refresh token returns HTTP 401. |
| AC-11 | `POST /api/v1/auth/logout` revokes the refresh token and returns HTTP 204. |
| AC-12 | After logout, the revoked refresh token can no longer be used to refresh. |

---

## Dependencies

- PostgreSQL database running and accessible
- At least one seeded Super User in the database

---

## Out of Scope

- Forgot password / reset password flow (F-002)
- New user registration / sign-up (F-003)
- Multi-factor authentication
- Social / OAuth login
- Role-based navigation redirects beyond `/dashboard` (covered in F-004)

---

## Step 4 — Database / Schema Design

### New Models (Prisma)

**Model: `User`**
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (UUID) | PK, @default(uuid()) |
| fullName | String | required, max 100 |
| email | String | required, unique, max 255 |
| passwordHash | String | required |
| systemRole | SystemRole (enum) | required, default EMPLOYEE |
| isActive | Boolean | default true |
| createdAt | DateTime | @default(now()) |
| lastLoginAt | DateTime? | nullable |

**Model: `RefreshToken`**
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (UUID) | PK, @default(uuid()) |
| token | String | required, unique |
| userId | String | FK → User.id, onDelete Cascade |
| expiresAt | DateTime | required |
| isRevoked | Boolean | default false |
| createdAt | DateTime | @default(now()) |

**Enum: `SystemRole`**
```
SUPER_USER | ADMIN | EMPLOYEE
```

### Migration
```
Name    : InitUserAndRefreshToken
Command : npx prisma migrate dev --name InitUserAndRefreshToken
```

---

## Step 5 — API Contract

Base URL: `http://localhost:3000/api/v1`
Swagger: `http://localhost:3000/api`

---

### POST /api/v1/auth/login

```
Auth Required : No (Public)

Request Body
{
  "email"    : string   // required, valid email format
  "password" : string   // required, min 6 characters
}

Success Response   HTTP 200
{
  "accessToken"  : string,
  "refreshToken" : string,
  "user" : {
    "id"         : string,
    "fullName"   : string,
    "email"      : string,
    "systemRole" : "SUPER_USER" | "ADMIN" | "EMPLOYEE"
  }
}

Error Responses
  400  Bad Request   — missing/invalid fields (e.g. invalid email format)
  401  Unauthorized  — wrong email or password (generic message — no enumeration)
  403  Forbidden     — account is inactive
```

---

### POST /api/v1/auth/refresh

```
Auth Required : No (Public)

Request Body
{
  "refreshToken" : string   // required
}

Success Response   HTTP 200
{
  "accessToken"  : string,
  "refreshToken" : string   // new rotated token
}

Error Responses
  400  Bad Request   — missing refreshToken field
  401  Unauthorized  — token not found, expired, or revoked
```

---

### POST /api/v1/auth/logout

```
Auth Required : Yes — Bearer JWT

Request Body
{
  "refreshToken" : string   // required — token to revoke
}

Success Response   HTTP 204 No Content

Error Responses
  400  Bad Request   — missing refreshToken field
  401  Unauthorized  — missing or invalid JWT
```
