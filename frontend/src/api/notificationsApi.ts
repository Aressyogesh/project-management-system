import { apiClient } from './client';

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  workItemId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getAll: (): Promise<AppNotification[]> =>
    apiClient.get('/notifications').then((r) => r.data),

  getUnreadCount: (): Promise<{ count: number }> =>
    apiClient.get('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string): Promise<void> =>
    apiClient.patch(`/notifications/${id}/read`).then(() => undefined),

  markAllRead: (): Promise<void> =>
    apiClient.patch('/notifications/read-all').then(() => undefined),
};
