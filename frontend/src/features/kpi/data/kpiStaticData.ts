import type {
  KpiGrade,
  KpiMetricDefinition,
  KpiMetricScore,
  KpiCategoryScore,
  EmployeeKpiRecord,
  KpiTeamSummary,
} from '../../../types/kpi.types';
import type { LiveEmployeeKpiRecord } from '../../../api/analyticsApi';

// ─── Metric Definitions (from Digital Appraisal System.xlsx) ──────────────────

export const KPI_METRICS: KpiMetricDefinition[] = [
  // ── Diligent and Committed › Delivery & Execution ─────────────────────────
  {
    id: 'sprint_reliability',
    name: 'Sprint Reliability',
    subTitle: 'Work Items Reaching QA vs Total Assigned (excluding Blocked)',
    shortName: 'Sprint',
    coreValue: 'Diligent and Committed',
    subCategory: 'Delivery & Execution',
    weightage: 0.10,
    maxPoints: 10,
    scoringType: 'formula',
    scoringDescription: '(Items in IN QA + QA Done + Closed) ÷ (Total Assigned − Blocked − Epics) × 10',
    badge: 'AUTO',
    formula: 'Items currently in "In QA", "QA Done", or "Closed" ÷ Total assigned (excl. Blocked & Epics) × 10',
    example: '15 tasks assigned, 1 BLOCKED, 1 EPIC → 13 eligible.\n5 items in IN QA + 2 in QA Done + 1 Closed = 8 items.\nScore = 8 ÷ 13 × 10 = 6.2 pts\nNote: QA Done and Closed still count. Pulling a card back from IN QA removes it immediately.',
  },
  {
    id: 'delivery_timeliness',
    name: 'Delivery Timeliness',
    subTitle: 'Tasks Completed On or Before Due Date vs Total Assigned',
    shortName: 'Delivery',
    coreValue: 'Diligent and Committed',
    subCategory: 'Delivery & Execution',
    weightage: 0.10,
    maxPoints: 10,
    scoringType: 'formula',
    scoringDescription: '(Items moved to "In Review" on/before due date) ÷ (Total Assigned − Blocked − Epics) × 10',
    badge: 'AUTO',
    formula: 'Items moved from "In Progress" → "In Review" on or before their due date ÷ Total assigned (excl. Blocked & Epics) × 10',
    example: '12 tasks assigned, 1 BLOCKED, 1 EPIC → 10 eligible.\n7 cards were moved to "In Review" on or before their due date.\nScore = 7 ÷ 10 × 10 = 7.0 pts\nNote: Pulling a card back from "In Review" clears its delivery timestamp. The clock restarts when you push it to In Review again.',
  },
  {
    id: 'estimation_accuracy',
    name: 'Estimation Accuracy',
    subTitle: 'Difference Between Estimated vs Actual Hours Logged',
    shortName: 'Estimation',
    coreValue: 'Diligent and Committed',
    subCategory: 'Delivery & Execution',
    weightage: 0.10,
    maxPoints: 10,
    scoringType: 'stepped',
    scoringDescription: '≤15% variance = 10 pts · 16–30% = 7 · 31–50% = 4 · >50% = 0',
    badge: 'AUTO',
    formula: '|Actual Hours Logged − Sum of Estimated Hours on work items| ÷ Estimated Hours × 100 → variance % → stepped score',
    example: 'Estimated hours (sum of all your work items) = 80 hrs\nActual hours logged in timesheet = 85 hrs\nVariance = |85−80| ÷ 80 = 6.25% → ≤15% → 10 pts\n\nAnother example:\nEstimated = 80 hrs, Actual = 104 hrs\nVariance = |104−80| ÷ 80 = 30% → 16–30% → 7 pts\n\nPoor example:\nEstimated = 40 hrs, Actual = 70 hrs\nVariance = |70−40| ÷ 40 = 75% → >50% → 0 pts',
  },
  {
    id: 'throughput_complexity',
    name: 'Throughput & Complexity Handling',
    subTitle: 'Closed Work Items vs Total Assigned Work Items',
    shortName: 'Throughput',
    coreValue: 'Diligent and Committed',
    subCategory: 'Delivery & Execution',
    weightage: 0.10,
    maxPoints: 10,
    scoringType: 'formula',
    scoringDescription: '(Items in "Closed" status) ÷ (Total Assigned − Blocked − Epics) × 10',
    badge: 'AUTO',
    formula: 'Work items in "Closed" status ÷ Total assigned (excl. Blocked & Epics) × 10',
    example: '20 tasks assigned this month:\n- 12 Closed ✅\n- 3 QA Done, 2 IN QA (not yet Closed)\n- 2 BLOCKED → excluded\n- 1 EPIC → excluded\nDenominator = 20 − 2 − 1 = 17\nScore = 12 ÷ 17 × 10 = 7.1 pts',
  },

  // ── Diligent and Committed › Quality & Engineering Excellence ──────────────
  {
    id: 'internal_rework_ratio',
    name: 'Internal Rework Ratio',
    subTitle: 'Tasks Dragged Back from "In QA" to "In Progress"',
    shortName: 'Rework',
    coreValue: 'Diligent and Committed',
    subCategory: 'Quality & Engineering Excellence',
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: '0% rework = 5 pts · ≤10% = 3 · >10% = 0',
    badge: 'AUTO',
    formula: 'Count of tasks dragged from "IN QA" → "In Progress" ÷ Total completed (QA Done + Closed) → stepped score',
    example: 'You completed 20 tasks this month (status: QA Done or Closed):\n\nScenario A: No tasks sent back from QA → 0 ÷ 20 = 0% → 5 pts\nScenario B: 2 tasks dragged IN QA → In Progress → 2 ÷ 20 = 10% → 3 pts\nScenario C: 3 tasks dragged IN QA → In Progress → 3 ÷ 20 = 15% → 0 pts\n\nImportant: Only the move from "IN QA → In Progress" counts as rework. Moving a card from "In Review → In Progress" does NOT affect this score.',
  },
  {
    id: 'technical_defect_leakage',
    name: 'Technical Defect Leakage',
    subTitle: 'Bugs Classified as "Code Review" — Hours Spent vs Total Working Hours',
    shortName: 'Tech Defect',
    coreValue: 'Diligent and Committed',
    subCategory: 'Quality & Engineering Excellence',
    weightage: 0.10,
    maxPoints: 10,
    scoringType: 'formula',
    scoringDescription: '10 − (Hours on "Code Review" bugs ÷ Total Working Hours × 10)',
    badge: 'AUTO',
    formula: '10 − (Timesheet hours logged on Bug items classified as "Code Review" ÷ Total timesheet hours in month × 10)',
    example: 'You logged 160 total hours this month.\nBug items where Classification = "Code Review":\n  BUG-01 (Code Review): 6 hrs\n  BUG-02 (Code Review): 4 hrs\n  Total = 10 hrs\nScore = 10 − (10 ÷ 160 × 10) = 10 − 0.625 = 9.375 pts\n\nIf no Code Review bugs exist at all → perfect 10 pts.\nOnly bugs with Classification = "Code Review" affect this parameter.',
  },
  {
    id: 'functional_defect_leakage',
    name: 'Functional Defect Leakage',
    subTitle: 'Non-Code-Review Bugs + Rework Hours vs Total Working Hours',
    shortName: 'Func Defect',
    coreValue: 'Diligent and Committed',
    subCategory: 'Quality & Engineering Excellence',
    weightage: 0.10,
    maxPoints: 10,
    scoringType: 'formula',
    scoringDescription: '10 − ((Rework hours + non-"Code Review" bug hours) ÷ Total Working Hours × 10)',
    badge: 'AUTO',
    formula: '10 − ((Hours on bugs NOT classified as "Code Review" + Hours on tasks dragged back from IN QA) ÷ Total timesheet hours × 10)',
    example: 'You logged 160 total hours this month.\n\nFunctional bugs (classification ≠ "Code Review"):\n  BUG-03 (New Bug):      8 hrs\n  BUG-04 (UI Usability): 5 hrs  →  13 hrs total\n\nRework (tasks dragged from IN QA → In Progress):\n  TASK-07: 7 hrs  →  7 hrs total\n\nCombined = 13 + 7 = 20 hrs\nScore = 10 − (20 ÷ 160 × 10) = 10 − 1.25 = 8.75 pts\n\nIf no functional bugs and no rework → perfect 10 pts.',
  },

  // ── Diligent and Committed › Attendance ───────────────────────────────────
  {
    id: 'attendance',
    name: 'Attendance',
    subTitle: 'Approved Leave Days Taken (No Unapproved Absences)',
    shortName: 'Attendance',
    coreValue: 'Diligent and Committed',
    subCategory: 'Attendance',
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'Any unplanned leave = 0 · ≤1 planned approved day = 5 · 1.5 planned days = 3 · >1.5 planned days = 0',
    badge: 'AUTO',
    formula: 'Checks approved leave requests for the month: unplanned flag triggers immediate 0; total planned days determine stepped score',
    example: 'No leave taken → 5 pts\n1 planned, approved leave day → 5 pts\n1.5 planned, approved leave days → 3 pts\n2 planned, approved leave days → 0 pts\n1 unplanned approved leave (any duration) → 0 pts immediately\n\nNote: Unapproved/rejected leave requests do not affect your score. Only APPROVED leaves are counted.',
  },
  {
    id: 'timeliness',
    name: 'Timeliness',
    subTitle: 'Punctuality — Auto-computed from Late Coming Logs',
    shortName: 'Timeliness',
    coreValue: 'Diligent and Committed',
    subCategory: 'Attendance',
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'Zero late comings = 5 · < 3 lates all ≤ 10 min = 3 · ≥ 3 lates or any > 10 min = 0',
    badge: 'AUTO',
    formula: 'System counts late coming logs recorded for the month and applies the scoring rules automatically',
    example: 'No late comings this month → 5 pts\n1 or 2 late comings, each ≤ 10 minutes → 3 pts\n3 or more late comings → 0 pts\nAny single late coming > 10 minutes → 0 pts',
  },

  // ── Collaboration ──────────────────────────────────────────────────────────
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    subTitle: 'Teamwork, Communication & Peer Support Observed by PM',
    shortName: 'Collaboration',
    coreValue: 'Collaboration',
    subCategory: null,
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'manual',
    scoringDescription: 'PM enters score: 5 = excellent · 3 = adequate · 0 = poor',
    badge: 'MANUAL',
    formula: 'PM observes team interaction across the month and assigns a score — can include notes',
    example: '5 pts: Proactively helped teammates, joined all standups, shared knowledge, unblocked peers\n3 pts: Adequate communication, participated when needed, no major issues\n0 pts: Isolated, caused team friction, or consistently poor communication\n\nYour PM may add notes explaining the score.',
  },
  {
    id: 'reporting_documentation',
    name: 'Reporting & Documentation',
    subTitle: 'Status Reports, Technical Docs, KT Notes — PM Reviewed',
    shortName: 'Reporting',
    coreValue: 'Collaboration',
    subCategory: null,
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'manual',
    scoringDescription: 'Accurate & timely docs = 5 · Inconsistent = 3 · Critical gaps or missing = 0',
    badge: 'MANUAL',
    formula: 'PM reviews quality and timeliness of status reports, technical docs, and KT notes during the month',
    example: '5 pts: All weekly status reports on time, accurate sprint notes, thorough KT documentation\n3 pts: Occasional missing updates, minor formatting issues, some gaps\n0 pts: No documentation submitted, or critical inaccuracies in existing docs\n\nYour PM may add multiple notes throughout the month.',
  },

  // ── Continuous Learning ────────────────────────────────────────────────────
  {
    id: 'learning_velocity',
    name: 'Learning Velocity',
    subTitle: 'Upskilling Assignment Approved via Learn & Innovate Module',
    shortName: 'Learning',
    coreValue: 'Continuous Learning',
    subCategory: null,
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'Approved by PM = 5 · Rejected by PM = 3 · Not submitted / still pending = 0',
    badge: 'SELF',
    formula: 'Complete your assigned learning pathway in the Learn & Innovate module — your PM\'s decision on the submission determines the score',
    example: 'Assignment submitted → PM Approved → 5 pts\nAssignment submitted → PM Rejected (needs revision) → 3 pts\nAssignment not submitted at all → 0 pts\nAssignment submitted but still pending PM review → 0 pts (score updates once PM acts)\n\nTip: Submit early so your PM has time to review before month-end.',
  },

  // ── Optimism ───────────────────────────────────────────────────────────────
  {
    id: 'positive_behaviour',
    name: 'Positive Behaviour & Conduct',
    subTitle: 'Flexible, Cooperative, Punctual & Professionally Mature',
    shortName: 'Behaviour',
    coreValue: 'Optimism',
    subCategory: null,
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'manual',
    scoringDescription: 'Professional & adaptable = 5 · Minor issues = 3 · Disruptive conduct = 0',
    badge: 'MANUAL',
    formula: 'PM evaluates attitude, flexibility under pressure, adaptability to change, and professional conduct across the month',
    example: '5 pts: Stayed positive under crunch, adapted gracefully to scope changes, showed maturity and flexibility\n3 pts: Generally professional, occasional pushback, cooperated after initial resistance\n0 pts: Regular complaints, resistant to change, caused team disruption, or unprofessional conduct\n\nThis score is entered by your Project Manager.',
  },

  // ── Gratitude ──────────────────────────────────────────────────────────────
  {
    id: 'gratitude',
    name: 'Gratitude',
    subTitle: 'Team Recognition, Appreciation & Positive Acknowledgement',
    shortName: 'Gratitude',
    coreValue: 'Gratitude',
    subCategory: null,
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'manual',
    scoringDescription: 'Actively recognises peers = 5 · Occasional thanks = 3 · No appreciation shown = 0',
    badge: 'MANUAL',
    formula: 'PM observes whether you recognise colleagues\' contributions, express genuine thanks, and foster a culture of appreciation',
    example: '5 pts: Publicly thanked teammates in standups, sent appreciation messages, acknowledged peer efforts in team chats\n3 pts: Occasional verbal thanks, informal acknowledgement\n0 pts: No visible appreciation shown to peers during the month\n\nThis score is entered by your Project Manager.',
  },
];

