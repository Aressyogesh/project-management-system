import { apiClient } from './client';
import type { BusinessUnit } from '../types/businessUnit.types';

export const businessUnitsApi = {
  list: (includeInactive = false) =>
    apiClient
      .get<BusinessUnit[]>('/business-units', { params: includeInactive ? { includeInactive: true } : {} })
      .then((r) => r.data),

  create: (payload: { name: string; description?: string }) =>
    apiClient.post<BusinessUnit>('/business-units', payload).then((r) => r.data),

  update: (id: string, payload: { name?: string; description?: string }) =>
    apiClient.patch<BusinessUnit>(`/business-units/${id}`, payload).then((r) => r.data),

  setStatus: (id: string, isActive: boolean) =>
    apiClient.patch<BusinessUnit>(`/business-units/${id}/status`, { isActive }).then((r) => r.data),
};
