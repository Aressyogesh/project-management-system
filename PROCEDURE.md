# Software Development Procedure
## Mandatory — Must Be Followed for Every Feature on Every Project

---

## Purpose

This document defines a universal, repeatable procedure for delivering software features with quality, traceability, and consistency. It applies to **any project** regardless of technology stack, team size, or domain.

When a large requirement arrives, treat it as an **Epic**. Break it into small, independently deliverable **Features**. Every feature must follow all **7 steps** in strict order before it is considered complete.

---

## Procedure Overview

```
EPIC
  └── Feature 1 ──► Step 1 → Step 2 → Step 3a → Step 3b → Step 4 → Step 5 → Step 6 → Step 7
  └── Feature 2 ──► Step 1 → Step 2 → Step 3a → Step 3b → Step 4 → Step 5 → Step 6 → Step 7
  └── Feature N ──► ...

Step 6 Internal Flow:
  6a Backend  →  6b Frontend  →  6c Code Review  →  6d Security Review (OWASP)
       ↑ tests written in 3a/3b run after 6a + 6b                ↓
                                                    All gates PASS → Step 7
```

| Step | Name | Gate |
|------|------|------|
| 1 | Identify Epic & Break Into Features | Before any other step |
| 2 | Analyse Requirement | Before writing tests |
| 3a | Write Unit Test Cases | Before writing E2E tests |
| 3b | Write E2E Test Cases | Before schema design |
| 4 | Database / Schema Design | Before API contract |
| 5 | API Contract Design | Before writing code |
| 6a | Backend Implementation | After contract is agreed |
| 6b | Frontend Implementation | After backend is done |
| **6c** | **Code Review** | **After implementation, before tests run** |
| **6d** | **Security Review (OWASP)** | **After code review passes** |
| 7 | Report → Branch → PR → Notify | Only when all tests + reviews pass |

> **Rule:** Steps must not be skipped or reordered. Code Review (6c) and Security Review (6d) are mandatory gates — no feature proceeds to Step 7 without both passing.

---

## Step 1 — Identify the Epic & Break Into Features

### What Is an Epic?
An Epic is a large, high-level requirement that cannot be built in a single iteration. It spans multiple screens, services, or data models.

### How to Break Down an Epic
Decompose the epic into the smallest independently deliverable units of value. Each feature must be:
- Buildable without depending on future features
- Testable on its own
- Deliverable to a user or stakeholder

### Feature ID Convention
Assign a sequential ID to every feature:
```
F-001, F-002, F-003 ...
```

### Feature Register Template

| # | Feature Name | Description | Roles / Users Affected | Priority |
|---|-------------|-------------|----------------------|----------|
| F-001 | <name> | <one-line description> | <who uses it> | High / Medium / Low |
| F-002 | <name> | <one-line description> | <who uses it> | High / Medium / Low |

### Worked Example (PIMS project)

| # | Feature | Roles Affected | Priority |
|---|---------|----------------|----------|
| F-001 | User Login | All roles | High |
| F-002 | Role-Based Navigation | All roles | High |
| F-003 | User Management | Admin | High |
| F-004 | Patient Registration | Receptionist, Admin | High |
| F-005 | Patient List & Search | All roles | High |
| F-006 | Appointment Booking | Doctor, Receptionist, Admin | High |
| F-007 | Medical Record — Visit Note | Doctor, Admin | High |
| F-008 | Invoice Generation | Receptionist, Admin | Medium |

---

## Step 2 — Analyse Requirement

Before anything else, deeply understand the feature. Document the following. Do not begin writing tests or code until this step is complete.

### What to Document

1. **User Story** — Who needs this, what they want, and why
2. **Business Rules** — Constraints and logic the system must enforce
3. **Acceptance Criteria (AC)** — Specific, testable conditions that define "done"
4. **Dependencies** — Other features, services, or data this feature relies on
5. **Out of Scope** — Explicitly state what this feature does NOT cover

### Storage Rule
```
Requirements/
└── <F-XXX>-<Feature-Name>/
    └── REQ-<F-XXX>-<Feature-Name>.md
```

### Template

```
Feature ID   : F-XXX
Feature Name : <name>
Epic         : <epic name>
Priority     : High / Medium / Low
Roles        : <which users or roles interact with this feature>

User Story
----------
As a <role/user>, I want to <action> so that <benefit>.

Business Rules
--------------
BR-1: <rule the system must enforce>
BR-2: <rule the system must enforce>

Acceptance Criteria
-------------------
AC-1: <specific, testable condition>
AC-2: <specific, testable condition>
AC-3: <specific, testable condition>

Dependencies
------------
- <feature or system this depends on>

Out of Scope
------------
- <what this feature explicitly does NOT do>
```

### Worked Example (F-001: User Login — PIMS project)

```
Feature ID   : F-001
Feature Name : User Login
Epic         : Patient Information and Management System
Priority     : High
Roles        : Admin, Doctor, Nurse, Receptionist

User Story
----------
As a system user, I want to log in with my email and password
so that I can securely access the system with my assigned role privileges.

Business Rules
--------------
BR-1: Passwords must be stored as hashes — never plain text.
BR-2: Access token expires after 15 minutes.
BR-3: Refresh token expires after 7 days and rotates on every use.
BR-4: Revoked or expired refresh tokens must never issue new access tokens.
BR-5: Inactive accounts must be rejected at login.

Acceptance Criteria
-------------------
AC-1: The login page is the only page visible to unauthenticated users.
AC-2: Valid credentials return tokens; user is redirected to the dashboard.
AC-3: Invalid credentials return a clear error message.
AC-4: User name and role are displayed in the navigation after login.
AC-5: Expired access tokens are silently refreshed using the refresh token.
AC-6: Logout revokes the token and redirects to the login page.
AC-7: Navigating to a protected route while logged out redirects to login.
AC-8: Inactive accounts are rejected with an appropriate message.

Dependencies
------------
- Database must be running and seeded with at least one user

Out of Scope
------------
- Password reset / forgot password
- Multi-factor authentication
- Social / OAuth login
```

---

## Step 3a — Write Unit Test Cases

Write unit tests that verify each individual unit of logic **in isolation** before touching the full stack. All unit tests must pass before E2E tests are run.