// ─── Core Value Groups (5 company values) ────────────────────────────────────

export interface KpiSubCategoryGroup {
  name: string | null;
  maxPoints: number;
  metrics: KpiMetricDefinition[];
}

export interface KpiCoreValueGroup {
  coreValue: string;
  maxPoints: number;
  /** Hex color for section header background (matches spreadsheet palette) */
  headerColor: string;
  /** Hex color for header text */
  headerTextColor: string;
  /** Hex color for section body background */
  bodyColor: string;
  /** Hex color for section border */
  borderColor: string;
  /** Hex color for metric score text */
  textColor: string;
  /** Hex color for mini progress bars inside metrics */
  barColor: string;
  subGroups: KpiSubCategoryGroup[];
}

export const KPI_CORE_VALUE_GROUPS: KpiCoreValueGroup[] = [
  {
    coreValue: 'Diligent and Committed',
    maxPoints: 75,
    // Spreadsheet: light green (Google Sheets light green 2 = #D9EAD3)
    headerColor: '#D9EAD3',
    headerTextColor: '#14532d',
    bodyColor: '#F0F7EE',
    borderColor: '#A8D5A0',
    textColor: '#166534',
    barColor: '#16A34A',
    subGroups: [
      {
        name: 'Delivery & Execution',
        maxPoints: 40,
        metrics: KPI_METRICS.filter(
          (m) => m.coreValue === 'Diligent and Committed' && m.subCategory === 'Delivery & Execution',
        ),
      },
      {
        name: 'Quality & Engineering Excellence',
        maxPoints: 25,
        metrics: KPI_METRICS.filter(
          (m) => m.coreValue === 'Diligent and Committed' && m.subCategory === 'Quality & Engineering Excellence',
        ),
      },
      {
        name: 'Attendance',
        maxPoints: 10,
        metrics: KPI_METRICS.filter(
          (m) => m.coreValue === 'Diligent and Committed' && m.subCategory === 'Attendance',
        ),
      },
    ],
  },
  {
    coreValue: 'Collaboration',
    maxPoints: 10,
    // Spreadsheet collaboration row color: #CCCCFF (periwinkle/light purple)
    headerColor: '#CCCCFF',
    headerTextColor: '#3b0764',
    bodyColor: '#F0EEFF',
    borderColor: '#B0A8F0',
    textColor: '#6D28D9',
    barColor: '#7C3AED',
    subGroups: [
      {
        name: null,
        maxPoints: 10,
        metrics: KPI_METRICS.filter((m) => m.coreValue === 'Collaboration'),
      },
    ],
  },
  {
    coreValue: 'Continuous Learning',
    maxPoints: 5,
    // Spreadsheet: light blue (Google Sheets cornflower blue 2 = #C9DAF8)
    headerColor: '#C9DAF8',
    headerTextColor: '#1e3a5f',
    bodyColor: '#EEF4FD',
    borderColor: '#A8C4F0',
    textColor: '#1D4ED8',
    barColor: '#1D4ED8',
    subGroups: [
      {
        name: null,
        maxPoints: 5,
        metrics: KPI_METRICS.filter((m) => m.coreValue === 'Continuous Learning'),
      },
    ],
  },
  {
    coreValue: 'Optimism',
    maxPoints: 5,
    // Spreadsheet: light red (Google Sheets light red 2 = #F4CCCC)
    headerColor: '#F4CCCC',
    headerTextColor: '#7f1d1d',
    bodyColor: '#FDF1F1',
    borderColor: '#E8A8A8',
    textColor: '#991B1B',
    barColor: '#DC2626',
    subGroups: [
      {
        name: null,
        maxPoints: 5,
        metrics: KPI_METRICS.filter((m) => m.coreValue === 'Optimism'),
      },
    ],
  },
  {
    coreValue: 'Gratitude',
    maxPoints: 5,
    // Complementary Google Sheets pastel: #FCE5CD (light orange 3)
    headerColor: '#FCE5CD',
    headerTextColor: '#7c2d12',
    bodyColor: '#FEF3E8',
    borderColor: '#F0B888',
    textColor: '#9A3412',
    barColor: '#EA580C',
    subGroups: [
      {
        name: null,
        maxPoints: 5,
        metrics: KPI_METRICS.filter((m) => m.coreValue === 'Gratitude'),
      },
    ],
  },
];

