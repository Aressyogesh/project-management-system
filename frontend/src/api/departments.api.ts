import { apiClient } from './client';
import type { Department } from '../types/users.types';

export const departmentsApi = {
  list: (includeInactive = false) =>
    apiClient
      .get<Department[]>('/departments', { params: includeInactive ? { includeInactive: true } : {} })
      .then((r) => r.data),

  create: (payload: { name: string; businessUnitId?: string }) =>
    apiClient.post<Department>('/departments', payload).then((r) => r.data),

  update: (id: string, payload: { name?: string; businessUnitId?: string | null }) =>
    apiClient.patch<Department>(`/departments/${id}`, payload).then((r) => r.data),

  setStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Department>(`/departments/${id}/status`, { isActive }).then((r) => r.data),
};
