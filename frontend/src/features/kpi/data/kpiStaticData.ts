import type {
  KpiGrade,
  KpiMetricDefinition,
  KpiMetricScore,
  KpiCategoryScore,
  EmployeeKpiRecord,
  KpiTeamSummary,
} from '../../../types/kpi.types';
import type { LiveEmployeeKpiRecord } from '../../../api/analyticsApi';

export function transformLiveKpi(live: LiveEmployeeKpiRecord): EmployeeKpiRecord {
  const categoryScores = computeCategoryScores(live.metrics);
  return {
    ...live,
    categoryScores,
    grade: computeGrade(live.totalScore),
  };
}

// ─── Metric Definitions (from Digital Appraisal System.xlsx) ─────────────────

export const KPI_METRICS: KpiMetricDefinition[] = [
  {
    id: 'sprint_reliability',
    name: 'Sprint Reliability',
    shortName: 'Sprint',
    category: 'Delivery & Execution',
    maxPoints: 15,
    scoringType: 'formula',
    scoringDescription: '(Story Points Delivered / Story Points Committed) × 15',
  },
  {
    id: 'delivery_timeliness',
    name: 'Delivery Timeliness',
    shortName: 'Delivery',
    category: 'Delivery & Execution',
    maxPoints: 15,
    scoringType: 'formula',
    scoringDescription: '(On-Time Tasks / Total Assigned Tasks) × 15',
  },
  {
    id: 'estimation_accuracy',
    name: 'Estimation Accuracy',
    shortName: 'Estimation',
    category: 'Delivery & Execution',
    maxPoints: 10,
    scoringType: 'stepped',
    scoringDescription: '≤15% variance=10 pts, 16–30%=7, 31–50%=4, >50%=0',
  },
  {
    id: 'throughput_complexity',
    name: 'Throughput & Complexity',
    shortName: 'Throughput',
    category: 'Delivery & Execution',
    maxPoints: 10,
    scoringType: 'formula',
    scoringDescription: '(Valid PRs Merged / Total PRs Generated) × 10',
  },
  {
    id: 'internal_rework_ratio',
    name: 'Internal Rework Ratio',
    shortName: 'Rework',
    category: 'Quality & Engineering Excellence',
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: '0% reopens=5 pts, ≤10%=3, >10%=0',
  },
  {
    id: 'defect_leakage',
    name: 'Defect Leakage',
    shortName: 'Defects',
    category: 'Quality & Engineering Excellence',
    maxPoints: 10,
    scoringType: 'stepped',
    scoringDescription: '0 bugs=10, 1 minor=7, 2 minor=4, 1 critical/3+ minor=0',
  },
  {
    id: 'engineering_hygiene',
    name: 'Engineering Hygiene',
    shortName: 'Hygiene',
    category: 'Quality & Engineering Excellence',
    maxPoints: 5,
    scoringType: 'manual',
    scoringDescription: 'Best practices, security & linting adherence',
  },
  {
    id: 'dependency_agile',
    name: 'Dependency & Agile Management',
    shortName: 'Agile Mgmt',
    category: 'Ownership & Collaboration',
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'Proactive blocker flags=5, minor delays=3, uncommunicated blockers=0',
  },
  {
    id: 'reporting_documentation',
    name: 'Reporting & Documentation',
    shortName: 'Reporting',
    category: 'Ownership & Collaboration',
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'Accurate no gaps=5, inconsistent=3, critical misses=0',
  },
  {
    id: 'learning_velocity',
    name: 'Learning Velocity',
    shortName: 'Learning',
    category: 'Growth & Innovation',
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'Completed monthly pathway=5, partial=3, no activity=0',
  },
  {
    id: 'automation_innovation',
    name: 'Automation & Innovation',
    shortName: 'Innovation',
    category: 'Growth & Innovation',
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'AI implementation=5, drafted improvements=3, zero inputs=0',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    shortName: 'Attendance',
    category: 'Behaviour & Reliability',
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: '≤1 approved leave=5, 1.5 leaves=3, unapproved/>1.5=0',
  },
  {
    id: 'positive_behaviour',
    name: 'Positive Behaviour & Conduct',
    shortName: 'Behaviour',
    category: 'Behaviour & Reliability',
    maxPoints: 5,
    scoringType: 'stepped',
    scoringDescription: 'Professional, flexible, zero late comings=5; minor issues=3; poor=0',
  },
];

export const KPI_CATEGORIES = [
  { name: 'Delivery & Execution', max: 50, color: '#3B82F6' },
  { name: 'Quality & Engineering Excellence', max: 20, color: '#10B981' },
  { name: 'Ownership & Collaboration', max: 10, color: '#8B5CF6' },
  { name: 'Growth & Innovation', max: 10, color: '#F59E0B' },
  { name: 'Behaviour & Reliability', max: 10, color: '#EC4899' },
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
  return KPI_CATEGORIES.map((cat) => {
    const catMetrics = KPI_METRICS.filter((m) => m.category === cat.name);
    const earned = catMetrics.reduce((sum, m) => {
      const score = metrics.find((s) => s.metricId === m.id);
      return sum + (score?.points ?? 0);
    }, 0);
    return {
      category: cat.name,
      earned,
      max: cat.max,
      percentage: Math.round((earned / cat.max) * 100),
    };
  });
}

// ─── Static Employee KPI Data (May 2026) ─────────────────────────────────────

function makeRecord(
  userId: string,
  name: string,
  role: string,
  department: string,
  scores: number[],
): EmployeeKpiRecord {
  const metricIds = KPI_METRICS.map((m) => m.id);
  const metrics: KpiMetricScore[] = metricIds.map((id, i) => ({
    metricId: id,
    points: scores[i],
  }));
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const categoryScores = computeCategoryScores(metrics);
  return {
    userId,
    name,
    role,
    department,
    period: '2026-05',
    metrics,
    categoryScores,
    totalScore,
    grade: computeGrade(totalScore),
  };
}

