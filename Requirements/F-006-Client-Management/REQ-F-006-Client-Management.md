# F-006: Client Management

Feature ID   : F-006
Feature Name : Client Management
Epic         : Project Management System
Priority     : High
Roles        : SUPER_USER, ADMIN

---

## User Story

As an Admin, I want to create and manage clients so that projects can be associated with the companies or teams that commission work.

---

## Business Rules

BR-1: Client name must be unique (case-insensitive).
BR-2: Client name is required and must not exceed 150 characters.
BR-3: Contact person name is required and must not exceed 100 characters.
BR-4: Email is required and must be a valid email format.
BR-5: Phone and address are optional.
BR-6: Clients use soft-delete — deactivated via isActive flag, never hard-deleted.
BR-7: Only SUPER_USER and ADMIN roles can create, edit, or toggle client status.
BR-8: The GET /clients endpoint returns active clients by default; pass includeInactive=true to return all.

---

## Acceptance Criteria

AC-1: Admin can create a new client with name, contactPerson, email, and optional phone + address.
AC-2: System rejects creation if a client with the same name (case-insensitive) already exists.
AC-3: Admin can edit any field of an existing client.
AC-4: System rejects update if the new name conflicts with another existing client.
AC-5: Admin can deactivate an active client; status badge changes to Inactive.
AC-6: Admin can reactivate an inactive client; status badge changes to Active.
AC-7: All clients (active + inactive) are shown in the management list.
AC-8: EMPLOYEE role receives 403 on all client endpoints.
AC-9: Empty state is shown when no clients exist.

---

## Dependencies

- F-001: JWT authentication infrastructure
- F-004: User model (no direct FK yet; clients will be referenced by Projects in a future phase)

---

## Out of Scope

- Assigning clients to projects (Phase 4)
- Client portal / external client login
- Hard-delete of clients

---

## Database / Schema Design

### New Entity: Client

| Field         | Type         | Constraints                     |
|---------------|--------------|---------------------------------|
| id            | String (UUID)| PK, auto-generated              |
| name          | String       | unique, required, max 150       |
| contactPerson | String       | required, max 100               |
| email         | String       | required, max 255               |
| phone         | String?      | optional, max 20                |
| address       | String?      | optional, max 300               |
| isActive      | Boolean      | default true                    |
| createdAt     | DateTime     | auto UTC                        |
| updatedAt     | DateTime     | auto updated                    |

Migration name: `add_clients_table`

---

## API Contract

### GET /clients
Auth: Required | Roles: SUPER_USER, ADMIN
Query: `?includeInactive=true` (optional)
Response 200:
```json
[{ "id": "...", "name": "...", "contactPerson": "...", "email": "...", "phone": "...", "address": "...", "isActive": true, "createdAt": "..." }]
```

### POST /clients
Auth: Required | Roles: SUPER_USER, ADMIN
Body: `{ "name": string, "contactPerson": string, "email": string, "phone?": string, "address?": string }`
Response 201: Created client object
Error 409: Duplicate name

### PATCH /clients/:id
Auth: Required | Roles: SUPER_USER, ADMIN
Body: any subset of `{ name, contactPerson, email, phone, address }`
Response 200: Updated client object
Error 404: Not found | 409: Duplicate name

### PATCH /clients/:id/status
Auth: Required | Roles: SUPER_USER, ADMIN
Body: `{ "isActive": boolean }`
Response 200: Updated client object
Error 404: Not found
