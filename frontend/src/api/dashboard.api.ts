import { DashboardStats } from '../types/dashboard.types';
import { apiClient } from './client';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
    return data;
  },
};
