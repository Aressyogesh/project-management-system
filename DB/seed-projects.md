# PMS — Project Seed Data (Smart Facility & HEMS One Rewrite)

Run this script in the **Supabase SQL Editor** (or any PostgreSQL client).

- Safe to re-run — all inserts use `ON CONFLICT (id) DO NOTHING`
- Dynamically looks up project IDs and team members from the live database
- Covers May 2026 (21 working days) + June 1 today items
- Requires: `script.md` schema already applied and both projects created in the app

```sql
DO $$
DECLARE
  -- Project IDs
  sf_id    TEXT;
  hems_id  TEXT;

  -- Smart Facility team
  sf_pm    TEXT;
  sf_tls   TEXT[];
  sf_devs  TEXT[];
  sf_qas   TEXT[];
  sf_all   TEXT[];
  sf_tl1   TEXT;

  -- HEMS team
  hems_pm       TEXT;
  hems_tls      TEXT[];
  hems_devs     TEXT[];
  hems_qas      TEXT[];
  hems_all      TEXT[];
  hems_tl1      TEXT;
  hems_reporters TEXT[];

  -- Loop counters
  e_idx  INT;  s_idx  INT;  d_idx  INT;
  b_idx  INT;  q_idx  INT;  day_i  INT;
  u_ord  INT;  i      INT;

  -- Computed IDs
  epic_id    TEXT;  story_id   TEXT;  task_id    TEXT;
  sub_id     TEXT;  qa_task_id TEXT;  bug_id     TEXT;
  today_id   TEXT;  ts_id      TEXT;

  -- State
  sprint_ref   TEXT;  story_sprint TEXT;
  in_sp1       BOOLEAN;
  in_early     BOOLEAN;
  story_day    INT;
  task_stat    TEXT;
  story_stat   TEXT;
  bug_resolved BOOLEAN;

  -- Timesheet helpers
  working_days DATE[];
  work_day     DATE;
  ts_hours     INT;
  approved     BOOLEAN;
  wid          TEXT;

  -- Collected work item IDs for timesheet cycling
  sf_work_ids   TEXT[] := ARRAY[]::TEXT[];
  hems_work_ids TEXT[] := ARRAY[]::TEXT[];

  -- Lookup arrays
  priorities TEXT[] := ARRAY['LOW','MEDIUM','HIGH','CRITICAL'];
  severities TEXT[] := ARRAY['MINOR','MAJOR','CRITICAL','SHOW_STOPPER'];

  -- Smart Facility content (flat: 4 epics × 5 stories, 1-indexed as [e*5+s+1])
  sf_epics TEXT[] := ARRAY[
    'User Authentication & Access Control',
    'Facility Monitoring Dashboard',
    'Equipment & Maintenance Module',
    'Reporting & Analytics'
  ];
  sf_stories TEXT[] := ARRAY[
    'User login and registration','Role-based access control','SSO integration','Session management','Password reset flow',
    'Real-time sensor data view','Floor plan interactive map','Alert notification centre','Historical data charts','Mobile responsive layout',
    'Equipment health scoring','Failure prediction alerts','Maintenance work orders','Technician assignment','Parts inventory tracking',
    'Monthly usage report','Energy cost breakdown','Export to PDF and CSV','Scheduled report emails','Dashboard KPI widgets'
  ];
  sf_task_titles TEXT[] := ARRAY[
    'Implement backend API endpoint',
    'Write unit tests for service layer',
    'Build React UI component',
    'Integrate API with frontend',
    'Code review and documentation',
    'QA test case execution',
    'Bug fixes from QA feedback'
  ];
  sf_bug_titles TEXT[] := ARRAY[
    'Login page crashes on Safari browser',
    'Auth token not refreshed on expiry',
    'Sensor chart shows incorrect date range',
    'Alert emails delivered with duplicate content',
    'Mobile layout broken on iOS 16 devices',
    'Export PDF contains misaligned columns',
    'Search filter resets on page navigation',
    'Dashboard widget does not load on slow network',
    'Date picker validation allows invalid range',
    'Report email scheduler fires twice on restart'
  ];

  -- HEMS content (flat: 4 epics × 5 stories)
  hems_epics TEXT[] := ARRAY[
    'Smart Metering & Data Collection',
    'Energy Consumption Dashboard',
    'Solar Panel Integration',
    'Analytics & Reporting Engine'
  ];
  hems_stories TEXT[] := ARRAY[
    'Meter data polling service','Real-time WebSocket data API','Data validation and cleansing','Historical data archival','Meter configuration management',
    'Consumption charts by period','Bill estimation widget','Budget threshold alerts','Comparative analysis view','Export consumption data',
    'Solar panel status monitoring','Grid import/export tracking','Battery level visualisation','Solar yield forecasting','Net metering calculations',
    'Monthly consumption report','Peak usage analysis','Carbon footprint tracker','ROI calculator for solar','PDF and CSV report generation'
  ];
  hems_task_titles TEXT[] := ARRAY[
    'Implement backend service and repository',
    'Write unit and integration tests',
    'Build React component with Recharts',
    'Wire API to frontend with React Query',
    'Code review and merge request',
    'QA test case execution',
    'Bug fix and regression testing'
  ];
  hems_bug_titles TEXT[] := ARRAY[
    'Meter poll fails after 30 min idle',
    'WebSocket disconnects on mobile network',
    'Chart tooltip shows incorrect kWh value',
    'Bill estimate off by 12% for peak hours',
    'Alert email body has UTF-8 encoding issue',
    'Solar chart axis label overlaps on small screen',
    'Battery percentage shows negative value on full charge',
    'Grid export value not refreshed in real-time',
    'PDF report page 2 renders blank',
    'Date range filter does not persist on back navigation'
  ];

BEGIN

  -- ── Resolve project IDs ──────────────────────────────────────────────────
  SELECT id INTO sf_id   FROM projects WHERE name = 'Smart Facility'   LIMIT 1;
  SELECT id INTO hems_id FROM projects WHERE name = 'HEMS One Rewrite' LIMIT 1;

  IF sf_id   IS NULL THEN RAISE EXCEPTION '"Smart Facility" not found — create it in the app first';   END IF;
  IF hems_id IS NULL THEN RAISE EXCEPTION '"HEMS One Rewrite" not found — create it in the app first'; END IF;

  RAISE NOTICE 'Smart Facility   : %', sf_id;
  RAISE NOTICE 'HEMS One Rewrite : %', hems_id;

  -- ── Smart Facility team ──────────────────────────────────────────────────
  SELECT "userId" INTO sf_pm FROM project_members
    WHERE "projectId" = sf_id AND "projectRole" = 'PROJECT_MANAGER' LIMIT 1;
  SELECT ARRAY_AGG("userId") INTO sf_tls  FROM project_members WHERE "projectId" = sf_id AND "projectRole" = 'TEAM_LEAD';
  SELECT ARRAY_AGG("userId") INTO sf_devs FROM project_members WHERE "projectId" = sf_id AND "projectRole" = 'DEVELOPER';
  SELECT ARRAY_AGG("userId") INTO sf_qas  FROM project_members WHERE "projectId" = sf_id AND "projectRole" = 'QA';
  SELECT ARRAY_AGG("userId") INTO sf_all  FROM project_members WHERE "projectId" = sf_id;

  IF sf_pm IS NULL THEN RAISE EXCEPTION 'No PROJECT_MANAGER in Smart Facility'; END IF;
  IF sf_tls  IS NULL THEN sf_tls  := ARRAY[sf_pm]; END IF;
  IF sf_devs IS NULL THEN sf_devs := sf_tls; END IF;
  IF sf_qas  IS NULL THEN sf_qas  := ARRAY[sf_pm]; END IF;
  sf_tl1 := sf_tls[1];

  -- ── HEMS team ────────────────────────────────────────────────────────────
  SELECT "userId" INTO hems_pm FROM project_members
    WHERE "projectId" = hems_id AND "projectRole" = 'PROJECT_MANAGER' LIMIT 1;
  SELECT ARRAY_AGG("userId") INTO hems_tls  FROM project_members WHERE "projectId" = hems_id AND "projectRole" = 'TEAM_LEAD';
  SELECT ARRAY_AGG("userId") INTO hems_devs FROM project_members WHERE "projectId" = hems_id AND "projectRole" = 'DEVELOPER';
  SELECT ARRAY_AGG("userId") INTO hems_qas  FROM project_members WHERE "projectId" = hems_id AND "projectRole" = 'QA';
  SELECT ARRAY_AGG("userId") INTO hems_all  FROM project_members WHERE "projectId" = hems_id;

  IF hems_pm IS NULL THEN RAISE EXCEPTION 'No PROJECT_MANAGER in HEMS One Rewrite'; END IF;
  IF hems_tls  IS NULL THEN hems_tls  := ARRAY[hems_pm]; END IF;
  IF hems_devs IS NULL THEN hems_devs := hems_tls; END IF;
  IF hems_qas  IS NULL THEN hems_qas  := ARRAY[hems_pm]; END IF;
  hems_tl1       := hems_tls[1];
  hems_reporters := ARRAY[hems_pm] || hems_tls;

  RAISE NOTICE 'SF  team — PM:% TLs:% Devs:% QAs:%', sf_pm, array_length(sf_tls,1), array_length(sf_devs,1), array_length(sf_qas,1);
  RAISE NOTICE 'HEMS team — PM:% TLs:% Devs:% QAs:%', hems_pm, array_length(hems_tls,1), array_length(hems_devs,1), array_length(hems_qas,1);

  -- ── May 2026 working days (Mon–Fri) ──────────────────────────────────────
  working_days := ARRAY[]::DATE[];
  FOR i IN 1..31 LOOP
    work_day := DATE '2026-05-01' + (i - 1);
    IF EXTRACT(DOW FROM work_day) NOT IN (0, 6) THEN
      working_days := working_days || work_day;
    END IF;
  END LOOP;
  RAISE NOTICE 'May 2026 working days: %', array_length(working_days, 1);

  -- ════════════════════════════════════════════════════════════════════════
  -- SMART FACILITY — Milestones & Sprints
  -- ════════════════════════════════════════════════════════════════════════

  INSERT INTO milestones (id,"projectId",name,description,"startDate","dueDate","responsibleUserId",status,"createdAt","updatedAt")
  VALUES ('sf-m1',sf_id,'Phase 1 — Requirements & Design','Requirements gathering, wireframes, and API design.',
          '2026-04-01','2026-04-30',sf_pm,'COMPLETED',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO milestones (id,"projectId",name,description,"startDate","dueDate","responsibleUserId",status,"createdAt","updatedAt")
  VALUES ('sf-m2',sf_id,'Phase 2 — Core Development','Backend APIs, frontend components, and integration.',
          '2026-05-01','2026-06-30',sf_tl1,'IN_PROGRESS',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sprints (id,"projectId","milestoneId",name,goal,"startDate","endDate","isActive","createdAt","updatedAt")
  VALUES ('sf-sp1',sf_id,'sf-m2','Sprint 1','Core API & Auth module','2026-05-01','2026-05-14',false,now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sprints (id,"projectId","milestoneId",name,goal,"startDate","endDate","isActive","createdAt","updatedAt")
  VALUES ('sf-sp2',sf_id,'sf-m2','Sprint 2','Dashboard & Frontend','2026-05-15','2026-05-31',false,now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sprints (id,"projectId","milestoneId",name,goal,"startDate","endDate","isActive","createdAt","updatedAt")
  VALUES ('sf-sp3',sf_id,'sf-m2','Sprint 3','Integration & QA','2026-06-01','2026-06-14',true,now(),now())
  ON CONFLICT (id) DO NOTHING;

  -- ════════════════════════════════════════════════════════════════════════
  -- HEMS ONE REWRITE — Milestones & Sprints
  -- ════════════════════════════════════════════════════════════════════════

  INSERT INTO milestones (id,"projectId",name,description,"startDate","dueDate","responsibleUserId",status,"createdAt","updatedAt")
  VALUES ('hems-m1',hems_id,'Phase 1 — Architecture & Setup','System architecture, DB schema, and CI/CD pipeline.',
          '2026-04-01','2026-04-30',hems_pm,'COMPLETED',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO milestones (id,"projectId",name,description,"startDate","dueDate","responsibleUserId",status,"createdAt","updatedAt")
  VALUES ('hems-m2',hems_id,'Phase 2 — Metering & Dashboard','Smart metering data pipeline and consumption dashboard.',
          '2026-05-01','2026-05-20',hems_tl1,'COMPLETED',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO milestones (id,"projectId",name,description,"startDate","dueDate","responsibleUserId",status,"createdAt","updatedAt")
  VALUES ('hems-m3',hems_id,'Phase 3 — Solar & Analytics','Solar integration, analytics, and reporting module.',
          '2026-05-21','2026-07-31',hems_tl1,'IN_PROGRESS',now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sprints (id,"projectId","milestoneId",name,goal,"startDate","endDate","isActive","createdAt","updatedAt")
  VALUES ('hems-sp1',hems_id,'hems-m2','Sprint 1','Metering API & Data Pipeline','2026-05-01','2026-05-10',false,now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sprints (id,"projectId","milestoneId",name,goal,"startDate","endDate","isActive","createdAt","updatedAt")
  VALUES ('hems-sp2',hems_id,'hems-m2','Sprint 2','Dashboard & Alerts Module','2026-05-11','2026-05-22',false,now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sprints (id,"projectId","milestoneId",name,goal,"startDate","endDate","isActive","createdAt","updatedAt")
  VALUES ('hems-sp3',hems_id,'hems-m3','Sprint 3','Solar Integration & Analytics','2026-05-23','2026-05-31',false,now(),now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO sprints (id,"projectId","milestoneId",name,goal,"startDate","endDate","isActive","createdAt","updatedAt")
  VALUES ('hems-sp4',hems_id,'hems-m3','Sprint 4','Reporting & Export','2026-06-01','2026-06-14',true,now(),now())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Milestones and sprints done';

  -- ════════════════════════════════════════════════════════════════════════
  -- SMART FACILITY — Work Items (4 epics × 5 stories)
  -- ════════════════════════════════════════════════════════════════════════

  FOR e_idx IN 0..3 LOOP
    epic_id    := 'sf-epic-' || e_idx;
    in_sp1     := (e_idx < 2);
    sprint_ref := CASE WHEN in_sp1 THEN 'sf-sp1' ELSE 'sf-sp2' END;

    INSERT INTO work_items (id,"projectId","sprintId",type,status,title,priority,"reporterId","storyPoints","createdAt","updatedAt")
    VALUES (
      epic_id, sf_id, sprint_ref,
      'EPIC'::"WorkItemType", 'QA_DONE'::"BoardStatus",
      sf_epics[e_idx + 1], 'HIGH'::"TaskPriority",
      sf_pm, 40,
      '2026-05-01 00:00:00 UTC'::TIMESTAMPTZ,
      '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ
    ) ON CONFLICT (id) DO NOTHING;

    FOR s_idx IN 0..4 LOOP
      story_id     := 'sf-story-' || e_idx || '-' || s_idx;
      story_day    := CASE WHEN in_sp1 THEN 1 + s_idx ELSE 15 + s_idx END;
      story_sprint := CASE WHEN in_sp1 THEN 'sf-sp1' ELSE 'sf-sp2' END;
      story_stat   := CASE WHEN in_sp1 THEN 'QA_DONE' WHEN s_idx < 3 THEN 'IN_REVIEW' ELSE 'IN_PROGRESS' END;

      INSERT INTO work_items (id,"projectId","parentId","sprintId",type,status,title,priority,"reporterId","storyPoints","completedAt","createdAt","updatedAt")
      VALUES (
        story_id, sf_id, epic_id, story_sprint,
        'USER_STORY'::"WorkItemType", story_stat::"BoardStatus",
        sf_stories[e_idx * 5 + s_idx + 1],
        priorities[(s_idx % 4) + 1]::"TaskPriority",
        sf_pm, 8,
        CASE WHEN in_sp1 THEN (DATE '2026-05-12' + (s_idx % 3))::TIMESTAMPTZ ELSE NULL END,
        (DATE '2026-05-01' + (story_day - 1))::TIMESTAMPTZ,
        CASE WHEN in_sp1 THEN (DATE '2026-05-12' + (s_idx % 3))::TIMESTAMPTZ
             ELSE (DATE '2026-05-20' + (s_idx % 5))::TIMESTAMPTZ END
      ) ON CONFLICT (id) DO NOTHING;

      sf_work_ids := sf_work_ids || story_id;

      -- Dev tasks (1 per developer)
      FOR d_idx IN 0..(array_length(sf_devs, 1) - 1) LOOP
        task_id   := 'sf-task-' || e_idx || '-' || s_idx || '-' || d_idx;
        task_stat := CASE WHEN in_sp1 THEN 'QA_DONE' WHEN d_idx = 0 THEN 'IN_PROGRESS' ELSE 'TODO' END;

        INSERT INTO work_items (id,"projectId","parentId","sprintId",type,status,title,priority,"assigneeId","reporterId","estimatedHours","storyPoints","completedAt","createdAt","updatedAt")
        VALUES (
          task_id, sf_id, story_id, story_sprint,
          'TASK'::"WorkItemType", task_stat::"BoardStatus",
          sf_task_titles[(d_idx % 7) + 1] || ' — ' || sf_stories[e_idx * 5 + s_idx + 1],
          priorities[((d_idx + s_idx) % 4) + 1]::"TaskPriority",
          sf_devs[(d_idx % array_length(sf_devs, 1)) + 1],
          sf_tl1,
          6 + (d_idx % 3), 3,
          CASE WHEN in_sp1 THEN '2026-05-13 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
          (DATE '2026-05-01' + LEAST(story_day, 29) - 1)::TIMESTAMPTZ,
          CASE WHEN in_sp1 THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ
               ELSE (DATE '2026-05-22' + (d_idx % 5))::TIMESTAMPTZ END
        ) ON CONFLICT (id) DO NOTHING;

        sf_work_ids := sf_work_ids || task_id;
      END LOOP;

      -- QA task per story
      qa_task_id := 'sf-qa-task-' || e_idx || '-' || s_idx;
      task_stat  := CASE WHEN in_sp1 THEN 'QA_DONE' WHEN s_idx < 2 THEN 'IN_PROGRESS' ELSE 'TODO' END;

      INSERT INTO work_items (id,"projectId","parentId","sprintId",type,status,title,priority,"assigneeId","reporterId","estimatedHours","storyPoints","completedAt","createdAt","updatedAt")
      VALUES (
        qa_task_id, sf_id, story_id, story_sprint,
        'TASK'::"WorkItemType", task_stat::"BoardStatus",
        'QA test cases execution — ' || sf_stories[e_idx * 5 + s_idx + 1],
        priorities[(s_idx % 4) + 1]::"TaskPriority",
        sf_qas[(s_idx % array_length(sf_qas, 1)) + 1],
        sf_tl1, 4, 2,
        CASE WHEN in_sp1 THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
        (DATE '2026-05-01' + LEAST(story_day + 1, 29) - 1)::TIMESTAMPTZ,
        CASE WHEN in_sp1 THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ
             ELSE '2026-05-24 00:00:00 UTC'::TIMESTAMPTZ END
      ) ON CONFLICT (id) DO NOTHING;

      sf_work_ids := sf_work_ids || qa_task_id;

      -- 3 bugs per story
      FOR b_idx IN 0..2 LOOP
        bug_id       := 'sf-bug-' || e_idx || '-' || s_idx || '-' || b_idx;
        bug_resolved := in_sp1 OR (b_idx = 0);

        INSERT INTO work_items (
          id,"projectId","parentId","sprintId",type,status,title,priority,
          "assigneeId","reporterId",severity,"bugClassification","bugFlag","bugReproducibility","bugStatus",
          "completedAt","createdAt","updatedAt"
        ) VALUES (
          bug_id, sf_id, story_id, story_sprint,
          'BUG'::"WorkItemType",
          CASE WHEN bug_resolved THEN 'QA_DONE' ELSE 'IN_PROGRESS' END::"BoardStatus",
          sf_bug_titles[((e_idx * 3 + s_idx + b_idx) % 10) + 1],
          priorities[(b_idx % 4) + 1]::"TaskPriority",
          sf_devs[(b_idx % array_length(sf_devs, 1)) + 1],
          sf_qas[(b_idx % array_length(sf_qas, 1)) + 1],
          severities[(b_idx % 4) + 1]::"BugSeverity",
          'UI_USABILITY'::"BugClassification",
          CASE WHEN b_idx % 2 = 0 THEN 'INTERNAL' ELSE 'EXTERNAL' END::"BugFlag",
          'ALWAYS'::"BugReproducibility",
          CASE WHEN bug_resolved THEN 'CLOSED' ELSE 'OPEN' END::"BugStatus",
          CASE WHEN bug_resolved THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
          (DATE '2026-05-01' + LEAST(story_day, 29) - 1)::TIMESTAMPTZ,
          (DATE '2026-05-01' + LEAST(story_day + 3 + b_idx, 29) - 1)::TIMESTAMPTZ
        ) ON CONFLICT (id) DO NOTHING;

      END LOOP;
    END LOOP;
  END LOOP;

  -- SF today items (Sprint 3 — June 1)
  FOR i IN 0..2 LOOP
    today_id := 'sf-today-' || i;
    INSERT INTO work_items (id,"projectId","sprintId",type,status,title,priority,"assigneeId","reporterId","estimatedHours","dueDate","createdAt","updatedAt")
    VALUES (
      today_id, sf_id, 'sf-sp3',
      'TASK'::"WorkItemType", 'IN_PROGRESS'::"BoardStatus",
      '[June 1] ' || sf_task_titles[(i % 7) + 1] || ' — Integration Testing',
      'HIGH'::"TaskPriority",
      sf_devs[(i % array_length(sf_devs, 1)) + 1],
      sf_pm, 6, DATE '2026-06-01',
      '2026-06-01 00:00:00 UTC'::TIMESTAMPTZ,
      '2026-06-01 00:00:00 UTC'::TIMESTAMPTZ
    ) ON CONFLICT (id) DO NOTHING;
    sf_work_ids := sf_work_ids || today_id;
  END LOOP;

  RAISE NOTICE 'SF work items done — IDs collected: %', array_length(sf_work_ids, 1);

  -- ════════════════════════════════════════════════════════════════════════
  -- HEMS ONE REWRITE — Work Items (4 epics × 5 stories)
  -- ════════════════════════════════════════════════════════════════════════

  FOR e_idx IN 0..3 LOOP
    epic_id  := 'hems-epic-' || e_idx;
    in_early := (e_idx < 2);
    sprint_ref := CASE WHEN e_idx < 2 THEN 'hems-sp1' ELSE 'hems-sp2' END;

    INSERT INTO work_items (id,"projectId","sprintId",type,status,title,priority,"reporterId","storyPoints","createdAt","updatedAt")
    VALUES (
      epic_id, hems_id, sprint_ref,
      'EPIC'::"WorkItemType",
      CASE WHEN in_early THEN 'QA_DONE' ELSE 'IN_PROGRESS' END::"BoardStatus",
      hems_epics[e_idx + 1], 'HIGH'::"TaskPriority",
      hems_pm, 40,
      CASE WHEN in_early THEN '2026-05-01 00:00:00 UTC'::TIMESTAMPTZ ELSE '2026-05-15 00:00:00 UTC'::TIMESTAMPTZ END,
      CASE WHEN in_early THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ ELSE '2026-05-28 00:00:00 UTC'::TIMESTAMPTZ END
    ) ON CONFLICT (id) DO NOTHING;

    FOR s_idx IN 0..4 LOOP
      story_id     := 'hems-story-' || e_idx || '-' || s_idx;
      in_early     := (e_idx < 2);
      story_day    := CASE WHEN in_early THEN 1 + s_idx * 2 ELSE 15 + s_idx END;
      story_stat   := CASE WHEN in_early THEN 'QA_DONE' WHEN s_idx < 2 THEN 'IN_REVIEW' ELSE 'IN_PROGRESS' END;
      story_sprint := CASE
        WHEN in_early AND e_idx < 1 THEN 'hems-sp1'
        WHEN in_early               THEN 'hems-sp2'
        ELSE                             'hems-sp3'
      END;

      INSERT INTO work_items (id,"projectId","parentId","sprintId",type,status,title,priority,"reporterId","storyPoints","completedAt","createdAt","updatedAt")
      VALUES (
        story_id, hems_id, epic_id, story_sprint,
        'USER_STORY'::"WorkItemType", story_stat::"BoardStatus",
        hems_stories[e_idx * 5 + s_idx + 1],
        priorities[(s_idx % 4) + 1]::"TaskPriority",
        hems_reporters[(s_idx % array_length(hems_reporters, 1)) + 1],
        8,
        CASE WHEN in_early THEN (DATE '2026-05-13' + (s_idx % 3))::TIMESTAMPTZ ELSE NULL END,
        (DATE '2026-05-01' + (story_day - 1))::TIMESTAMPTZ,
        CASE WHEN in_early THEN (DATE '2026-05-14' + (s_idx % 5))::TIMESTAMPTZ
             ELSE (DATE '2026-05-22' + (s_idx % 5))::TIMESTAMPTZ END
      ) ON CONFLICT (id) DO NOTHING;

      hems_work_ids := hems_work_ids || story_id;

      -- Dev tasks (1 per developer)
      FOR d_idx IN 0..(array_length(hems_devs, 1) - 1) LOOP
        task_id   := 'hems-task-' || e_idx || '-' || s_idx || '-' || d_idx;
        task_stat := CASE WHEN in_early THEN 'QA_DONE' WHEN d_idx = 0 THEN 'IN_PROGRESS' ELSE 'TODO' END;

        INSERT INTO work_items (id,"projectId","parentId","sprintId",type,status,title,priority,"assigneeId","reporterId","estimatedHours","storyPoints","completedAt","createdAt","updatedAt")
        VALUES (
          task_id, hems_id, story_id, story_sprint,
          'TASK'::"WorkItemType", task_stat::"BoardStatus",
          hems_task_titles[(d_idx % 7) + 1] || ' — ' || hems_stories[e_idx * 5 + s_idx + 1],
          priorities[((d_idx + s_idx) % 4) + 1]::"TaskPriority",
          hems_devs[(d_idx % array_length(hems_devs, 1)) + 1],
          hems_tls[(d_idx % array_length(hems_tls, 1)) + 1],
          5 + (d_idx % 4), 3,
          CASE WHEN in_early THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
          (DATE '2026-05-01' + LEAST(story_day + (d_idx % 2), 29) - 1)::TIMESTAMPTZ,
          CASE WHEN in_early THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ
               ELSE (DATE '2026-05-22' + (d_idx % 5))::TIMESTAMPTZ END
        ) ON CONFLICT (id) DO NOTHING;

        hems_work_ids := hems_work_ids || task_id;

        -- Sub-task for first developer only
        IF d_idx = 0 THEN
          sub_id := 'hems-sub-' || e_idx || '-' || s_idx;
          INSERT INTO work_items (id,"projectId","parentId","sprintId",type,status,title,priority,"assigneeId","reporterId","estimatedHours","createdAt","updatedAt")
          VALUES (
            sub_id, hems_id, task_id, story_sprint,
            'SUB_TASK'::"WorkItemType", task_stat::"BoardStatus",
            'Write unit tests — ' || hems_stories[e_idx * 5 + s_idx + 1],
            'MEDIUM'::"TaskPriority",
            hems_devs[1],
            hems_tls[(d_idx % array_length(hems_tls, 1)) + 1],
            2,
            (DATE '2026-05-01' + LEAST(story_day + 1, 29) - 1)::TIMESTAMPTZ,
            CASE WHEN in_early THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ
                 ELSE '2026-05-24 00:00:00 UTC'::TIMESTAMPTZ END
          ) ON CONFLICT (id) DO NOTHING;
          hems_work_ids := hems_work_ids || sub_id;
        END IF;
      END LOOP;

      -- QA tasks (up to 2 per story)
      FOR q_idx IN 0..LEAST(array_length(hems_qas, 1), 2) - 1 LOOP
        qa_task_id := 'hems-qa-task-' || e_idx || '-' || s_idx || '-' || q_idx;
        task_stat  := CASE WHEN in_early THEN 'QA_DONE' WHEN s_idx < 2 THEN 'IN_PROGRESS' ELSE 'TODO' END;

        INSERT INTO work_items (id,"projectId","parentId","sprintId",type,status,title,priority,"assigneeId","reporterId","estimatedHours","storyPoints","completedAt","createdAt","updatedAt")
        VALUES (
          qa_task_id, hems_id, story_id, story_sprint,
          'TASK'::"WorkItemType", task_stat::"BoardStatus",
          'QA test execution — ' || hems_stories[e_idx * 5 + s_idx + 1],
          priorities[(q_idx % 4) + 1]::"TaskPriority",
          hems_qas[(q_idx % array_length(hems_qas, 1)) + 1],
          hems_tl1, 3, 2,
          CASE WHEN in_early THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
          (DATE '2026-05-01' + LEAST(story_day + 2, 29) - 1)::TIMESTAMPTZ,
          CASE WHEN in_early THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ
               ELSE '2026-05-25 00:00:00 UTC'::TIMESTAMPTZ END
        ) ON CONFLICT (id) DO NOTHING;

        hems_work_ids := hems_work_ids || qa_task_id;
      END LOOP;

      -- 2 bugs per story
      FOR b_idx IN 0..1 LOOP
        bug_id       := 'hems-bug-' || e_idx || '-' || s_idx || '-' || b_idx;
        bug_resolved := in_early OR (s_idx < 2 AND b_idx = 0);

        INSERT INTO work_items (
          id,"projectId","parentId","sprintId",type,status,title,priority,
          "assigneeId","reporterId",severity,"bugClassification","bugFlag","bugReproducibility","bugStatus",
          "completedAt","createdAt","updatedAt"
        ) VALUES (
          bug_id, hems_id, story_id, story_sprint,
          'BUG'::"WorkItemType",
          CASE WHEN bug_resolved THEN 'QA_DONE' ELSE 'IN_PROGRESS' END::"BoardStatus",
          hems_bug_titles[((e_idx * 2 + s_idx + b_idx) % 10) + 1],
          priorities[(b_idx % 4) + 1]::"TaskPriority",
          hems_devs[(b_idx % array_length(hems_devs, 1)) + 1],
          hems_qas[(b_idx % array_length(hems_qas, 1)) + 1],
          severities[(b_idx % 4) + 1]::"BugSeverity",
          'PERFORMANCE'::"BugClassification",
          CASE WHEN b_idx % 2 = 0 THEN 'INTERNAL' ELSE 'EXTERNAL' END::"BugFlag",
          'SOMETIMES'::"BugReproducibility",
          CASE WHEN bug_resolved THEN 'CLOSED' ELSE 'OPEN' END::"BugStatus",
          CASE WHEN bug_resolved THEN '2026-05-14 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
          (DATE '2026-05-01' + LEAST(story_day, 29) - 1)::TIMESTAMPTZ,
          (DATE '2026-05-01' + LEAST(story_day + 4 + b_idx, 29) - 1)::TIMESTAMPTZ
        ) ON CONFLICT (id) DO NOTHING;

      END LOOP;
    END LOOP;
  END LOOP;

  -- HEMS today items (Sprint 4 — June 1)
  FOR i IN 0..4 LOOP
    today_id := 'hems-today-' || i;
    INSERT INTO work_items (id,"projectId","sprintId",type,status,title,priority,"assigneeId","reporterId","estimatedHours","dueDate","createdAt","updatedAt")
    VALUES (
      today_id, hems_id, 'hems-sp4',
      'TASK'::"WorkItemType", 'IN_PROGRESS'::"BoardStatus",
      '[June 1] ' || hems_task_titles[(i % 7) + 1] || ' — Solar Analytics',
      'HIGH'::"TaskPriority",
      hems_devs[(i % array_length(hems_devs, 1)) + 1],
      hems_tl1, 6, DATE '2026-06-01',
      '2026-06-01 00:00:00 UTC'::TIMESTAMPTZ,
      '2026-06-01 00:00:00 UTC'::TIMESTAMPTZ
    ) ON CONFLICT (id) DO NOTHING;
    hems_work_ids := hems_work_ids || today_id;
  END LOOP;

  RAISE NOTICE 'HEMS work items done — IDs collected: %', array_length(hems_work_ids, 1);

  -- ════════════════════════════════════════════════════════════════════════
  -- TIMESHEET ENTRIES — May 2026 (21 working days × all members)
  -- ════════════════════════════════════════════════════════════════════════

  -- Smart Facility timesheets
  FOR u_ord IN 1..array_length(sf_all, 1) LOOP
    FOR day_i IN 1..array_length(working_days, 1) LOOP
      ts_id    := 'sf-ts-u' || (u_ord - 1) || '-d' || (day_i - 1);
      work_day := working_days[day_i];
      wid      := sf_work_ids[((day_i - 1) % array_length(sf_work_ids, 1)) + 1];
      ts_hours := 6 + ((day_i - 1) % 3);
      approved := (day_i <= 15);

      INSERT INTO timesheet_entries (id,"workItemId","userId",date,hours,description,"approvalStatus","approvedById","approvedAt","createdAt","updatedAt")
      VALUES (
        ts_id, wid, sf_all[u_ord],
        work_day, ts_hours,
        'Daily work log — ' || work_day::TEXT,
        CASE WHEN approved THEN 'APPROVED' ELSE 'SUBMITTED' END::"TimesheetApprovalStatus",
        CASE WHEN approved THEN sf_pm ELSE NULL END,
        CASE WHEN approved THEN '2026-05-16 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
        now(), now()
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- HEMS timesheets
  FOR u_ord IN 1..array_length(hems_all, 1) LOOP
    FOR day_i IN 1..array_length(working_days, 1) LOOP
      ts_id    := 'hems-ts-u' || (u_ord - 1) || '-d' || (day_i - 1);
      work_day := working_days[day_i];
      wid      := hems_work_ids[((day_i - 1) % array_length(hems_work_ids, 1)) + 1];
      ts_hours := 6 + ((day_i - 1) % 3);
      approved := (day_i <= 15);

      INSERT INTO timesheet_entries (id,"workItemId","userId",date,hours,description,"approvalStatus","approvedById","approvedAt","createdAt","updatedAt")
      VALUES (
        ts_id, wid, hems_all[u_ord],
        work_day, ts_hours,
        'Daily work log — ' || work_day::TEXT,
        CASE WHEN approved THEN 'APPROVED' ELSE 'SUBMITTED' END::"TimesheetApprovalStatus",
        CASE WHEN approved THEN hems_pm ELSE NULL END,
        CASE WHEN approved THEN '2026-05-16 00:00:00 UTC'::TIMESTAMPTZ ELSE NULL END,
        now(), now()
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Timesheet entries done';

  -- ════════════════════════════════════════════════════════════════════════
  -- LEAVE REQUESTS — May 2026
  -- ════════════════════════════════════════════════════════════════════════

  -- Smart Facility
  IF array_length(sf_devs, 1) >= 1 THEN
    INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
    VALUES ('lr-sf-dev-1',sf_devs[1],'SICK'::"LeaveType",'APPROVED'::"LeaveStatus",
            '2026-05-05','2026-05-06',2,'Fever and flu',sf_pm,'2026-05-16 00:00:00 UTC'::TIMESTAMPTZ,now(),now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF array_length(sf_qas, 1) >= 1 AND sf_qas[1] IS DISTINCT FROM sf_pm THEN
    INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
    VALUES ('lr-sf-qa-1',sf_qas[1],'CASUAL'::"LeaveType",'APPROVED'::"LeaveStatus",
            '2026-05-19','2026-05-19',1,'Personal work',sf_pm,'2026-05-16 00:00:00 UTC'::TIMESTAMPTZ,now(),now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
  VALUES ('lr-sf-pm-1',sf_pm,'EARNED'::"LeaveType",'PENDING'::"LeaveStatus",
          '2026-05-26','2026-05-27',2,'Annual leave planned',NULL,NULL,now(),now())
  ON CONFLICT (id) DO NOTHING;

  -- HEMS One Rewrite
  IF array_length(hems_devs, 1) >= 1 THEN
    INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
    VALUES ('lr-hems-dev1-1',hems_devs[1],'SICK'::"LeaveType",'APPROVED'::"LeaveStatus",
            '2026-05-07','2026-05-08',2,'Not feeling well',hems_pm,'2026-05-16 00:00:00 UTC'::TIMESTAMPTZ,now(),now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF array_length(hems_devs, 1) >= 2 THEN
    INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
    VALUES ('lr-hems-dev2-1',hems_devs[2],'CASUAL'::"LeaveType",'APPROVED'::"LeaveStatus",
            '2026-05-14','2026-05-14',1,'Personal errand',hems_pm,'2026-05-16 00:00:00 UTC'::TIMESTAMPTZ,now(),now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF array_length(hems_qas, 1) >= 1 THEN
    INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
    VALUES ('lr-hems-qa1-1',hems_qas[1],'EARNED'::"LeaveType",'APPROVED'::"LeaveStatus",
            '2026-05-20','2026-05-22',3,'Planned vacation',hems_pm,'2026-05-16 00:00:00 UTC'::TIMESTAMPTZ,now(),now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF array_length(hems_tls, 1) >= 1 AND hems_tls[1] IS DISTINCT FROM hems_pm THEN
    INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
    VALUES ('lr-hems-tl1-1',hems_tls[1],'SICK'::"LeaveType",'PENDING'::"LeaveStatus",
            '2026-05-27','2026-05-28',2,'Back pain',NULL,NULL,now(),now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF array_length(hems_qas, 1) >= 2 THEN
    INSERT INTO leave_requests (id,"userId",type,status,"startDate","endDate","totalDays",reason,"approvedById","approvedAt","createdAt","updatedAt")
    VALUES ('lr-hems-qa2-1',hems_qas[2],'CASUAL'::"LeaveType",'REJECTED'::"LeaveStatus",
            '2026-05-30','2026-05-30',1,'Family event',hems_pm,'2026-05-16 00:00:00 UTC'::TIMESTAMPTZ,now(),now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RAISE NOTICE '=== Seed complete ===';
  RAISE NOTICE 'Smart Facility   — 2 milestones, 3 sprints (sp3 active), 4×5 epics/stories + tasks/QA/bugs + 3 June-1 items';
  RAISE NOTICE 'HEMS One Rewrite — 3 milestones, 4 sprints (sp4 active), 4×5 epics/stories + tasks/sub-tasks/QA/bugs + 5 June-1 items';
  RAISE NOTICE 'Timesheets       — 21 May working days × all team members on both projects';
  RAISE NOTICE 'Leave requests   — up to 8 (conditional on team composition)';

END $$;
```
