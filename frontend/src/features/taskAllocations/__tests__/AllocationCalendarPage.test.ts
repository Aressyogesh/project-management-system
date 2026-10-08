import {
  buildCalendarWeeks,
  toLocalDateStr,
  dayColor,
  hoursBarColor,
} from '../pages/AllocationCalendarPage';

// --- buildCalendarWeeks ---

// UTC-F018-FE-001
it('BuildCalendarWeeks_May2026_FirstRealCellIsFriday', () => {
  // May 1 2026 is a Friday (index 4 in Mon-indexed week)
  const weeks = buildCalendarWeeks(2026, 4);
  expect(weeks[0]).toHaveLength(7);
  expect(weeks[0][0]).toBeNull(); // Mon
  expect(weeks[0][1]).toBeNull(); // Tue
  expect(weeks[0][2]).toBeNull(); // Wed
  expect(weeks[0][3]).toBeNull(); // Thu
  expect(weeks[0][4]).not.toBeNull();
  expect((weeks[0][4] as Date).getDate()).toBe(1);
});

// UTC-F018-FE-002
it('BuildCalendarWeeks_March2026_FirstRealCellIsSunday', () => {
  // March 1 2026 is a Sunday (index 6 in Mon-indexed week)
  const weeks = buildCalendarWeeks(2026, 2);
  for (let i = 0; i <= 5; i++) expect(weeks[0][i]).toBeNull();
  expect((weeks[0][6] as Date).getDate()).toBe(1);
});

// UTC-F018-FE-003
it('BuildCalendarWeeks_AllWeeksHaveSevenColumns', () => {
  const weeks = buildCalendarWeeks(2026, 0); // January 2026
  for (const week of weeks) expect(week).toHaveLength(7);
  expect(weeks.length).toBeGreaterThanOrEqual(4);
  expect(weeks.length).toBeLessThanOrEqual(6);
});

// UTC-F018-FE-004
it('BuildCalendarWeeks_May2026_Contains31Dates', () => {
  const weeks = buildCalendarWeeks(2026, 4);
  const allDates = weeks.flat().filter(Boolean) as Date[];
  expect(allDates).toHaveLength(31);
  expect(allDates[allDates.length - 1].getDate()).toBe(31);
});

// UTC-F018-FE-005
it('BuildCalendarWeeks_LeapYear2028Feb_Contains29Dates', () => {
  const weeks = buildCalendarWeeks(2028, 1);
  const allDates = weeks.flat().filter(Boolean) as Date[];
  expect(allDates).toHaveLength(29);
  expect(allDates[allDates.length - 1].getDate()).toBe(29);
});

// --- toLocalDateStr ---

// UTC-F018-FE-006
it('ToLocalDateStr_PadsMonthAndDay', () => {
  expect(toLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
});

// UTC-F018-FE-007
it('ToLocalDateStr_NoUTCShift_December31', () => {
  expect(toLocalDateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
});

// --- dayColor ---

// UTC-F018-FE-008
it('DayColor_ZeroHours_ReturnsEmpty', () => {
  expect(dayColor(0)).toBe('');
});

// UTC-F018-FE-009
it('DayColor_UnderSixHours_ContainsGreen', () => {
  expect(dayColor(1)).toContain('green');
  expect(dayColor(3.5)).toContain('green');
  expect(dayColor(5.9)).toContain('green');
});

// UTC-F018-FE-010
it('DayColor_SixToUnderEightHours_ContainsYellow', () => {
  expect(dayColor(6)).toContain('yellow');
  expect(dayColor(7.5)).toContain('yellow');
  expect(dayColor(7.9)).toContain('yellow');
});

// UTC-F018-FE-011
it('DayColor_EightHours_ContainsRed', () => {
  expect(dayColor(8)).toContain('red');
});

// --- hoursBarColor ---

// UTC-F018-FE-012
it('HoursBarColor_UnderSixHours_ContainsGreen', () => {
  expect(hoursBarColor(3)).toContain('green');
});

// UTC-F018-FE-013
it('HoursBarColor_SixToUnderEightHours_ContainsYellow', () => {
  expect(hoursBarColor(6.5)).toContain('yellow');
});

// UTC-F018-FE-014
it('HoursBarColor_EightOrMore_ContainsRed', () => {
  expect(hoursBarColor(8)).toContain('red');
});
