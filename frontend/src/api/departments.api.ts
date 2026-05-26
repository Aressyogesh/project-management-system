import { apiClient } from './client';
import type { Department } from '../types/users.types';

export const departmentsApi = {
  list: (includeInactive = false) =>
    apiClient
      .get<Department[]>('/departments', { params: includeInactive ? { includeInactive: true } : {} })
      .then((r) => r.data),

  create: (name: string) =>
    apiClient.post<Department>('/departments', { name }).then((r) => r.data),

  update: (id: string, name: string) =>
    apiClient.patch<Department>(`/departments/${id}`, { name }).then((r) => r.data),

  setStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Department>(`/departments/${id}/status`, { isActive }).then((r) => r.data),
};
