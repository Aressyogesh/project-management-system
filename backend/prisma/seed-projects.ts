/**
 * seed-projects.ts
 * Seeds Smart Facility and HEMS One Rewrite projects with realistic May 2026 data.
 * Works on both local PostgreSQL and Supabase — looks up project/user IDs dynamically.
 * Safe to re-run: all creates use upsert with fixed IDs.
 *
 * Run: npx ts-node prisma/seed-projects.ts
 */

import {
  BoardStatus,
  BugClassification,
  BugFlag,
  BugReproducibility,
  BugSeverity,
  BugStatus,
  LeaveStatus,
  MilestoneStatus,
  PrismaClient,
  ProjectRole,
  TaskPriority,
  TimesheetApprovalStatus,
  WorkItemType,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** UTC date to avoid timezone shifts */
function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** May 2026 working days Mon–Fri (21 days: May 1=Fri, May 31=Sun) */
function mayWorkingDays(): Date[] {
  const days: Date[] = [];
  for (let day = 1; day <= 31; day++) {
    const dt = new Date(Date.UTC(2026, 4, day));
    const dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(dt);
  }
  return days;
}

const WORKING_DAYS = mayWorkingDays(); // 21 days

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamRoles {
  pm: string;           // userId of PROJECT_MANAGER
  tls: string[];        // userIds of TEAM_LEADs (may be empty)
  devs: string[];       // userIds of DEVELOPERs
  qas: string[];        // userIds of QAs
  all: string[];        // all member userIds
}

// ─── Fetch team roles for a project ──────────────────────────────────────────

async function getTeamRoles(projectId: string): Promise<TeamRoles> {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true, projectRole: true },
  });

  const byRole = (role: ProjectRole) =>
    members.filter((m) => m.projectRole === role).map((m) => m.userId);

  const pm = byRole(ProjectRole.PROJECT_MANAGER)[0];
  if (!pm) throw new Error(`No PROJECT_MANAGER found for project ${projectId}`);

  return {
    pm,
    tls:  byRole(ProjectRole.TEAM_LEAD),
    devs: byRole(ProjectRole.DEVELOPER),
    qas:  byRole(ProjectRole.QA),
    all:  members.map((m) => m.userId),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Seeding Smart Facility & HEMS One Rewrite...\n');

  // ── Resolve existing projects ──────────────────────────────────────────────
  const sfProject = await prisma.project.findFirst({ where: { name: 'Smart Facility' } });
  const hemsProject = await prisma.project.findFirst({ where: { name: 'HEMS One Rewrite' } });

  if (!sfProject)   throw new Error('Project "Smart Facility" not found — create it in the app first.');
  if (!hemsProject) throw new Error('Project "HEMS One Rewrite" not found — create it in the app first.');

  const sfId   = sfProject.id;
  const hemsId = hemsProject.id;

  console.log(`✅ Found: Smart Facility    (${sfId})`);
  console.log(`✅ Found: HEMS One Rewrite  (${hemsId})\n`);

  // ── Resolve team members ───────────────────────────────────────────────────
  const sf   = await getTeamRoles(sfId);
  const hems = await getTeamRoles(hemsId);

  console.log('Smart Facility team:');
  console.log(`  PM   : ${sf.pm}`);
  console.log(`  TLs  : ${sf.tls.join(', ') || '(none)'}`);
  console.log(`  Devs : ${sf.devs.join(', ') || '(none)'}`);
  console.log(`  QAs  : ${sf.qas.join(', ') || '(none)'}`);
  console.log('HEMS One Rewrite team:');
  console.log(`  PM   : ${hems.pm}`);
  console.log(`  TLs  : ${hems.tls.join(', ')}`);
  console.log(`  Devs : ${hems.devs.join(', ')}`);
  console.log(`  QAs  : ${hems.qas.join(', ')}\n`);

  // If no devs fall back to TLs; if no TLs fall back to PM
  const sfDevs  = sf.devs.length   ? sf.devs   : sf.tls.length ? sf.tls   : [sf.pm];
  const sfQAs   = sf.qas.length    ? sf.qas    : [sf.pm];
  const sfTL    = sf.tls.length    ? sf.tls[0] : sf.pm;

  const hemsDevs = hems.devs.length ? hems.devs : hems.tls.length ? hems.tls : [hems.pm];
  const hemsQAs  = hems.qas.length  ? hems.qas  : [hems.pm];
  const hemsTL   = hems.tls.length  ? hems.tls[0] : hems.pm;

  const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const bugSeverities: BugSeverity[] = ['MINOR', 'MAJOR', 'CRITICAL', 'SHOW_STOPPER'];

  // ══════════════════════════════════════════════════════════════════════════
  // SMART FACILITY — Milestones & Sprints
  // ══════════════════════════════════════════════════════════════════════════

  await prisma.milestone.upsert({
    where:  { id: 'sf-m1' },
    update: { status: MilestoneStatus.COMPLETED },
    create: {
      id: 'sf-m1', projectId: sfId,
      name: 'Phase 1 — Requirements & Design',
      description: 'Requirements gathering, wireframes, and API design.',
      startDate: d(2026, 4, 1), dueDate: d(2026, 4, 30),
      responsibleUserId: sf.pm, status: MilestoneStatus.COMPLETED,
    },
  });

  await prisma.milestone.upsert({
    where:  { id: 'sf-m2' },
    update: { status: MilestoneStatus.IN_PROGRESS },
    create: {
      id: 'sf-m2', projectId: sfId,
      name: 'Phase 2 — Core Development',
      description: 'Backend APIs, frontend components, and integration.',
      startDate: d(2026, 5, 1), dueDate: d(2026, 6, 30),
      responsibleUserId: sfTL, status: MilestoneStatus.IN_PROGRESS,
    },
  });

  const sfSp1 = await prisma.sprint.upsert({
    where:  { id: 'sf-sp1' },
    update: {},
    create: {
      id: 'sf-sp1', projectId: sfId, milestoneId: 'sf-m2',
      name: 'Sprint 1', goal: 'Core API & Auth module',
      startDate: d(2026, 5, 1), endDate: d(2026, 5, 14), isActive: false,
    },
  });

  const sfSp2 = await prisma.sprint.upsert({
    where:  { id: 'sf-sp2' },
    update: {},
    create: {
      id: 'sf-sp2', projectId: sfId, milestoneId: 'sf-m2',
      name: 'Sprint 2', goal: 'Dashboard & Frontend',
      startDate: d(2026, 5, 15), endDate: d(2026, 5, 31), isActive: false,
    },
  });

  const sfSp3 = await prisma.sprint.upsert({
    where:  { id: 'sf-sp3' },
    update: {},
    create: {
      id: 'sf-sp3', projectId: sfId, milestoneId: 'sf-m2',
      name: 'Sprint 3', goal: 'Integration & QA',
      startDate: d(2026, 6, 1), endDate: d(2026, 6, 14), isActive: true,
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HEMS ONE REWRITE — Milestones & Sprints
  // ══════════════════════════════════════════════════════════════════════════

  await prisma.milestone.upsert({
    where:  { id: 'hems-m1' },
    update: { status: MilestoneStatus.COMPLETED },
    create: {
      id: 'hems-m1', projectId: hemsId,
      name: 'Phase 1 — Architecture & Setup',
      description: 'System architecture, DB schema, and CI/CD pipeline.',
      startDate: d(2026, 4, 1), dueDate: d(2026, 4, 30),
      responsibleUserId: hems.pm, status: MilestoneStatus.COMPLETED,
    },
  });

  await prisma.milestone.upsert({
    where:  { id: 'hems-m2' },
    update: { status: MilestoneStatus.COMPLETED },
    create: {
      id: 'hems-m2', projectId: hemsId,
      name: 'Phase 2 — Metering & Dashboard',
      description: 'Smart metering data pipeline and consumption dashboard.',
      startDate: d(2026, 5, 1), dueDate: d(2026, 5, 20),
      responsibleUserId: hemsTL, status: MilestoneStatus.COMPLETED,
    },
  });

  await prisma.milestone.upsert({
    where:  { id: 'hems-m3' },
    update: { status: MilestoneStatus.IN_PROGRESS },
    create: {
      id: 'hems-m3', projectId: hemsId,
      name: 'Phase 3 — Solar & Analytics',
      description: 'Solar integration, analytics, and reporting module.',
      startDate: d(2026, 5, 21), dueDate: d(2026, 7, 31),
      responsibleUserId: hemsTL, status: MilestoneStatus.IN_PROGRESS,
    },
  });

  const hemsSp1 = await prisma.sprint.upsert({
    where:  { id: 'hems-sp1' },
    update: {},
    create: {
      id: 'hems-sp1', projectId: hemsId, milestoneId: 'hems-m2',
      name: 'Sprint 1', goal: 'Metering API & Data Pipeline',
      startDate: d(2026, 5, 1), endDate: d(2026, 5, 10), isActive: false,
    },
  });

  const hemsSp2 = await prisma.sprint.upsert({
    where:  { id: 'hems-sp2' },
    update: {},
    create: {
      id: 'hems-sp2', projectId: hemsId, milestoneId: 'hems-m2',
      name: 'Sprint 2', goal: 'Dashboard & Alerts Module',
      startDate: d(2026, 5, 11), endDate: d(2026, 5, 22), isActive: false,
    },
  });

  const hemsSp3 = await prisma.sprint.upsert({
    where:  { id: 'hems-sp3' },
    update: {},
    create: {
      id: 'hems-sp3', projectId: hemsId, milestoneId: 'hems-m3',
      name: 'Sprint 3', goal: 'Solar Integration & Analytics',
      startDate: d(2026, 5, 23), endDate: d(2026, 5, 31), isActive: false,
    },
  });

  const hemsSp4 = await prisma.sprint.upsert({
    where:  { id: 'hems-sp4' },
    update: {},
    create: {
      id: 'hems-sp4', projectId: hemsId, milestoneId: 'hems-m3',
      name: 'Sprint 4', goal: 'Reporting & Export',
      startDate: d(2026, 6, 1), endDate: d(2026, 6, 14), isActive: true,
    },
  });

  console.log('✅ Milestones and sprints created');

  // ══════════════════════════════════════════════════════════════════════════
  // SMART FACILITY — Work Items
  // 4 Epics × 5 Stories × (1 Task per Dev + 3 Bugs per QA)
  // 1 dev → 20 tasks (5 stories × 4 epics × 1 task = 20)
  // ══════════════════════════════════════════════════════════════════════════

  const sfEpics = [
    'User Authentication & Access Control',
    'Facility Monitoring Dashboard',
    'Equipment & Maintenance Module',
    'Reporting & Analytics',
  ];

  const sfStories: string[][] = [
    ['User login and registration', 'Role-based access control', 'SSO integration', 'Session management', 'Password reset flow'],
    ['Real-time sensor data view', 'Floor plan interactive map', 'Alert notification centre', 'Historical data charts', 'Mobile responsive layout'],
    ['Equipment health scoring', 'Failure prediction alerts', 'Maintenance work orders', 'Technician assignment', 'Parts inventory tracking'],
    ['Monthly usage report', 'Energy cost breakdown', 'Export to PDF and CSV', 'Scheduled report emails', 'Dashboard KPI widgets'],
  ];

  const sfTaskTitles = [
    'Implement backend API endpoint',
    'Write unit tests for service layer',
    'Build React UI component',
    'Integrate API with frontend',
    'Code review and documentation',
    'QA test case execution',
    'Bug fixes from QA feedback',
  ];

  const sfBugTitles = [
    'Login page crashes on Safari browser',
    'Auth token not refreshed on expiry',
    'Sensor chart shows incorrect date range',
    'Alert emails delivered with duplicate content',
    'Mobile layout broken on iOS 16 devices',
    'Export PDF contains misaligned columns',
    'Search filter resets on page navigation',
    'Dashboard widget does not load on slow network',
    'Date picker validation allows invalid range',
    'Report email scheduler fires twice on restart',
  ];

  let sfTaskCount = 0;
  let sfBugCount  = 0;
  const sfWorkItemIds: string[] = [];

  for (let eIdx = 0; eIdx < sfEpics.length; eIdx++) {
    const epicId  = `sf-epic-${eIdx}`;
    const sprintId = eIdx < 2 ? sfSp1.id : sfSp2.id;

    await prisma.workItem.upsert({
      where:  { id: epicId },
      update: {},
      create: {
        id: epicId, projectId: sfId, sprintId,
        type: WorkItemType.EPIC, status: BoardStatus.QA_DONE,
        title: sfEpics[eIdx], priority: 'HIGH',
        reporterId: sf.pm, storyPoints: 40,
        createdAt: d(2026, 5, 1), updatedAt: d(2026, 5, 14),
      },
    });

    for (let sIdx = 0; sIdx < sfStories[eIdx].length; sIdx++) {
      const storyId  = `sf-story-${eIdx}-${sIdx}`;
      const inSp1    = eIdx < 2;
      const storyDay = inSp1 ? 1 + sIdx : 15 + sIdx;
      const storyStatus: BoardStatus = inSp1 ? BoardStatus.QA_DONE
        : sIdx < 3 ? BoardStatus.IN_REVIEW : BoardStatus.IN_PROGRESS;

      await prisma.workItem.upsert({
        where:  { id: storyId },
        update: {},
        create: {
          id: storyId, projectId: sfId, parentId: epicId,
          sprintId: inSp1 ? sfSp1.id : sfSp2.id,
          type: WorkItemType.USER_STORY, status: storyStatus,
          title: sfStories[eIdx][sIdx],
          priority: pick(priorities, sIdx),
          reporterId: sf.pm, storyPoints: 8,
          completedAt: inSp1 ? d(2026, 5, 12 + sIdx % 3) : undefined,
          createdAt: d(2026, 5, storyDay),
          updatedAt: inSp1 ? d(2026, 5, 12 + sIdx % 3) : d(2026, 5, 20 + sIdx % 5),
        },
      });
      sfWorkItemIds.push(storyId);

      // 1 task per developer (Smart Facility has typically 1 dev)
      for (let dIdx = 0; dIdx < sfDevs.length; dIdx++) {
        const taskId    = `sf-task-${eIdx}-${sIdx}-${dIdx}`;
        const taskStatus: BoardStatus = inSp1 ? BoardStatus.QA_DONE
          : dIdx === 0 ? BoardStatus.IN_PROGRESS : BoardStatus.TODO;

        await prisma.workItem.upsert({
          where:  { id: taskId },
          update: {},
          create: {
            id: taskId, projectId: sfId, parentId: storyId,
            sprintId: inSp1 ? sfSp1.id : sfSp2.id,
            type: WorkItemType.TASK, status: taskStatus,
            title: `${sfTaskTitles[dIdx % sfTaskTitles.length]} — ${sfStories[eIdx][sIdx]}`,
            priority: pick(priorities, dIdx + sIdx),
            assigneeId: sfDevs[dIdx],
            reporterId: sfTL,
            estimatedHours: 6 + (dIdx % 3),
            storyPoints: 3,
            completedAt: inSp1 ? d(2026, 5, 13) : undefined,
            createdAt: d(2026, 5, Math.min(storyDay + 1, 29)),
            updatedAt: inSp1 ? d(2026, 5, 14) : d(2026, 5, 22 + dIdx % 5),
          },
        });
        sfWorkItemIds.push(taskId);
        sfTaskCount++;
      }

      // Also create a QA task assigned to QA member for each story
      const qaTaskId = `sf-qa-task-${eIdx}-${sIdx}`;
      const qaTaskStatus: BoardStatus = inSp1 ? BoardStatus.QA_DONE
        : sIdx < 2 ? BoardStatus.IN_PROGRESS : BoardStatus.TODO;

      await prisma.workItem.upsert({
        where:  { id: qaTaskId },
        update: {},
        create: {
          id: qaTaskId, projectId: sfId, parentId: storyId,
          sprintId: inSp1 ? sfSp1.id : sfSp2.id,
          type: WorkItemType.TASK, status: qaTaskStatus,
          title: `QA test cases execution — ${sfStories[eIdx][sIdx]}`,
          priority: pick(priorities, sIdx),
          assigneeId: pick(sfQAs, sIdx),
          reporterId: sfTL,
          estimatedHours: 4,
          storyPoints: 2,
          completedAt: inSp1 ? d(2026, 5, 14) : undefined,
          createdAt: d(2026, 5, Math.min(storyDay + 2, 29)),
          updatedAt: inSp1 ? d(2026, 5, 14) : d(2026, 5, 24),
        },
      });
      sfWorkItemIds.push(qaTaskId);
      sfTaskCount++;

      // 3 bugs per story (QA reporter, dev assignee)
      for (let bIdx = 0; bIdx < 3; bIdx++) {
        const bugId      = `sf-bug-${eIdx}-${sIdx}-${bIdx}`;
        const bugResolved = inSp1 || bIdx === 0;
        const bugBoardSt: BoardStatus = bugResolved ? BoardStatus.QA_DONE : BoardStatus.IN_PROGRESS;
        const bugSt: BugStatus        = bugResolved ? 'CLOSED' : 'OPEN';

        await prisma.workItem.upsert({
          where:  { id: bugId },
          update: {},
          create: {
            id: bugId, projectId: sfId, parentId: storyId,
            sprintId: inSp1 ? sfSp1.id : sfSp2.id,
            type: WorkItemType.BUG, status: bugBoardSt,
            title: sfBugTitles[(eIdx * 3 + sIdx + bIdx) % sfBugTitles.length],
            priority: pick(priorities, bIdx),
            assigneeId: pick(sfDevs, bIdx),
            reporterId: pick(sfQAs, bIdx),
            severity: pick(bugSeverities, bIdx),
            bugClassification: BugClassification.UI_USABILITY,
            bugFlag: bIdx % 2 === 0 ? BugFlag.INTERNAL : BugFlag.EXTERNAL,
            bugReproducibility: BugReproducibility.ALWAYS,
            bugStatus: bugSt,
            completedAt: bugResolved ? d(2026, 5, 14) : undefined,
            createdAt: d(2026, 5, Math.min(storyDay + 1, 29)),
            updatedAt: d(2026, 5, Math.min(storyDay + 3 + bIdx, 29)),
          },
        });
        sfBugCount++;
      }
    }
  }

  // Today's items for Smart Facility (Sprint 3 — June 1)
  for (let i = 0; i < 3; i++) {
    const todayId = `sf-today-${i}`;
    await prisma.workItem.upsert({
      where:  { id: todayId },
      update: {},
      create: {
        id: todayId, projectId: sfId, sprintId: sfSp3.id,
        type: WorkItemType.TASK, status: BoardStatus.IN_PROGRESS,
        title: `[June 1] ${sfTaskTitles[i]} — Integration Testing`,
        priority: 'HIGH',
        assigneeId: pick(sfDevs, i),
        reporterId: sf.pm,
        estimatedHours: 6,
        dueDate: d(2026, 6, 1),
        createdAt: d(2026, 6, 1), updatedAt: d(2026, 6, 1),
      },
    });
    sfWorkItemIds.push(todayId);
  }

  console.log(`✅ Smart Facility: ${sfTaskCount} tasks, ${sfBugCount} bugs + 3 today items`);

  // ══════════════════════════════════════════════════════════════════════════
  // HEMS ONE REWRITE — Work Items
  // 4 Epics × 5 Stories × (3 Tasks per Dev + 2 Bugs per QA)
  // 3 devs → 20 tasks each (5 stories × 4 epics × 1 task per dev = 20 each)
  // ══════════════════════════════════════════════════════════════════════════

  const hemsEpics = [
    'Smart Metering & Data Collection',
    'Energy Consumption Dashboard',
    'Solar Panel Integration',
    'Analytics & Reporting Engine',
  ];

  const hemsStories: string[][] = [
    ['Meter data polling service', 'Real-time WebSocket data API', 'Data validation and cleansing', 'Historical data archival', 'Meter configuration management'],
    ['Consumption charts by period', 'Bill estimation widget', 'Budget threshold alerts', 'Comparative analysis view', 'Export consumption data'],
    ['Solar panel status monitoring', 'Grid import/export tracking', 'Battery level visualisation', 'Solar yield forecasting', 'Net metering calculations'],
    ['Monthly consumption report', 'Peak usage analysis', 'Carbon footprint tracker', 'ROI calculator for solar', 'PDF and CSV report generation'],
  ];

  const hemsBugTitles = [
    'Meter poll fails after 30 min idle',
    'WebSocket disconnects on mobile network',
    'Chart tooltip shows incorrect kWh value',
    'Bill estimate off by 12% for peak hours',
    'Alert email body has UTF-8 encoding issue',
    'Solar chart axis label overlaps on small screen',
    'Battery percentage shows negative value on full charge',
    'Grid export value not refreshed in real-time',
    'PDF report page 2 renders blank',
    'Date range filter does not persist on back navigation',
  ];

  const hemsTaskTitles = [
    'Implement backend service and repository',
    'Write unit and integration tests',
    'Build React component with Recharts',
    'Wire API to frontend with React Query',
    'Code review and merge request',
    'QA test case execution',
    'Bug fix and regression testing',
  ];

  let hemsTaskCount = 0;
  let hemsBugCount  = 0;
  const hemsWorkItemIds: string[] = [];

  for (let eIdx = 0; eIdx < hemsEpics.length; eIdx++) {
    const epicId   = `hems-epic-${eIdx}`;
    const sprintId = eIdx < 2 ? hemsSp1.id : hemsSp2.id;
    const epicDone = eIdx < 2;

    await prisma.workItem.upsert({
      where:  { id: epicId },
      update: {},
      create: {
        id: epicId, projectId: hemsId, sprintId,
        type: WorkItemType.EPIC,
        status: epicDone ? BoardStatus.QA_DONE : BoardStatus.IN_PROGRESS,
        title: hemsEpics[eIdx], priority: 'HIGH',
        reporterId: hems.pm, storyPoints: 40,
        createdAt: d(2026, 5, epicDone ? 1 : 15),
        updatedAt: d(2026, 5, epicDone ? 14 : 28),
      },
    });

    for (let sIdx = 0; sIdx < hemsStories[eIdx].length; sIdx++) {
      const storyId  = `hems-story-${eIdx}-${sIdx}`;
      const inEarly  = eIdx < 2; // epics 0-1 in sprint 1-2 (completed)
      const storyDay = inEarly ? 1 + sIdx * 2 : 15 + sIdx;
      const storyStatus: BoardStatus = inEarly ? BoardStatus.QA_DONE
        : sIdx < 2 ? BoardStatus.IN_REVIEW : BoardStatus.IN_PROGRESS;
      const storyReporter = pick([hems.pm, ...hems.tls], sIdx);

      await prisma.workItem.upsert({
        where:  { id: storyId },
        update: {},
        create: {
          id: storyId, projectId: hemsId, parentId: epicId,
          sprintId: inEarly ? (eIdx < 1 ? hemsSp1.id : hemsSp2.id) : hemsSp3.id,
          type: WorkItemType.USER_STORY, status: storyStatus,
          title: hemsStories[eIdx][sIdx],
          priority: pick(priorities, sIdx),
          reporterId: storyReporter, storyPoints: 8,
          completedAt: inEarly ? d(2026, 5, 13 + sIdx % 3) : undefined,
          createdAt: d(2026, 5, storyDay),
          updatedAt: inEarly ? d(2026, 5, 14 + sIdx % 5) : d(2026, 5, 22 + sIdx % 5),
        },
      });
      hemsWorkItemIds.push(storyId);

      // 1 task per developer (3 devs = 3 tasks per story × 20 stories = 20 each)
      for (let dIdx = 0; dIdx < hemsDevs.length; dIdx++) {
        const taskId     = `hems-task-${eIdx}-${sIdx}-${dIdx}`;
        const taskStatus: BoardStatus = inEarly ? BoardStatus.QA_DONE
          : dIdx === 0 ? BoardStatus.IN_PROGRESS : BoardStatus.TODO;
        const taskTL = pick(hems.tls.length ? hems.tls : [hems.pm], dIdx);

        await prisma.workItem.upsert({
          where:  { id: taskId },
          update: {},
          create: {
            id: taskId, projectId: hemsId, parentId: storyId,
            sprintId: inEarly ? (eIdx < 1 ? hemsSp1.id : hemsSp2.id) : hemsSp3.id,
            type: WorkItemType.TASK, status: taskStatus,
            title: `${hemsTaskTitles[dIdx % hemsTaskTitles.length]} — ${hemsStories[eIdx][sIdx]}`,
            priority: pick(priorities, dIdx + sIdx),
            assigneeId: hemsDevs[dIdx],
            reporterId: taskTL,
            estimatedHours: 5 + (dIdx % 4),
            storyPoints: 3,
            completedAt: inEarly ? d(2026, 5, 14) : undefined,
            createdAt: d(2026, 5, Math.min(storyDay + dIdx % 2, 29)),
            updatedAt: inEarly ? d(2026, 5, 14) : d(2026, 5, Math.min(22 + dIdx % 5, 29)),
          },
        });
        hemsWorkItemIds.push(taskId);
        hemsTaskCount++;

        // Sub-task for dev (first dev position only)
        if (dIdx === 0) {
          const subId = `hems-sub-${eIdx}-${sIdx}`;
          await prisma.workItem.upsert({
            where:  { id: subId },
            update: {},
            create: {
              id: subId, projectId: hemsId, parentId: taskId,
              sprintId: inEarly ? (eIdx < 1 ? hemsSp1.id : hemsSp2.id) : hemsSp3.id,
              type: WorkItemType.SUB_TASK, status: taskStatus,
              title: `Write unit tests — ${hemsStories[eIdx][sIdx]}`,
              priority: 'MEDIUM',
              assigneeId: hemsDevs[0],
              reporterId: taskTL,
              estimatedHours: 2,
              createdAt: d(2026, 5, Math.min(storyDay + 1, 29)),
              updatedAt: inEarly ? d(2026, 5, 14) : d(2026, 5, 24),
            },
          });
          hemsWorkItemIds.push(subId);
        }
      }

      // QA task per story (assigned to QA members)
      for (let qIdx = 0; qIdx < Math.min(hemsQAs.length, 2); qIdx++) {
        const qaTaskId = `hems-qa-task-${eIdx}-${sIdx}-${qIdx}`;
        const qaStatus: BoardStatus = inEarly ? BoardStatus.QA_DONE
          : sIdx < 2 ? BoardStatus.IN_PROGRESS : BoardStatus.TODO;

        await prisma.workItem.upsert({
          where:  { id: qaTaskId },
          update: {},
          create: {
            id: qaTaskId, projectId: hemsId, parentId: storyId,
            sprintId: inEarly ? (eIdx < 1 ? hemsSp1.id : hemsSp2.id) : hemsSp3.id,
            type: WorkItemType.TASK, status: qaStatus,
            title: `QA test execution — ${hemsStories[eIdx][sIdx]}`,
            priority: pick(priorities, qIdx),
            assigneeId: hemsQAs[qIdx],
            reporterId: hemsTL,
            estimatedHours: 3,
            storyPoints: 2,
            completedAt: inEarly ? d(2026, 5, 14) : undefined,
            createdAt: d(2026, 5, Math.min(storyDay + 2, 29)),
            updatedAt: inEarly ? d(2026, 5, 14) : d(2026, 5, 25),
          },
        });
        hemsWorkItemIds.push(qaTaskId);
        hemsTaskCount++;
      }

      // 2 bugs per story (rotating QA reporters, dev assignees)
      for (let bIdx = 0; bIdx < 2; bIdx++) {
        const bugId      = `hems-bug-${eIdx}-${sIdx}-${bIdx}`;
        const bugResolved = inEarly || (sIdx < 2 && bIdx === 0);
        const bugBoardSt: BoardStatus = bugResolved ? BoardStatus.QA_DONE : BoardStatus.IN_PROGRESS;
        const bugSt: BugStatus        = bugResolved ? 'CLOSED' : 'OPEN';

        await prisma.workItem.upsert({
          where:  { id: bugId },
          update: {},
          create: {
            id: bugId, projectId: hemsId, parentId: storyId,
            sprintId: inEarly ? (eIdx < 1 ? hemsSp1.id : hemsSp2.id) : hemsSp3.id,
            type: WorkItemType.BUG, status: bugBoardSt,
            title: hemsBugTitles[(eIdx * 2 + sIdx + bIdx) % hemsBugTitles.length],
            priority: pick(priorities, bIdx),
            assigneeId: pick(hemsDevs, bIdx),
            reporterId: pick(hemsQAs, bIdx),
            severity: pick(bugSeverities, bIdx),
            bugClassification: BugClassification.PERFORMANCE,
            bugFlag: bIdx % 2 === 0 ? BugFlag.INTERNAL : BugFlag.EXTERNAL,
            bugReproducibility: BugReproducibility.SOMETIMES,
            bugStatus: bugSt,
            completedAt: bugResolved ? d(2026, 5, 14) : undefined,
            createdAt: d(2026, 5, Math.min(storyDay + 1, 29)),
            updatedAt: d(2026, 5, Math.min(storyDay + 4 + bIdx, 29)),
          },
        });
        hemsBugCount++;
      }
    }
  }

  // Today's items for HEMS One Rewrite (Sprint 4 — June 1)
  for (let i = 0; i < 5; i++) {
    const todayId = `hems-today-${i}`;
    await prisma.workItem.upsert({
      where:  { id: todayId },
      update: {},
      create: {
        id: todayId, projectId: hemsId, sprintId: hemsSp4.id,
        type: WorkItemType.TASK, status: BoardStatus.IN_PROGRESS,
        title: `[June 1] ${hemsTaskTitles[i % hemsTaskTitles.length]} — Solar Analytics`,
        priority: 'HIGH',
        assigneeId: pick(hemsDevs, i),
        reporterId: hemsTL,
        estimatedHours: 6,
        dueDate: d(2026, 6, 1),
        createdAt: d(2026, 6, 1), updatedAt: d(2026, 6, 1),
      },
    });
    hemsWorkItemIds.push(todayId);
  }

  console.log(`✅ HEMS One Rewrite: ${hemsTaskCount} tasks, ${hemsBugCount} bugs + 5 today items`);

  // ══════════════════════════════════════════════════════════════════════════
  // TIMESHEET ENTRIES — May 2026 (21 working days × all team members)
  // ══════════════════════════════════════════════════════════════════════════

  let tsCount = 0;

  async function seedTimesheets(
    projectKey: string,
    teamUserIds: string[],
    workItemIds: string[],
    approverId: string,
  ) {
    for (let uOrd = 0; uOrd < teamUserIds.length; uOrd++) {
      const userId = teamUserIds[uOrd];
      for (let dayIdx = 0; dayIdx < WORKING_DAYS.length; dayIdx++) {
        const tsId   = `${projectKey}-ts-u${uOrd}-d${dayIdx}`;
        const workDay = WORKING_DAYS[dayIdx];
        const wid    = workItemIds[dayIdx % workItemIds.length];
        const hours  = 6 + (dayIdx % 3); // 6, 7, or 8 hours
        const approved = dayIdx < 15;     // first 15 days approved, rest submitted

        try {
          await prisma.timesheetEntry.upsert({
            where:  { id: tsId },
            update: {},
            create: {
              id: tsId,
              workItemId: wid,
              userId,
              date: workDay,
              hours,
              description: `Daily work log — ${workDay.toISOString().slice(0, 10)}`,
              approvalStatus: approved
                ? TimesheetApprovalStatus.APPROVED
                : TimesheetApprovalStatus.SUBMITTED,
              approvedById: approved ? approverId : null,
              approvedAt:   approved ? d(2026, 5, 16) : null,
            },
          });
          tsCount++;
        } catch {
          // skip duplicate
        }
      }
    }
  }

  await seedTimesheets('sf',   sf.all,   sfWorkItemIds,   sf.pm);
  await seedTimesheets('hems', hems.all, hemsWorkItemIds, hems.pm);

  console.log(`✅ ${tsCount} timesheet entries created`);

  // ══════════════════════════════════════════════════════════════════════════
  // LEAVE REQUESTS — May 2026
  // ══════════════════════════════════════════════════════════════════════════

  const leaveRequests = [
    // Smart Facility
    ...(sfDevs[0] ? [{ id: 'lr-sf-dev-1', userId: sfDevs[0],    start: d(2026,5,5),  end: d(2026,5,6),  days: 2, reason: 'Fever and flu',        status: LeaveStatus.APPROVED,  approvedById: sf.pm }] : []),
    ...(sfQAs[0]  ? [{ id: 'lr-sf-qa-1',  userId: sfQAs[0],     start: d(2026,5,19), end: d(2026,5,19), days: 1, reason: 'Personal work',        status: LeaveStatus.APPROVED,  approvedById: sf.pm }] : []),
    { id: 'lr-sf-pm-1',  userId: sf.pm,       start: d(2026,5,26), end: d(2026,5,27), days: 2, reason: 'Annual leave planned',  status: LeaveStatus.PENDING,   approvedById: null },
    // HEMS One Rewrite
    ...(hemsDevs[0] ? [{ id: 'lr-hems-dev1-1', userId: hemsDevs[0], start: d(2026,5,7),  end: d(2026,5,8),  days: 2, reason: 'Not feeling well',       status: LeaveStatus.APPROVED, approvedById: hems.pm }] : []),
    ...(hemsDevs[1] ? [{ id: 'lr-hems-dev2-1', userId: hemsDevs[1], start: d(2026,5,14), end: d(2026,5,14), days: 1, reason: 'Personal errand',         status: LeaveStatus.APPROVED, approvedById: hems.pm }] : []),
    ...(hemsQAs[0]  ? [{ id: 'lr-hems-qa1-1',  userId: hemsQAs[0],  start: d(2026,5,20), end: d(2026,5,22), days: 3, reason: 'Planned vacation',        status: LeaveStatus.APPROVED, approvedById: hems.pm }] : []),
    ...(hems.tls[0] ? [{ id: 'lr-hems-tl1-1',  userId: hems.tls[0], start: d(2026,5,27), end: d(2026,5,28), days: 2, reason: 'Back pain',               status: LeaveStatus.PENDING,  approvedById: null }] : []),
    ...(hemsQAs[1]  ? [{ id: 'lr-hems-qa2-1',  userId: hemsQAs[1],  start: d(2026,5,30), end: d(2026,5,30), days: 1, reason: 'Family event',             status: LeaveStatus.REJECTED, approvedById: hems.pm }] : []),
  ];

  for (const lr of leaveRequests) {
    await prisma.leaveRequest.upsert({
      where: { id: lr.id },
      update: {},
      create: {
        id: lr.id,
        userId: lr.userId,
        startDate: lr.start,
        endDate: lr.end,
        totalDays: lr.days,
        reason: lr.reason,
        status: lr.status,
        approvedById: lr.approvedById,
        approvedAt: lr.approvedById ? d(2026, 5, 16) : null,
      },
    });
  }

  console.log(`✅ ${leaveRequests.length} leave requests created`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n📊 Seed Summary');
  console.log('─────────────────────────────────────────────────');
  console.log('Smart Facility:');
  console.log(`  Project ID  : ${sfId}`);
  console.log(`  Team        : PM(1) Dev(${sfDevs.length}) QA(${sfQAs.length})`);
  console.log(`  Milestones  : 2  |  Sprints: 3 (Sprint 3 active)`);
  console.log(`  Work Items  : ${sfTaskCount} tasks + ${sfBugCount} bugs + 3 today`);
  console.log('HEMS One Rewrite:');
  console.log(`  Project ID  : ${hemsId}`);
  console.log(`  Team        : PM(1) TL(${hems.tls.length}) Dev(${hemsDevs.length}) QA(${hemsQAs.length})`);
  console.log(`  Milestones  : 3  |  Sprints: 4 (Sprint 4 active)`);
  console.log(`  Work Items  : ${hemsTaskCount} tasks + ${hemsBugCount} bugs + 5 today`);
  console.log('─────────────────────────────────────────────────');
  console.log(`Timesheet entries : ${tsCount} (May 2026, 21 working days)`);
  console.log(`Leave requests    : ${leaveRequests.length}`);
  console.log('─────────────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
