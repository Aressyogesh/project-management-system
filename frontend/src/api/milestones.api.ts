import { apiClient } from './client';
import type { CreateMilestonePayload, Milestone } from '../types/milestones.types';

export const milestonesApi = {
  list: (projectId: string) =>
    apiClient.get<Milestone[]>(`/projects/${projectId}/milestones`).then((r) => r.data),

  create: (projectId: string, payload: CreateMilestonePayload) =>
    apiClient.post<Milestone>(`/projects/${projectId}/milestones`, payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateMilestonePayload>) =>
    apiClient.patch<Milestone>(`/milestones/${id}`, payload).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/milestones/${id}`),
};
