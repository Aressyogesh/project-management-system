import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardStatus, BugSeverity, LeaveStatus, ProjectRole, WorkItemType } from '@prisma/client';

// ─── KPI Computation Helpers ──────────────────────────────────────────────────

function periodToRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function computeSprintReliability(
  committed: number,
  delivered: number,
): number {
  if (committed === 0) return 0;
  return Math.min(Math.round((delivered / committed) * 15 * 10) / 10, 15);
}

function computeDeliveryTimeliness(
  onTime: number,
  total: number,
): number {
  if (total === 0) return 0;
  return Math.min(Math.round((onTime / total) * 15 * 10) / 10, 15);
}

function computeEstimationAccuracy(
  estimatedHours: number,
  actualHours: number,
): number {
  if (estimatedHours === 0) return actualHours === 0 ? 10 : 0;
  const variance = Math.abs(actualHours - estimatedHours) / estimatedHours;
  if (variance <= 0.15) return 10;
  if (variance <= 0.3) return 7;
  if (variance <= 0.5) return 4;
  return 0;
}

function computeThroughput(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((completed / total) * 10 * 10) / 10, 10);
}

function computeReworkRatio(totalReopens: number, totalCompleted: number): number {
  if (totalCompleted === 0) return 5;
  const ratio = totalReopens / totalCompleted;
  if (ratio === 0) return 5;
  if (ratio <= 0.1) return 3;
  return 0;
}

function computeDefectLeakage(
  bugs: { severity: BugSeverity | null }[],
): number {
  const criticalOrBlocker = bugs.filter(
    (b) =>
      b.severity === 'SHOW_STOPPER' ||
      b.severity === 'CRITICAL' ||
      b.severity === 'BLOCKER',
  ).length;
  if (criticalOrBlocker > 0) return 0;
  const minors = bugs.filter((b) => b.severity === 'MINOR' || b.severity === 'TRIVIAL').length;
  const majors = bugs.filter((b) => b.severity === 'MAJOR').length;
  const totalSevere = majors * 2 + minors;
  if (totalSevere === 0) return 10;
  if (totalSevere === 1) return 7;
  if (totalSevere === 2) return 4;
  return 0;
}

function computeDependencyAgile(
  blockedCount: number,
  totalItems: number,
): number {
  if (totalItems === 0) return 5;
  const ratio = blockedCount / totalItems;
  if (ratio === 0) return 5;
  if (ratio <= 0.1) return 3;
  return 0;
}

function computeAttendance(
  leaveRequests: { status: string; totalDays: number }[],
): number {
  const hasRejected = leaveRequests.some((r) => r.status === 'REJECTED');
  if (hasRejected) return 0;

  const approvedDays = leaveRequests
    .filter((r) => r.status === 'APPROVED')
    .reduce((s, r) => s + r.totalDays, 0);

  if (approvedDays > 1.5) return 0;
  if (approvedDays > 1) return 3;
  return 5;
}

function computeLearningVelocity(totalHours: number): number {
  if (totalHours >= 4) return 5;
  if (totalHours >= 1) return 3;
  return 0;
}

