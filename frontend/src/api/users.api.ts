import { apiClient } from './client';
import type { CreateUserPayload, UpdateUserPayload, User, UsersPage } from '../types/users.types';

export const usersApi = {
  list: (params: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<UsersPage>('/users', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<User>(`/users/${id}`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    apiClient.post<User>('/users', payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.patch<User>(`/users/${id}`, payload).then((r) => r.data),

  setStatus: (id: string, isActive: boolean) =>
    apiClient.patch<User>(`/users/${id}/status`, { isActive }).then((r) => r.data),

  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.patch<User>(`/users/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
