import { Injectable } from '@nestjs/common';
import { SystemRole, TaskStatus } from '@prisma/client';
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
    const [
      activeUserCount,
      activeProjectCount,
      totalTaskCount,
      completedTaskCount,
      notStartedCount,
      inProgressCount,
      onReviewCount,
      completedCount,
      rawMyTasks,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.project.count({ where: { status: 'ACTIVE' } }),
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.task.count({ where: { status: TaskStatus.NOT_STARTED } }),
      this.prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.prisma.task.count({ where: { status: TaskStatus.ON_REVIEW } }),
      this.prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.task.findMany({
        where: { assignedToId: userId },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          assignedTo: { select: { fullName: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const myTasks: MyTask[] = rawMyTasks.map((t) => ({
      id: t.id,
      projectName: t.project.name,
      taskName: t.title,
      assignee: t.assignedTo?.fullName ?? '—',
      priority: t.priority,
      status: t.status,
    }));

    const cards: StatCard[] =
      role === SystemRole.EMPLOYEE
        ? [
            { label: 'My Projects', value: 0, change: 0, trend: 'up', color: 'green' },
            { label: 'My Tasks', value: rawMyTasks.length, change: 0, trend: 'up', color: 'blue' },
            { label: 'Assigned To Me', value: rawMyTasks.length, change: 0, trend: 'up', color: 'purple' },
            { label: 'Completed', value: rawMyTasks.filter((t) => t.status === TaskStatus.COMPLETED).length, change: 0, trend: 'up', color: 'rose' },
          ]
        : [
            { label: 'Active Projects', value: activeProjectCount, change: 0, trend: 'up', color: 'green' },
            { label: 'Total Tasks', value: totalTaskCount, change: 0, trend: 'up', color: 'blue' },
            { label: 'Total Users', value: activeUserCount, change: 0, trend: 'up', color: 'purple' },
            { label: 'Completed Tasks', value: completedTaskCount, change: 0, trend: 'up', color: 'rose' },
          ];

    return {
      cards,
      activityData: this.buildActivityData(),
      tasksProgress: {
        notStarted: notStartedCount,
        inProgress: inProgressCount,
        onReview: onReviewCount,
        completed: completedCount,
      },
      myTasks,
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
