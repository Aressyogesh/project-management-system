export type KpiGrade = 'A' | 'B' | 'C' | 'D';
export type KpiBadge = 'AUTO' | 'MANUAL' | 'SELF';

export interface KpiMetricDefinition {
  id: string;
  name: string;
  subTitle: string;
  shortName: string;
  coreValue: string;
  subCategory: string | null;
  weightage: number;
  maxPoints: number;
  scoringType: 'formula' | 'stepped' | 'manual';
  scoringDescription: string;
  badge: KpiBadge;
  /** Plain-english formula from the appraisal spreadsheet */
  formula: string;
  /** Worked example showing how a score is calculated */
  example: string;
}

export interface KpiMetricScore {
  metricId: string;
  points: number;
}

export interface KpiCategoryScore {
  category: string;
  earned: number;
  max: number;
  percentage: number;
}

export interface EmployeeKpiRecord {
  userId: string;
  name: string;
  role: string;
  department: string;
  period: string;
  metrics: KpiMetricScore[];
  categoryScores: KpiCategoryScore[];
  totalScore: number;
  grade: KpiGrade;
  hasNoActivity?: boolean;
}

export interface KpiTeamSummary {
  period: string;
  teamAverage: number;
  teamGrade: KpiGrade;
  gradeACcount: number;
  gradeBCount: number;
  gradeCCount: number;
  gradeDCount: number;
  categoryAverages: KpiCategoryScore[];
  employees: EmployeeKpiRecord[];
}