### Principles
- Test one thing per test case
- Mock all external dependencies (database, APIs, file system)
- Name tests using the pattern: `MethodName_Scenario_ExpectedBehaviour`
- Every Acceptance Criterion must be covered by at least one unit test

### Frameworks (adapt to your stack)

| Layer | Example Frameworks |
|-------|--------------------|
| Backend | xUnit / NUnit / JUnit / Jest / PyTest / Go test |
| Frontend / UI | Jest / Vitest / React Testing Library / Vue Test Utils |
| Mocking | Moq / Mockito / Jest mocks / unittest.mock |

### Storage Rule
```
Unit Test Cases/
└── <F-XXX>-<Feature-Name>/
    └── UTC-<F-XXX>-<Feature-Name>.md      ← specification document
```
> Actual test code lives inside the project's test directory (e.g. `tests/`, `src/__tests__/`, `*.Tests/`).

### Unit Test Case Template

```
Unit Test ID : UTC-<F-XXX>-<NNN>
Title        : <MethodOrComponent_Scenario_ExpectedBehaviour>
Layer        : Backend / Frontend / Service / etc.
Class / File : <class name or file path>
AC Covered   : AC-X
Framework    : <testing framework used>

Arrange : <setup — create objects, configure mocks, prepare test data>
Act     : <invoke the method or render the component>
Assert  : <verify the return value, side effect, exception, or rendered output>
```

### Worked Example (F-001: User Login — Backend unit test)

```
Unit Test ID : UTC-F001-B-001
Title        : LoginAsync_ValidCredentials_ReturnsTokensAndUser
Layer        : Backend
Class / File : AuthServiceTests
AC Covered   : AC-2
Framework    : xUnit + Moq

Arrange:
  - Mock IUserRepository.GetByEmailAsync() → returns active user with hashed password
  - Mock ITokenService.GenerateAccessToken() → returns "fake-access-token"
  - Mock ITokenService.GenerateRefreshToken() → returns "fake-refresh-token"

Act:
  - result = await authService.LoginAsync("user@example.com", "ValidPassword")

Assert:
  - result.AccessToken is "fake-access-token"
  - result.RefreshToken is "fake-refresh-token"
  - result.User.Email is "user@example.com"
  - IRefreshTokenRepository.AddAsync() was called once
```

### Execution Gate

```
Run unit tests:   <framework command>   e.g. dotnet test / npm test / pytest
Result:           ALL PASS  →  proceed to Step 3b
                  ANY FAIL  →  fix failures before continuing
```

---

## Step 3b — Write E2E Test Cases

Write end-to-end test cases in **Given / When / Then** format that exercise the full system through the UI or API. These run **only after all unit tests pass**.

### Principles
- Each test case must map to at least one Acceptance Criterion
- Cover: happy path, negative cases, edge cases, security, and role-based access
- Tests must be runnable against a seeded test environment
- Automate using Playwright, Selenium, Cypress, or equivalent

### Storage Rule
```
Test Cases/
└── <F-XXX>-<Feature-Name>/
    └── TC-<F-XXX>-<Feature-Name>.md
```

### E2E Test Case Template

```
Test Case ID : TC-<F-XXX>-<NNN>
Title        : <short descriptive title>
Feature      : F-XXX — <Feature Name>
AC Covered   : AC-X
Priority     : High / Medium / Low
Type         : Happy Path / Negative / Edge Case / Security / RBAC
Framework    : Playwright / Selenium / Cypress / RestAssured / etc.

Given  : <initial system state and preconditions>
When   : <action performed by user or system>
Then   : <expected outcome>
  And  : <additional expected outcome>

Expected Response : <HTTP status / UI state / data>
```

### Test Type Coverage Required Per Feature

| Type | Description | Minimum |
|------|-------------|---------|
| Happy Path | Valid inputs, expected flow | 1 per main user story |
| Negative | Invalid inputs, error states | 1 per validation rule |
| Edge Case | Boundary values, race conditions, empty states | As needed |
| Security | Auth bypass, token misuse, injection | 1+ per auth-related feature |
| RBAC | Role restrictions respected | 1 per restricted action |

### Worked Example (F-001: User Login)

```
Test Case ID : TC-F001-001
Title        : Successful Login Redirects to Dashboard
AC Covered   : AC-1, AC-2, AC-4
Priority     : High
Type         : Happy Path
Framework    : Playwright

Given  : A valid active user exists with known credentials
  And  : The user is not logged in
  And  : The user navigates to the login page

When   : The user enters valid email and password
  And  : Clicks the Login button

Then   : The system returns HTTP 200 with access token and refresh token
  And  : The user is redirected to /dashboard
  And  : The navigation bar shows the user's name and role

Expected Response : HTTP 200 OK with { accessToken, refreshToken, user }
```

### Execution Gate

```
Run E2E tests:    <framework command>   e.g. npx playwright test / mvn test
Result:           ALL PASS  →  proceed to Step 4
                  ANY FAIL  →  fix failures before continuing
```

---

## Step 4 — Database / Schema Design

Identify all data model changes needed to support this feature before writing any code.

### What to Document

1. **New entities / tables** — names, fields, types, constraints
2. **Modified entities** — fields added, changed, or removed
3. **Relationships** — foreign keys, join tables, navigation properties
4. **Enumerations** — new enum types and their values
5. **Migration strategy** — how to apply the change (migration name or script)

### Storage Rule
```
Requirements/
└── <F-XXX>-<Feature-Name>/
    └── REQ-<F-XXX>-<Feature-Name>.md    ← include schema section here
```

### Template

```
Feature ID   : F-XXX
Feature Name : <name>

New Entities / Tables
---------------------
Entity / Table : <Name>
Fields:
  - <FieldName> : <Type>   [constraints: required / unique / nullable / default]

Modified Entities / Tables
--------------------------
Entity / Table : <Name>
Changes:
  - Add   : <FieldName> <Type>
  - Remove : <FieldName>
  - Rename : <OldName> → <NewName>

Relationships
-------------
  <EntityA> has many <EntityB> via <ForeignKey>
  <EntityA> belongs to <EntityB>

Enumerations
------------
  <EnumName> : <Value1> | <Value2> | <Value3>

Migration
---------
  Name   : <descriptive migration name>
  Type   : Auto-generated / Manual SQL script
  Command: <framework-specific command>
```

### Worked Example (F-001: User Login — PIMS project)

