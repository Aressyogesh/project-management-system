import { ActivityPoint, Announcement, DashboardStats, MemberActivity, ProjectProgress, TasksProgress } from '../types/dashboard.types';
import { apiClient } from './client';

export const dashboardApi = {
  getStats: async (params?: { projectId?: string; month?: string }): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>('/dashboard/stats', { params });
    return data;
  },

  getProjectsProgress: async (): Promise<ProjectProgress[]> => {
    const { data } = await apiClient.get<ProjectProgress[]>('/dashboard/projects-progress');
    return data;
  },

  getTeamActivity: async (projectId: string, month: string): Promise<MemberActivity[]> => {
    const { data } = await apiClient.get<MemberActivity[]>('/dashboard/team-activity', {
      params: { projectId, month },
    });
    return data;
  },

  getTasksProgress: async (params?: { projectId?: string; period?: '7d' | '30d' | 'all' }): Promise<TasksProgress> => {
    const { data } = await apiClient.get<TasksProgress>('/dashboard/tasks-progress', { params });
    return data;
  },

  getActivityData: async (params?: { projectId?: string; period?: 'monthly' | 'weekly' }): Promise<ActivityPoint[]> => {
    const { data } = await apiClient.get<ActivityPoint[]>('/dashboard/activity', { params });
    return data;
  },

  getAnnouncements: async (params?: { projectId?: string; month?: string }): Promise<Announcement[]> => {
    const { data } = await apiClient.get<Announcement[]>('/dashboard/announcements', { params });
    return data;
  },
};
