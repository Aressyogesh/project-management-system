import { client } from './client';
import type { CreateUserPayload, UpdateUserPayload, User, UsersPage } from '../types/users.types';

export const usersApi = {
  list: (params: { page?: number; limit?: number; search?: string }) =>
    client.get<UsersPage>('/users', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<User>(`/users/${id}`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    client.post<User>('/users', payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserPayload) =>
    client.patch<User>(`/users/${id}`, payload).then((r) => r.data),

  setStatus: (id: string, isActive: boolean) =>
    client.patch<User>(`/users/${id}/status`, { isActive }).then((r) => r.data),

  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client.patch<User>(`/users/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