function computeInnovation(
  logs: { type: string }[],
): number {
  if (logs.length === 0) return 0;
  const hasAi = logs.some((l) => l.type === 'AI_IMPLEMENTATION');
  return hasAi ? 5 : 3;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── KPI ──────────────────────────────────────────────────────────────────────

  async getKpi(period: string, currentUserId: string, isAdmin: boolean) {
    const { start, end } = periodToRange(period);

    const activeProjectIds = (await this.prisma.project.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })).map((p) => p.id);

    let userWhere: object = isAdmin ? { isActive: true } : { id: currentUserId, isActive: true };

    if (!isAdmin) {
      const pmMemberships = await this.prisma.projectMember.findMany({
        where: { userId: currentUserId, projectRole: { in: ['PROJECT_MANAGER', 'TEAM_LEAD'] } },
        select: { projectId: true },
      });
      if (pmMemberships.length > 0) {
        const projectIds = pmMemberships.map((m) => m.projectId);
        const teamMembers = await this.prisma.projectMember.findMany({
          where: { projectId: { in: projectIds } },
          select: { userId: true },
        });
        const memberIds = [...new Set([currentUserId, ...teamMembers.map((m) => m.userId)])];
        userWhere = { id: { in: memberIds }, isActive: true };
      }
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        fullName: true,
        systemRole: true,
        department: { select: { name: true } },
        projectMembers: { select: { projectRole: true } },
      },
    });

    const results = await Promise.all(
      users.map((user) => this.computeUserKpi(user, period, start, end, activeProjectIds)),
    );

    return results;
  }

  private async computeUserKpi(
    user: {
      id: string;
      fullName: string;
      systemRole: string;
      department: { name: string } | null;
      projectMembers: { projectRole: string }[];
    },
    period: string,
    start: Date,
    end: Date,
    activeProjectIds: string[],
  ) {
    const userId = user.id;

    // Fetch all relevant data in parallel
    const [
      sprintItems,
      allAssignedItems,
      bugItems,
      manualScores,
      leaveRequests,
      learningLogs,
      innovationLogs,
      upskillLearningApproved,
      upskillLearningAny,
      upskillAutomationApproved,
    ] = await Promise.all([
      // Sprint items (for Sprint Reliability + Throughput)
      this.prisma.workItem.findMany({
        where: {
          assigneeId: userId,
          sprintId: { not: null },
          createdAt: { gte: start, lt: end },
          projectId: { in: activeProjectIds },
        },
        select: {
          id: true,
          status: true,
          storyPoints: true,
          estimatedHours: true,
          completedAt: true,
          dueDate: true,
          reopenCount: true,
        },
      }),
      // All assigned items (for Delivery Timeliness + Rework + non-sprint fallback)
      this.prisma.workItem.findMany({
        where: {
          assigneeId: userId,
          createdAt: { gte: start, lt: end },
          projectId: { in: activeProjectIds },
        },
        select: {
          id: true,
          status: true,
          completedAt: true,
          dueDate: true,
          reopenCount: true,
          type: true,
          severity: true,
          storyPoints: true,
          estimatedHours: true,
        },
      }),
      // Bug items where this user is responsible (defects found in their work)
      this.prisma.workItem.findMany({
        where: {
          responsibleUserId: userId,
          type: WorkItemType.BUG,
          createdAt: { gte: start, lt: end },
          projectId: { in: activeProjectIds },
        },
        select: { severity: true },
      }),
      // Manual KPI scores
      this.prisma.kpiRecord.findMany({
        where: { userId, period },
        select: { metricId: true, points: true },
      }),
      // Approved/rejected leave requests overlapping this period (for Attendance)
      this.prisma.leaveRequest.findMany({
        where: {
          userId,
          status: { in: ['APPROVED', 'REJECTED'] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { status: true, totalDays: true },
      }),
      // Learning logs
      this.prisma.learningLog.findMany({
        where: { userId, period },
        select: { hours: true },
      }),
      // Innovation logs
      this.prisma.innovationLog.findMany({
        where: { userId, period },
        select: { type: true },
      }),
      // Approved LEARNING upskill assignment overlapping this period
      this.prisma.upskillAssignment.findFirst({
        where: { assignedToId: userId, type: 'LEARNING', status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
        select: { id: true },
      }),
      // Any LEARNING upskill assignment (any status) overlapping this period
      this.prisma.upskillAssignment.findFirst({
        where: { assignedToId: userId, type: 'LEARNING', startDate: { lte: end }, endDate: { gte: start } },
        select: { id: true },
      }),
      // Approved AUTOMATION upskill assignment overlapping this period
      this.prisma.upskillAssignment.findFirst({
        where: { assignedToId: userId, type: 'AUTOMATION', status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
        select: { id: true },
      }),
    ]);

    // Timesheet hours scoped to deliveryBase items only (accurate estimation comparison)
    const isSprintBased = sprintItems.length > 0;
    const deliveryBase = isSprintBased ? sprintItems : allAssignedItems;
    const deliveryItemIds = deliveryBase.map((i) => i.id);
    const timesheetSum = await this.prisma.timesheetEntry.aggregate({
      where: {
        userId,
        ...(deliveryItemIds.length > 0 ? { workItemId: { in: deliveryItemIds } } : { date: { gte: start, lt: end } }),
      },
      _sum: { hours: true },
    });

    // Sprint Reliability
    const sprintCommitted = deliveryBase.reduce((s, i) => s + (i.storyPoints ?? 1), 0);
    const sprintDelivered = deliveryBase
      .filter((i) => i.status === BoardStatus.QA_DONE)
      .reduce((s, i) => s + (i.storyPoints ?? 1), 0);
    const sprintReliability = computeSprintReliability(sprintCommitted, sprintDelivered);

    // Delivery Timeliness
    const itemsWithDue = allAssignedItems.filter((i) => i.dueDate !== null && i.completedAt !== null);
    const onTimeItems = itemsWithDue.filter(
      (i) => i.completedAt! <= i.dueDate!,
    );
    const deliveryTimeliness = computeDeliveryTimeliness(onTimeItems.length, itemsWithDue.length);

    // Estimation Accuracy — uses same deliveryBase as sprint reliability
    const totalEstimated = deliveryBase.reduce(
      (s, i) => s + Number(i.estimatedHours ?? 0),
      0,
    );
    const totalActual = Number(timesheetSum._sum.hours ?? 0);
    const estimationAccuracy = computeEstimationAccuracy(totalEstimated, totalActual);

    // Throughput — uses same deliveryBase
    const throughputTotal = deliveryBase.length;
    const throughputCompleted = deliveryBase.filter((i) => i.status === BoardStatus.QA_DONE).length;
    const throughput = computeThroughput(throughputCompleted, throughputTotal);

    // Rework Ratio
    const totalReopens = allAssignedItems.reduce((s, i) => s + i.reopenCount, 0);
    const totalCompleted = allAssignedItems.filter((i) => i.status === BoardStatus.QA_DONE).length;
    const reworkRatio = computeReworkRatio(totalReopens, totalCompleted);

    // Defect Leakage
    const defectLeakage = computeDefectLeakage(bugItems);

    // Dependency & Agile Management
    const blockedCount = allAssignedItems.filter((i) => i.status === BoardStatus.BLOCKED).length;
    const dependencyAgile = computeDependencyAgile(blockedCount, allAssignedItems.length);

    // Manual scores
    const getManual = (metricId: string) =>
      manualScores.find((s) => s.metricId === metricId)?.points ?? 0;
    const engineeringHygiene = getManual('engineering_hygiene');
    const reportingDocs = getManual('reporting_documentation');
    const positiveBehaviour = getManual('positive_behaviour');

    // Self-service
    const attendance = computeAttendance(leaveRequests as { status: string; totalDays: number }[]);
    // LEARNING assignment approved → 5; pending → 0; none → self-log fallback
    const learningVelocity = upskillLearningApproved
      ? 5
      : upskillLearningAny
        ? 0
        : computeLearningVelocity(learningLogs.reduce((s, l) => s + l.hours, 0));
    // AUTOMATION assignment approved → 5; anything else → 0 (self-logs no longer count)
    const automationInnovation = upskillAutomationApproved ? 5 : 0;

    const hasNoActivity =
      sprintItems.length === 0 &&
      allAssignedItems.length === 0 &&
      manualScores.length === 0 &&
      learningLogs.length === 0 &&
      innovationLogs.length === 0 &&
      !upskillLearningAny &&
      !upskillAutomationApproved;

    // When the user has no assigned work and no manual scores for this period,
    // zero out all metrics so the radar chart and category scores reflect reality.
    const metricPoints = hasNoActivity
      ? Array(13).fill(0)
      : [sprintReliability, deliveryTimeliness, estimationAccuracy, throughput,
         reworkRatio, defectLeakage, dependencyAgile, engineeringHygiene,
         reportingDocs, learningVelocity, automationInnovation, attendance, positiveBehaviour];

    const metricIds = [
      'sprint_reliability', 'delivery_timeliness', 'estimation_accuracy', 'throughput_complexity',
      'internal_rework_ratio', 'defect_leakage', 'dependency_agile', 'engineering_hygiene',
      'reporting_documentation', 'learning_velocity', 'automation_innovation', 'attendance', 'positive_behaviour',
    ];

    const metrics = metricIds.map((metricId, i) => ({ metricId, points: metricPoints[i] }));
    const totalScore = hasNoActivity ? 0 : Math.round(metrics.reduce((s, m) => s + m.points, 0) * 10) / 10;

    const role =
      user.projectMembers[0]?.projectRole?.replace('_', ' ') ??
      user.systemRole;

    return {
      userId,
      name: user.fullName,
      role,
      department: user.department?.name ?? 'N/A',
      period,
      metrics,
      totalScore,
      hasNoActivity,
    };
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async getProductivityReport(period: string, projectId?: string, requestingUserId?: string, isAdmin = true) {
    const { start, end } = periodToRange(period);

    let activeProjectIds: string[];
    let selfOnly = false;
    if (isAdmin || !requestingUserId) {
      activeProjectIds = projectId
        ? [projectId]
        : (await this.prisma.project.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })).map((p) => p.id);
    } else {
      const managedIds = await this.getManagedProjectIds(requestingUserId);
      if (managedIds.length > 0) {
        activeProjectIds = projectId ? managedIds.filter((id) => id === projectId) : managedIds;
      } else {
        selfOnly = true;
        const memberIds = await this.getMemberProjectIds(requestingUserId);
        activeProjectIds = projectId ? memberIds.filter((id) => id === projectId) : memberIds;
        if (activeProjectIds.length === 0) return [];
      }
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        projectMembers: { some: { projectId: { in: activeProjectIds } } },
        ...(selfOnly ? { id: requestingUserId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        systemRole: true,
        projectMembers: {
          where: { projectId: { in: activeProjectIds } },
          select: { projectRole: true },
          take: 1,
        },
      },
    });

    const results = await Promise.all(
      users.map(async (user) => {
        const [storiesCompleted, timesheetSum, allItems, storiesAssigned] = await Promise.all([
          this.prisma.workItem.count({
            where: {
              assigneeId: user.id,
              status: BoardStatus.QA_DONE,
              completedAt: { gte: start, lt: end },
              projectId: { in: activeProjectIds },
            },
          }),
          this.prisma.timesheetEntry.aggregate({
            where: {
              userId: user.id,
              date: { gte: start, lt: end },
              workItem: { projectId: { in: activeProjectIds } },
            },
            _sum: { hours: true },
          }),
          this.prisma.workItem.count({
            where: {
              assigneeId: user.id,
              dueDate: { gte: start, lt: end },
              projectId: { in: activeProjectIds },
            },
          }),
          this.prisma.workItem.count({
            where: {
              assigneeId: user.id,
              projectId: { in: activeProjectIds },
            },
          }),
        ]);

        const onTimeItems = await this.prisma.workItem.count({
          where: {
            assigneeId: user.id,
            status: BoardStatus.QA_DONE,
            completedAt: { gte: start, lt: end },
            projectId: { in: activeProjectIds },
          },
        });

        const hoursLogged = Math.round(Number(timesheetSum._sum?.hours ?? 0) * 10) / 10;
        const onTimePct = allItems > 0 ? Math.round((onTimeItems / allItems) * 100) : 0;
        const completedPct = allItems > 0 ? Math.min(Math.round((onTimeItems / allItems) * 100), 100) : 0;
        const hoursUtilPct = Math.min(Math.round((hoursLogged / 176) * 100), 100);
        const score = Math.round(completedPct * 0.4 + hoursUtilPct * 0.3 + onTimePct * 0.3);

        return {
          userId: user.id,
          name: user.fullName,
          role: user.projectMembers[0]?.projectRole?.replace(/_/g, ' ') ?? user.systemRole,
          tasksDone: storiesCompleted,
          storiesAssigned,
          hoursLogged,
          onTimePct,
          score: Math.min(score, 100),
        };
      }),
    );

    return results.sort((a, b) => b.score - a.score);
  }

  async getProjectsReport(period: string, projectId?: string, requestingUserId?: string, isAdmin = true) {
    const { start, end } = periodToRange(period);

    let projectWhere: object;
    if (isAdmin || !requestingUserId) {
      projectWhere = { status: 'ACTIVE', ...(projectId ? { id: projectId } : {}) };
    } else {
      const managedIds = await this.getManagedProjectIds(requestingUserId);
      if (managedIds.length > 0) {
        const scoped = projectId ? managedIds.filter((id) => id === projectId) : managedIds;
        projectWhere = { status: 'ACTIVE', id: { in: scoped } };
      } else {
        const memberIds = await this.getMemberProjectIds(requestingUserId);
        const scoped = projectId ? memberIds.filter((id) => id === projectId) : memberIds;
        if (scoped.length === 0) return [];
        projectWhere = { status: 'ACTIVE', id: { in: scoped } };
      }
    }

    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        status: true,
        projectType: true,
        members: { select: { id: true } },
        workItems: {
          where: { createdAt: { gte: start, lt: end } },
          select: { status: true, type: true },
        },
      },
    });

    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#EF4444'];
    const TYPES = ['EPIC', 'USER_STORY', 'TASK', 'SUB_TASK', 'BUG'] as const;

    return projects.map((p, i) => {
      const breakdown = TYPES.map((type) => {
        const items = p.workItems.filter((w) => w.type === type);
        const total = items.length;
        const done = items.filter((w) => w.status === BoardStatus.QA_DONE).length;
        return { type, total, done, completePct: total > 0 ? Math.round((done / total) * 100) : 0 };
      });
      const totalAll = p.workItems.length;
      const doneAll = p.workItems.filter((w) => w.status === BoardStatus.QA_DONE).length;
      return {
        id: p.id,
        name: p.name,
        status: p.status === 'ACTIVE' ? 'Active' : p.status === 'ON_HOLD' ? 'On Hold' : 'Archive',
        tasks: totalAll,
        done: doneAll,
        teamSize: p.members.length,
        color: colors[i % colors.length],
        breakdown,
      };
    });
  }

  async getBugsReport(period: string, projectId?: string) {
    const { start, end } = periodToRange(period);

    const activeProjectIds = projectId
      ? [projectId]
      : (await this.prisma.project.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })).map((p) => p.id);

    const bugs = await this.prisma.workItem.findMany({
      where: {
        type: WorkItemType.BUG,
        createdAt: { gte: start, lt: end },
        projectId: { in: activeProjectIds },
      },
      select: {
        severity: true,
        bugClassification: true,
      },
    });

    const severityCounts: Record<string, number> = {
      SHOW_STOPPER: 0,
      BLOCKER: 0,
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      TRIVIAL: 0,
    };
    const classificationCounts: Record<string, number> = {
      SECURITY: 0,
      CRASH_HANG: 0,
      DATA_LOSS: 0,
      PERFORMANCE: 0,
      UI_USABILITY: 0,
      OTHER_BUG: 0,
      OTHER: 0,
      FEATURE_NEW: 0,
      ENHANCEMENT: 0,
      DESIGN: 0,
      NEW_BUG: 0,
      CODE_REVIEW: 0,
      UNIT_TESTING: 0,
      SUGGESTION: 0,
      PROJECT_MANAGEMENT: 0,
    };

    for (const bug of bugs) {
      if (bug.severity) severityCounts[bug.severity]++;
      if (bug.bugClassification) classificationCounts[bug.bugClassification]++;
    }

    const severityColors: Record<string, string> = {
      SHOW_STOPPER: '#450A0A',
      BLOCKER: '#7F1D1D',
      CRITICAL: '#EF4444',
      MAJOR: '#F97316',
      MINOR: '#F59E0B',
      TRIVIAL: '#D1D5DB',
    };

    const classificationColors: Record<string, string> = {
      SECURITY: '#DC2626',
      CRASH_HANG: '#B91C1C',
      DATA_LOSS: '#9F1239',
      PERFORMANCE: '#F59E0B',
      UI_USABILITY: '#8B5CF6',
      OTHER_BUG: '#6B7280',
      OTHER: '#9CA3AF',
      FEATURE_NEW: '#10B981',
      ENHANCEMENT: '#3B82F6',
      DESIGN: '#EC4899',
      NEW_BUG: '#EF4444',
      CODE_REVIEW: '#6366F1',
      UNIT_TESTING: '#14B8A6',
      SUGGESTION: '#F97316',
      PROJECT_MANAGEMENT: '#0EA5E9',
    };

    return {
      severity: Object.entries(severityCounts).map(([severity, count]) => ({
        severity,
        count,
        color: severityColors[severity],
      })),
      classification: Object.entries(classificationCounts).map(([classification, count]) => ({
        classification,
        count,
        color: classificationColors[classification],
      })),
    };
  }

  async getAllocationReport(period: string, projectId?: string, requestingUserId?: string, isAdmin = true) {
    const { start, end } = periodToRange(period);

    let activeProjectIds: string[];
    let selfOnly = false;
    if (isAdmin || !requestingUserId) {
      activeProjectIds = projectId
        ? [projectId]
        : (await this.prisma.project.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })).map((p) => p.id);
    } else {
      const managedIds = await this.getManagedProjectIds(requestingUserId);
      if (managedIds.length > 0) {
        activeProjectIds = projectId ? managedIds.filter((id) => id === projectId) : managedIds;
      } else {
        selfOnly = true;
        const memberIds = await this.getMemberProjectIds(requestingUserId);
        activeProjectIds = projectId ? memberIds.filter((id) => id === projectId) : memberIds;
        if (activeProjectIds.length === 0) return [];
      }
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        projectMembers: { some: { projectId: { in: activeProjectIds } } },
        ...(selfOnly ? { id: requestingUserId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        systemRole: true,
        projectMembers: { select: { projectRole: true } },
      },
    });

    const results = await Promise.all(
      users.map(async (user) => {
        const [itemCount, hoursSum] = await Promise.all([
          this.prisma.workItem.count({
            where: {
              assigneeId: user.id,
              createdAt: { gte: start, lt: end },
              projectId: { in: activeProjectIds },
            },
          }),
          this.prisma.timesheetEntry.aggregate({
            where: {
              userId: user.id,
              date: { gte: start, lt: end },
              workItem: { projectId: { in: activeProjectIds } },
            },
            _sum: { hours: true },
          }),
        ]);

        const hoursAllocated = Math.round(Number(hoursSum._sum?.hours ?? 0) * 10) / 10;
        const maxMonthlyHours = 176;
        const utilisationPct = Math.round((hoursAllocated / maxMonthlyHours) * 100);

        return {
          userId: user.id,
          name: user.fullName,
          role: user.projectMembers[0]?.projectRole?.replace(/_/g, ' ') ?? user.systemRole,
          tasksAllocated: itemCount,
          hoursAllocated,
          utilisationPct,
        };
      }),
    );

    return results.sort((a, b) => b.hoursAllocated - a.hoursAllocated);
  }

  async getManagedProjectIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.projectMember.findMany({
      where: {
        userId,
        projectRole: { in: [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD] },
      },
      select: { projectId: true },
    });
    return memberships.map((m) => m.projectId);
  }

  async getMemberProjectIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    return memberships.map((m) => m.projectId);
  }

  async getTimesheetReport(period: string, projectId?: string, requestingUserId?: string, isAdmin = true) {
    const { start, end } = periodToRange(period);

    let activeProjectIds: string[];
    let selfOnly = false;
    if (!isAdmin && requestingUserId) {
      const managedIds = await this.getManagedProjectIds(requestingUserId);
      if (managedIds.length > 0) {
        activeProjectIds = projectId ? managedIds.filter((id) => id === projectId) : managedIds;
      } else {
        selfOnly = true;
        const memberIds = await this.getMemberProjectIds(requestingUserId);
        activeProjectIds = projectId ? memberIds.filter((id) => id === projectId) : memberIds;
        if (activeProjectIds.length === 0) return [];
      }
    } else {
      activeProjectIds = projectId
        ? [projectId]
        : (await this.prisma.project.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })).map((p) => p.id);
    }

    const entries = await this.prisma.timesheetEntry.groupBy({
      by: ['userId'],
      where: {
        date: { gte: start, lt: end },
        workItem: { projectId: { in: activeProjectIds } },
        ...(selfOnly ? { userId: requestingUserId } : {}),
      },
      _sum: { hours: true },
    });

    const userIds = entries.map((e) => e.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        systemRole: true,
        projectMembers: {
          where: { projectId: { in: activeProjectIds } },
          select: { projectRole: true, project: { select: { name: true } } },
        },
      },
    });

    return entries.map((entry) => {
      const user = users.find((u) => u.id === entry.userId);
      return {
        userId: entry.userId,
        name: user?.fullName ?? 'Unknown',
        role:
          user?.projectMembers[0]?.projectRole?.replace(/_/g, ' ') ??
          user?.systemRole ??
          'N/A',
        project: user?.projectMembers[0]?.project?.name ?? (projectId ? 'N/A' : 'Multiple'),
        hoursLogged: Math.round(Number(entry._sum?.hours ?? 0) * 10) / 10,
      };
    });
  }

  async getPlannedVsActualReport(period: string, projectId?: string, requestingUserId?: string, isAdmin = true) {
    const { start, end } = periodToRange(period);

    let scopedProjectIds: string[] | undefined;
    let selfOnly = false;
    if (!isAdmin && requestingUserId) {
      const managedIds = await this.getManagedProjectIds(requestingUserId);
      if (managedIds.length > 0) {
        scopedProjectIds = projectId ? managedIds.filter((id) => id === projectId) : managedIds;
      } else {
        selfOnly = true;
        const memberIds = await this.getMemberProjectIds(requestingUserId);
        scopedProjectIds = projectId ? memberIds.filter((id) => id === projectId) : memberIds;
        if (scopedProjectIds.length === 0) return [];
      }
    }

    const projectMemberFilter = scopedProjectIds !== undefined
      ? { projectMembers: { some: { projectId: { in: scopedProjectIds } } } }
      : projectId ? { projectMembers: { some: { projectId } } } : {};

    const users = await this.prisma.user.findMany({
      where: { isActive: true, ...projectMemberFilter, ...(selfOnly ? { id: requestingUserId } : {}) },
      select: {
        id: true,
        fullName: true,
        systemRole: true,
        projectMembers: { select: { projectRole: true } },
      },
    });

    const workItemProjectFilter = scopedProjectIds !== undefined
      ? { projectId: { in: scopedProjectIds } }
      : projectId ? { projectId } : {};

    const timesheetProjectFilter = scopedProjectIds !== undefined
      ? { workItem: { projectId: { in: scopedProjectIds } } }
      : projectId ? { workItem: { projectId } } : {};

    const results = await Promise.all(
      users.map(async (user) => {
        const [estimatedAgg, actualAgg] = await Promise.all([
          this.prisma.workItem.aggregate({
            where: {
              assigneeId: user.id,
              // Items due in this month, OR items with no dueDate created in this month.
              // Using dueDate means "what was planned to be delivered this month" —
              // which correctly covers tasks created in prior months but due now.
              OR: [
                { dueDate: { gte: start, lt: end } },
                { dueDate: null, createdAt: { gte: start, lt: end } },
              ],
              ...workItemProjectFilter,
            },
            _sum: { estimatedHours: true },
            _count: { id: true },
          }),
          this.prisma.timesheetEntry.aggregate({
            where: {
              userId: user.id,
              date: { gte: start, lt: end },
              ...timesheetProjectFilter,
            },
            _sum: { hours: true },
          }),
        ]);

        const planned = Math.round(Number(estimatedAgg._sum.estimatedHours ?? 0) * 10) / 10;
        const actual  = Math.round(Number(actualAgg._sum.hours ?? 0) * 10) / 10;
        const variance = Math.round((actual - planned) * 10) / 10;
        const variancePct = planned > 0 ? Math.round(((actual - planned) / planned) * 100) : 0;

        return {
          userId: user.id,
          name: user.fullName,
          role: user.projectMembers[0]?.projectRole?.replace('_', ' ') ?? user.systemRole,
          taskCount: estimatedAgg._count.id,
          plannedHours: planned,
          actualHours: actual,
          variance,
          variancePct,
          status: variancePct > 20 ? 'over' : variancePct < -20 ? 'under' : 'ontrack',
        };
      }),
    );

    return results
      .filter((r) => r.plannedHours > 0 || r.actualHours > 0)
      .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
  }

  async getCapacityReport(period: string, requestingUserId?: string, isAdmin = true, filterProjectId?: string) {
    const { start, end } = periodToRange(period);
    const [year, month] = period.split('-').map(Number);

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    let scopedProjectIds: string[] | undefined;
    if (filterProjectId) {
      if (!isAdmin && requestingUserId) {
        const managedIds = await this.getManagedProjectIds(requestingUserId);
        scopedProjectIds = managedIds.includes(filterProjectId) ? [filterProjectId] : [];
      } else {
        scopedProjectIds = [filterProjectId];
      }
    } else if (!isAdmin && requestingUserId) {
      const managedIds = await this.getManagedProjectIds(requestingUserId);
      if (managedIds.length > 0) scopedProjectIds = managedIds;
    }

    const userWhere = scopedProjectIds !== undefined
      ? { isActive: true, projectMembers: { some: { projectId: { in: scopedProjectIds } } } }
      : { isActive: true };

    const [portalConfig, holidays, users, leaveRequests, timesheetEntries, workItems] =
      await Promise.all([
        this.prisma.portalConfig.findUnique({ where: { id: 'singleton' } }),
        this.prisma.holiday.findMany({
          where: { date: { gte: start, lt: end } },
          select: { date: true, name: true },
        }),
        this.prisma.user.findMany({
          where: userWhere,
          select: {
            id: true,
            fullName: true,
            systemRole: true,
            projectMembers: { select: { projectRole: true } },
          },
          orderBy: { fullName: 'asc' },
        }),
        // Approved + pending leave requests overlapping this month
        this.prisma.leaveRequest.findMany({
          where: {
            status: { in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
            startDate: { lte: end },
            endDate: { gte: start },
          },
          select: { userId: true, startDate: true, endDate: true, isPlanned: true, totalDays: true, isHalfDay: true },
        }),
        // Fetch ALL hours in the period — not scoped by project.
        // Capacity = total time a person is busy, regardless of which project they logged against.
        this.prisma.timesheetEntry.findMany({
          where: { date: { gte: start, lt: end } },
          select: { userId: true, date: true, hours: true },
        }),
        // Active work items assigned to users — interval overlap or no dates set
        // Epics are excluded: they are planning containers and their estimated hours
        // should not contribute to daily capacity load.
        this.prisma.workItem.findMany({
          where: {
            assigneeId: { not: null },
            type: { not: WorkItemType.EPIC },
            status: { notIn: [BoardStatus.QA_DONE, BoardStatus.CLOSED] },
            ...(scopedProjectIds !== undefined ? { projectId: { in: scopedProjectIds } } : {}),
            OR: [
              // Both dates set and overlap with the period
              { startDate: { lte: end }, dueDate: { gte: start } },
              // Started before period end, no due date (open-ended)
              { startDate: { lte: end }, dueDate: null },
              // Due after period start, no start date
              { startDate: null, dueDate: { gte: start } },
              // No dates at all — always include as open assignment
              { AND: [{ startDate: null }, { dueDate: null }] },
            ],
          },
          select: { assigneeId: true, startDate: true, dueDate: true, title: true, type: true, estimatedHours: true },
        }),
      ]);

    const workingDaysCfg = (portalConfig?.workingDays as Record<string, boolean>) ?? {
      monday: true, tuesday: true, wednesday: true,
      thursday: true, friday: true, saturday: false, sunday: false,
    };

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const holidayDates = new Set(holidays.map((h) => new Date(h.date).getDate()));
    const holidayNames = new Map(holidays.map((h) => [new Date(h.date).getDate(), h.name]));

    // Build per-user leave-day sets (planned and unplanned separately)
    const plannedLeaveMap   = new Map<string, Set<number>>();
    const unplannedLeaveMap = new Map<string, Set<number>>();
    // Half-day leave sets (day numbers where the leave is a half-day)
    const halfDayLeaveMap   = new Map<string, Set<number>>();
    for (const leave of leaveRequests) {
      const targetMap = leave.isPlanned ? plannedLeaveMap : unplannedLeaveMap;
      const leaveStart = new Date(leave.startDate);
      const leaveEnd   = new Date(leave.endDate);
      for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          const day = d.getDate();
          if (!targetMap.has(leave.userId)) targetMap.set(leave.userId, new Set());
          targetMap.get(leave.userId)!.add(day);
          if (leave.isHalfDay) {
            if (!halfDayLeaveMap.has(leave.userId)) halfDayLeaveMap.set(leave.userId, new Set());
            halfDayLeaveMap.get(leave.userId)!.add(day);
          }
        }
      }
    }

    // Build per-user timesheet hours map
    const hoursMap = new Map<string, Map<number, number>>();
    for (const entry of timesheetEntries) {
      const day = new Date(entry.date).getDate();
      if (!hoursMap.has(entry.userId)) hoursMap.set(entry.userId, new Map());
      const existing = hoursMap.get(entry.userId)!.get(day) ?? 0;
      hoursMap.get(entry.userId)!.set(day, existing + Number(entry.hours));
    }

    // Build per-user assigned-work-item day sets + estimated hours per day.
    // Fill-to-capacity model: allocate up to 8h per working day, carry the
    // remainder forward. e.g. 12h over 2 days → day 1 = 8h, day 2 = 4h.
    // This correctly reflects that a developer cannot work more than 8h/day,
    // so any overflow spills into the next working day.
    const workItemDayMap      = new Map<string, Set<number>>();
    const workItemEstHoursMap = new Map<string, Map<number, number>>();
    for (const wi of workItems) {
      if (!wi.assigneeId) continue;
      const wiStart = wi.startDate ? new Date(wi.startDate) : start;
      const wiEnd   = wi.dueDate   ? new Date(wi.dueDate)   : end;
      let remaining = Number(wi.estimatedHours ?? 0);

      for (let d = new Date(wiStart); d <= wiEnd && remaining > 0; d.setDate(d.getDate() + 1)) {
        const dn = dayNames[d.getDay()];
        if (!workingDaysCfg[dn]) continue; // skip weekends
        // Skip holidays in the current month (holidays outside this month are not loaded)
        if (d.getFullYear() === year && d.getMonth() + 1 === month && holidayDates.has(d.getDate())) continue;

        const allocatedForDay = Math.min(remaining, 8);
        remaining = Math.round((remaining - allocatedForDay) * 100) / 100;

        // Only populate maps for days that fall within the viewed month
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          const day = d.getDate();
          if (!workItemDayMap.has(wi.assigneeId)) workItemDayMap.set(wi.assigneeId, new Set());
          workItemDayMap.get(wi.assigneeId)!.add(day);
          if (allocatedForDay > 0) {
            if (!workItemEstHoursMap.has(wi.assigneeId)) workItemEstHoursMap.set(wi.assigneeId, new Map());
            const prev = workItemEstHoursMap.get(wi.assigneeId)!.get(day) ?? 0;
            workItemEstHoursMap.get(wi.assigneeId)!.set(day, Math.round((prev + allocatedForDay) * 100) / 100);
          }
        }
      }
    }

    const employeeRows = users.map((user) => {
      const userPlannedLeaves   = plannedLeaveMap.get(user.id)       ?? new Set<number>();
      const userUnplannedLeaves = unplannedLeaveMap.get(user.id)   ?? new Set<number>();
      const userHalfDayLeaves   = halfDayLeaveMap.get(user.id)     ?? new Set<number>();
      const userHours           = hoursMap.get(user.id)            ?? new Map<number, number>();
      const userWorkDays        = workItemDayMap.get(user.id)      ?? new Set<number>();
      const userWorkItemEstHrs  = workItemEstHoursMap.get(user.id) ?? new Map<number, number>();

      const cells = days.map((day) => {
        const date    = new Date(year, month - 1, day);
        const dayName = dayNames[date.getDay()];
        const isWeeklyOff        = !workingDaysCfg[dayName];
        const isHoliday          = holidayDates.has(day);
        const isOnPlannedLeave   = userPlannedLeaves.has(day);
        const isOnUnplannedLeave = userUnplannedLeaves.has(day);
        const isOnLeave          = isOnPlannedLeave || isOnUnplannedLeave;
        const isHalfDay          = userHalfDayLeaves.has(day);
        const hours          = userHours.get(day) ?? 0;
        const hasWorkItem    = userWorkDays.has(day);
        const workItemHours  = userWorkItemEstHrs.get(day) ?? 0;

        let status: string;
        if (isHoliday)           status = 'holiday';
        else if (isWeeklyOff)    status = 'weekly_off';
        else if (isOnUnplannedLeave) status = 'unplanned_leave';
        else if (isOnPlannedLeave)   status = 'planned_leave';
        else if (hours >= 8 || workItemHours >= 8) status = 'occupied';
        else if (hasWorkItem)                       status = 'partial';
        else status = 'available';

        // For half-day leave, compute what the "rest of day" looks like
        let restOfDayStatus: string | undefined;
        if (isHalfDay && isOnLeave) {
          if (hours >= 4 || workItemHours >= 4) restOfDayStatus = 'occupied';
          else if (hasWorkItem)                 restOfDayStatus = 'partial';
          else                                  restOfDayStatus = 'available';
        }

        return {
          day,
          status,
          hours,
          workItemHours: !isHoliday && !isWeeklyOff ? workItemHours : 0,
          isHalfDay: isHalfDay && isOnLeave,
          restOfDayStatus,
          hasWorkItem: !isHoliday && !isWeeklyOff && !isOnLeave && hasWorkItem,
          holidayName: holidayNames.get(day),
          dayOfWeek: dayName,
        };
      });

      const workingDayCount = cells.filter(
        (c) => c.status !== 'holiday' && c.status !== 'weekly_off',
      ).length;
      // Half-day leave cells contribute 0.5 to occupied/available counts
      const occupiedDays = cells.reduce((sum, c) => {
        if (c.status === 'occupied' || c.status === 'partial') return sum + 1;
        if (c.isHalfDay && (c.restOfDayStatus === 'occupied' || c.restOfDayStatus === 'partial')) return sum + 0.5;
        return sum;
      }, 0);
      // Count leave days from the per-month day sets — this is always scoped to the
      // current month even when the leave request spans multiple months.
      // Each half-day counts as 0.5; full days count as 1.
      const userHalfDayCount = userHalfDayLeaves.size;
      const leaveDays =
        (userPlannedLeaves.size + userUnplannedLeaves.size) - userHalfDayCount * 0.5;
      const availableDays = cells.reduce((sum, c) => {
        if (c.status === 'available') return sum + 1;
        if (c.isHalfDay && c.restOfDayStatus === 'available') return sum + 0.5;
        return sum;
      }, 0);

      return {
        userId: user.id,
        name: user.fullName,
        role:
          user.projectMembers[0]?.projectRole?.replace('_', ' ') ??
          user.systemRole,
        cells,
        summary: { workingDays: workingDayCount, occupiedDays, leaveDays, availableDays },
      };
    });

    return {
      period,
      year,
      month,
      daysInMonth,
      days: days.map((day) => {
        const date = new Date(year, month - 1, day);
        return {
          day,
          dayOfWeek: dayNames[date.getDay()],
          isHoliday: holidayDates.has(day),
          holidayName: holidayNames.get(day),
          isWeeklyOff: !workingDaysCfg[dayNames[date.getDay()]],
        };
      }),
      employees: employeeRows,
    };
  }
}