```
Feature ID   : F-001
Feature Name : User Login

New Entities
------------
Entity: User
  - Id           : UUID / GUID      [PK, auto-generated]
  - Name         : string           [required, max 100]
  - Email        : string           [required, unique, max 255]
  - PasswordHash : string           [required]
  - Role         : UserRole (enum)  [required]
  - IsActive     : boolean          [default: true]
  - CreatedAt    : datetime         [auto UTC]
  - LastLoginAt  : datetime         [nullable]

Entity: RefreshToken
  - Id        : UUID     [PK]
  - UserId    : UUID     [FK → User]
  - Token     : string   [required, unique]
  - ExpiresAt : datetime
  - IsRevoked : boolean  [default: false]
  - CreatedAt : datetime

Enumerations
------------
  UserRole : Admin | Doctor | Nurse | Receptionist

Migration
---------
  Name    : AddUserAndRefreshToken
  Command : dotnet ef migrations add AddUserAndRefreshToken
```

---

## Step 5 — API Contract Design

Define the complete API contract **before** writing any backend or frontend code. All parties must agree on this contract first.

### What to Document Per Endpoint

1. **Method and URL**
2. **Authentication required** — yes/no, which roles/scopes
3. **Request format** — headers, query params, body schema with types and validation rules
4. **Success response** — HTTP status and body shape
5. **Error responses** — all possible status codes and messages

### Storage Rule
```
Requirements/
└── <F-XXX>-<Feature-Name>/
    └── REQ-<F-XXX>-<Feature-Name>.md    ← include API contract section here
```

### Template

```
Feature ID   : F-XXX
Feature Name : <name>

─────────────────────────────────────────
Endpoint : <METHOD>  <base-url>/<path>
─────────────────────────────────────────
Auth Required : Yes / No
Roles Allowed : <role list or "Public">

Request
  Headers : <key: value>
  Body    :
    {
      "<field>" : <type>    // <validation rule>
    }

Success Response   HTTP <status>
  {
    "<field>" : <type>
  }

Error Responses
  400  Bad Request      — validation failed
  401  Unauthorized     — missing or invalid token
  403  Forbidden        — authenticated but insufficient role / permission
  404  Not Found        — resource does not exist
  409  Conflict         — duplicate or constraint violation
  422  Unprocessable    — business rule violation
  500  Internal Error   — unexpected server error
```

### Worked Example (F-001: User Login — PIMS project)

```
Feature ID   : F-001
Feature Name : User Login

─────────────────────────────────────────
Endpoint : POST  /api/v1/auth/login
─────────────────────────────────────────
Auth Required : No

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
      "id"    : string,
      "name"  : string,
      "email" : string,
      "role"  : string
    }
  }

Error Responses
  400 — missing or malformed fields
  401 — invalid email or password
  403 — account is inactive

─────────────────────────────────────────
Endpoint : POST  /api/v1/auth/refresh
─────────────────────────────────────────
Auth Required : No

Request Body
  { "refreshToken" : string }   // required

Success Response   HTTP 200
  { "accessToken" : string, "refreshToken" : string }

Error Responses
  401 — token invalid, expired, or revoked

─────────────────────────────────────────
Endpoint : POST  /api/v1/auth/logout
─────────────────────────────────────────
Auth Required : Yes (any authenticated user)

Request Body
  { "refreshToken" : string }   // required — token to revoke

Success Response   HTTP 204 No Content

Error Responses
  401 — not authenticated
```

---

## Step 6 — Implementation

Follow these sub-steps in strict order. Adapt the layers to your project's architecture.

### 6a — Backend

| Sub-step | Action |
|----------|--------|
| 6-B1 | Create or update data model / entity class |
| 6-B2 | Register model with data layer (ORM context, repository, etc.) |
| 6-B3 | Apply database migration / schema change |
| 6-B4 | Create request and response data transfer objects (DTOs / schemas) |
| 6-B5 | Write input validation rules |
| 6-B6 | Write service / business logic layer |
| 6-B7 | Write API controller / handler / route with access control |
| 6-B8 | Register dependencies in DI container / module system |
| 6-B9 | Verify all endpoints manually via API client (Swagger / Postman / cURL) |

### 6b — Frontend / Client

| Sub-step | Action |
|----------|--------|
| 6-F1 | Define types / interfaces / models matching API response shapes |
| 6-F2 | Write API service / client functions |
| 6-F3 | Build reusable UI components |
| 6-F4 | Build the full page / screen / view |
| 6-F5 | Wire into router with appropriate access guards |
| 6-F6 | Add seed / fixture data so the feature works after a fresh setup |

> For API-only projects: skip 6b. For frontend-only projects: skip 6a.

### Worked Example Summary (F-001 — PIMS)

**Backend order:**  
Entity → DbContext → Migration → DTOs → FluentValidation → AuthService → AuthController → DI registration → Swagger verification

**Frontend order:**  
TypeScript types → Axios functions → LoginForm component → LoginPage → ProtectedRoute → App router wiring → seed data

---

### Step 6c — Code Review

A thorough code review must be completed on all code written in Steps 6a and 6b **before** running any tests or proceeding to Step 6d.

#### Code Review Principles

Every reviewer must evaluate code against the following standards. Mark each item as **PASS**, **FAIL**, or **N/A**.

---

##### CR-1: Code Correctness & Logic

```
[ ] Logic matches the Acceptance Criteria defined in Step 2
[ ] All business rules (BR-X) from Step 2 are correctly implemented
[ ] No off-by-one errors, incorrect conditionals, or inverted logic
[ ] Edge cases (null, empty, zero, max values) are handled
[ ] No hardcoded values that belong in configuration or constants
[ ] No commented-out dead code left in the codebase
```

---

##### CR-2: Naming & Readability (Industry Standard — Clean Code)

```
[ ] Names are intention-revealing — no abbreviations (usr, obj, tmp, i2)
[ ] Classes / components are nouns (UserService, LoginForm)
[ ] Methods / functions are verbs (GetUserById, HandleSubmit)
[ ] Boolean variables / props use is/has/can/should prefix (isActive, hasRole)
[ ] Constants are UPPER_SNAKE_CASE
[ ] No single-letter variables except loop counters
[ ] File names match the class / component they contain
[ ] No misleading names (a method called GetUser must not delete data)
```

