import { Injectable } from '@nestjs/common';
import { BoardStatus, LeaveStatus, MilestoneStatus, ProjectRole, ProjectStatus, SystemRole, TaskStatus, WorkItemType } from '@prisma/client';
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

export interface MemberActivity {
  userId: string;
  name: string;
  projectRole: string;
  profilePhoto: string | null;
  tasksAssigned: number;
  tasksCompleted: number;
  hoursLogged: number;
  bugsReported: number;
  leaveDays: number;
}

export interface Announcement {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  body: string;
  date: string;
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

  async getStats(userId: string, role: SystemRole, projectId?: string, month?: string): Promise<DashboardStats> {
    if (projectId && month) {
      return this.getProjectStats(userId, role, projectId, month);
    }
    return this.getGlobalStats(userId, role);
  }

  private async getGlobalStats(userId: string, role: SystemRole): Promise<DashboardStats> {
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
          id: true, title: true, priority: true, status: true,
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
        where: { assigneeId: userId, dueDate: { gte: today, lt: tomorrow }, status: { not: BoardStatus.QA_DONE } },
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
            { label: 'My Projects',   value: myProjectCount,         change: 0, trend: 'up', color: 'green'  },
            { label: 'My Tasks',      value: rawMyTasks.length,      change: 0, trend: 'up', color: 'blue'   },
            { label: 'Assigned To Me',value: rawMyTasks.length,      change: 0, trend: 'up', color: 'purple' },
            { label: 'Completed',     value: rawMyTasks.filter((t) => t.status === TaskStatus.COMPLETED).length, change: 0, trend: 'up', color: 'rose' },
          ]
        : [
            { label: 'Active Projects', value: activeProjectCount,                  change: 0, trend: 'up', color: 'green'  },
            { label: 'Total Tasks',     value: totalTaskCount,                       change: 0, trend: 'up', color: 'blue'   },
            { label: 'Total Users',     value: activeUserCount,                      change: 0, trend: 'up', color: 'purple' },
            { label: 'Completed Tasks', value: completedCount + completedWorkItems,  change: 0, trend: 'up', color: 'rose'   },
          ];

