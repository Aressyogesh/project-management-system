import { Injectable } from '@nestjs/common';
import { BoardStatus, ProjectRole, ProjectStatus, SystemRole, TaskStatus, WorkItemType } from '@prisma/client';
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

export interface ProjectProgress {
  id: string;
  name: string;
  clientName: string;
  projectManager: string;
  teamSize: number;
  totalTasks: number;
  completedTasks: number;
  openBugs: number;
  progress: number;
}

export interface DashboardStats {
  cards: StatCard[];
  activityData: ActivityPoint[];
  tasksProgress: TasksProgress;
  myTasks: MyTask[];
  todayTask: { name: string; progress: number } | null;
  teamPerformance: { score: number; change: number };
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string, role: SystemRole): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activeUserCount,
      activeProjectCount,
      rawMyTasks,
      notStartedCount,
      inProgressCount,
      onReviewCount,
      completedCount,
      totalWorkItems,
      completedWorkItems,
      todayWorkItem,
      activeProjects,
      myProjectCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.project.count({ where: { status: ProjectStatus.ACTIVE } }),
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
      this.prisma.task.count({ where: { status: TaskStatus.NOT_STARTED } }),
      this.prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.prisma.task.count({ where: { status: TaskStatus.ON_REVIEW } }),
      this.prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.workItem.count(),
      this.prisma.workItem.count({ where: { status: BoardStatus.QA_DONE } }),
      this.prisma.workItem.findFirst({
        where: {
          assigneeId: userId,
          dueDate: { gte: today, lt: tomorrow },
          status: { not: BoardStatus.QA_DONE },
        },
        select: { title: true, status: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { status: ProjectStatus.ACTIVE },
        select: {
          _count: { select: { workItems: true } },
          workItems: { where: { status: BoardStatus.QA_DONE }, select: { id: true } },
        },
      }),
      this.prisma.projectMember.count({ where: { userId } }),
    ]);

    const myTasks: MyTask[] = rawMyTasks.map((t) => ({
      id: t.id,
      projectName: t.project.name,
      taskName: t.title,
      assignee: t.assignedTo?.fullName ?? '—',
      priority: t.priority,
      status: t.status,
    }));

    const totalTaskCount = notStartedCount + inProgressCount + onReviewCount + completedCount + totalWorkItems;

    const cards: StatCard[] =
      role === SystemRole.EMPLOYEE
        ? [
            { label: 'My Projects', value: myProjectCount, change: 0, trend: 'up', color: 'green' },
            { label: 'My Tasks', value: rawMyTasks.length, change: 0, trend: 'up', color: 'blue' },
            { label: 'Assigned To Me', value: rawMyTasks.length, change: 0, trend: 'up', color: 'purple' },
            {
              label: 'Completed',
              value: rawMyTasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
              change: 0,
              trend: 'up',
              color: 'rose',
            },
          ]
        : [
            { label: 'Active Projects', value: activeProjectCount, change: 0, trend: 'up', color: 'green' },
            { label: 'Total Tasks', value: totalTaskCount, change: 0, trend: 'up', color: 'blue' },
            { label: 'Total Users', value: activeUserCount, change: 0, trend: 'up', color: 'purple' },
            { label: 'Completed Tasks', value: completedCount + completedWorkItems, change: 0, trend: 'up', color: 'rose' },
          ];

    const teamPerformanceScore = this.calcTeamPerformance(activeProjects);

    return {
      cards,
      activityData: await this.buildActivityData(),
      tasksProgress: {
        notStarted: notStartedCount,
        inProgress: inProgressCount,
        onReview: onReviewCount,
        completed: completedCount,
      },
      myTasks,
      todayTask: todayWorkItem
        ? {
            name: todayWorkItem.title,
            progress: todayWorkItem.status === BoardStatus.IN_REVIEW || todayWorkItem.status === BoardStatus.QA ? 75 : 50,
          }
        : null,
      teamPerformance: { score: teamPerformanceScore, change: 0 },
    };
  }

  async getProjectsProgress(): Promise<ProjectProgress[]> {
    const projects = await this.prisma.project.findMany({
      where: { status: ProjectStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        client: { select: { name: true } },
        members: {
          select: {
            projectRole: true,
            user: { select: { fullName: true } },
          },
        },
        workItems: {
          where: { parentId: null },
          select: { id: true, status: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => {
      const pm = project.members.find((m) => m.projectRole === ProjectRole.PROJECT_MANAGER);
      const totalTasks = project.workItems.length;
      const completedTasks = project.workItems.filter((wi) => wi.status === BoardStatus.QA_DONE).length;
      const openBugs = project.workItems.filter(
        (wi) => wi.type === WorkItemType.BUG && wi.status !== BoardStatus.QA_DONE,
      ).length;
      const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      return {
        id: project.id,
        name: project.name,
        clientName: project.client?.name ?? '—',
        projectManager: pm?.user?.fullName ?? '—',
        teamSize: project.members.length,
        totalTasks,
        completedTasks,
        openBugs,
        progress,
      };
    });
  }

  private calcTeamPerformance(
    activeProjects: { _count: { workItems: number }; workItems: { id: string }[] }[],
  ): number {
    if (activeProjects.length === 0) return 0;
    const ratios = activeProjects.map((p) => {
      if (p._count.workItems === 0) return 0;
      return (p.workItems.length / p._count.workItems) * 100;
    });
    const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    return Math.round(avg * 10) / 10;
  }

  private async buildActivityData(): Promise<ActivityPoint[]> {
    const now = new Date();
    const points: ActivityPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const [created, completed] = await Promise.all([
        this.prisma.workItem.count({
          where: { createdAt: { gte: date, lt: nextDate } },
        }),
        this.prisma.workItem.count({
          where: {
            status: BoardStatus.QA_DONE,
            updatedAt: { gte: date, lt: nextDate },
          },
        }),
      ]);

      points.push({
        month: MONTH_ABBR[date.getMonth()],
        high: created,
        low: completed,
      });
    }

    return points;
  }
}
