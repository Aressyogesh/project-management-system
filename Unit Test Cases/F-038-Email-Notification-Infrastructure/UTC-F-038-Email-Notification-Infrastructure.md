Feature ID   : F-038
Feature Name : Email Notification Infrastructure
Layer        : Backend
Framework    : Jest (NestJS Testing)

---

Unit Test ID : UTC-F038-B-001
Title        : SendEmail_ValidParams_CallsSendMailOnce
Layer        : Backend
Class / File : EmailService
AC Covered   : AC-1
Framework    : Jest

Arrange:
  - Mock nodemailer.createTransport to return { sendMail: jest.fn().mockResolvedValue({}) }
  - Instantiate EmailService with mocked ConfigService returning SMTP config values

Act:
  - await service.sendEmail('user@example.com', 'Test Subject', '<p>Hello</p>')

Assert:
  - transporter.sendMail called once
  - sendMail called with { to: 'user@example.com', subject: 'Test Subject', html: '<p>Hello</p>' }

---

Unit Test ID : UTC-F038-B-002
Title        : WrapHtml_ValidTitleAndBody_ReturnsCompleteHtmlDocument
Layer        : Backend
Class / File : EmailService
AC Covered   : AC-2
Framework    : Jest

Arrange:
  - Instantiate EmailService

Act:
  - result = service.wrapHtml('Welcome', '<p>Hello World</p>')

Assert:
  - result contains '<!DOCTYPE html>'
  - result contains 'Welcome'
  - result contains '<p>Hello World</p>'
  - result contains 'PMS' (branded header)
  - result contains 'Project Management System'

---

Unit Test ID : UTC-F038-B-003
Title        : SendPasswordReset_ValidParams_CallsSendEmailWithWrappedHtml
Layer        : Backend
Class / File : EmailService
AC Covered   : AC-3
Framework    : Jest

Arrange:
  - Spy on service.sendEmail and service.wrapHtml
  - Mock sendEmail to resolve successfully

Act:
  - await service.sendPasswordReset('user@pms.com', 'John Doe', 'http://localhost/reset?token=abc')

Assert:
  - service.wrapHtml called once with title containing 'Reset' or 'Password'
  - service.sendEmail called once with to='user@pms.com'
  - html passed to sendEmail contains 'http://localhost/reset?token=abc'
  - html passed to sendEmail contains 'John Doe'

---

Unit Test ID : UTC-F038-B-004
Title        : SendEmail_SmtpRejects_LogsErrorAndRethrows
Layer        : Backend
Class / File : EmailService
AC Covered   : AC-5
Framework    : Jest

Arrange:
  - Mock transporter.sendMail to reject with new Error('Connection refused')
  - Spy on Logger.error

Act:
  - await expect(service.sendEmail('u@example.com', 'Sub', '<p>body</p>')).rejects.toThrow('Connection refused')

Assert:
  - Logger.error called once
  - Error propagated to caller (not swallowed)

---

Unit Test ID : UTC-F038-B-005
Title        : SendEmail_ReadsFromAddressFromConfig_UsesConfigValues
Layer        : Backend
Class / File : EmailService
AC Covered   : AC-6
Framework    : Jest

Arrange:
  - Mock ConfigService.get to return known SMTP values
  - Mock transporter.sendMail to resolve

Act:
  - await service.sendEmail('dest@example.com', 'Sub', '<p>body</p>')

Assert:
  - sendMail called with from containing the configured SMTP_FROM_EMAIL value
  - No hard-coded email addresses in the from field
