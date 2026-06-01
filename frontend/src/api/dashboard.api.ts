import { DashboardStats, ProjectProgress } from '../types/dashboard.types';
import { apiClient } from './client';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
    return data;
  },

  getProjectsProgress: async (): Promise<ProjectProgress[]> => {
    const { data } = await apiClient.get<ProjectProgress[]>('/dashboard/projects-progress');
    return data;
  },
};
