// Static Monthly Capacity data — May 2026
// May 1, 2026 = Friday (Labour Day public holiday)
// Working weekdays (Mon–Fri minus holiday): 4,5,6,7,8,11,12,13,14,15,18,19,20,21,22,25,26,27,28,29

type CellStatus = 'holiday' | 'weekly_off' | 'leave' | 'occupied' | 'partial' | 'available';

export interface CapacityDay {
  day: number;
  dayOfWeek: string;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export interface CapacityCell {
  day: number;
  status: CellStatus;
  hours: number;
  holidayName?: string;
}

export interface CapacityEmployee {
  userId: string;
  name: string;
  role: string;
  cells: CapacityCell[];
  summary: { occupiedDays: number; leaveDays: number; availableDays: number };
}

export interface StaticCapacityReport {
  period: string;
  year: number;
  month: number;
  daysInMonth: number;
  days: CapacityDay[];
  employees: CapacityEmployee[];
}

// ─── May 2026 day metadata ────────────────────────────────────────────────────

const MAY2026_DAYS: CapacityDay[] = [
  { day:  1, dayOfWeek: 'friday',    isWeeklyOff: false, isHoliday: true,  holidayName: 'Labour Day' },
  { day:  2, dayOfWeek: 'saturday',  isWeeklyOff: true,  isHoliday: false },
  { day:  3, dayOfWeek: 'sunday',    isWeeklyOff: true,  isHoliday: false },
  { day:  4, dayOfWeek: 'monday',    isWeeklyOff: false, isHoliday: false },
  { day:  5, dayOfWeek: 'tuesday',   isWeeklyOff: false, isHoliday: false },
  { day:  6, dayOfWeek: 'wednesday', isWeeklyOff: false, isHoliday: false },
  { day:  7, dayOfWeek: 'thursday',  isWeeklyOff: false, isHoliday: false },
  { day:  8, dayOfWeek: 'friday',    isWeeklyOff: false, isHoliday: false },
  { day:  9, dayOfWeek: 'saturday',  isWeeklyOff: true,  isHoliday: false },
  { day: 10, dayOfWeek: 'sunday',    isWeeklyOff: true,  isHoliday: false },
  { day: 11, dayOfWeek: 'monday',    isWeeklyOff: false, isHoliday: false },
  { day: 12, dayOfWeek: 'tuesday',   isWeeklyOff: false, isHoliday: false },
  { day: 13, dayOfWeek: 'wednesday', isWeeklyOff: false, isHoliday: false },
  { day: 14, dayOfWeek: 'thursday',  isWeeklyOff: false, isHoliday: false },
  { day: 15, dayOfWeek: 'friday',    isWeeklyOff: false, isHoliday: false },
  { day: 16, dayOfWeek: 'saturday',  isWeeklyOff: true,  isHoliday: false },
  { day: 17, dayOfWeek: 'sunday',    isWeeklyOff: true,  isHoliday: false },
  { day: 18, dayOfWeek: 'monday',    isWeeklyOff: false, isHoliday: false },
  { day: 19, dayOfWeek: 'tuesday',   isWeeklyOff: false, isHoliday: false },
  { day: 20, dayOfWeek: 'wednesday', isWeeklyOff: false, isHoliday: false },
  { day: 21, dayOfWeek: 'thursday',  isWeeklyOff: false, isHoliday: false },
  { day: 22, dayOfWeek: 'friday',    isWeeklyOff: false, isHoliday: false },
  { day: 23, dayOfWeek: 'saturday',  isWeeklyOff: true,  isHoliday: false },
  { day: 24, dayOfWeek: 'sunday',    isWeeklyOff: true,  isHoliday: false },
  { day: 25, dayOfWeek: 'monday',    isWeeklyOff: false, isHoliday: false },
  { day: 26, dayOfWeek: 'tuesday',   isWeeklyOff: false, isHoliday: false },
  { day: 27, dayOfWeek: 'wednesday', isWeeklyOff: false, isHoliday: false },
  { day: 28, dayOfWeek: 'thursday',  isWeeklyOff: false, isHoliday: false },
  { day: 29, dayOfWeek: 'friday',    isWeeklyOff: false, isHoliday: false },
  { day: 30, dayOfWeek: 'saturday',  isWeeklyOff: true,  isHoliday: false },
  { day: 31, dayOfWeek: 'sunday',    isWeeklyOff: true,  isHoliday: false },
];

// ─── Cell builder ─────────────────────────────────────────────────────────────
// Pattern = 20 chars for the 20 working weekdays in order
// O = occupied (8h)  P = partial (4h)  L = leave (0h)  A = available (0h)

function buildCells(days: CapacityDay[], pattern: string): CapacityCell[] {
  const cells: CapacityCell[] = [];
  let wi = 0;
  for (const d of days) {
    if (d.isHoliday) {
      cells.push({ day: d.day, status: 'holiday', hours: 0, holidayName: d.holidayName });
    } else if (d.isWeeklyOff) {
      cells.push({ day: d.day, status: 'weekly_off', hours: 0 });
    } else {
      const ch = pattern[wi++] ?? 'A';
      cells.push({
        day: d.day,
        status: ch === 'O' ? 'occupied' : ch === 'P' ? 'partial' : ch === 'L' ? 'leave' : 'available',
        hours: ch === 'O' ? 8 : ch === 'P' ? 4 : 0,
      });
    }
  }
  return cells;
}

function calcSummary(pattern: string) {
  return {
    occupiedDays:  [...pattern].filter((c) => c === 'O').length,
    leaveDays:     [...pattern].filter((c) => c === 'L').length,
    availableDays: [...pattern].filter((c) => c === 'A').length,
  };
}

// ─── Employee patterns (20 working days) ─────────────────────────────────────

const EMPLOYEE_PATTERNS = [
  { userId: '49fad96a-559a-4105-9cb9-b888e97f54c4', name: 'Hemant Atre',        role: 'Senior Developer', pattern: 'OOOOOOOOOOOOOOOOOOOO' },
  { userId: 'be927bba-6130-4361-8bd2-f7569bfc5903', name: 'Yogesh Lolage',      role: 'Team Lead',        pattern: 'OOOOOOOOOOPOOOOOOOOO' },
  { userId: '907700b2-4cea-4e70-91c4-313b99046f5e', name: 'Pratiksha Khairnar', role: 'QA Engineer',      pattern: 'OOOOOOOOOOPOOOOOPOOO' },
  { userId: 'e10eba00-cd85-4933-abc9-82c335f0a201', name: 'System Admin',       role: 'Admin',            pattern: 'OOOOOOOOOOPOOOPOOAOO' },
  { userId: 'e828e62b-a73e-460f-9201-1da121732e9f', name: 'Gaurav Patil',       role: 'Developer',        pattern: 'OOOOOPOOOOOOOOOPOOOO' },
  { userId: '68665a5e-fd7a-435f-ad60-cdea8179fa30', name: 'Shital Joshi',       role: 'Developer',        pattern: 'OOOPOOOOOOOOOPOOOOOO' },
  { userId: '75482b9f-45ab-42c0-9cd2-cf6c15f89c17', name: 'Deepali Jawharkar',  role: 'Designer',         pattern: 'OOOOOOOPOOOOOOOOPAOO' },
  { userId: 'adde42f0-6b96-48c9-99c8-1a91cde645ed', name: 'Prashik Shirsat',    role: 'Developer',        pattern: 'OOOOOOOOPOOOOOOPOOAO' },
  { userId: 'b6a87b34-491b-4a6e-bfa2-8c37be562c33', name: 'John Developer',     role: 'Developer',        pattern: 'OOOOOOOOPOLOOOPOOAAO' },
  { userId: '3110773f-7e26-4a8b-8ec5-aaac112f12c0', name: 'Ganesh Khalkar',     role: 'Developer',        pattern: 'OOOOOPOOLOOOOPOAOAOO' },
  { userId: 'ffeaf90e-a2dc-4900-9125-3a28a515130f', name: 'Rohit More',         role: 'Developer',        pattern: 'OOLOOPOOOOLOOOAPOOAO' },
  { userId: '052f928c-896d-4b39-a276-21759f6beb27', name: 'Yash Boraste',       role: 'Developer',        pattern: 'OOLOOPOOOLLOOOAPOOAO' },
  { userId: '2dd7b0e2-0d2a-4ff1-b735-e41469aaa5fc', name: 'Super Admin',        role: 'Super Admin',      pattern: 'ALLAOPOOAOLLOOAPOOAA' },
  { userId: 'f887a347-4aac-47de-a0cf-471b536be9d7', name: 'Jayvant Bagul',      role: 'DevOps Engineer',  pattern: 'ALLOAPOOAOLLOOAPOAOA' },
];

// ─── Exported static dataset ──────────────────────────────────────────────────

export const STATIC_CAPACITY_DATA: Record<string, StaticCapacityReport> = {
  '2026-05': {
    period: '2026-05',
    year: 2026,
    month: 5,
    daysInMonth: 31,
    days: MAY2026_DAYS,
    employees: EMPLOYEE_PATTERNS.map(({ userId, name, role, pattern }) => ({
      userId,
      name,
      role,
      cells: buildCells(MAY2026_DAYS, pattern),
      summary: calcSummary(pattern),
    })),
  },
};
