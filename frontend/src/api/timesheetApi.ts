import { apiClient } from './client';

export type TimesheetApprovalStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface TimesheetWorkItem {
  id: string;
  title: string;
  type: string;
  billingStatus: 'BILLABLE' | 'NON_BILLABLE';
  estimatedHours: number | null;
  project: { id: string; name: string };
}

export interface TimesheetEntryFull {
  id: string;
  workItemId: string;
  userId: string;
  date: string;
  hours: number;
  description: string | null;
  approvalStatus: TimesheetApprovalStatus;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
  isRework: boolean;
  isBugFix: boolean;
  user: { id: string; fullName: string; profilePhoto: string | null };
  approvedBy: { id: string; fullName: string } | null;
  workItem: TimesheetWorkItem;
}

export const timesheetApi = {
  getMyEntries: (params?: { userId?: string; from?: string; to?: string; projectId?: string }): Promise<TimesheetEntryFull[]> =>
    apiClient.get('/timesheet', { params }).then((r) => r.data),

  submit: (id: string): Promise<TimesheetEntryFull> =>
    apiClient.patch(`/timesheet-entries/${id}/submit`).then((r) => r.data),

  approve: (id: string): Promise<TimesheetEntryFull> =>
    apiClient.patch(`/timesheet-entries/${id}/approve`).then((r) => r.data),

  reject: (id: string, rejectionNote?: string): Promise<TimesheetEntryFull> =>
    apiClient.patch(`/timesheet-entries/${id}/reject`, { rejectionNote }).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/timesheet-entries/${id}`).then(() => undefined),
};
