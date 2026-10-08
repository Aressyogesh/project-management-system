# UTC-F-003 — Holiday Calendar Unit Test Cases

---

UTC-F003-B-001
Title        : getHolidays_NoFilter_ReturnsAllHolidays
Layer        : Backend — SettingsService
AC Covered   : AC-1
Arrange : Mock prisma.holiday.findMany() → returns 5 holidays
Act     : service.getHolidays({})
Assert  : Returns array of 5; findMany called without year filter

---

UTC-F003-B-002
Title        : getHolidays_WithYearFilter_ReturnsFilteredHolidays
Layer        : Backend — SettingsService
AC Covered   : AC-1
Arrange : Mock prisma.holiday.findMany() → returns 3 holidays for 2026
Act     : service.getHolidays({ year: 2026 })
Assert  : findMany called with date gte 2026-01-01 and lte 2026-12-31

---

UTC-F003-B-003
Title        : createHoliday_ValidInput_ReturnsCreatedHoliday
Layer        : Backend — SettingsService
AC Covered   : AC-2
Arrange : Mock prisma.holiday.create() → returns new holiday
Act     : service.createHoliday({ name:'Diwali', date:'2026-10-20', isRecurring:false })
Assert  : Returns holiday with id

---

UTC-F003-B-004
Title        : createHoliday_DuplicateDate_ThrowsConflict
Layer        : Backend — SettingsService
AC Covered   : AC-2
Arrange : Mock prisma.holiday.findUnique({ where: { date } }) → returns existing holiday
Act     : service.createHoliday({ date:'2026-01-26', ... })
Assert  : Throws ConflictException "A holiday already exists on this date"

---

UTC-F003-B-005
Title        : deleteHoliday_ValidId_DeletesRecord
Layer        : Backend — SettingsService
AC Covered   : AC-3
Arrange : Mock prisma.holiday.findUnique() → returns holiday; prisma.holiday.delete() → success
Act     : service.deleteHoliday('uuid')
Assert  : prisma.holiday.delete called once with correct id

---

UTC-F003-B-006
Title        : deleteHoliday_EmployeeRole_Returns403
Layer        : Backend — RolesGuard
AC Covered   : AC-4
Arrange : Request with EMPLOYEE JWT token
Act     : DELETE /api/v1/settings/holidays/:id
Assert  : Returns HTTP 403 Forbidden

---

UTC-F003-F-001
Title        : HolidaySection_RendersForCurrentYear
Layer        : Frontend — PortalConfigPage
AC Covered   : AC-5, AC-6
Arrange : Mock API returns holidays for current year
Act     : Render Portal Config page; expand Holidays section
Assert  : Year selector shows current year; holiday list renders

---

UTC-F003-F-002
Title        : HolidaySection_AddHoliday_CallsCreateMutation
Layer        : Frontend — PortalConfigPage
AC Covered   : AC-8
Arrange : Render Holidays section; fill name + date inputs
Act     : Click "Add Holiday"
Assert  : createHoliday mutation called with { name, date, isRecurring }

---

UTC-F003-F-003
Title        : HolidaySection_DeleteButton_CallsDeleteMutation
Layer        : Frontend — PortalConfigPage
AC Covered   : AC-7
Arrange : Render Holidays section with 2 holidays
Act     : Click delete on first holiday
Assert  : deleteHoliday mutation called with that holiday's id
