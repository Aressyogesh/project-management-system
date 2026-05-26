import { apiClient } from './client';
import type { Department } from '../types/users.types';

export const departmentsApi = {
  list: () => apiClient.get<Department[]>('/departments').then((r) => r.data),
};
