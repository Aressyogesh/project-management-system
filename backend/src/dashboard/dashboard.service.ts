import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface StatCard {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
  color: 'green' | 'blue' | 'purple' | 'rose';
}

export interface ActivityPoint {
  month: string;
  high: number;
  low: number;
}

export interface TasksProgress {
  notStarted: number;
  inProgress: number;
  onReview: number;
  completed: number;
}

export interface MyTask {
  id: string;
  projectName: string;
  taskName: string;
  assignee: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_REVIEW' | 'COMPLETED';
}

export interface DashboardStats {
  cards: StatCard[];
  activityData: ActivityPoint[];
  tasksProgress: TasksProgress;
  myTasks: MyTask[];
  todayTask: { name: string; progress: number } | null;
  teamPerformance: { score: number; change: number };
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string, role: SystemRole): Promise<DashboardStats> {
    const activeUserCount = await this.prisma.user.count({ where: { isActive: true } });

    const cards: StatCard[] =
      role === SystemRole.EMPLOYEE
        ? [
            { label: 'My Projects', value: 0, change: 0, trend: 'up', color: 'green' },
            { label: 'My Tasks', value: 0, change: 0, trend: 'up', color: 'blue' },
            { label: 'Assigned To Me', value: 0, change: 0, trend: 'up', color: 'purple' },
            { label: 'Completed', value: 0, change: 0, trend: 'up', color: 'rose' },
          ]
        : [
            { label: 'Active Projects', value: 0, change: 12, trend: 'up', color: 'green' },
            { label: 'Total Tasks', value: 0, change: 21, trend: 'up', color: 'blue' },
            { label: 'Total Users', value: activeUserCount, change: 0, trend: 'up', color: 'purple' },
            { label: 'Completed Tasks', value: 0, change: 37, trend: 'up', color: 'rose' },
          ];

    return {
      cards,
      activityData: this.buildActivityData(),
      tasksProgress: { notStarted: 0, inProgress: 0, onReview: 0, completed: 0 },
      myTasks: [],
      todayTask: null,
      teamPerformance: { score: 0, change: 0 },
    };
  }

  private buildActivityData(): ActivityPoint[] {
    return [
      { month: 'Jan', high: 65, low: 30 },
      { month: 'Feb', high: 55, low: 45 },
      { month: 'Mar', high: 70, low: 20 },
      { month: 'Apr', high: 35, low: 55 },
      { month: 'May', high: 20, low: 40 },
      { month: 'Jun', high: 28, low: 35 },
      { month: 'Jul', high: 85, low: 30 },
      { month: 'Aug', high: 60, low: 50 },
      { month: 'Sep', high: 45, low: 30 },
      { month: 'Oct', high: 55, low: 40 },
      { month: 'Nov', high: 90, low: 20 },
      { month: 'Dec', high: 75, low: 35 },
    ];
  }
}
