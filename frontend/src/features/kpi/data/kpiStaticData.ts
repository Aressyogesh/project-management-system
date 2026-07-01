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
    scoringDescription: '(Items currently in "In QA" / Total Assigned − Blocked) × 10',
    badge: 'AUTO',
    formula: 'Work items in "In QA" column ÷ Total assigned work items (excluding BLOCKED) × 10',
    example: 'If you had 12 tasks this month, 2 were BLOCKED, and 8 are in "In QA": 8 ÷ (12−2) × 10 = 8.0 pts',
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
    scoringDescription: '(On-Time Tasks / Total Assigned) × 10',
    badge: 'AUTO',
    formula: 'Work items completed on or before their due date ÷ Total assigned work items × 10',
    example: 'If you had 10 tasks and completed 7 on time: 7 ÷ 10 × 10 = 7.0 pts',
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
    formula: '|Actual Hours − Estimated Hours| ÷ Estimated Hours → variance % → stepped score',
    example: 'Estimated 20 hrs, logged 22 hrs → variance = |22−20|÷20 = 10% → ≤15% → 10 pts\nEstimated 20 hrs, logged 27 hrs → variance = 35% → 31–50% → 4 pts',
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
    scoringDescription: '(Work Items Closed / Total Assigned) × 10',
    badge: 'AUTO',
    formula: 'Work items in "Closed" status ÷ Total assigned work items × 10',
    example: 'Assigned 15 tasks, 9 are Closed: 9 ÷ 15 × 10 = 6.0 pts',
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
    scoringDescription: '0% reopens = 5 pts · ≤10% = 3 · >10% = 0',
    badge: 'AUTO',
    formula: 'Reopened items (moved from In QA → In Progress) ÷ Total completed items → stepped score',
    example: '10 tasks completed, 0 reopened → 0% → 5 pts\n10 tasks completed, 1 reopened → 10% → 3 pts\n10 tasks completed, 2 reopened → 20% → 0 pts',
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
    scoringDescription: '10 − (Code Review bug hours / Total Working Hours × 10)',
    badge: 'AUTO',
    formula: '10 − (Hours spent on bugs classified as "Code Review" ÷ Total hours logged in month × 10)',
    example: 'Total hours = 160, Code Review bug hours = 8: 10 − (8÷160×10) = 10 − 0.5 = 9.5 pts\nTotal hours = 160, Code Review bug hours = 40: 10 − (40÷160×10) = 10 − 2.5 = 7.5 pts',
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
    scoringDescription: '10 − ((Rework + functional bug hours) / Total Working Hours × 10)',
    badge: 'AUTO',
    formula: '10 − ((Hours on non-Code-Review bugs + Hours on reopened tasks) ÷ Total hours logged × 10)',
    example: 'Total hours = 160, functional bug + rework hours = 16: 10 − (16÷160×10) = 10 − 1.0 = 9.0 pts\nTotal hours = 160, functional bug + rework hours = 48: 10 − (48÷160×10) = 10 − 3.0 = 7.0 pts',
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
    scoringDescription: '≤1 approved leave day = 5 · 1–1.5 days = 3 · >1.5 or unapproved = 0',
    badge: 'AUTO',
    formula: 'Based on leave records for the month — unapproved absences = 0, approved leave days → stepped',
    example: '0–1 approved leave day, no unapproved = 5 pts\n1 to 1.5 approved days = 3 pts\nMore than 1.5 days OR any unapproved leave = 0 pts',
  },
  {
    id: 'timeliness',
    name: 'Timeliness',
    subTitle: 'Punctuality — Late Comings Tracked by PM / HR',
    shortName: 'Timeliness',
    coreValue: 'Diligent and Committed',
    subCategory: 'Attendance',
    weightage: 0.05,
    maxPoints: 5,
    scoringType: 'manual',
    scoringDescription: 'Zero late comings = 5 · <3 lates (under 10 min) = 3 · >3 lates or >10 min = 0',
    badge: 'MANUAL',
    formula: 'PM / HR manually enters the score based on office login records',
    example: 'No late comings this month = 5 pts\n1–2 late comings under 10 min = 3 pts\n3 or more late comings, or late > 10 min = 0 pts',
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
    scoringDescription: 'PM enters score: 5 = excellent · 3 = good · 0 = poor',
    badge: 'MANUAL',
    formula: 'Project Manager observes team interaction and assigns a score at end of month',
    example: 'Proactively helped teammates, joined standups, shared knowledge = 5 pts\nAdequate communication, no major issues = 3 pts\nIsolated or caused team friction = 0 pts',
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
    scoringDescription: 'Accurate & timely = 5 · Inconsistent = 3 · Critical misses = 0',
    badge: 'MANUAL',
    formula: 'PM reviews quality and timeliness of all documentation submitted during the month',
    example: 'All weekly reports submitted on time, detailed sprint notes = 5 pts\nOccasional missing updates = 3 pts\nNo documentation or major gaps = 0 pts',
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
    scoringDescription: 'Approved = 5 · Submitted (pending or rejected) = 3 · Not submitted at all = 0',
    badge: 'SELF',
    formula: 'Submit a learning assignment via the Learn & Innovate module — approval status determines score',
    example: 'Assignment submitted and approved = 5 pts\nAssignment submitted but pending PM review = 3 pts\nAssignment submitted but rejected by PM = 3 pts\nNo assignment submitted at all = 0 pts',
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
    scoringDescription: 'Professional & flexible = 5 · Minor issues = 3 · Unprofessional conduct = 0',
    badge: 'MANUAL',
    formula: 'PM evaluates attitude, flexibility under pressure, and professional conduct across the month',
    example: 'Stayed positive during crunch, adapted to scope changes gracefully = 5 pts\nOccasional pushback but generally cooperative = 3 pts\nRegular complaints, refuses change, or unprofessional = 0 pts',
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
    scoringDescription: 'PM enters score: 5 = actively recognises peers · 3 = occasionally · 0 = not observed',
    badge: 'MANUAL',
    formula: 'PM observes if the employee recognises colleagues\' contributions, expresses thanks, and fosters appreciation',
    example: 'Publicly thanked teammates in standups, sent appreciation messages = 5 pts\nOccasional verbal thanks = 3 pts\nNo visible appreciation shown to peers = 0 pts',
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
