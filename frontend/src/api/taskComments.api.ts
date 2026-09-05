import { CreateCommentPayload, TaskComment } from '../types/taskComment.types';
import { apiClient } from './client';

export const taskCommentsApi = {
  list: (taskId: string) =>
    apiClient.get<TaskComment[]>(`/tasks/${taskId}/comments`).then((r) => r.data),

  create: (taskId: string, payload: CreateCommentPayload) =>
    apiClient.post<TaskComment>(`/tasks/${taskId}/comments`, payload).then((r) => r.data),

  remove: (commentId: string) => apiClient.delete(`/comments/${commentId}`),
};
