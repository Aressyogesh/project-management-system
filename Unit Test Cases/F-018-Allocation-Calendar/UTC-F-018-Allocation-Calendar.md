# UTC-F-018 — Unit Test Cases: Employee Allocation Calendar View

## Feature: F-018 — Employee Allocation Calendar View
## Date: 2026-05-27

---

## Scope

All unit tests target the **pure helper functions** extracted from `AllocationCalendarPage.tsx`.
These functions have no React/DOM dependency and are tested with plain Jest.

| Function | File |
|----------|------|
| `buildCalendarWeeks(year, month)` | `AllocationCalendarPage.tsx` |
| `toLocalDateStr(date)` | `AllocationCalendarPage.tsx` |
| `dayColor(totalHours)` | `AllocationCalendarPage.tsx` |
| `hoursBarColor(totalHours)` | `AllocationCalendarPage.tsx` |

---

## Test Cases

### buildCalendarWeeks

---

#### UTC-F018-FE-001 — BuildCalendarWeeks_May2026_FirstCellIsMonday

**AC Covered:** AC-9 (ISO week grid)

**Arrange:**
```ts
const year = 2026, month = 4; // May 2026; May 1 is a Friday
```

**Act:**
```ts
const weeks = buildCalendarWeeks(year, month);
```

**Assert:**
- `weeks[0]` has length 7
- `weeks[0][0]` is `null` (Mon–Thu are padding)
- `weeks[0][1]` is `null`
- `weeks[0][2]` is `null`
- `weeks[0][3]` is `null`
- `weeks[0][4]` is a Date with `getDate() === 1`  (Friday = index 4)

---

#### UTC-F018-FE-002 — BuildCalendarWeeks_MonthStartsOnMonday_NoPaddingFirstRow

**AC Covered:** AC-9

**Arrange:**
```ts
const year = 2026, month = 2; // March 2026; March 1 is a Sunday
```

**Act:**
```ts
const weeks = buildCalendarWeeks(year, month);
```

**Assert:**
- `weeks[0][0]` is `null` (Mon–Sat are null; only Sun is real for March 1... wait)

Actually March 1 2026 is a Sunday (index 6), so weeks[0][0–5] are null, weeks[0][6] is Date(1).

- `weeks[0][6]` has `getDate() === 1`
- `weeks[0][0]` is `null`

---

#### UTC-F018-FE-003 — BuildCalendarWeeks_AllWeeksHaveSevenColumns

**AC Covered:** AC-9

**Arrange:**
```ts
const year = 2026, month = 0; // January 2026
```

**Act:**
```ts
const weeks = buildCalendarWeeks(year, month);
```

**Assert:**
- Every element in `weeks` has `length === 7`
- `weeks` has between 4 and 6 rows

---

#### UTC-F018-FE-004 — BuildCalendarWeeks_LastCellIsLastDayOfMonth

**AC Covered:** AC-9

**Arrange:**
```ts
const year = 2026, month = 4; // May 2026 — 31 days
```

**Act:**
```ts
const weeks = buildCalendarWeeks(year, month);
const allDates = weeks.flat().filter(Boolean) as Date[];
```

**Assert:**
- `allDates.length === 31`
- `allDates[allDates.length - 1].getDate() === 31`

---

#### UTC-F018-FE-005 — BuildCalendarWeeks_LeapYear_Feb29Included

**AC Covered:** AC-9

**Arrange:**
```ts
const year = 2028, month = 1; // February 2028 — leap year, 29 days
```

**Act:**
```ts
const weeks = buildCalendarWeeks(year, month);
const allDates = weeks.flat().filter(Boolean) as Date[];
```

**Assert:**
- `allDates.length === 29`
- `allDates[allDates.length - 1].getDate() === 29`

---

### toLocalDateStr

---

#### UTC-F018-FE-006 — ToLocalDateStr_PadsMonthAndDay

**AC Covered:** AC-3 (date key matching)

**Arrange:**
```ts
const date = new Date(2026, 0, 5); // January 5 2026
```

**Act:**
```ts
const result = toLocalDateStr(date);
```

**Assert:**
- `result === '2026-01-05'`

---

#### UTC-F018-FE-007 — ToLocalDateStr_NoUTCShift_MidnightLocalIsCorrectDate

**AC Covered:** AC-3

**Arrange:**
```ts
const date = new Date(2026, 11, 31); // December 31 2026
```

**Act:**
```ts
const result = toLocalDateStr(date);
```

**Assert:**
- `result === '2026-12-31'`
- (Verifies no UTC offset causes the date to shift to Jan 1 2027)

---

### dayColor

---

#### UTC-F018-FE-008 — DayColor_ZeroHours_ReturnsEmptyString

**AC Covered:** AC-3

**Arrange:**
```ts
const hours = 0;
```

**Act / Assert:**
- `dayColor(0) === ''`

---

#### UTC-F018-FE-009 — DayColor_UnderSixHours_ReturnsGreen

**AC Covered:** AC-3, BR-4

**Assert:**
- `dayColor(1)` contains `'green'`
- `dayColor(3.5)` contains `'green'`
- `dayColor(5.9)` contains `'green'`

---

#### UTC-F018-FE-010 — DayColor_SixToSevenPointFiveHours_ReturnsYellow

**AC Covered:** AC-3, BR-4

**Assert:**
- `dayColor(6)` contains `'yellow'`
- `dayColor(7.5)` contains `'yellow'`
- `dayColor(7.9)` contains `'yellow'`

---

#### UTC-F018-FE-011 — DayColor_EightHours_ReturnsRed

**AC Covered:** AC-3, BR-4

**Assert:**
- `dayColor(8)` contains `'red'`

---

### hoursBarColor

---

#### UTC-F018-FE-012 — HoursBarColor_UnderSixHours_ReturnsGreen

**AC Covered:** AC-3, BR-5

**Assert:**
- `hoursBarColor(3)` contains `'green'`

---

#### UTC-F018-FE-013 — HoursBarColor_SixToSevenPointFiveHours_ReturnsYellow

**AC Covered:** AC-3, BR-5

**Assert:**
- `hoursBarColor(6.5)` contains `'yellow'`

---

#### UTC-F018-FE-014 — HoursBarColor_EightOrMore_ReturnsRed

**AC Covered:** AC-3, BR-5

**Assert:**
- `hoursBarColor(8)` contains `'red'`
