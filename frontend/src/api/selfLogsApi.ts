import { apiClient } from './client';

export interface LeaveLog {
  id: string;
  userId: string;
  date: string;
  type: string;
  description: string | null;
  createdAt: string;
}

export interface LearningLog {
  id: string;
  userId: string;
  period: string;
  topic: string;
  hours: number;
  description: string | null;
  createdAt: string;
}

export interface InnovationLog {
  id: string;
  userId: string;
  period: string;
  title: string;
  impact: string;
  type: string;
  createdAt: string;
}

export const selfLogsApi = {
  // Leave logs
  getLeaveLogs: (period?: string): Promise<LeaveLog[]> =>
    apiClient.get('/leave-logs', { params: period ? { period } : undefined }).then((r) => r.data),

  createLeaveLog: (dto: { date: string; type: string; description?: string }): Promise<LeaveLog> =>
    apiClient.post('/leave-logs', dto).then((r) => r.data),

  deleteLeaveLog: (id: string): Promise<void> =>
    apiClient.delete(`/leave-logs/${id}`).then(() => undefined),

  // Learning logs
  getLearningLogs: (period?: string, targetUserId?: string): Promise<LearningLog[]> =>
    apiClient.get('/learning-logs', { params: { ...(period && { period }), ...(targetUserId && { targetUserId }) } }).then((r) => r.data),

  createLearningLog: (dto: { period: string; topic: string; hours: number; description?: string; targetUserId?: string }): Promise<LearningLog> =>
    apiClient.post('/learning-logs', dto).then((r) => r.data),

  deleteLearningLog: (id: string): Promise<void> =>
    apiClient.delete(`/learning-logs/${id}`).then(() => undefined),

  // Innovation logs
  getInnovationLogs: (period?: string, targetUserId?: string): Promise<InnovationLog[]> =>
    apiClient.get('/innovation-logs', { params: { ...(period && { period }), ...(targetUserId && { targetUserId }) } }).then((r) => r.data),

  createInnovationLog: (dto: { period: string; title: string; impact: string; type: string; targetUserId?: string }): Promise<InnovationLog> =>
    apiClient.post('/innovation-logs', dto).then((r) => r.data),

  deleteInnovationLog: (id: string): Promise<void> =>
    apiClient.delete(`/innovation-logs/${id}`).then(() => undefined),
};
