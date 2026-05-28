import { apiClient } from '../../../api/client';
import type { BoardStatus, Sprint, TimesheetEntry, WorkItem, WorkItemType } from '../types/board.types';

// ─── Work Items ───────────────────────────────────────────────────────────────

export interface BoardFiltersQuery {
  type?: WorkItemType;
  sprintId?: string;
  assigneeId?: string;
  status?: BoardStatus;
  priority?: string;
  search?: string;
}

export const boardApi = {
  getWorkItems: (projectId: string, params?: BoardFiltersQuery): Promise<WorkItem[]> =>
    apiClient.get(`/projects/${projectId}/work-items`, { params }).then((r) => r.data),

  getWorkItem: (id: string): Promise<WorkItem> =>
    apiClient.get(`/work-items/${id}`).then((r) => r.data),

  createWorkItem: (projectId: string, data: Partial<WorkItem>): Promise<WorkItem> =>
    apiClient.post(`/projects/${projectId}/work-items`, data).then((r) => r.data),

  updateWorkItem: (id: string, data: Partial<WorkItem>): Promise<WorkItem> =>
    apiClient.patch(`/work-items/${id}`, data).then((r) => r.data),

  moveWorkItem: (id: string, status: BoardStatus, position?: number): Promise<WorkItem> =>
    apiClient.patch(`/work-items/${id}/move`, { status, position }).then((r) => r.data),

  deleteWorkItem: (id: string): Promise<void> =>
    apiClient.delete(`/work-items/${id}`).then(() => undefined),

  // Comments
  addComment: (workItemId: string, content: string) =>
    apiClient.post(`/work-items/${workItemId}/comments`, { content }).then((r) => r.data),

  deleteComment: (workItemId: string, commentId: string): Promise<void> =>
    apiClient.delete(`/work-items/${workItemId}/comments/${commentId}`).then(() => undefined),

  // Timesheet entries
  getTimesheetEntries: (workItemId: string): Promise<TimesheetEntry[]> =>
    apiClient.get(`/work-items/${workItemId}/timesheet-entries`).then((r) => r.data),

  logTime: (workItemId: string, data: { date: string; hours: number; description?: string }): Promise<TimesheetEntry> =>
    apiClient.post(`/work-items/${workItemId}/timesheet-entries`, data).then((r) => r.data),

  deleteTimesheetEntry: (entryId: string): Promise<void> =>
    apiClient.delete(`/timesheet-entries/${entryId}`).then(() => undefined),
};

// ─── Sprints ──────────────────────────────────────────────────────────────────

export const sprintsApi = {
  getSprints: (projectId: string): Promise<Sprint[]> =>
    apiClient.get(`/projects/${projectId}/sprints`).then((r) => r.data),

  createSprint: (projectId: string, data: Partial<Sprint>): Promise<Sprint> =>
    apiClient.post(`/projects/${projectId}/sprints`, data).then((r) => r.data),

  updateSprint: (id: string, data: Partial<Sprint>): Promise<Sprint> =>
    apiClient.patch(`/sprints/${id}`, data).then((r) => r.data),

  activateSprint: (id: string, projectId: string): Promise<Sprint> =>
    apiClient.patch(`/sprints/${id}/activate`, { projectId }).then((r) => r.data),

  deleteSprint: (id: string): Promise<void> =>
    apiClient.delete(`/sprints/${id}`).then(() => undefined),
};