---

##### CR-3: SOLID Principles

```
[ ] S — Single Responsibility: each class/module does one thing only
[ ] O — Open/Closed: open for extension, closed for modification
[ ] L — Liskov Substitution: subtypes are substitutable for their base types
[ ] I — Interface Segregation: interfaces are small and specific, not bloated
[ ] D — Dependency Inversion: depend on abstractions, not concrete implementations
```

---

##### CR-4: Code Quality & Maintainability

```
[ ] DRY — no duplicated logic; shared logic is extracted to a utility / helper
[ ] Functions / methods do one thing and have a single level of abstraction
[ ] Function length is reasonable (guideline: under 30 lines; flag over 50)
[ ] Cyclomatic complexity is low (guideline: under 10 per method)
[ ] No magic numbers — all literals are named constants
[ ] Early returns used to reduce nesting (avoid deeply nested if/else)
[ ] Avoid negative conditions where positive equivalents are clearer
[ ] Error handling is explicit — no silent failures, no empty catch blocks
[ ] Logging is meaningful — errors logged with context, not just message
```

---

##### CR-5: API & Interface Design

```
[ ] REST conventions followed — correct HTTP methods and status codes
[ ] Response shapes match the API contract defined in Step 5
[ ] Consistent naming in JSON responses (camelCase or snake_case — pick one)
[ ] Pagination, filtering, and sorting implemented consistently
[ ] No sensitive data (passwords, tokens, PII) exposed in responses or logs
[ ] Versioning strategy applied (/api/v1/...)
```

---

##### CR-6: Test Quality Review

```
[ ] Unit tests follow Arrange / Act / Assert pattern clearly
[ ] Test names describe behaviour, not implementation (what, not how)
[ ] No logic (if/loops) inside test bodies
[ ] No tests that always pass regardless of implementation
[ ] Mocks are used appropriately — real implementations not mocked unnecessarily
[ ] Tests are independent — no test depends on another test's output
[ ] Edge cases and boundary values are tested, not just happy paths
[ ] Test coverage is adequate for the criticality of the feature
```

---

##### CR-7: Performance Awareness

```
[ ] No N+1 query problems — relationships loaded efficiently (eager loading, joins)
[ ] No unnecessary API calls triggered by UI re-renders
[ ] Large collections are paginated — never return unbounded result sets
[ ] Expensive operations are not in loops
[ ] Indexes considered for frequently queried fields
[ ] Async/await used correctly — no blocking synchronous calls in async code
```

---

##### CR-8: Coding Standards & Consistency

```
[ ] Code follows the project's language/framework style guide:
      .NET   → Microsoft C# Coding Conventions
      JS/TS  → Airbnb / StandardJS / project ESLint config
      Python → PEP 8
      Java   → Google Java Style Guide
[ ] Linter passes with zero errors (ESLint / StyleCop / Checkstyle / Flake8)
[ ] Formatter applied (Prettier / dotnet format / Black / gofmt)
[ ] No warnings suppressed without documented justification
[ ] Imports / usings are organised and unused ones removed
[ ] File structure follows the agreed project layout
```

---

#### Code Review Outcome

```
All PASS  →  Proceed to Step 6d (Security Review)
Any FAIL  →  Developer fixes findings, re-review required before proceeding
```

#### Code Review Tools (adapt to stack)

| Purpose | Tool Options |
|---------|-------------|
| Static analysis | SonarQube / SonarCloud / CodeClimate / ESLint / StyleCop |
| Code coverage | Coverlet / Istanbul / JaCoCo / coverage.py |
| Linting | ESLint / Pylint / Checkstyle / dotnet-format |
| Formatting | Prettier / Black / gofmt / dotnet format |
| Peer review | GitHub PR review / Gerrit / Crucible |

---

### Step 6d — Security Review (OWASP)

A security review must be completed on all code **after** Step 6c passes. Every item below must be evaluated. This is non-negotiable — security issues block the feature from proceeding to Step 7.

**Reference standards:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

##### SEC-1: Broken Access Control (OWASP A01)

```
[ ] Every endpoint enforces authentication — no endpoint is accidentally public
[ ] Role-based access control applied — users can only access their permitted resources
[ ] Horizontal privilege escalation prevented — User A cannot access User B's data
[ ] Vertical privilege escalation prevented — lower roles cannot invoke higher-role actions
[ ] Insecure Direct Object References (IDOR) prevented — IDs validated against caller's ownership
[ ] Admin-only endpoints are inaccessible to non-admin roles
[ ] Frontend route guards match backend RBAC (no security by obscurity)
```

---

##### SEC-2: Cryptographic Failures (OWASP A02)

```
[ ] Passwords are hashed using a strong algorithm (BCrypt / Argon2 / scrypt)
[ ] No MD5 or SHA-1 used for password hashing
[ ] Sensitive data (tokens, keys, passwords) never stored in plain text
[ ] Secrets and credentials stored in environment variables / secret manager — never in code
[ ] No sensitive data logged (passwords, tokens, PII, health data)
[ ] HTTPS enforced in all environments — no HTTP endpoints for sensitive data
[ ] JWT secrets are sufficiently long and random (min 256 bits)
```

---

##### SEC-3: Injection (OWASP A03)

```
[ ] SQL Injection prevented — parameterised queries / ORM used, no string concatenation
[ ] NoSQL Injection prevented — input sanitised before use in queries
[ ] Command Injection prevented — no user input passed to OS commands (exec, shell)
[ ] LDAP Injection prevented — if applicable
[ ] XSS (Cross-Site Scripting) prevented:
      - Output encoded before rendering in HTML
      - React / Angular / Vue auto-escaping not bypassed (no dangerouslySetInnerHTML with user input)
      - Content-Security-Policy header set
[ ] XML / JSON injection prevented — input validated and sanitised
```

---

##### SEC-4: Insecure Design (OWASP A04)

```
[ ] Business logic flaws considered — can a user skip steps, replay actions, or abuse workflows?
[ ] Rate limiting in place on sensitive endpoints (login, password reset, OTP)
[ ] Account enumeration prevented — same error message for wrong email and wrong password
[ ] Insecure password reset flows not present
[ ] File upload validation — only allowed types accepted, stored outside web root
```

---

##### SEC-5: Security Misconfiguration (OWASP A05)

