import { ForbiddenException, Injectable } from '@nestjs/common';
import { BillingStatus, BoardStatus, LeaveStatus, MilestoneStatus, ProjectRole, ProjectStatus, SystemRole, WorkItemType } from '@prisma/client';
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
  dueDate: string | null;
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
  delivered: number;
  reworked: number;
  bugsFixed: number;
  hoursLogged: number;
  billableHours: number;
  nonBillableHours: number;
  bugsReported: number;
  leaveDays: number;
  plannedLeaveDays: number;
  unplannedLeaveDays: number;
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

  async getStats(userId: string, role: SystemRole, projectId?: string, month?: string, managedBuId?: string | null): Promise<DashboardStats> {
    if (projectId && month) {
      return this.getProjectStats(userId, role, projectId, month);
    }
    return this.getGlobalStats(userId, role, managedBuId);
  }

  private async getGlobalStats(userId: string, role: SystemRole, managedBuId?: string | null): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // SUPER_USER and ADMIN always see global (unscoped) stats regardless of any project memberships.
    // BU_HEAD sees stats scoped to their managed Business Unit's projects.
    // EMPLOYEE is scoped to projects where they hold PM or TL role; if they hold no such role they
    // get a personal (self-only) view.
    let scopedProjectIds: string[] | null = null;

    if (role === SystemRole.BU_HEAD && managedBuId) {
      const buProjects = await this.prisma.project.findMany({
        where: { status: ProjectStatus.ACTIVE, department: { businessUnitId: managedBuId } },
        select: { id: true },
      });
      scopedProjectIds = buProjects.map((p) => p.id);
    } else if (role === SystemRole.EMPLOYEE) {
      const mgmtRows = await this.prisma.projectMember.findMany({
        where: { userId, projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] } },
        select: { projectId: true },
      });
      scopedProjectIds = mgmtRows.length > 0 ? mgmtRows.map((r) => r.projectId) : null;
    }

    const isBuHeadView = role === SystemRole.BU_HEAD;
    const isPersonalView = role === SystemRole.EMPLOYEE && scopedProjectIds === null;

    const projectActiveWhere = scopedProjectIds !== null
      ? { id: { in: scopedProjectIds }, status: ProjectStatus.ACTIVE }
      : { status: ProjectStatus.ACTIVE };

    const workItemWhere: any = scopedProjectIds !== null
      ? { projectId: { in: scopedProjectIds }, project: { status: ProjectStatus.ACTIVE } }
      : { project: { status: ProjectStatus.ACTIVE } };

    const [
      activeUserCount,
      activeProjectCount,
      memberProjectCount,
      rawMyTasks,
      totalWorkItems,
      completedWorkItems,
      todoCount,
      inProgressCount,
      inReviewCount,
      todayWorkItem,
      activeProjects,
    ] = await Promise.all([
      // Active users: distinct team members in scoped projects, or all active users globally
      scopedProjectIds !== null
        ? this.prisma.projectMember
            .findMany({ where: { projectId: { in: scopedProjectIds }, project: { status: ProjectStatus.ACTIVE } }, select: { userId: true }, distinct: ['userId'] })
            .then((rows) => rows.length)
        : this.prisma.user.count({ where: { isActive: true } }),

      // Active project count (respects scoping; SUPER_USER/ADMIN always global active projects)
      this.prisma.project.count({ where: projectActiveWhere }),

      // Projects the user is a member of — only needed for personal employee view
      isPersonalView
        ? this.prisma.project.count({ where: { status: ProjectStatus.ACTIVE, members: { some: { userId } } } })
        : Promise.resolve(0),

      // Current user's own assigned open work items (used for myTasks response field)
      this.prisma.workItem.findMany({
        where: { assigneeId: userId, project: { status: ProjectStatus.ACTIVE }, status: { not: BoardStatus.QA_DONE } },
        select: {
          id: true, title: true, priority: true, status: true, dueDate: true,
          assignee: { select: { fullName: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Total work items across scope (WorkItem model only — source of truth for board tasks)
      this.prisma.workItem.count({ where: workItemWhere }),

      // Completed work items (QA_DONE) across scope
      this.prisma.workItem.count({ where: { ...workItemWhere, status: BoardStatus.QA_DONE } }),

      // Tasks progress breakdown (WorkItem statuses)
      this.prisma.workItem.count({ where: { ...workItemWhere, status: BoardStatus.TODO } }),
      this.prisma.workItem.count({ where: { ...workItemWhere, status: { in: [BoardStatus.IN_PROGRESS, BoardStatus.BLOCKED] } } }),
      this.prisma.workItem.count({ where: { ...workItemWhere, status: { in: [BoardStatus.IN_REVIEW, BoardStatus.READY_FOR_QA, BoardStatus.IN_QA] } } }),

      // Today's due work item for the requesting user
      this.prisma.workItem.findFirst({
        where: { assigneeId: userId, dueDate: { gte: today, lt: tomorrow }, status: { not: BoardStatus.QA_DONE }, ...workItemWhere },
        select: { title: true, status: true },
        orderBy: { dueDate: 'asc' },
      }),

      // Active projects list for team-performance calculation
      this.prisma.project.findMany({
        where: projectActiveWhere,
        select: {
          _count: { select: { workItems: true } },
          workItems: { where: { status: BoardStatus.QA_DONE }, select: { id: true } },
        },
      }),
    ]);

    const myTasks: MyTask[] = rawMyTasks.map((t) => ({
      id: t.id,
      projectName: t.project.name,
      taskName: t.title,
      assignee: t.assignee?.fullName ?? '—',
      priority: t.priority as MyTask['priority'],
      status: this.boardStatusToMyTaskStatus(t.status as BoardStatus),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    }));

    const cards: StatCard[] = isPersonalView
      ? [
          { label: 'All Projects',   value: memberProjectCount,  change: 0, trend: 'up', color: 'blue'   },
          { label: 'My Tasks',       value: rawMyTasks.length,   change: 0, trend: 'up', color: 'rose'   },
          { label: 'Assigned To Me', value: rawMyTasks.length,   change: 0, trend: 'up', color: 'purple' },
          { label: 'Completed',      value: completedWorkItems,  change: 0, trend: 'up', color: 'green'  },
        ]
      : isBuHeadView
      ? [
          { label: 'All Projects',    value: activeProjectCount,  change: 0, trend: 'up', color: 'blue'   },
          { label: 'Total Tasks',     value: totalWorkItems,      change: 0, trend: 'up', color: 'rose'   },
          { label: 'Team Members',    value: activeUserCount,     change: 0, trend: 'up', color: 'purple' },
          { label: 'Completed Tasks', value: completedWorkItems,  change: 0, trend: 'up', color: 'green'  },
        ]
      : [
          { label: 'All Projects',   value: activeProjectCount,  change: 0, trend: 'up', color: 'blue'   },
          { label: 'Total Tasks',    value: totalWorkItems,       change: 0, trend: 'up', color: 'rose'   },
          { label: scopedProjectIds !== null ? 'Team Members' : 'Total Users', value: activeUserCount, change: 0, trend: 'up', color: 'purple' },
          { label: 'Completed Tasks',value: completedWorkItems,  change: 0, trend: 'up', color: 'green'  },
        ];

    return {
      cards,
      activityData: await this.buildActivityData(undefined, scopedProjectIds ?? undefined),
      tasksProgress: { notStarted: todoCount, inProgress: inProgressCount, onReview: inReviewCount, completed: completedWorkItems },
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
        where: { projectId, assigneeId: { not: null }, status: { not: BoardStatus.QA_DONE } },
        select: {
          id: true, title: true, priority: true, status: true, dueDate: true,
          project: { select: { name: true } },
          assignee: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const progress = totalWorkItems === 0 ? 0 : Math.round((doneCount / totalWorkItems) * 100);

    const cards: StatCard[] = [
      { label: 'Team Members',    value: teamSize,          change: 0, trend: 'up',                         color: 'blue'   },
      { label: 'Work Items',      value: totalWorkItems,    change: 0, trend: 'up',                         color: 'rose'   },
      { label: 'Completed',       value: completedThisMonth,change: 0, trend: completedThisMonth > 0 ? 'up' : 'down', color: 'green' },
      { label: 'Open Bugs',       value: openBugs,          change: 0, trend: openBugs === 0 ? 'up' : 'down', color: 'purple' },
    ];

    const myTasks: MyTask[] = myWorkItems.map((wi) => ({
      id:          wi.id,
      projectName: wi.project.name,
      taskName:    wi.title,
      assignee:    wi.assignee?.fullName ?? '—',
      priority:    wi.priority as MyTask['priority'],
      status:      this.boardStatusToMyTaskStatus(wi.status as BoardStatus),
      dueDate:     wi.dueDate ? wi.dueDate.toISOString() : null,
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

  async getProjectsProgress(userId: string, role: SystemRole, managedBuId?: string | null): Promise<ProjectProgress[]> {
    const isAdmin = role === SystemRole.ADMIN || role === SystemRole.SUPER_USER;
    const isBuHead = role === SystemRole.BU_HEAD;

    if (isBuHead && managedBuId) {
      const where = { status: ProjectStatus.ACTIVE, department: { businessUnitId: managedBuId } };
      return this.buildProjectsProgress(where);
    }

    const memberProjectIds = await this.prisma.projectMember
      .findMany({
        where: {
          userId,
          projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] },
          project: { status: ProjectStatus.ACTIVE },
        },
        select: { projectId: true },
      })
      .then((rows) => rows.map((r) => r.projectId));

    if (!isAdmin && memberProjectIds.length === 0) return [];

    const where = (!isAdmin && memberProjectIds.length > 0)
      ? { id: { in: memberProjectIds }, status: ProjectStatus.ACTIVE }
      : { status: ProjectStatus.ACTIVE };

    return this.buildProjectsProgress(where);
  }

  private async buildProjectsProgress(where: Record<string, unknown>): Promise<ProjectProgress[]> {
    const projects = await this.prisma.project.findMany({
      where,
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

  async getTeamActivity(projectId: string, month: string, requestingUserId?: string, role?: SystemRole): Promise<MemberActivity[]> {
    const isAdmin = !role || role === SystemRole.ADMIN || role === SystemRole.SUPER_USER;
    let selfOnlyUserId: string | null = null;

    if (!isAdmin && requestingUserId) {
      const membership = await this.prisma.projectMember.findFirst({
        where: { projectId, userId: requestingUserId },
        select: { projectRole: true },
      });
      if (!membership) throw new ForbiddenException('Access denied');
      const isManagerialRole =
        membership.projectRole === ProjectRole.PROJECT_MANAGER ||
        membership.projectRole === ProjectRole.TEAM_LEAD;
      if (!isManagerialRole) {
        selfOnlyUserId = requestingUserId;
      }
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate   = new Date(year, monthNum, 1);

    const members = await this.prisma.projectMember.findMany({
      where: selfOnlyUserId
        ? { projectId, userId: selfOnlyUserId }
        : { projectId },
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
        const reworkEarlierStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'READY_FOR_QA'];

        const [
          tasksAssigned,
          delivered,
          bugsFixed,
          bugsReported,
          plannedLeaveAgg,
          unplannedLeaveAgg,
          reworkActivitiesThisMonth,
          reworkActivitiesAllTime,
          timesheetEntries,
        ] = await Promise.all([
          // FIX 1: scope to month so denominator matches the numerator's time window
          this.prisma.workItem.count({
            where: {
              projectId,
              assigneeId: uid,
              createdAt: { gte: startDate, lt: endDate },
            },
          }),
          this.prisma.workItem.count({
            where: {
              projectId,
              assigneeId: uid,
              status: BoardStatus.QA_DONE,
              type: { in: [WorkItemType.EPIC, WorkItemType.TASK, WorkItemType.SUB_TASK, WorkItemType.USER_STORY] },
              updatedAt: { gte: startDate, lt: endDate },
            },
          }),
          this.prisma.workItem.count({
            where: {
              projectId,
              assigneeId: uid,
              status: BoardStatus.QA_DONE,
              type: WorkItemType.BUG,
              updatedAt: { gte: startDate, lt: endDate },
            },
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
              isPlanned: true,
              startDate: { lt: endDate },
              endDate:   { gte: startDate },
            },
            _sum: { totalDays: true },
          }),
          this.prisma.leaveRequest.aggregate({
            where: {
              userId: uid,
              status: LeaveStatus.APPROVED,
              isPlanned: false,
              startDate: { lt: endDate },
              endDate:   { gte: startDate },
            },
            _sum: { totalDays: true },
          }),
          // FIX 3: rework = IN_QA → earlier status only, within the month
          this.prisma.workItemActivity.findMany({
            where: {
              workItem: { projectId, assigneeId: uid },
              action: 'status_changed',
              createdAt: { gte: startDate, lt: endDate },
              oldValue: 'IN_QA',
              newValue: { in: reworkEarlierStatuses },
            },
            select: { workItemId: true },
          }),
          // FIX 2: all-time rework items for billing classification
          this.prisma.workItemActivity.findMany({
            where: {
              workItem: { projectId, assigneeId: uid },
              action: 'status_changed',
              oldValue: 'IN_QA',
              newValue: { in: reworkEarlierStatuses },
            },
            select: { workItemId: true },
          }),
          // FIX 2: fetch entries to apply forced non-billable overrides + estimatedHours cap
          this.prisma.timesheetEntry.findMany({
            where: {
              userId: uid,
              workItem: { projectId },
              date: { gte: startDate, lt: endDate },
            },
            select: {
              hours: true,
              workItem: { select: { id: true, type: true, billingStatus: true, estimatedHours: true } },
            },
          }),
        ]);

        // FIX 3: rework ratio counts unique items dragged back from IN_QA this month
        const reworkedItems = new Set(reworkActivitiesThisMonth.map((a) => a.workItemId));

        // FIX 2: BUG type and rework items are always non-billable regardless of billing flag
        const reworkWorkItemIds = new Set(reworkActivitiesAllTime.map((a) => a.workItemId));

        // Pre-compute total logged per BILLABLE work item so we can cap at estimatedHours
        const itemLoggedTotals = new Map<string, { total: number; cap: number | null }>();
        for (const entry of timesheetEntries) {
          const wi = entry.workItem;
          if (wi.type !== WorkItemType.BUG && !reworkWorkItemIds.has(wi.id) && wi.billingStatus === BillingStatus.BILLABLE) {
            const prev = itemLoggedTotals.get(wi.id) ?? { total: 0, cap: wi.estimatedHours != null ? Number(wi.estimatedHours) : null };
            itemLoggedTotals.set(wi.id, { total: prev.total + Number(entry.hours), cap: prev.cap });
          }
        }

        let billableHours = 0;
        let nonBillableHours = 0;
        for (const entry of timesheetEntries) {
          const h = Number(entry.hours);
          const isBug    = entry.workItem.type === WorkItemType.BUG;
          const isRework = reworkWorkItemIds.has(entry.workItem.id);
          if (isBug || isRework) {
            nonBillableHours += h;
          } else if (entry.workItem.billingStatus === BillingStatus.BILLABLE) {
            const item = itemLoggedTotals.get(entry.workItem.id);
            if (item && item.cap != null && item.total > item.cap) {
              // Proportional split: each entry's share of the cap
              const billableFraction = h * (item.cap / item.total);
              billableHours    += billableFraction;
              nonBillableHours += h - billableFraction;
            } else {
              billableHours += h;
            }
          } else {
            nonBillableHours += h;
          }
        }

        const tasksCompleted     = delivered + bugsFixed;
        const plannedLeaveDays   = Number(plannedLeaveAgg._sum.totalDays ?? 0);
        const unplannedLeaveDays = Number(unplannedLeaveAgg._sum.totalDays ?? 0);

        return {
          userId:            uid,
          name:              m.user.fullName ?? '—',
          projectRole:       m.projectRole,
          profilePhoto:      m.user.profilePhoto ?? null,
          tasksAssigned,
          tasksCompleted,
          delivered,
          reworked:          reworkedItems.size,
          bugsFixed,
          hoursLogged:       billableHours + nonBillableHours,
          billableHours,
          nonBillableHours,
          bugsReported,
          leaveDays:         plannedLeaveDays + unplannedLeaveDays,
          plannedLeaveDays,
          unplannedLeaveDays,
        };
      }),
    );
  }

  async getTasksProgress(userId: string, role: SystemRole, projectId?: string, period: '7d' | '30d' | 'all' = 'all'): Promise<TasksProgress> {
    let base: any;
    if (projectId) {
      base = { projectId };
    } else {
      const mgmtRows = await this.prisma.projectMember.findMany({
        where: { userId, projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] }, project: { status: ProjectStatus.ACTIVE } },
        select: { projectId: true },
      });
      base = mgmtRows.length > 0
        ? { projectId: { in: mgmtRows.map((r) => r.projectId) } }
        : { project: { status: ProjectStatus.ACTIVE } };
    }
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

  async getActivityData(userId: string, projectId?: string, period: 'monthly' | 'weekly' = 'monthly'): Promise<ActivityPoint[]> {
    let scopedIds: string[] | undefined;
    if (!projectId) {
      const mgmtRows = await this.prisma.projectMember.findMany({
        where: { userId, projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] }, project: { status: ProjectStatus.ACTIVE } },
        select: { projectId: true },
      });
      if (mgmtRows.length > 0) scopedIds = mgmtRows.map((r) => r.projectId);
    }
    return period === 'weekly'
      ? this.buildWeeklyActivityData(projectId, scopedIds)
      : this.buildActivityData(projectId, scopedIds);
  }

  private async buildWeeklyActivityData(projectId?: string, scopedIds?: string[]): Promise<ActivityPoint[]> {
    const now    = new Date();
    const points: ActivityPoint[] = [];

    const activeProjectIds = projectId
      ? [projectId]
      : scopedIds !== undefined
        ? scopedIds
        : (await this.prisma.project.findMany({ where: { status: ProjectStatus.ACTIVE }, select: { id: true } })).map((p) => p.id);

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const [created, completed] = await Promise.all([
        this.prisma.workItem.count({ where: { projectId: { in: activeProjectIds }, createdAt: { gte: weekStart, lt: weekEnd } } }),
        this.prisma.workItem.count({ where: { projectId: { in: activeProjectIds }, status: BoardStatus.QA_DONE, updatedAt: { gte: weekStart, lt: weekEnd } } }),
      ]);

      const label = `${MONTH_ABBR[weekStart.getMonth()]} W${Math.ceil(weekStart.getDate() / 7)}`;
      points.push({ month: label, high: created, low: completed });
    }

    return points;
  }

  async getAnnouncements(projectId?: string, month?: string, userId?: string, role?: SystemRole): Promise<Announcement[]> {
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

    const dateUntil = until ?? new Date();

    const isAdmin = !role || role === SystemRole.SUPER_USER || role === SystemRole.ADMIN;

    // Scope all queries to active projects only (or the specific project if given)
    // Non-admin users only see announcements for projects they are a member of
    let activeProjectIds: string[];
    if (projectId) {
      activeProjectIds = [projectId];
    } else if (isAdmin) {
      activeProjectIds = (await this.prisma.project.findMany({ where: { status: ProjectStatus.ACTIVE }, select: { id: true } })).map((p) => p.id);
    } else {
      activeProjectIds = (await this.prisma.projectMember.findMany({
        where: { userId, project: { status: ProjectStatus.ACTIVE } },
        select: { projectId: true },
      })).map((m) => m.projectId);
    }

    const [completedMilestones, activeSprints, newMembers, bugProjects] = await Promise.all([
      this.prisma.milestone.findMany({
        where: {
          projectId: { in: activeProjectIds },
          status: MilestoneStatus.COMPLETED,
          updatedAt: { gte: since, lt: dateUntil },
        },
        select: { id: true, name: true, project: { select: { name: true } }, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 4,
      }),
      this.prisma.sprint.findMany({
        where: { projectId: { in: activeProjectIds }, isActive: true },
        select: { id: true, name: true, project: { select: { name: true } }, startDate: true },
        orderBy: { startDate: 'desc' },
        take: 3,
      }),
      this.prisma.projectMember.findMany({
        where: { projectId: { in: activeProjectIds }, joinedAt: { gte: since, lt: dateUntil } },
        select: { id: true, user: { select: { fullName: true } }, project: { select: { name: true } }, joinedAt: true },
        orderBy: { joinedAt: 'desc' },
        take: 3,
      }),
      this.prisma.project.findMany({
        where: { id: { in: activeProjectIds } },
        select: {
          id: true, name: true,
          _count: { select: { workItems: { where: { type: WorkItemType.BUG, status: { not: BoardStatus.QA_DONE } } } } },
        },
        take: activeProjectIds.length,
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

  private boardStatusToMyTaskStatus(s: BoardStatus): MyTask['status'] {
    if (s === BoardStatus.QA_DONE) return 'COMPLETED';
    if (s === BoardStatus.IN_REVIEW || s === BoardStatus.READY_FOR_QA || s === BoardStatus.IN_QA) return 'ON_REVIEW';
    if (s === BoardStatus.IN_PROGRESS || s === BoardStatus.BLOCKED) return 'IN_PROGRESS';
    return 'NOT_STARTED';
  }

  private async buildActivityData(projectId?: string, scopedIds?: string[]): Promise<ActivityPoint[]> {
    const now = new Date();
    const points: ActivityPoint[] = [];

    const activeProjectIds = projectId
      ? [projectId]
      : scopedIds !== undefined
        ? scopedIds
        : (await this.prisma.project.findMany({ where: { status: ProjectStatus.ACTIVE }, select: { id: true } })).map((p) => p.id);

    for (let i = 11; i >= 0; i--) {
      const date     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const [created, completed] = await Promise.all([
        this.prisma.workItem.count({ where: { projectId: { in: activeProjectIds }, createdAt: { gte: date, lt: nextDate } } }),
        this.prisma.workItem.count({ where: { projectId: { in: activeProjectIds }, status: BoardStatus.QA_DONE, updatedAt: { gte: date, lt: nextDate } } }),
      ]);

      points.push({ month: MONTH_ABBR[date.getMonth()], high: created, low: completed });
    }

    return points;
  }
}