//                                                                                   Spr  Del  Est  Thru  Rwk  Def  Hyg  Dep  Rep  Lrn  Aut  Att  Beh  Total Grade
export const STATIC_KPI_DATA: EmployeeKpiRecord[] = [
  makeRecord('e10eba00-cd85-4933-abc9-82c335f0a201', 'System Admin',       'Admin',            'Digital', [12,  13,  7,  8,  5,   7,  5,  5,  5,  5,  3,  5,  5]),  // 85 B
  makeRecord('b6a87b34-491b-4a6e-bfa2-8c37be562c33', 'John Developer',     'Developer',        'Digital', [ 9,  10,  7,  7,  3,   7,  5,  3,  3,  3,  3,  5,  5]),  // 70 C
  makeRecord('2dd7b0e2-0d2a-4ff1-b735-e41469aaa5fc', 'Super Admin',        'Super Admin',      'Digital', [ 7,   7,  4,  5,  0,   0,  3,  3,  3,  3,  3,  5,  3]),  // 46 D
  makeRecord('be927bba-6130-4361-8bd2-f7569bfc5903', 'Yogesh Lolage',      'Team Lead',        'Digital', [12,  13, 10,  9,  5,  10,  5,  5,  5,  5,  3,  5,  5]),  // 92 A
  makeRecord('e828e62b-a73e-460f-9201-1da121732e9f', 'Gaurav Patil',       'Developer',        'Digital', [11,  12,  7,  8,  5,   7,  5,  5,  5,  5,  3,  5,  5]),  // 83 B
  makeRecord('68665a5e-fd7a-435f-ad60-cdea8179fa30', 'Shital Joshi',       'Developer',        'Digital', [11,  12,  7,  8,  5,   7,  5,  5,  5,  3,  3,  5,  5]),  // 81 B
  makeRecord('3110773f-7e26-4a8b-8ec5-aaac112f12c0', 'Ganesh Khalkar',     'Developer',        'Digital', [10,  11,  7,  7,  3,   4,  5,  3,  3,  3,  5,  5,  3]),  // 69 C
  makeRecord('ffeaf90e-a2dc-4900-9125-3a28a515130f', 'Rohit More',         'Developer',        'Digital', [ 9,  10,  7,  7,  3,   4,  3,  3,  3,  3,  3,  5,  3]),  // 63 C
  makeRecord('adde42f0-6b96-48c9-99c8-1a91cde645ed', 'Prashik Shirsat',    'Developer',        'Digital', [10,  12,  7,  8,  3,   7,  5,  5,  5,  5,  3,  5,  3]),  // 78 B
  makeRecord('907700b2-4cea-4e70-91c4-313b99046f5e', 'Pratiksha Khairnar', 'QA Engineer',      'Digital', [13,  13,  7,  9,  5,  10,  5,  5,  5,  5,  3,  5,  5]),  // 90 A
  makeRecord('052f928c-896d-4b39-a276-21759f6beb27', 'Yash Boraste',       'Developer',        'Digital', [ 9,  10,  7,  7,  0,   4,  3,  3,  3,  3,  3,  5,  3]),  // 60 C
  makeRecord('75482b9f-45ab-42c0-9cd2-cf6c15f89c17', 'Deepali Jawharkar',  'Designer',         'Digital', [11,  12, 10,  7,  5,   7,  5,  3,  5,  3,  3,  5,  5]),  // 81 B
  makeRecord('49fad96a-559a-4105-9cb9-b888e97f54c4', 'Hemant Atre',        'Senior Developer', 'Digital', [13,  14, 10,  9,  5,  10,  5,  5,  5,  5,  5,  5,  5]),  // 96 A
  makeRecord('f887a347-4aac-47de-a0cf-471b536be9d7', 'Jayvant Bagul',      'DevOps Engineer',  'Digital', [ 6,   7,  4,  4,  0,   0,  3,  3,  3,  3,  3,  5,  3]),  // 44 D
];

// ─── Team Summary ─────────────────────────────────────────────────────────────

export function buildTeamSummary(employees: EmployeeKpiRecord[], period: string): KpiTeamSummary {
  const total = employees.reduce((s, e) => s + e.totalScore, 0);
  const teamAverage = Math.round((total / employees.length) * 10) / 10;

  const categoryAverages = KPI_CATEGORIES.map((cat) => {
    const avgEarned =
      employees.reduce((s, e) => {
        const cs = e.categoryScores.find((c) => c.category === cat.name);
        return s + (cs?.earned ?? 0);
      }, 0) / employees.length;
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
    gradeACcount: employees.filter((e) => e.grade === 'A').length,
    gradeBCount: employees.filter((e) => e.grade === 'B').length,
    gradeCCount: employees.filter((e) => e.grade === 'C').length,
    gradeDCount: employees.filter((e) => e.grade === 'D').length,
    categoryAverages,
    employees,
  };
}

export const GRADE_CONFIG: Record<
  KpiGrade,
  { label: string; color: string; bg: string; text: string; border: string }
> = {
  A: { label: 'Excellent', color: '#10B981', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  B: { label: 'Good',      color: '#3B82F6', bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    },
  C: { label: 'Average',   color: '#F59E0B', bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   },
  D: { label: 'Poor',      color: '#EF4444', bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200'     },
};

export const AVAILABLE_PERIODS = [
  '2026-05',
  '2026-04',
  '2026-03',
  '2026-02',
  '2026-01',
];
