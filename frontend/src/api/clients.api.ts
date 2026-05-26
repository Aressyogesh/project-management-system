import { apiClient } from './client';
import type { Client } from '../types/clients.types';

export const clientsApi = {
  list: (includeInactive = false) =>
    apiClient
      .get<Client[]>('/clients', { params: includeInactive ? { includeInactive: true } : {} })
      .then((r) => r.data),

  create: (payload: { name: string; contactPerson: string; email: string; phone?: string; address?: string }) =>
    apiClient.post<Client>('/clients', payload).then((r) => r.data),

  update: (id: string, payload: Partial<{ name: string; contactPerson: string; email: string; phone: string; address: string }>) =>
    apiClient.patch<Client>(`/clients/${id}`, payload).then((r) => r.data),

  setStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Client>(`/clients/${id}/status`, { isActive }).then((r) => r.data),
};
