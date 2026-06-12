export type KpiGrade = 'A' | 'B' | 'C' | 'D';

export interface KpiMetricDefinition {
  id: string;
  name: string;
  shortName: string;
  category: string;
  maxPoints: number;
  scoringType: 'formula' | 'stepped' | 'manual';
  scoringDescription: string;
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
