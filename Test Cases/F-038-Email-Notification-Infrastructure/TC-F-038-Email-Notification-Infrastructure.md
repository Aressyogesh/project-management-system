Feature ID   : F-038
Feature Name : Email Notification Infrastructure
Framework    : Jest (integration — no UI)

---

Test Case ID : TC-F038-001
Title        : ForgotPassword_ExistingUser_EmailDelivered
Feature      : F-038 — Email Notification Infrastructure
AC Covered   : AC-1, AC-3
Priority     : High
Type         : Happy Path

Given  : A registered active user exists (yogesh.lolage@aress.com)
  And  : SMTP env vars point to cp1.aress.net:465
When   : POST /api/v1/auth/forgot-password { email: 'yogesh.lolage@aress.com' }
Then   : Response is HTTP 204
  And  : No error in pm2 logs
  And  : Email arrives in inbox with subject "Reset your PMS password"
  And  : Email body contains the branded PMS header (indigo)
  And  : Email body contains a reset link

Expected Response : HTTP 204 No Content

---

Test Case ID : TC-F038-002
Title        : SendEmail_SmtpDown_Returns500
Feature      : F-038 — Email Notification Infrastructure
AC Covered   : AC-5
Priority     : High
Type         : Negative

Given  : SMTP_HOST is set to an unreachable host
When   : POST /api/v1/auth/forgot-password { email: 'registered@pms.com' }
Then   : Response is HTTP 500
  And  : Backend logs contain ERROR from EmailService

Expected Response : HTTP 500 Internal Server Error

---

Test Case ID : TC-F038-003
Title        : WrapHtml_Output_ContainsBrandingElements
Feature      : F-038 — Email Notification Infrastructure
AC Covered   : AC-2
Priority     : Medium
Type         : Happy Path

Given  : EmailService is instantiated with valid config
When   : wrapHtml('Test Title', '<p>Test body content</p>') is called
Then   : Returned HTML contains DOCTYPE declaration
  And  : Contains 'PMS' branding in the header
  And  : Contains 'Project Management System' subtitle
  And  : Contains the provided title
  And  : Contains the provided body content
  And  : Contains footer disclaimer text

---

Test Case ID : TC-F038-004
Title        : ForgotPassword_UnknownEmail_Returns204AndNoEmailSent
Feature      : F-038 — Email Notification Infrastructure
AC Covered   : AC-1
Priority     : High
Type         : Security (account enumeration prevention)

Given  : Email address does not exist in the system
When   : POST /api/v1/auth/forgot-password { email: 'ghost@unknown.com' }
Then   : Response is HTTP 204 (same as success — no enumeration)
  And  : No email is dispatched
  And  : No error thrown

Expected Response : HTTP 204 No Content
