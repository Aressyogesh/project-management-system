import { apiClient } from './client';
import type { AdditionalContact, Client } from '../types/clients.types';

export const clientsApi = {
  list: (includeInactive = false) =>
    apiClient
      .get<Client[]>('/clients', { params: includeInactive ? { includeInactive: true } : {} })
      .then((r) => r.data),

  create: (payload: { name: string; contactPerson: string; designation?: string; email: string; phone?: string; address?: string; businessUnitId?: string; additionalContacts?: AdditionalContact[] }) =>
    apiClient.post<Client>('/clients', payload).then((r) => r.data),

  update: (id: string, payload: Partial<{ name: string; contactPerson: string; designation: string | null; email: string; phone: string; address: string; businessUnitId: string | null; additionalContacts: AdditionalContact[] }>) =>
    apiClient.patch<Client>(`/clients/${id}`, payload).then((r) => r.data),

  setStatus: (id: string, isActive: boolean) =>
    apiClient.patch<Client>(`/clients/${id}/status`, { isActive }).then((r) => r.data),
};