```
[ ] Debug mode disabled in production configuration
[ ] Detailed error messages / stack traces not exposed to end users
[ ] Default credentials removed from all systems
[ ] Unnecessary HTTP methods disabled (TRACE, OPTIONS where not needed)
[ ] Security headers set:
      - Strict-Transport-Security (HSTS)
      - X-Content-Type-Options: nosniff
      - X-Frame-Options: DENY
      - Content-Security-Policy
      - Referrer-Policy
[ ] CORS configured to allow only trusted origins — never wildcard (*) in production
[ ] Directory listing disabled
```

---

##### SEC-6: Vulnerable & Outdated Components (OWASP A06)

```
[ ] All dependencies checked for known CVEs (Common Vulnerabilities and Exposures)
[ ] No outdated packages with known security vulnerabilities
[ ] Dependency audit run: npm audit / dotnet list package --vulnerable / safety check / trivy
[ ] Third-party libraries obtained from trusted sources only
```

---

##### SEC-7: Identification & Authentication Failures (OWASP A07)

```
[ ] JWT tokens have appropriate expiry (access: ≤ 15 min, refresh: ≤ 7 days)
[ ] Refresh token rotation enforced — old token revoked on each use
[ ] Refresh tokens stored securely — not in localStorage (use httpOnly cookie or memory)
[ ] Token revocation supported — logout invalidates the token server-side
[ ] Session fixation prevented
[ ] Multi-factor authentication supported (or planned) for sensitive roles
[ ] Brute-force protection on login (rate limiting / account lockout)
```

---

##### SEC-8: Software & Data Integrity Failures (OWASP A08)

```
[ ] Serialised data from untrusted sources not deserialised without validation
[ ] CI/CD pipeline integrity verified — no unauthorised steps introduced
[ ] Dependencies have integrity checksums (package-lock.json / packages.lock.json)
[ ] No auto-update of dependencies without review
```

---

##### SEC-9: Security Logging & Monitoring (OWASP A09)

```
[ ] Authentication events logged (login success, login failure, logout, token refresh)
[ ] Authorisation failures logged (403 responses with user ID and resource)
[ ] Sensitive operations logged with audit trail (create, update, delete patient records, billing)
[ ] Logs do NOT contain sensitive data (passwords, tokens, full card numbers, full SSN)
[ ] Log entries include: timestamp, user ID, action, resource, outcome
[ ] Alerting configured for repeated auth failures or unusual access patterns
```

---

##### SEC-10: Server-Side Request Forgery — SSRF (OWASP A10)

```
[ ] Server does not fetch URLs provided by user input without validation
[ ] Internal network resources not accessible via user-supplied URLs
[ ] URL whitelist enforced if the server must make outbound HTTP calls
```

---

##### SEC-11: API-Specific Checks (OWASP API Security Top 10)

```
[ ] API01 — Broken Object Level Auth: resource IDs validated against caller ownership
[ ] API02 — Broken Authentication: all endpoints require appropriate auth
[ ] API03 — Broken Object Property Level Auth: response DTOs limit fields returned per role
[ ] API04 — Unrestricted Resource Consumption: pagination, rate limiting, request size limits
[ ] API05 — Broken Function Level Auth: admin functions inaccessible to non-admins
[ ] API06 — Unrestricted Access to Sensitive Business Flows: workflows cannot be abused
[ ] API07 — Server Side Request Forgery: server does not blindly call user-supplied URLs
[ ] API08 — Security Misconfiguration: no debug info exposed in error responses
[ ] API09 — Improper Inventory Management: no undocumented / shadow endpoints
[ ] API10 — Unsafe Consumption of APIs: third-party API responses validated before use
```

---

#### Security Review Outcome

```
All PASS  →  Proceed to Step 7 (Report → Branch → PR → Notify)
Any FAIL  →  Developer fixes the finding(s), security re-review required before proceeding

CRITICAL findings (SEC-1, SEC-2, SEC-3, SEC-7) block the feature immediately.
HIGH findings must be resolved before Step 7.
MEDIUM / LOW findings must be logged as tracked issues even if not blocking.
```

#### Security Review Tools (adapt to stack)

| Purpose | Tool Options |
|---------|-------------|
| SAST (Static Analysis) | SonarQube / Semgrep / Checkmarx / Bandit (Python) / Brakeman (Ruby) |
| Dependency Scanning | OWASP Dependency-Check / npm audit / Snyk / Trivy / Dependabot |
| Secret Detection | GitLeaks / TruffleHog / GitHub Secret Scanning |
| DAST (Dynamic Analysis) | OWASP ZAP / Burp Suite Community |
| Header Analysis | SecurityHeaders.com / Mozilla Observatory |
| Container Scanning | Trivy / Grype / Snyk Container |

---

## Step 7 — Report → Branch → PR → Notify

This step is **triggered only when ALL unit tests AND all E2E tests pass**. Never execute when any test is failing.

```
Trigger Condition
─────────────────
  Unit tests   → ALL PASS   (dotnet test / npm test / pytest / etc.)
  E2E tests    → ALL PASS   (Playwright / Selenium / Cypress / etc.)
       ↓
  Execute Step 7
```

---

### Step 7a — Generate Reports (Test + Code Review + Security Review)

Generate three HTML reports per feature **and** update the project-wide consolidated report. All HTML reports are stored in the `TestReports/` folder hierarchy.

---

#### 7a-i — Feature Test Execution Report

Covers all unit and E2E test results for the feature.

##### Report Tools (adapt to your stack)

| Test Layer | Reporting Tool Options |
|-----------|------------------------|
| Unit tests (backend) | ExtentReports / Allure / JUnit HTML / pytest-html |
| Unit tests (frontend) | vitest-html-reporter / Jest HTML Reporter |
| E2E tests | Playwright HTML Reporter / Allure / Extent |
| Combined summary | Allure / ExtentReports merged report |

##### Storage Rule
```
TestReports/
└── <F-XXX>-<Feature-Name>/
    ├── unit-backend-report.html    ← backend unit test results
    ├── unit-frontend-report.html   ← frontend unit test results
    ├── e2e-report.html             ← E2E test results
    └── test-summary-report.html    ← consolidated pass/fail per AC
```

##### Test Summary Report Must Include

