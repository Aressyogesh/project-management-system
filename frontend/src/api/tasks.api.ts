import { CreateTaskPayload, Task } from '../types/task.types';
import { apiClient } from './client';

export const tasksApi = {
  list: (projectId: string) =>
    apiClient.get<Task[]>(`/projects/${projectId}/tasks`).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Task>(`/tasks/${id}`).then((r) => r.data),

  create: (projectId: string, payload: CreateTaskPayload) =>
    apiClient.post<Task>(`/projects/${projectId}/tasks`, payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateTaskPayload>) =>
    apiClient.patch<Task>(`/tasks/${id}`, payload).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/tasks/${id}`),
};
