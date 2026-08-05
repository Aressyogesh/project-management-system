import { apiClient } from './client';

export interface LateComingLog {
  id: string;
  userId: string;
  date: string;
  minutesLate: number;
  reason: string | null;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; fullName: string; profilePhoto: string | null };
  recordedBy: { id: string; fullName: string };
}

export interface CreateLateComingDto {
  targetUserId: string;
  date: string;
  minutesLate: number;
  reason?: string;
}

export const lateComingsApi = {
  create: (dto: CreateLateComingDto): Promise<LateComingLog> =>
    apiClient.post('/late-comings', dto).then((r) => r.data),

  list: (params?: { userId?: string }): Promise<LateComingLog[]> =>
    apiClient.get('/late-comings', { params }).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/late-comings/${id}`).then(() => undefined),
};