| Section | Content |
|---------|---------|
| Feature Info | Feature ID, name, date and time executed |
| Test Coverage | Total tests, pass count, fail count, pass % |
| AC Coverage | Each AC mapped to test IDs with PASS / FAIL |
| Failures | Error message + screenshot or stack trace for any failure |
| Environment | App URL(s), runtime versions, DB version |

---

#### 7a-ii — Feature Code Review Report (HTML)

Summarises all findings from Step 6c in an auditable HTML report.

##### Storage Rule
```
TestReports/
└── <F-XXX>-<Feature-Name>/
    └── code-review-report.html
```

##### Code Review Report Must Include

| Section | Content |
|---------|---------|
| Feature Info | Feature ID, name, reviewer, date |
| Checklist Summary | Each CR-X category with PASS / FAIL / N/A |
| Verdict | Approved / Approved with comments / Needs changes |
| Blocking Issues | File, line, description, fix required (table) |
| Non-Blocking Observations | Bullet list |
| Sign-off | Reviewer name + date |

##### Source
Translate the completed `Document/CodeReview/CR-<F-XXX>-<Feature-Name>.md` into HTML. Use the generic template at `Document/CodeReview/CODE-REVIEW-TEMPLATE.md` as the structure reference.

---

#### 7a-iii — Feature Security Review Report (HTML)

Summarises all OWASP findings from Step 6d in an auditable HTML report.

##### Storage Rule
```
TestReports/
└── <F-XXX>-<Feature-Name>/
    └── security-review-report.html
```

##### Security Review Report Must Include

| Section | Content |
|---------|---------|
| Feature Info | Feature ID, name, reviewer, date |
| OWASP Web Top 10 | Each risk with Applicable, Status, Notes |
| OWASP API Top 10 | Each risk with Applicable, Status, Notes |
| Feature-Specific Checks | Each C-X item with PASS / FAIL / N/A |
| Dependency Audit Results | Critical / High / Moderate counts |
| SAST Findings | File, line, severity, resolution |
| Verdict | Cleared / Cleared with mitigations / Blocked |
| Open Risk Items | Description + planned remediation |
| Sign-off | Reviewer name + date |

##### Source
Translate the completed `Document/SecurityReview/SR-<F-XXX>-<Feature-Name>.md` into HTML. Use the generic template at `Document/SecurityReview/OWASP-SECURITY-REVIEW-TEMPLATE.md` as the structure reference.

---

#### 7a-iv — Consolidated Project Report (HTML)

A single HTML report that aggregates all features delivered to date across the project. Updated every time a new feature completes Step 7a.

##### Storage Rule
```
TestReports/
└── consolidated-report.html        ← updated after every feature delivery
```

##### Consolidated Report Must Include

| Section | Content |
|---------|---------|
| Project Info | Project name, report generated date, total features delivered |
| Features Summary Table | Feature ID, Feature Name, Unit Tests (pass/total), E2E Tests (pass/total), Code Review Verdict, Security Review Verdict, Overall Status |
| Test Totals | Sum of all unit + E2E tests across all features; total pass %, total fail % |
| Code Review Summary | Count of Approved / Approved with comments / Needs changes across all features |
| Security Review Summary | Count of Cleared / Cleared with mitigations / Blocked across all features |
| Open Risk Register | All open risk items from all security reviews (feature, risk, severity, planned fix) |
| Definition of Done Tracker | Each feature's DoD checklist completion status |

##### Update Rule
```
After every feature's Step 7a:
  1. Add a new row for <F-XXX> in the Features Summary Table
  2. Update all totals (test counts, verdicts)
  3. Append any new open risk items to the Open Risk Register
  4. Save and commit consolidated-report.html with the feature commit
```

---

### Step 7b — Create Feature Branch & Push to Remote

After the summary report confirms 100% pass, create a branch and push to the remote repository.

#### Required Before Pushing — Ask for Remote Repo URL

Before running any `git push`, confirm the remote repository URL with the developer.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  REMOTE REPOSITORY REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All tests have passed for F-XXX: <Feature Name>.
Ready to push branch and raise PR.

Please provide:
  1. Remote repository URL
     (e.g. https://github.com/<org>/<repo>.git
           git@github.com:<org>/<repo>.git)

  2. Base branch to merge into  [default: main]

  3. Confirm the remote name    [default: origin]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Only proceed once the developer has provided the remote URL and confirmed the base branch.

#### Branch Naming Convention
```
feature/<F-XXX>-<kebab-case-feature-name>

Examples:
  feature/F-001-user-login
  feature/F-004-patient-registration
  feature/F-007-appointment-booking
```

#### Commands
```bash
# Verify or configure the remote
git remote -v
# If remote not set:
git remote add origin <REMOTE_REPO_URL_PROVIDED_BY_DEVELOPER>

# Pull latest from the base branch
git checkout main          # or the confirmed base branch
git pull origin main

# Create feature branch
git checkout -b feature/F-XXX-<feature-name>

# Stage and commit
git add <relevant files>
git commit -m "feat(F-XXX): <short feature description>

- <bullet: what was built>
- <bullet: tests written and passing>
- Reports: TestReports/F-XXX-<Feature-Name>/ (test-summary, code-review, security-review)

Closes: F-XXX
AC: AC-1, AC-2, AC-3 ..."

# Push feature branch to remote
git push -u origin feature/F-XXX-<feature-name>
```

#### Commit Message Format
```
feat(<F-XXX>):     new feature
fix(<F-XXX>):      bug fix
refactor(<F-XXX>): code change without behaviour change
test(<F-XXX>):     test-only change
docs(<F-XXX>):     documentation only
```

---

### Step 7c — Raise Pull Request

Create a PR to merge the feature branch into `main` immediately after pushing.

#### PR Title Format
```
feat(F-XXX): <Feature Name>
```

#### PR Body Template
```markdown
## Feature
**F-XXX — <Feature Name>**
Epic: <Epic Name>

## Summary
- <bullet: what this feature does>
- <bullet: what this feature does>

## Test Results
| Layer          | Total | Passed | Failed |
|----------------|-------|--------|--------|
| Unit (Backend) |       |        |        |
| Unit (Frontend)|       |        |        |
| E2E            |       |        |        |
| **Total**      |       |        |        |

## Reports
| Report | Path |
|--------|------|
| Test Summary | `TestReports/F-XXX-<Feature-Name>/test-summary-report.html` |
| Code Review | `TestReports/F-XXX-<Feature-Name>/code-review-report.html` |
| Security Review | `TestReports/F-XXX-<Feature-Name>/security-review-report.html` |
| Consolidated | `TestReports/consolidated-report.html` |

## Acceptance Criteria
- [ ] AC-1: <description>
- [ ] AC-2: <description>
- [ ] AC-3: <description>

## How to Test Locally
1. <step>
2. <step>
3. <step>
```

