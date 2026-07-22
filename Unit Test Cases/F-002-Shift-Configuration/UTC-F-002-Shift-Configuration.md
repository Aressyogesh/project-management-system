# UTC-F-002 — Shift Configuration Unit Test Cases

---

UTC-F002-B-001
Title        : getShifts_AllRoles_ReturnsShiftList
Layer        : Backend — SettingsService
AC Covered   : AC-1
Arrange : Mock prisma.shift.findMany() → returns array of 3 shifts
Act     : service.getShifts()
Assert  : Returns array; no error thrown

---

UTC-F002-B-002
Title        : createShift_ValidInput_ReturnsCreatedShift
Layer        : Backend — SettingsService
AC Covered   : AC-2
Arrange : Mock prisma.shift.create() → returns new shift object
Act     : service.createShift({ name:'Day', shiftType:'DAY', startTime:'10:00', endTime:'19:00', workHours:8 })
Assert  : Returns shift with id; prisma.shift.create called once

---

UTC-F002-B-003
Title        : createShift_DuplicateShiftType_ThrowsConflict
Layer        : Backend — SettingsService
AC Covered   : AC-2
Arrange : Mock prisma.shift.findUnique() → returns existing shift (DAY already exists)
Act     : service.createShift({ shiftType:'DAY', ... })
Assert  : Throws ConflictException with message "Shift type DAY already exists"

---

UTC-F002-B-004
Title        : updateShift_ValidId_ReturnsUpdatedShift
Layer        : Backend — SettingsService
AC Covered   : AC-3
Arrange : Mock prisma.shift.findUnique() → returns shift; prisma.shift.update() → returns updated shift
Act     : service.updateShift('uuid', { startTime:'09:00', endTime:'18:00' })
Assert  : Returns updated shift; prisma.shift.update called with correct data

---

UTC-F002-B-005
Title        : updateShift_NotFound_ThrowsNotFoundException
Layer        : Backend — SettingsService
AC Covered   : AC-3
Arrange : Mock prisma.shift.findUnique() → returns null
Act     : service.updateShift('bad-id', { startTime:'09:00' })
Assert  : Throws NotFoundException

---

UTC-F002-B-006
Title        : createShift_EmployeeRole_Returns403
Layer        : Backend — RolesGuard
AC Covered   : AC-4
Arrange : Request with EMPLOYEE JWT token
Act     : POST /api/v1/settings/shifts
Assert  : Returns HTTP 403 Forbidden

---

UTC-F002-F-001
Title        : ShiftConfigPage_RendersThreeShiftRows
Layer        : Frontend — ShiftConfigPage
AC Covered   : AC-5
Arrange : Mock API returns 3 shifts (DAY, AFTERNOON, NIGHT)
Act     : Render <ShiftConfigPage />
Assert  : Three rows rendered; each shows shiftType label, startTime, endTime, workHours inputs

---

UTC-F002-F-002
Title        : ShiftRow_SaveButton_CallsMutationWithUpdatedValues
Layer        : Frontend — ShiftConfigPage
AC Covered   : AC-6
Arrange : Render with 1 shift; change startTime input value
Act     : Click "Save" button on row
Assert  : useMutation mutate() called with { id, startTime: newValue }
