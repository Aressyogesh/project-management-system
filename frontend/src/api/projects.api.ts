import { apiClient } from './client';
import type { CreateProjectPayload, Project, ProjectMember, ProjectRole, ProjectStatus, ProjectSummary, ProjectType } from '../types/projects.types';

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

  listMembers: (projectId: string) =>
    apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`).then((r) => r.data),

  addMember: (projectId: string, userId: string, projectRole: ProjectRole) =>
    apiClient.post<ProjectMember>(`/projects/${projectId}/members`, { userId, projectRole }).then((r) => r.data),

  updateMemberRole: (projectId: string, userId: string, projectRole: ProjectRole) =>
    apiClient.patch<ProjectMember>(`/projects/${projectId}/members/${userId}`, { projectRole }).then((r) => r.data),

  removeMember: (projectId: string, userId: string) =>
    apiClient.delete(`/projects/${projectId}/members/${userId}`),

  setTeamsWebhook: (id: string, teamsWebhookUrl: string | null) =>
    apiClient.patch<Project>(`/projects/${id}/teams-webhook`, { teamsWebhookUrl }).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/projects/${id}`),
};