// ─── Legacy category list (kept for backward compat with charts) ───────────────

export const KPI_CATEGORIES = [
  { name: 'Delivery & Execution', max: 40, color: '#1D4ED8' },
  { name: 'Quality & Engineering Excellence', max: 25, color: '#059669' },
  { name: 'Attendance', max: 10, color: '#0891B2' },
  { name: 'Collaboration', max: 10, color: '#7C3AED' },
  { name: 'Continuous Learning', max: 5, color: '#059669' },
  { name: 'Optimism', max: 5, color: '#D97706' },
  { name: 'Gratitude', max: 5, color: '#BE123C' },
];

// ─── Grade Computation ────────────────────────────────────────────────────────

export function computeGrade(totalScore: number): KpiGrade {
  if (totalScore >= 90) return 'A';
  if (totalScore >= 75) return 'B';
  if (totalScore >= 60) return 'C';
  return 'D';
}

// ─── Category Score Computation ───────────────────────────────────────────────

export function computeCategoryScores(metrics: KpiMetricScore[]): KpiCategoryScore[] {
  const catMap = new Map<string, { earned: number; max: number }>();

  for (const m of KPI_METRICS) {
    const cat = m.subCategory ?? m.coreValue;
    const existing = catMap.get(cat) ?? { earned: 0, max: 0 };
    const score = metrics.find((s) => s.metricId === m.id);
    catMap.set(cat, {
      earned: existing.earned + (score?.points ?? 0),
      max: existing.max + m.maxPoints,
    });
  }

  return Array.from(catMap.entries()).map(([category, { earned, max }]) => ({
    category,
    earned: Math.round(earned * 100) / 100,
    max,
    percentage: max > 0 ? Math.round((earned / max) * 100) : 0,
  }));
}