#### PR Rules
- Base branch is always `main`
- Every AC must be explicitly listed and checked in the PR body
- The Extent Report path must be included
- A PR must never be raised if any test is failing
- Assign at least one reviewer

#### Command — Option A: GitHub CLI (recommended)
```bash
gh pr create \
  --title "feat(F-XXX): <Feature Name>" \
  --base main \
  --head feature/F-XXX-<feature-name> \
  --body "<PR body from template above>"
```

> **`gh` not installed?**  
> Install it from [cli.github.com](https://cli.github.com) then run `gh auth login`.

#### Command — Option B: Manual via GitHub web (fallback)

When `gh` is not available, the PR URL is printed by `git push` itself:

```
remote: Create a pull request for 'feature/F-XXX-…' on GitHub by visiting:
remote:     https://github.com/<org>/<repo>/pull/new/feature/F-XXX-<feature-name>
```

1. Copy that URL from the push output and open it in a browser.
2. Set **base** to `main` and **compare** to `feature/F-XXX-<feature-name>`.
3. Paste the PR body from the template above into the description field.
4. Click **Create pull request**.

---

### Step 7d — Notify Developer

After the PR is raised, deliver a notification with the PR link and test summary.

#### Notification Template
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FEATURE COMPLETE — F-XXX: <Feature Name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Results
  Unit Tests (Backend)  : <N>/<N>  PASSED ✅
  Unit Tests (Frontend) : <N>/<N>  PASSED ✅
  E2E Tests             : <N>/<N>  PASSED ✅

Code Review     : Approved ✅
Security Review : Cleared ✅

Reports (HTML)
  Test Summary     : TestReports/F-XXX-<Feature-Name>/test-summary-report.html
  Code Review      : TestReports/F-XXX-<Feature-Name>/code-review-report.html
  Security Review  : TestReports/F-XXX-<Feature-Name>/security-review-report.html
  Consolidated     : TestReports/consolidated-report.html

GitHub Branch
  feature/F-XXX-<feature-name>

Pull Request
  <PR_URL>

Action Required
  Please review the PR and approve to merge into main.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Notification Channels (configure per project)
- Console / terminal output (always)
- Email (if configured)
- Slack / Teams webhook (if configured)
- GitHub PR comment (automatic via `gh pr create`)

---

## Definition of Done (DoD)

A feature is **only complete** when every item below is checked:

```
Requirements & Design
[ ] User story written with numbered Acceptance Criteria
[ ] Business rules documented
[ ] Database / schema changes designed
[ ] API contract defined and agreed before coding

Testing
[ ] Unit test cases written (Unit Test Cases/F-XXX/)
[ ] All unit tests pass
[ ] E2E test cases written in Given/When/Then format (Test Cases/F-XXX/)
[ ] All E2E tests pass (run after unit tests)
[ ] All Acceptance Criteria covered by at least one test

Implementation
[ ] Data model / migration applied (no pending changes)
[ ] API endpoints verified via API client / Swagger / Postman
[ ] Access control verified (unauthorised → 401/403)
[ ] Frontend happy path works end-to-end in the browser
[ ] Error states display user-friendly messages
[ ] Seed / fixture data added for fresh-setup support
[ ] No build errors, no compiler warnings, no unhandled exceptions

Code Review (Step 6c) — ALL items PASS
[ ] Logic matches all Acceptance Criteria and Business Rules
[ ] Naming conventions followed (Clean Code standards)
[ ] SOLID principles applied
[ ] DRY — no duplicated logic
[ ] Linter passes with zero errors
[ ] Formatter applied
[ ] Test quality reviewed (Arrange/Act/Assert, no logic in tests)
[ ] No N+1 queries, no unbounded result sets

Security Review (Step 6d — OWASP) — ALL CRITICAL and HIGH items PASS
[ ] Access control verified on every endpoint (OWASP A01)
[ ] Passwords hashed, no secrets in code (OWASP A02)
[ ] No SQL/XSS/Command injection vectors (OWASP A03)
[ ] Rate limiting on sensitive endpoints (OWASP A04)
[ ] Security headers configured, CORS locked down (OWASP A05)
[ ] Dependencies scanned — no known CVEs (OWASP A06)
[ ] Token lifecycle secure — expiry, rotation, revocation (OWASP A07)
[ ] Auth events and sensitive operations logged (OWASP A09)
[ ] API OWASP Top 10 checks passed (API01–API10)
[ ] SAST tool run with no CRITICAL / HIGH findings unresolved
[ ] Dependency scan run with no CRITICAL / HIGH CVEs unresolved

Delivery
[ ] HTML reports generated in TestReports/<F-XXX>-<Feature-Name>/
    [ ] test-summary-report.html  (unit + E2E results)
    [ ] code-review-report.html   (Step 6c findings)
    [ ] security-review-report.html (Step 6d OWASP findings)
[ ] Consolidated report updated: TestReports/consolidated-report.html
[ ] Remote repo URL confirmed with developer
[ ] Feature branch created and pushed: feature/F-XXX-<name>
[ ] PR raised to main — all ACs checked, all report paths included
[ ] Developer notified with PR URL, test summary, and review verdicts
```

---

## Quick Reference Checklist (copy per feature)

```
Feature: ________________________________  ID: F-___

STEP 2 — Analyse Requirement
[ ] User story written
[ ] Business rules documented
[ ] Acceptance criteria numbered (AC-1, AC-2, ...)
[ ] Dependencies listed
[ ] Out of scope documented

STEP 3a — Unit Test Cases
[ ] Unit test specs written (all layers)
[ ] Every AC covered by at least one unit test
[ ] Saved to: Unit Test Cases/F-XXX/UTC-F-XXX-<Feature>.md
[ ] Test code written in project test directory
[ ] All unit tests pass

STEP 3b — E2E Test Cases
[ ] E2E cases written in Given/When/Then format
[ ] Happy path, negative, edge case, security, RBAC covered
[ ] Saved to: Test Cases/F-XXX/TC-F-XXX-<Feature>.md
[ ] All E2E tests pass (run AFTER unit tests)

STEP 4 — Database / Schema
[ ] New/modified entities and fields identified
[ ] Enumerations defined
[ ] Migration name / script prepared

STEP 5 — API Contract
[ ] All endpoints documented (method, URL, auth, request, response, errors)
[ ] Contract agreed before coding begins

STEP 6a — Backend Implementation
[ ] 6-B1  Data model created/updated
[ ] 6-B2  Data layer registered
[ ] 6-B3  Migration applied
[ ] 6-B4  DTOs / schemas created
[ ] 6-B5  Validation rules written
[ ] 6-B6  Business logic / service written
[ ] 6-B7  Controller / handler written with access control
[ ] 6-B8  Dependencies registered
[ ] 6-B9  Endpoints verified in API client

STEP 6b — Frontend Implementation
[ ] 6-F1  Types / interfaces defined
[ ] 6-F2  API client functions written
[ ] 6-F3  UI components built
[ ] 6-F4  Page / screen built
[ ] 6-F5  Route wired with access guards
[ ] 6-F6  Seed / fixture data added

STEP 6c — Code Review (all must PASS before 6d)
[ ] Logic matches all ACs and business rules
[ ] Naming conventions — intention-revealing names
[ ] SOLID principles applied
[ ] DRY — no duplicated logic
[ ] No magic numbers, no commented-out code
[ ] Cyclomatic complexity acceptable (< 10 per method)
[ ] Error handling explicit — no empty catch blocks
[ ] Linter passes with zero errors
[ ] Formatter applied (Prettier / dotnet format / Black)
[ ] Test quality reviewed (AAA pattern, no logic in tests)
[ ] Performance: no N+1 queries, pagination on list endpoints

STEP 6d — Security Review / OWASP (all CRITICAL+HIGH must PASS before Step 7)
[ ] SEC-1  Access control on every endpoint (no accidental public routes)
[ ] SEC-2  Passwords hashed (BCrypt/Argon2), no secrets in source code
[ ] SEC-3  No SQL/XSS/Command injection vectors
[ ] SEC-4  Rate limiting on login and sensitive endpoints
[ ] SEC-5  Security headers set, CORS locked to trusted origins
[ ] SEC-6  Dependency audit — no CRITICAL/HIGH CVEs (npm audit / dotnet vuln)
[ ] SEC-7  JWT expiry, rotation, revocation in place
[ ] SEC-9  Auth events and sensitive operations logged (no PII in logs)
[ ] API    OWASP API Top 10 (API01–API10) verified
[ ] SAST tool run — no CRITICAL/HIGH findings open
[ ] Secrets scan run — no credentials or keys in committed code

STEP 7 — Report → Branch → PR → Notify
[ ] 7a  All unit tests pass + all E2E tests pass
[ ] 7a  test-summary-report.html  → TestReports/F-XXX-<Feature-Name>/
[ ] 7a  code-review-report.html   → TestReports/F-XXX-<Feature-Name>/
[ ] 7a  security-review-report.html → TestReports/F-XXX-<Feature-Name>/
[ ] 7a  consolidated-report.html updated → TestReports/
[ ] 7b  Remote repo URL confirmed with developer
[ ] 7b  Base branch confirmed (default: main)
[ ] 7b  Branch created & pushed: feature/F-XXX-<name>
[ ] 7c  PR raised (all ACs checked, all 3 report paths + consolidated in PR body)
[ ] 7d  Developer notified with PR URL, test summary, code review + security verdicts

DEFINITION OF DONE — ALL boxes above must be checked
```

---

---

## Procedure Versioning & Evolution

This document is a **living standard**. It is expected to improve over time as the team gains experience, adopts new tools, or identifies gaps.

### Version History

| Version | Date | Change Summary | Changed By |
|---------|------|----------------|------------|
| 1.0 | 2026-05-25 | Initial procedure — 4 steps | Team |
| 2.0 | 2026-05-25 | Added Unit Test Cases (Step 3a) and E2E separation | Team |
| 3.0 | 2026-05-25 | Added Extent Report, GitHub branch, PR, and Notify (Step 7) | Team |
| 4.0 | 2026-05-25 | Made fully generic — tech-stack agnostic, applicable to any project | Team |
| 5.0 | 2026-05-25 | Added Step 6c (Code Review — Clean Code, SOLID, linting) and Step 6d (Security Review — OWASP Top 10, ASVS, API Security Top 10) | Team |
| 6.0 | 2026-05-25 | Step 7a expanded: feature-wise HTML reports for test results, code review, and security review stored in Test Cases/; added project-wide consolidated-report.html updated after every feature delivery | Team |
| 7.0 | 2026-05-26 | Step 7c: added Option B (manual PR via GitHub web) as a fallback when `gh` CLI is not installed; URL is printed by `git push` output | Team |

### How to Propose a Change

1. Open a discussion with the team (Slack, meeting, or GitHub Issue)
2. Describe: **what** to change, **why** it improves quality or efficiency, and any **risks**
3. Apply the change to this file
4. Increment the version number and add a row to the Version History table above
5. Notify all team members that the procedure has been updated

### What May Evolve (examples)

| Area | Possible Future Improvement |
|------|----------------------------|
| Step 3a | Add mutation testing (e.g. Stryker) as a quality gate |
| Step 3b | Add performance / load tests as a separate sub-step |
| Step 7a | Publish Extent Reports to a shared web server automatically |
| Step 7c | Add automated PR reviewers and CI checks as required gates |
| Step 7d | Add Slack / Teams / email notification automation |
| General | Add security scanning (SAST/DAST) as a gate before Step 7 |
| General | Add a code review checklist as a sub-step of Step 6 |

### What Must Never Change

These gates are non-negotiable regardless of project pressure:

- Unit tests must pass before E2E tests run
- All tests must pass before a branch is pushed
- All tests must pass before a PR is raised
- Every AC must be covered by at least one test case
- Steps must not be skipped or reordered

---

*Procedure version: 7.0 — Updated: 2026-05-26*
*This document is universal and mandatory for every feature on every project.*
*Adapt the tooling to your stack — the steps and gates never change.*
