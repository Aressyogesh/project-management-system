import { TaskAttachment } from '../types/taskAttachment.types';
import { apiClient } from './client';

export const taskAttachmentsApi = {
  list: (taskId: string) =>
    apiClient.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`).then((r) => r.data),

  upload: (taskId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<TaskAttachment>(`/tasks/${taskId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  download: async (attachmentId: string, originalName: string) => {
    const res = await apiClient.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  remove: (attachmentId: string) => apiClient.delete(`/attachments/${attachmentId}`),
};
