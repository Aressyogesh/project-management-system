Feature ID   : F-038
Feature Name : Email Notification Infrastructure
Epic         : PMS — Smart Email Notifications & Workflow Automation (Phase 15)
Priority     : High
Roles        : System (internal service — no direct user interaction)

User Story
----------
As the PMS system, I want a reusable email sending service so that all notification
features (F-039–F-042) can send consistently branded emails without duplicating
transport configuration or HTML template logic.

Business Rules
--------------
BR-1: All emails must use the existing company SMTP transport (cp1.aress.net:465 SSL).
BR-2: A single generic `sendEmail(to, subject, html)` method must be exposed so any
      NestJS service can send an email without knowing SMTP details.
BR-3: A reusable `wrapHtml(title, bodyHtml)` helper must produce branded HTML with the
      same header/footer style as the forgot-password email (indigo header, PMS logo,
      white card, footer disclaimer).
BR-4: The EmailModule must remain globally available — no feature module should need to
      import it explicitly.
BR-5: SMTP credentials must never be hard-coded; they must be read from ConfigService.
BR-6: Email send failures must be logged as errors but must NOT crash the caller —
      errors are caught and re-thrown so callers can decide handling strategy.
BR-7: No new npm packages required — Nodemailer is already installed.

Acceptance Criteria
-------------------
AC-1: `EmailService.sendEmail(to, subject, html)` sends an email via company SMTP and
      resolves successfully when the server accepts the message.
AC-2: `EmailService.wrapHtml(title, bodyHtml)` returns a complete HTML document with
      the PMS-branded header (indigo), a white card body, and a footer disclaimer.
AC-3: The existing `sendPasswordReset` method continues to work and now internally
      calls `wrapHtml` + `sendEmail` to reduce duplication.
AC-4: EmailModule is decorated `@Global()` so downstream modules (NotificationsModule,
      UsersModule, etc.) can inject EmailService without importing EmailModule.
AC-5: When the SMTP server rejects the message, EmailService logs an ERROR and
      re-throws so the caller handles the failure.
AC-6: No new environment variables are required — existing SMTP_* vars are sufficient.

Dependencies
------------
- F-037 (Forgot Password) — EmailService and EmailModule already exist; this feature
  extends them.
- `backend/.env` with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME,
  SMTP_FROM_EMAIL already set.

Out of Scope
------------
- Actual notification triggers (deadlines, timesheets) — those belong to F-039/F-040.
- Email open/click tracking.
- Unsubscribe management.
- Email queue / retry logic (deferred to F-039+).
- HTML email builder UI.

---

## Database / Schema Design (Step 4)

No schema changes required. F-038 is a pure service-layer enhancement — no new
Prisma models, no new tables, no migrations needed.

---

## API Contract Design (Step 5)

F-038 is an internal service with no new HTTP endpoints. It exposes TypeScript
methods consumed by other services:

### EmailService public interface

```typescript
// Send any email (generic)
sendEmail(to: string, subject: string, html: string): Promise<void>

// Wrap body content in branded PMS HTML template
wrapHtml(title: string, bodyHtml: string): string

// Send password reset email (refactored to use sendEmail + wrapHtml internally)
sendPasswordReset(to: string, fullName: string, resetLink: string): Promise<void>
```

No changes to existing REST endpoints (`POST /auth/forgot-password`,
`POST /auth/reset-password`).
