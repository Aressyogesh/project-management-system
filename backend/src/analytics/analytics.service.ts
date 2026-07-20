import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardStatus, BugClassification, LeaveStatus, MemberBilling, MemberEngagement, ProjectRole, SystemRole, WorkItemType } from '@prisma/client';

// ─── KPI Computation Helpers ──────────────────────────────────────────────────

function periodToRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function ratio10(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.min(Math.round((numerator / denominator) * 10 * 10) / 10, 10);
}

function computeEstimationAccuracy(estimatedHours: number, actualHours: number): number {
  if (estimatedHours === 0) return actualHours === 0 ? 10 : 0;
  const variance = Math.abs(actualHours - estimatedHours) / estimatedHours;
  if (variance <= 0.15) return 10;
  if (variance <= 0.30) return 7;
  if (variance <= 0.50) return 4;
  return 0;
}

function computeReworkRatio(totalReopens: number, totalCompleted: number): number {
  if (totalCompleted === 0) return 5;
  const ratio = totalReopens / totalCompleted;
  if (ratio === 0) return 5;
  if (ratio <= 0.1) return 3;
  return 0;
}

// 10 - (bugHours / totalWorkingHours * 10), clamped to [0, 10]
function computeDefectLeakageFromHours(bugHours: number, totalWorkingHours: number): number {
  if (totalWorkingHours === 0) return 10;
  const score = 10 - (bugHours / totalWorkingHours) * 10;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function computeAttendance(
  leaveRequests: { isPlanned: boolean; startDate: Date; endDate: Date; isHalfDay: boolean }[],
  periodStart: Date,
  periodEnd: Date,
): number {
  if (leaveRequests.some((r) => !r.isPlanned)) return 0;

  const lastDayOfPeriod = new Date(periodEnd.getTime() - 86_400_000);

  const plannedDays = leaveRequests.reduce((s, r) => {
    if (r.isHalfDay) return s + 0.5;
    const effectiveStart = r.startDate < periodStart ? periodStart : r.startDate;
    const effectiveEnd   = r.endDate   > lastDayOfPeriod ? lastDayOfPeriod : r.endDate;
    const days = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 86_400_000) + 1;
    return s + Math.max(0, days);
  }, 0);

  if (plannedDays > 1.5) return 0;
  if (plannedDays > 1)   return 3;
  return 5;
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

    const adminSystemRoles = [SystemRole.SUPER_USER, SystemRole.ADMIN];
    let userWhere: object = isAdmin
      ? { isActive: true, systemRole: { notIn: adminSystemRoles } }
      : { id: currentUserId, isActive: true };

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

    // ── Phase 1: parallel fetch ─────────────────────────────────────────────────
    const [
      allAssignedItems,
      bugItems,
      manualScores,
      leaveRequests,
      lateComingLogs,
      upskillLearningApproved,
      upskillLearningRejected,
      totalWorkingHoursAgg,
    ] = await Promise.all([
      // All assigned items — used for ALL delivery metrics regardless of sprint presence
      this.prisma.workItem.findMany({
        where: {
          assigneeId: userId,
          createdAt: { gte: start, lt: end },
          projectId: { in: activeProjectIds },
        },
        select: { id: true, status: true, completedAt: true, inReviewAt: true, dueDate: true, reopenCount: true, qaReopenCount: true, type: true, storyPoints: true, estimatedHours: true },
      }),
      // Bug items the developer is responsible for (defect leakage)
      this.prisma.workItem.findMany({
        where: {
          responsibleUserId: userId,
          type: WorkItemType.BUG,
          createdAt: { gte: start, lt: end },
          projectId: { in: activeProjectIds },
        },
        select: { id: true, bugClassification: true },
      }),
      // PM-entered manual KPI scores
      this.prisma.kpiRecord.findMany({
        where: { userId, period },
        select: { metricId: true, points: true },
      }),
      // Leave requests overlapping the period — only APPROVED leaves affect scoring
      this.prisma.leaveRequest.findMany({
        where: {
          userId,
          status: 'APPROVED',
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { isPlanned: true, startDate: true, endDate: true, isHalfDay: true },
      }),
      // Late coming logs for the period — used to auto-compute timeliness score
      this.prisma.lateComingLog.findMany({
        where: { userId, date: { gte: start, lt: end } },
        select: { minutesLate: true },
      }),
      // APPROVED LEARNING assignment → 5 pts
      this.prisma.upskillAssignment.findFirst({
        where: { assignedToId: userId, type: 'LEARNING', status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
        select: { id: true },
      }),
      // REJECTED (declined) LEARNING assignment → 3 pts. SUBMITTED/IN_PROGRESS/ASSIGNED = 0 pts per spec.
      this.prisma.upskillAssignment.findFirst({
        where: { assignedToId: userId, type: 'LEARNING', status: 'REJECTED', startDate: { lte: end }, endDate: { gte: start } },
        select: { id: true },
      }),
      // Total timesheet hours for the user in the period (for defect leakage denominators)
      this.prisma.timesheetEntry.aggregate({
        where: { userId, date: { gte: start, lt: end } },
        _sum: { hours: true },
      }),
    ]);

    // ── Phase 2: dependent queries ──────────────────────────────────────────────
    // All metrics use allAssignedItems regardless of sprint existence.
    const allAssignedItemIds = allAssignedItems.map((i) => i.id);

    const codeReviewBugIds = bugItems
      .filter((b) => b.bugClassification === BugClassification.CODE_REVIEW)
      .map((b) => b.id);
    const functionalBugIds = bugItems
      .filter((b) => b.bugClassification !== null && b.bugClassification !== BugClassification.CODE_REVIEW)
      .map((b) => b.id);
    // Rework = items dragged specifically from IN_QA → IN_PROGRESS (same definition as Internal Rework Ratio)
    const reworkItemIds = allAssignedItems.filter((i) => i.qaReopenCount > 0).map((i) => i.id);

    const [timesheetSum, codeReviewHoursAgg, functionalBugHoursAgg, reworkHoursAgg] = await Promise.all([
      // Timesheet hours on all assigned work items (for estimation accuracy actual hours)
      this.prisma.timesheetEntry.aggregate({
        where: {
          userId,
          ...(allAssignedItemIds.length > 0
            ? { workItemId: { in: allAssignedItemIds } }
            : { date: { gte: start, lt: end } }),
        },
        _sum: { hours: true },
      }),
      // Hours logged on CODE_REVIEW bugs
      codeReviewBugIds.length > 0
        ? this.prisma.timesheetEntry.aggregate({
            where: { userId, workItemId: { in: codeReviewBugIds } },
            _sum: { hours: true },
          })
        : Promise.resolve({ _sum: { hours: 0 } }),
      // Hours logged on functional (non-CODE_REVIEW) bugs
      functionalBugIds.length > 0
        ? this.prisma.timesheetEntry.aggregate({
            where: { userId, workItemId: { in: functionalBugIds } },
            _sum: { hours: true },
          })
        : Promise.resolve({ _sum: { hours: 0 } }),
      // Hours logged on reopened/rework items
      reworkItemIds.length > 0
        ? this.prisma.timesheetEntry.aggregate({
            where: { userId, workItemId: { in: reworkItemIds } },
            _sum: { hours: true },
          })
        : Promise.resolve({ _sum: { hours: 0 } }),
    ]);

    // ── Compute metrics ─────────────────────────────────────────────────────────

    const totalWorkingHours = Number(totalWorkingHoursAgg._sum.hours ?? 0);
    const totalEstimated = allAssignedItems.reduce((s, i) => s + Number(i.estimatedHours ?? 0), 0);
    const totalActual = Number(timesheetSum._sum.hours ?? 0);

    // Diligent & Committed — auto metrics
    // Sprint Reliability: items that have entered IN_QA / Total Assigned (non-EPIC, non-BLOCKED) * 10
    // Cards in QA_DONE or CLOSED moved forward from IN_QA — score unaffected, still counted.
    // Cards pulled back below IN_QA (to IN_REVIEW or IN_PROGRESS) — recalculate: status leaves the set.
    const QA_OR_BEYOND = new Set<BoardStatus>([BoardStatus.IN_QA, BoardStatus.QA_DONE, BoardStatus.CLOSED]);
    const srBase = allAssignedItems.filter(
      (i) => i.type !== WorkItemType.EPIC && i.status !== BoardStatus.BLOCKED,
    );
    const sprintReliability = ratio10(
      srBase.filter((i) => QA_OR_BEYOND.has(i.status)).length,
      srBase.length,
    );

    // Delivery Timeliness: items moved from In-Progress to In-Review on or before due date
    // Completion trigger = inReviewAt (when card entered IN_REVIEW).
    // Score persists as card moves forward (IN_REVIEW → IN_QA → QA_DONE → CLOSED): inReviewAt stays set.
    // Recalculate if pulled back from IN_REVIEW to IN_PROGRESS: inReviewAt is cleared in work-items.service.
    // Excludes EPICs and BLOCKED items per Excel.
    const dtBase = allAssignedItems.filter(
      (i) => i.type !== WorkItemType.EPIC && i.status !== BoardStatus.BLOCKED,
    );
    const onTimeItems = dtBase.filter(
      (i) => i.inReviewAt !== null && i.dueDate !== null && i.inReviewAt <= i.dueDate,
    );
    const deliveryTimeliness = ratio10(onTimeItems.length, dtBase.length);

    // Estimation Accuracy: variance-based stepped
    const estimationAccuracy = computeEstimationAccuracy(totalEstimated, totalActual);

    // Throughput: items in CLOSED / Total Assigned (non-BLOCKED, non-EPIC) * 10
    // Persist: card in CLOSED stays counted. Recalculate: if moved back from CLOSED to any earlier
    // column, status is no longer CLOSED so it drops from numerator automatically.
    // Exclude BLOCKED and EPIC per Notes column.
    const throughputBase = allAssignedItems.filter(
      (i) => i.status !== BoardStatus.BLOCKED && i.type !== WorkItemType.EPIC,
    );
    const closedItems = throughputBase.filter((i) => i.status === BoardStatus.CLOSED);
    const throughput = ratio10(closedItems.length, throughputBase.length);

    // Collaboration — auto + manual
    // Internal Rework Ratio: tasks dragged from IN_QA → IN_PROGRESS (qaReopenCount > 0) / total completed
    // Only IN_QA→IN_PROGRESS moves count as rework per Excel spec. General reopenCount (any backward move)
    // is NOT used here — that would overcount moves from IN_REVIEW, QA_DONE, etc.
    const DONE_STAGES = new Set<BoardStatus>([BoardStatus.QA_DONE, BoardStatus.CLOSED]);
    const qaReopenedTaskCount = allAssignedItems.filter((i) => i.qaReopenCount > 0).length;
    const totalCompleted = allAssignedItems.filter((i) => DONE_STAGES.has(i.status)).length;
    const internalReworkRatio = computeReworkRatio(qaReopenedTaskCount, totalCompleted);

    // Technical Defect Leakage: 10 - (CODE_REVIEW bug hours / total working hours * 10)
    const codeReviewBugHours = Number(codeReviewHoursAgg._sum.hours ?? 0);
    const technicalDefectLeakage = computeDefectLeakageFromHours(codeReviewBugHours, totalWorkingHours);

    // Functional Defect Leakage: 10 - ((rework hours + functional bug hours) / total working hours * 10)
    const functionalBugHours = Number(functionalBugHoursAgg._sum.hours ?? 0);
    const reworkHours = Number(reworkHoursAgg._sum.hours ?? 0);
    const functionalDefectLeakage = computeDefectLeakageFromHours(functionalBugHours + reworkHours, totalWorkingHours);

    // Attendance — clipped to period so cross-month leaves aren't overcounted
    const attendance = computeAttendance(leaveRequests, start, end);

    // Learning Velocity: approved=5, declined (REJECTED)=3, not submitted or any other status=0
    const learningVelocity = upskillLearningApproved ? 5 : upskillLearningRejected ? 3 : 0;

    // Timeliness — auto-computed from late coming logs
    const timeliness = (() => {
      if (lateComingLogs.length === 0) return 5;
      if (lateComingLogs.length < 3 && lateComingLogs.every((l) => l.minutesLate <= 10)) return 3;
      return 0;
    })();

    // Manual scores (PM entries)
    const getManual = (metricId: string) =>
      manualScores.find((s) => s.metricId === metricId)?.points ?? 0;
    const teamCollaboration  = getManual('team_collaboration');
    const reportingDocs      = getManual('reporting_documentation');
    const positiveBehaviour  = getManual('positive_behaviour');
    const gratitude          = getManual('gratitude');

    // ── Assemble final result ────────────────────────────────────────────────────

    const hasNoActivity =
      allAssignedItems.length === 0 &&
      manualScores.length === 0 &&
      !upskillLearningApproved &&
      !upskillLearningRejected;

    const METRIC_IDS = [
      'sprint_reliability', 'delivery_timeliness', 'estimation_accuracy', 'throughput_complexity',
      'internal_rework_ratio', 'technical_defect_leakage', 'functional_defect_leakage',
      'attendance', 'timeliness',
      'team_collaboration', 'reporting_documentation',
      'learning_velocity',
      'positive_behaviour', 'gratitude',
    ];

    const METRIC_VALUES = hasNoActivity
      ? [0, 0, 0, 0, 0, 0, 0, attendance, timeliness, 0, 0, 0, 0, 0]
      : [
          sprintReliability, deliveryTimeliness, estimationAccuracy, throughput,
          internalReworkRatio, technicalDefectLeakage, functionalDefectLeakage,
          attendance, timeliness,
          teamCollaboration, reportingDocs,
          learningVelocity,
          positiveBehaviour, gratitude,
        ];

    const metrics = METRIC_IDS.map((metricId, i) => ({ metricId, points: METRIC_VALUES[i] }));
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

  // ─── KPI Notes ───────────────────────────────────────────────────────────────

  async getKpiNotes(userId: string, period: string) {
    return this.prisma.kpiNote.findMany({
      where: { userId, period },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        metricId: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, fullName: true } },
      },
    });
  }

  async addKpiNote(authorId: string, body: { userId: string; metricId: string; period: string; content: string }) {
    return this.prisma.kpiNote.create({
      data: {
        userId: body.userId,
        metricId: body.metricId,
        period: body.period,
        content: body.content,
        authorId,
      },
      select: {
        id: true,
        metricId: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, fullName: true } },
      },
    });
  }

  async deleteKpiNote(noteId: string, requesterId: string, isAdmin: boolean) {
    const note = await this.prisma.kpiNote.findUnique({ where: { id: noteId }, select: { authorId: true } });
    if (!note) throw new Error('Note not found');
    if (!isAdmin && note.authorId !== requesterId) throw new Error('Forbidden');
    return this.prisma.kpiNote.delete({ where: { id: noteId } });
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
              status: { in: [BoardStatus.QA_DONE, BoardStatus.CLOSED] },
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
            status: { in: [BoardStatus.QA_DONE, BoardStatus.CLOSED] },
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
        const done = items.filter((w) => w.status === BoardStatus.QA_DONE || w.status === BoardStatus.CLOSED).length;
        return { type, total, done, completePct: total > 0 ? Math.round((done / total) * 100) : 0 };
      });
      const totalAll = p.workItems.length;
      const doneAll = p.workItems.filter((w) => w.status === BoardStatus.QA_DONE || w.status === BoardStatus.CLOSED).length;
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
    const now = new Date();
    // For dateless work items in the current month, start distribution from today
    // rather than the 1st so allocation appears on the correct day in the report.
    const datelessWiStart = (now >= start && now < end)
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : start;

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

    const excludeSystemRoles = { notIn: [SystemRole.SUPER_USER, SystemRole.ADMIN] };
    const userWhere = scopedProjectIds !== undefined
      ? { isActive: true, systemRole: excludeSystemRoles, projectMembers: { some: { projectId: { in: scopedProjectIds } } } }
      : { isActive: true, systemRole: excludeSystemRoles };

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
            projectMembers: {
              ...(filterProjectId ? { where: { projectId: filterProjectId } } : {}),
              select: { projectRole: true, billing: true, engagement: true, engagementHours: true },
              take: 1,
            },
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

    // Pre-index work items by assignee — distribution is done per-employee
    // so each employee's daily cap (driven by their engagement) is respected.
    const userWorkItemsMap = new Map<string, typeof workItems>();
    for (const wi of workItems) {
      if (!wi.assigneeId) continue;
      if (!userWorkItemsMap.has(wi.assigneeId)) userWorkItemsMap.set(wi.assigneeId, []);
      userWorkItemsMap.get(wi.assigneeId)!.push(wi);
    }

    const employeeRows = users.map((user) => {
      const member          = user.projectMembers[0];
      const isBillable      = !!filterProjectId && member?.billing === MemberBilling.BILLABLE;
      const engagement      = member?.engagement ?? MemberEngagement.FULL_DAY;
      const engagementHoursVal = member?.engagementHours ?? null;

      // Daily capacity cap used for work-item fill-to-capacity distribution
      const dailyCap = isBillable
        ? engagement === MemberEngagement.FULL_DAY ? 8.5
          : engagement === MemberEngagement.HALF_DAY ? 4
          : (engagementHoursVal ?? 4)
        : 8.5;

      // Resolve leave sets up front so the distribution loop can skip leave days
      const userPlannedLeaves   = plannedLeaveMap.get(user.id)   ?? new Set<number>();
      const userUnplannedLeaves = unplannedLeaveMap.get(user.id) ?? new Set<number>();
      const userHalfDayLeaves   = halfDayLeaveMap.get(user.id)   ?? new Set<number>();
      const userHours           = hoursMap.get(user.id)          ?? new Map<number, number>();

      // Per-employee work-item distribution using this employee's daily cap.
      // Full leave days are skipped (same as weekends/holidays) so hours roll
      // forward to the next available day within the due date.
      // leaveAffectedHours is only populated when hours could NOT be redistributed
      // (remaining > 0 after the loop) — so the warning disappears once the PM
      // extends the due date far enough to absorb the leave day's hours.
      const userWorkDays         = new Set<number>();
      const userWorkItemEstHrs   = new Map<number, number>();
      const userLeaveAffectedHrs = new Map<number, number>();
      const _wiList = userWorkItemsMap.get(user.id) ?? [];
      for (const wi of _wiList) {
        const wiStart = wi.startDate ? new Date(wi.startDate) : datelessWiStart;
        const wiEnd   = wi.dueDate   ? new Date(wi.dueDate)   : end;
        let remaining = Number(wi.estimatedHours ?? 0);
        // Track per-leave-day skips for THIS work item — only surfaced if
        // hours overflow past the due date.
        const thisWiLeaveSkips = new Map<number, number>();

        for (let d = new Date(wiStart); d <= wiEnd && remaining > 0; d.setDate(d.getDate() + 1)) {
          const dn             = dayNames[d.getDay()];
          const isCurrentMonth = d.getFullYear() === year && d.getMonth() + 1 === month;
          const dayNum         = d.getDate();

          if (!workingDaysCfg[dn]) continue;
          if (isCurrentMonth && holidayDates.has(dayNum)) continue;

          // Skip full leave days — hours roll forward to the next available day.
          // Half-day leave is NOT skipped: the person is partially available.
          if (isCurrentMonth &&
              (userPlannedLeaves.has(dayNum) || userUnplannedLeaves.has(dayNum)) &&
              !userHalfDayLeaves.has(dayNum)) {
            const wouldAllocate = Math.min(remaining, dailyCap);
            thisWiLeaveSkips.set(dayNum, Math.round(((thisWiLeaveSkips.get(dayNum) ?? 0) + wouldAllocate) * 100) / 100);
            continue;
          }

          const allocatedForDay = Math.min(remaining, dailyCap);
          remaining = Math.round((remaining - allocatedForDay) * 100) / 100;

          if (isCurrentMonth) {
            userWorkDays.add(dayNum);
            if (allocatedForDay > 0) {
              const prev = userWorkItemEstHrs.get(dayNum) ?? 0;
              userWorkItemEstHrs.set(dayNum, Math.round((prev + allocatedForDay) * 100) / 100);
            }
          }
        }

        // Only surface leave impacts that caused actual overflow past the due date.
        // If remaining == 0, all hours were placed — no warning needed.
        if (remaining > 0) {
          let overflow = remaining;
          for (const [day, hrs] of thisWiLeaveSkips) {
            if (overflow <= 0) break;
            const attributed = Math.min(hrs, overflow);
            overflow = Math.round((overflow - attributed) * 100) / 100;
            userLeaveAffectedHrs.set(day, Math.round(((userLeaveAffectedHrs.get(day) ?? 0) + attributed) * 100) / 100);
          }
        }
      }

      const cells = days.map((day) => {
        const date    = new Date(year, month - 1, day);
        const dayName = dayNames[date.getDay()];
        const isWeeklyOff        = !workingDaysCfg[dayName];
        const isHoliday          = holidayDates.has(day);
        const isOnPlannedLeave   = userPlannedLeaves.has(day);
        const isOnUnplannedLeave = userUnplannedLeaves.has(day);
        const isOnLeave          = isOnPlannedLeave || isOnUnplannedLeave;
        const isHalfDayLeave     = userHalfDayLeaves.has(day);
        const hours              = userHours.get(day) ?? 0;
        const hasWorkItem        = userWorkDays.has(day);
        const workItemHours      = userWorkItemEstHrs.get(day) ?? 0;

        let status: string;
        let cellHours = 0;
        let cellIsHalfDay = false;
        let cellRestOfDayStatus: string | undefined;

        if (isHoliday) {
          status = 'holiday';
        } else if (isWeeklyOff) {
          status = 'weekly_off';
        } else if (isOnUnplannedLeave || isOnPlannedLeave) {
          status        = isOnUnplannedLeave ? 'unplanned_leave' : 'planned_leave';
          cellIsHalfDay = isHalfDayLeave;
          if (isHalfDayLeave) {
            if (hours >= 4 || workItemHours >= 4) cellRestOfDayStatus = 'occupied';
            else if (hasWorkItem)                 cellRestOfDayStatus = 'partial';
            else                                 cellRestOfDayStatus = 'available';
          }
        } else if (isBillable) {
          if (engagement === MemberEngagement.FULL_DAY) {
            // Full-day engagement sets the daily cap at 8.5h but does NOT
            // pre-occupy every day. Color follows actual work item allocation,
            // same as non-billable, so the PM sees real gaps (red = nothing assigned).
            if (workItemHours >= 8.5)   { status = 'occupied'; cellHours = workItemHours; }
            else if (workItemHours > 0) { status = 'partial';  cellHours = workItemHours; }
            else                        { status = 'available'; cellHours = 0; }
          } else if (engagement === MemberEngagement.HALF_DAY) {
            // Split cell: top half = committed 4h slot, bottom = rest of day.
            // Green top when work fills the slot; amber when slot has no tasks yet.
            cellIsHalfDay       = true;
            cellRestOfDayStatus = 'available';
            cellHours           = workItemHours > 0 ? workItemHours : 4;
            status              = workItemHours >= 4 ? 'occupied' : 'partial';
          } else {
            // PARTIAL — split cell, custom engagement hours per day
            const cap           = engagementHoursVal ?? 4;
            cellIsHalfDay       = true;
            cellRestOfDayStatus = 'available';
            cellHours           = workItemHours > 0 ? workItemHours : cap;
            status              = workItemHours >= cap ? 'occupied' : 'partial';
          }
        } else {
          // Non-billable: current behaviour — work items + timesheets
          if (hours >= 8.5 || workItemHours >= 8.5) status = 'occupied';
          else if (hasWorkItem)                     status = 'partial';
          else                                      status = 'available';
          cellHours = hours;
        }

        return {
          day,
          status,
          hours:               cellHours,
          workItemHours:       !isHoliday && !isWeeklyOff ? workItemHours : 0,
          isHalfDay:           cellIsHalfDay,
          restOfDayStatus:     cellRestOfDayStatus,
          hasWorkItem:         !isHoliday && !isWeeklyOff && !isOnLeave && hasWorkItem,
          holidayName:         holidayNames.get(day),
          dayOfWeek:           dayName,
          leaveAffectedHours:  isOnLeave && !isHalfDayLeave ? (userLeaveAffectedHrs.get(day) ?? 0) : 0,
        };
      });

      const workingDayCount = cells.filter(
        (c) => c.status !== 'holiday' && c.status !== 'weekly_off',
      ).length;

      const occupiedDays = cells.reduce((sum, c) => {
        if (!c.isHalfDay && (c.status === 'occupied' || c.status === 'partial')) return sum + 1;
        if (c.isHalfDay) {
          // For split cells the top half is only truly occupied when status='occupied'.
          // status='partial' means the commitment slot has no tasks yet — don't count it.
          if (c.status === 'occupied') sum += 0.5;
          if (c.restOfDayStatus === 'occupied' || c.restOfDayStatus === 'partial') sum += 0.5;
        }
        return sum;
      }, 0);

      const userHalfDayCount = userHalfDayLeaves.size;
      const leaveDays =
        (userPlannedLeaves.size + userUnplannedLeaves.size) - userHalfDayCount * 0.5;

      const availableDays = cells.reduce((sum, c) => {
        if (!c.isHalfDay && c.status === 'available') return sum + 1;
        if (c.isHalfDay) {
          // 'partial' top = commitment slot with no tasks = available for assignment
          if (c.status === 'available' || c.status === 'partial') sum += 0.5;
          if (c.restOfDayStatus === 'available') sum += 0.5;
        }
        return sum;
      }, 0);

      return {
        userId:         user.id,
        name:           user.fullName,
        role:           member?.projectRole?.replace('_', ' ') ?? user.systemRole,
        billing:        member?.billing,
        engagement:     member?.engagement,
        engagementHours: engagementHoursVal,
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
