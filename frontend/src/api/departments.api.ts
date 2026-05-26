import { client } from './client';
import type { Department } from '../types/users.types';

export const departmentsApi = {
  list: () => client.get<Department[]>('/departments').then((r) => r.data),
};
