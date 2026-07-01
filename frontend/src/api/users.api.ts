import { apiClient } from './client';
import type { CreateUserPayload, UpdateUserPayload, User, UsersPage } from '../types/users.types';
import type { AuthUser } from '../types/auth.types';

export interface CelebrationEntry {
  type: 'BIRTHDAY' | 'ANNIVERSARY';
  user: { id: string; fullName: string; profilePhoto: string | null };
  yearsCount: number;
}

export const usersApi = {
  getProfile: () =>
    apiClient.get<AuthUser>('/users/profile').then((r) => r.data),

  updateProfile: (payload: { fullName?: string; email?: string; currentPassword?: string; newPassword?: string; dateOfBirth?: string }, photo?: File) => {
    const form = new FormData();
    if (payload.fullName) form.append('fullName', payload.fullName);
    if (payload.email) form.append('email', payload.email);
    if (payload.currentPassword) form.append('currentPassword', payload.currentPassword);
    if (payload.newPassword) form.append('newPassword', payload.newPassword);
    if (payload.dateOfBirth !== undefined) form.append('dateOfBirth', payload.dateOfBirth);
    if (photo) form.append('photo', photo);
    return apiClient.patch<AuthUser>('/users/profile', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  getCelebrationsToday: () =>
    apiClient.get<CelebrationEntry[]>('/users/celebrations/today').then((r) => r.data),

  postCelebrationAnnouncement: () =>
    apiClient.post('/users/celebrations/announce').then((r) => r.data),


  list: (params: { page?: number; limit?: number; search?: string; departmentId?: string }) =>
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
