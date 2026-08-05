import { apiClient } from './client';
import type {
  AllocationCheck,
  CreateTaskAllocationPayload,
  TaskAllocation,
  UpdateTaskAllocationPayload,
} from '../types/taskAllocation.types';

export const taskAllocationsApi = {
  listByProject: (projectId: string) =>
    apiClient
      .get<TaskAllocation[]>(`/projects/${projectId}/task-allocations`)
      .then((r) => r.data),

  create: (projectId: string, payload: CreateTaskAllocationPayload) =>
    apiClient
      .post<TaskAllocation>(`/projects/${projectId}/task-allocations`, payload)
      .then((r) => r.data),

  update: (id: string, payload: UpdateTaskAllocationPayload) =>
    apiClient.patch<TaskAllocation>(`/task-allocations/${id}`, payload).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/task-allocations/${id}`),

  check: (userId: string, date: string) =>
    apiClient
      .get<AllocationCheck>(`/task-allocations/check`, { params: { userId, date } })
      .then((r) => r.data),

  listByUser: (userId: string, from?: string, to?: string) =>
    apiClient
      .get<TaskAllocation[]>(`/task-allocations/user/${userId}`, {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      })
      .then((r) => r.data),
};