// ─── Transform live API response ─────────────────────────────────────────────

export function transformLiveKpi(live: LiveEmployeeKpiRecord): EmployeeKpiRecord {
  const categoryScores = computeCategoryScores(live.metrics);
  return {
    ...live,
    categoryScores,
    grade: computeGrade(live.totalScore),
  };
}

// ─── Grade Config ─────────────────────────────────────────────────────────────

export const GRADE_CONFIG: Record<
  KpiGrade,
  { label: string; color: string; bg: string; text: string; border: string }
> = {
  A: { label: 'Excellent', color: '#10B981', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  B: { label: 'Good',      color: '#3B82F6', bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    },
  C: { label: 'Average',   color: '#F59E0B', bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   },
  D: { label: 'Poor',      color: '#EF4444', bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200'     },
};

// ─── Team Summary ─────────────────────────────────────────────────────────────

export function buildTeamSummary(employees: EmployeeKpiRecord[], period: string): KpiTeamSummary {
  const scored = employees.filter((e) => !e.hasNoActivity);
  const total = scored.reduce((s, e) => s + e.totalScore, 0);
  const teamAverage = scored.length > 0 ? Math.round((total / scored.length) * 10) / 10 : 0;

  const categoryAverages = KPI_CATEGORIES.map((cat) => {
    const avgEarned =
      scored.length > 0
        ? scored.reduce((s, e) => {
            const cs = e.categoryScores.find((c) => c.category === cat.name);
            return s + (cs?.earned ?? 0);
          }, 0) / scored.length
        : 0;
    return {
      category: cat.name,
      earned: Math.round(avgEarned * 10) / 10,
      max: cat.max,
      percentage: Math.round((avgEarned / cat.max) * 100),
    };
  });

  return {
    period,
    teamAverage,
    teamGrade: computeGrade(teamAverage),
    gradeACcount: scored.filter((e) => e.grade === 'A').length,
    gradeBCount: scored.filter((e) => e.grade === 'B').length,
    gradeCCount: scored.filter((e) => e.grade === 'C').length,
    gradeDCount: scored.filter((e) => e.grade === 'D').length,
    categoryAverages,
    employees,
  };
}

export const AVAILABLE_PERIODS = [
  '2026-06',
  '2026-05',
  '2026-04',
  '2026-03',
  '2026-02',
  '2026-01',
];
