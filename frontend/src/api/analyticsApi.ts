import { apiClient } from './client';

export interface KpiMetricScore {
  metricId: string;
  points: number;
}

export interface LiveEmployeeKpiRecord {
  userId: string;
  name: string;
  role: string;
  department: string;
  period: string;
  metrics: KpiMetricScore[];
  totalScore: number;
  hasNoActivity?: boolean;
}

export interface ProductivityRecord {
  userId: string;
  name: string;
  role: string;
  tasksDone: number;
  storiesAssigned: number;
  hoursLogged: number;
  onTimePct: number;
  score: number;
}

export interface ProjectBreakdownItem {
  type: string;
  total: number;
  done: number;
  completePct: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  status: string;
  tasks: number;
  done: number;
  teamSize: number;
  color: string;
  breakdown: ProjectBreakdownItem[];
}

export interface BugsReport {
  severity: { severity: string; count: number; color: string }[];
  classification: { classification: string; count: number; color: string }[];
}

export interface AllocationRecord {
  userId: string;
  name: string;
  role: string;
  tasksAllocated: number;
  hoursAllocated: number;
  utilisationPct: number;
}

export interface TimesheetRecord {
  userId: string;
  name: string;
  role: string;
  project: string;
  hoursLogged: number;
}

export interface CapacityCell {
  day: number;
  status: 'holiday' | 'weekly_off' | 'leave' | 'occupied' | 'partial' | 'available';
  hours: number;
  holidayName?: string;
  dayOfWeek: string;
}

export interface CapacityEmployee {
  userId: string;
  name: string;
  role: string;
  cells: CapacityCell[];
  summary: {
    workingDays: number;
    occupiedDays: number;
    leaveDays: number;
    availableDays: number;
  };
}

export interface CapacityReport {
  period: string;
  year: number;
  month: number;
  daysInMonth: number;
  days: {
    day: number;
    dayOfWeek: string;
    isHoliday: boolean;
    holidayName?: string;
    isWeeklyOff: boolean;
  }[];
  employees: CapacityEmployee[];
}

export interface PlannedVsActualRecord {
  userId: string;
  name: string;
  role: string;
  taskCount: number;
  plannedHours: number;
  actualHours: number;
  variance: number;
  variancePct: number;
  status: 'over' | 'under' | 'ontrack';
}

export interface KpiRecord {
  id: string;
  userId: string;
  period: string;
  metricId: string;
  points: number;
  notes?: string;
}

export const analyticsApi = {
  getMyProjectRole: (): Promise<{ isManager: boolean }> =>
    apiClient.get<{ isManager: boolean }>('/analytics/my-project-role').then((r) => r.data),

  getKpi: (period: string, userId?: string) =>
    apiClient
      .get<LiveEmployeeKpiRecord[]>('/analytics/kpi', { params: { period, userId } })
      .then((r) => r.data),

  getProductivity: (period: string, projectId?: string) =>
    apiClient
      .get<ProductivityRecord[]>('/analytics/reports/productivity', {
        params: { period, ...(projectId && projectId !== 'all' ? { projectId } : {}) },
      })
      .then((r) => r.data),

  getProjects: (period: string, projectId?: string) =>
    apiClient
      .get<ProjectRecord[]>('/analytics/reports/projects', {
        params: { period, ...(projectId && projectId !== 'all' ? { projectId } : {}) },
      })
      .then((r) => r.data),

  getBugs: (period: string, projectId?: string) =>
    apiClient
      .get<BugsReport>('/analytics/reports/bugs', {
        params: { period, ...(projectId && projectId !== 'all' ? { projectId } : {}) },
      })
      .then((r) => r.data),

  getAllocation: (period: string, projectId?: string) =>
    apiClient
      .get<AllocationRecord[]>('/analytics/reports/allocation', {
        params: { period, ...(projectId && projectId !== 'all' ? { projectId } : {}) },
      })
      .then((r) => r.data),

  getTimesheet: (period: string, projectId?: string) =>
    apiClient
      .get<TimesheetRecord[]>('/analytics/reports/timesheet', {
        params: { period, ...(projectId && projectId !== 'all' ? { projectId } : {}) },
      })
      .then((r) => r.data),

  getCapacity: (period: string) =>
    apiClient
      .get<CapacityReport>('/analytics/reports/capacity', { params: { period } })
      .then((r) => r.data),

  getPlannedVsActual: (period: string, projectId?: string) =>
    apiClient
      .get<PlannedVsActualRecord[]>('/analytics/reports/planned-vs-actual', {
        params: { period, ...(projectId && projectId !== 'all' ? { projectId } : {}) },
      })
      .then((r) => r.data),

  upsertKpiRecord: (dto: {
    userId: string;
    period: string;
    metricId: string;
    points: number;
    notes?: string;
  }) => apiClient.post<KpiRecord>('/kpi-records', dto).then((r) => r.data),

  getKpiRecords: (userId?: string, period?: string) =>
    apiClient
      .get<KpiRecord[]>('/kpi-records', { params: { userId, period } })
      .then((r) => r.data),
};
