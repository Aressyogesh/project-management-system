import { apiClient } from './client';

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: { id: string; fullName: string; profilePhoto?: string | null };
}

export interface AnnouncementsPage {
  data: AnnouncementRecord[];
  total: number;
  page: number;
  lastPage: number;
}

export const announcementsApi = {
  list: (params?: { page?: number; limit?: number; latest?: boolean }) =>
    apiClient.get<AnnouncementsPage>('/announcements', { params }).then((r: { data: AnnouncementsPage }) => r.data),

  create: (dto: { title: string; content: string }) =>
    apiClient.post<AnnouncementRecord>('/announcements', dto).then((r: { data: AnnouncementRecord }) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/announcements/${id}`),
};
