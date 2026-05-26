import { apiClient } from './client';
import type { CreateProjectPayload, Project, ProjectStatus, ProjectSummary, ProjectType } from '../types/projects.types';

export const projectsApi = {
  list: (params?: { status?: ProjectStatus; type?: ProjectType }) =>
    apiClient.get<Project[]>('/projects', { params }).then((r) => r.data),

  summary: () =>
    apiClient.get<ProjectSummary>('/projects/summary').then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (payload: CreateProjectPayload) =>
    apiClient.post<Project>('/projects', payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateProjectPayload>) =>
    apiClient.patch<Project>(`/projects/${id}`, payload).then((r) => r.data),

  setStatus: (id: string, status: ProjectStatus) =>
    apiClient.patch<Project>(`/projects/${id}/status`, { status }).then((r) => r.data),
};