    return {
      cards,
      activityData: await this.buildActivityData(),
      tasksProgress: { notStarted: notStartedCount, inProgress: inProgressCount, onReview: onReviewCount, completed: completedCount },
      myTasks,
      todayTask: todayWorkItem
        ? { name: todayWorkItem.title, progress: todayWorkItem.status === BoardStatus.IN_REVIEW || todayWorkItem.status === BoardStatus.READY_FOR_QA || todayWorkItem.status === BoardStatus.IN_QA ? 75 : 50 }
        : null,
      teamPerformance: { score: this.calcTeamPerformance(activeProjects), change: 0 },
    };
  }

  private async getProjectStats(userId: string, role: SystemRole, projectId: string, month: string): Promise<DashboardStats> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate   = new Date(year, monthNum, 1);
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow  = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      teamSize,
      totalWorkItems,
      completedThisMonth,
      openBugs,
      todoCount,
      inProgressCount,
      inReviewCount,
      doneCount,
      todayWorkItem,
      myWorkItems,
    ] = await Promise.all([
      this.prisma.projectMember.count({ where: { projectId } }),
      this.prisma.workItem.count({ where: { projectId } }),
      this.prisma.workItem.count({
        where: { projectId, status: BoardStatus.QA_DONE, updatedAt: { gte: startDate, lt: endDate } },
      }),
      this.prisma.workItem.count({
        where: { projectId, type: WorkItemType.BUG, status: { not: BoardStatus.QA_DONE } },
      }),
      this.prisma.workItem.count({ where: { projectId, status: BoardStatus.TODO } }),
      this.prisma.workItem.count({ where: { projectId, status: { in: [BoardStatus.IN_PROGRESS, BoardStatus.BLOCKED] } } }),
      this.prisma.workItem.count({ where: { projectId, status: { in: [BoardStatus.IN_REVIEW, BoardStatus.READY_FOR_QA, BoardStatus.IN_QA] } } }),
      this.prisma.workItem.count({ where: { projectId, status: BoardStatus.QA_DONE } }),
      this.prisma.workItem.findFirst({
        where: { projectId, assigneeId: userId, dueDate: { gte: today, lt: tomorrow }, status: { not: BoardStatus.QA_DONE } },
        select: { title: true, status: true },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.workItem.findMany({
        where: { projectId, assigneeId: userId, type: { in: [WorkItemType.TASK, WorkItemType.SUB_TASK] } },
        select: {
          id: true, title: true, priority: true, status: true,
          project: { select: { name: true } },
          assignee: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const progress = totalWorkItems === 0 ? 0 : Math.round((doneCount / totalWorkItems) * 100);

    const cards: StatCard[] = [
      { label: 'Team Members',    value: teamSize,          change: 0, trend: 'up',                         color: 'green'  },
      { label: 'Work Items',      value: totalWorkItems,    change: 0, trend: 'up',                         color: 'blue'   },
      { label: 'Completed',       value: completedThisMonth,change: 0, trend: completedThisMonth > 0 ? 'up' : 'down', color: 'rose' },
      { label: 'Open Bugs',       value: openBugs,          change: 0, trend: openBugs === 0 ? 'up' : 'down', color: 'purple' },
    ];

    const myTasks: MyTask[] = myWorkItems.map((wi) => ({
      id:          wi.id,
      projectName: wi.project.name,
      taskName:    wi.title,
      assignee:    wi.assignee?.fullName ?? '—',
      priority:    wi.priority as MyTask['priority'],
      status:      'IN_PROGRESS' as MyTask['status'],
    }));

    return {
      cards,
      activityData:  await this.buildActivityData(projectId),
      tasksProgress: { notStarted: todoCount, inProgress: inProgressCount, onReview: inReviewCount, completed: doneCount },
      myTasks,
      todayTask: todayWorkItem
        ? { name: todayWorkItem.title, progress: todayWorkItem.status === BoardStatus.IN_REVIEW || todayWorkItem.status === BoardStatus.READY_FOR_QA || todayWorkItem.status === BoardStatus.IN_QA ? 75 : 50 }
        : null,
      teamPerformance: { score: progress, change: 0 },
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

  async getTeamActivity(projectId: string, month: string): Promise<MemberActivity[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate   = new Date(year, monthNum, 1);

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: {
        projectRole: true,
        user: { select: { id: true, fullName: true, profilePhoto: true } },
      },
      orderBy: { projectRole: 'asc' },
    });

    if (members.length === 0) return [];

    return Promise.all(
      members.map(async (m) => {
        const uid = m.user.id;

        const [tasksAssigned, tasksCompleted, timeAgg, bugsReported, leaveAgg] = await Promise.all([
          this.prisma.workItem.count({
            where: {
              projectId,
              assigneeId: uid,
              type: { in: [WorkItemType.TASK, WorkItemType.SUB_TASK] },
              createdAt: { gte: startDate, lt: endDate },
            },
          }),
          this.prisma.workItem.count({
            where: {
              projectId,
              assigneeId: uid,
              status: BoardStatus.QA_DONE,
              updatedAt: { gte: startDate, lt: endDate },
            },
          }),
          this.prisma.timesheetEntry.aggregate({
            where: {
              userId: uid,
              workItem: { projectId },
              date: { gte: startDate, lt: endDate },
            },
            _sum: { hours: true },
          }),
          this.prisma.workItem.count({
            where: {
              projectId,
              reporterId: uid,
              type: WorkItemType.BUG,
              createdAt: { gte: startDate, lt: endDate },
            },
          }),
          this.prisma.leaveRequest.aggregate({
            where: {
              userId: uid,
              status: LeaveStatus.APPROVED,
              startDate: { lt: endDate },
              endDate:   { gte: startDate },
            },
            _sum: { totalDays: true },
          }),
        ]);

        return {
          userId:         uid,
          name:           m.user.fullName ?? '—',
          projectRole:    m.projectRole,
          profilePhoto:   m.user.profilePhoto ?? null,
          tasksAssigned,
          tasksCompleted,
          hoursLogged:    Number(timeAgg._sum.hours ?? 0),
          bugsReported,
          leaveDays:      leaveAgg._sum.totalDays ?? 0,
        };
      }),
    );
  }

  async getTasksProgress(projectId?: string, period: '7d' | '30d' | 'all' = 'all'): Promise<TasksProgress> {
    const base: any = projectId ? { projectId } : {};
    if (period !== 'all') {
      const days = period === '7d' ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      base.createdAt = { gte: since };
    }

    const [notStarted, inProgress, onReview, completed] = await Promise.all([
      this.prisma.workItem.count({ where: { ...base, status: BoardStatus.TODO } }),
      this.prisma.workItem.count({ where: { ...base, status: { in: [BoardStatus.IN_PROGRESS, BoardStatus.BLOCKED] } } }),
      this.prisma.workItem.count({ where: { ...base, status: { in: [BoardStatus.IN_REVIEW, BoardStatus.READY_FOR_QA, BoardStatus.IN_QA] } } }),
      this.prisma.workItem.count({ where: { ...base, status: BoardStatus.QA_DONE } }),
    ]);

    return { notStarted, inProgress, onReview, completed };
  }

  async getActivityData(projectId?: string, period: 'monthly' | 'weekly' = 'monthly'): Promise<ActivityPoint[]> {
    return period === 'weekly'
      ? this.buildWeeklyActivityData(projectId)
      : this.buildActivityData(projectId);
  }

  private async buildWeeklyActivityData(projectId?: string): Promise<ActivityPoint[]> {
    const now   = new Date();
    const base  = projectId ? { projectId } : {};
    const points: ActivityPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const [created, completed] = await Promise.all([
        this.prisma.workItem.count({ where: { ...base, createdAt: { gte: weekStart, lt: weekEnd } } }),
        this.prisma.workItem.count({ where: { ...base, status: BoardStatus.QA_DONE, updatedAt: { gte: weekStart, lt: weekEnd } } }),
      ]);

      const label = `${MONTH_ABBR[weekStart.getMonth()]} W${Math.ceil(weekStart.getDate() / 7)}`;
      points.push({ month: label, high: created, low: completed });
    }

    return points;
  }

  async getAnnouncements(projectId?: string, month?: string): Promise<Announcement[]> {
    const items: Announcement[] = [];

    // Date range: entire selected month OR last 30 days if no month filter
    let since: Date;
    let until: Date | undefined;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      since = new Date(y, m - 1, 1);
      until = new Date(y, m, 1);
    } else {
      since = new Date();
      since.setDate(since.getDate() - 30);
    }

    const projectFilter = projectId ? { projectId } : {};
    const dateUntil     = until ?? new Date();

    const [completedMilestones, activeSprints, newMembers, bugProjects] = await Promise.all([
      this.prisma.milestone.findMany({
        where: {
          ...projectFilter,
          status: MilestoneStatus.COMPLETED,
          updatedAt: { gte: since, lt: dateUntil },
        },
        select: { id: true, name: true, project: { select: { name: true } }, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 4,
      }),
      this.prisma.sprint.findMany({
        where: { ...projectFilter, isActive: true },
        select: { id: true, name: true, project: { select: { name: true } }, startDate: true },
        orderBy: { startDate: 'desc' },
        take: 3,
      }),
      this.prisma.projectMember.findMany({
        where: { ...projectFilter, joinedAt: { gte: since, lt: dateUntil } },
        select: { id: true, user: { select: { fullName: true } }, project: { select: { name: true } }, joinedAt: true },
        orderBy: { joinedAt: 'desc' },
        take: 3,
      }),
      this.prisma.project.findMany({
        where: projectId ? { id: projectId } : { status: ProjectStatus.ACTIVE },
        select: {
          id: true, name: true,
          _count: { select: { workItems: { where: { type: WorkItemType.BUG, status: { not: BoardStatus.QA_DONE } } } } },
        },
        take: projectId ? 1 : 10,
      }),
    ]);

    completedMilestones.forEach((m) => {
      items.push({
        id:    `ms-${m.id}`,
        type:  'success',
        title: `Milestone completed — ${m.project.name}`,
        body:  `"${m.name}" has been marked as completed.`,
        date:  m.updatedAt.toISOString().slice(0, 10),
      });
    });

    activeSprints.forEach((s) => {
      items.push({
        id:    `sp-${s.id}`,
        type:  'info',
        title: `Sprint active — ${s.project.name}`,
        body:  `${s.name} is now active and accepting work items.`,
        date:  s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    });

    newMembers.forEach((pm) => {
      items.push({
        id:    `pm-${pm.id}`,
        type:  'info',
        title: `New member joined — ${pm.project.name}`,
        body:  `${pm.user.fullName ?? 'A new member'} has been added to the project team.`,
        date:  pm.joinedAt.toISOString().slice(0, 10),
      });
    });

    bugProjects
      .filter((p) => p._count.workItems >= 5)
      .slice(0, 2)
      .forEach((p) => {
        items.push({
          id:    `bug-${p.id}`,
          type:  'warning',
          title: `High open bug count — ${p.name}`,
          body:  `${p._count.workItems} open bugs need attention.`,
          date:  new Date().toISOString().slice(0, 10),
        });
      });

    return items.slice(0, 8);
  }

  private async buildActivityData(projectId?: string): Promise<ActivityPoint[]> {
    const now = new Date();
    const points: ActivityPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const date     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const base     = projectId ? { projectId } : {};

      const [created, completed] = await Promise.all([
        this.prisma.workItem.count({ where: { ...base, createdAt: { gte: date, lt: nextDate } } }),
        this.prisma.workItem.count({ where: { ...base, status: BoardStatus.QA_DONE, updatedAt: { gte: date, lt: nextDate } } }),
      ]);

      points.push({ month: MONTH_ABBR[date.getMonth()], high: created, low: completed });
    }

    return points;
  }
}
