import { TaskList, CreateTaskListPayload } from '../types/taskList.types';
import apiClient from './client';

export const taskListsApi = {
  list: (projectId: string) =>
    apiClient.get<TaskList[]>(`/projects/${projectId}/task-lists`).then((r) => r.data),

  create: (projectId: string, payload: CreateTaskListPayload) =>
    apiClient.post<TaskList>(`/projects/${projectId}/task-lists`, payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateTaskListPayload>) =>
    apiClient.patch<TaskList>(`/task-lists/${id}`, payload).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/task-lists/${id}`),
};
