// Static report data for May 2026 — same 14 users as STATIC_KPI_DATA

export interface ProductivityRecord {
  userId: string;
  name: string;
  role: string;
  tasksDone: number;
  hoursLogged: number;
  onTimePct: number;
  score: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  tasks: number;
  done: number;
  teamSize: number;
  status: 'Active' | 'Completed' | 'On Hold';
  color: string;
}

export interface BugSeverityRecord {
  severity: string;
  count: number;
  color: string;
}

export interface BugClassificationRecord {
  classification: string;
  count: number;
  color: string;
}

export const STATIC_PRODUCTIVITY_DATA: ProductivityRecord[] = [
  { userId: '49fad96a-559a-4105-9cb9-b888e97f54c4', name: 'Hemant Atre',        role: 'Senior Developer', tasksDone: 28, hoursLogged: 168, onTimePct: 96, score: 94 },
  { userId: 'be927bba-6130-4361-8bd2-f7569bfc5903', name: 'Yogesh Lolage',      role: 'Team Lead',        tasksDone: 24, hoursLogged: 152, onTimePct: 92, score: 89 },
  { userId: '907700b2-4cea-4e70-91c4-313b99046f5e', name: 'Pratiksha Khairnar', role: 'QA Engineer',      tasksDone: 22, hoursLogged: 144, onTimePct: 90, score: 86 },
  { userId: 'e10eba00-cd85-4933-abc9-82c335f0a201', name: 'System Admin',       role: 'Admin',            tasksDone: 18, hoursLogged: 120, onTimePct: 88, score: 82 },
  { userId: 'e828e62b-a73e-460f-9201-1da121732e9f', name: 'Gaurav Patil',       role: 'Developer',        tasksDone: 20, hoursLogged: 136, onTimePct: 85, score: 80 },
  { userId: '68665a5e-fd7a-435f-ad60-cdea8179fa30', name: 'Shital Joshi',       role: 'Developer',        tasksDone: 19, hoursLogged: 130, onTimePct: 84, score: 79 },
  { userId: '75482b9f-45ab-42c0-9cd2-cf6c15f89c17', name: 'Deepali Jawharkar',  role: 'Designer',         tasksDone: 17, hoursLogged: 124, onTimePct: 82, score: 77 },
  { userId: 'adde42f0-6b96-48c9-99c8-1a91cde645ed', name: 'Prashik Shirsat',    role: 'Developer',        tasksDone: 16, hoursLogged: 118, onTimePct: 80, score: 75 },
  { userId: 'b6a87b34-491b-4a6e-bfa2-8c37be562c33', name: 'John Developer',     role: 'Developer',        tasksDone: 14, hoursLogged: 104, onTimePct: 72, score: 68 },
  { userId: '3110773f-7e26-4a8b-8ec5-aaac112f12c0', name: 'Ganesh Khalkar',     role: 'Developer',        tasksDone: 13, hoursLogged: 98,  onTimePct: 70, score: 65 },
  { userId: 'ffeaf90e-a2dc-4900-9125-3a28a515130f', name: 'Rohit More',         role: 'Developer',        tasksDone: 12, hoursLogged: 92,  onTimePct: 66, score: 62 },
  { userId: '052f928c-896d-4b39-a276-21759f6beb27', name: 'Yash Boraste',       role: 'Developer',        tasksDone: 11, hoursLogged: 88,  onTimePct: 62, score: 58 },
  { userId: '2dd7b0e2-0d2a-4ff1-b735-e41469aaa5fc', name: 'Super Admin',        role: 'Super Admin',      tasksDone:  6, hoursLogged: 48,  onTimePct: 50, score: 44 },
  { userId: 'f887a347-4aac-47de-a0cf-471b536be9d7', name: 'Jayvant Bagul',      role: 'DevOps Engineer',  tasksDone:  5, hoursLogged: 40,  onTimePct: 45, score: 42 },
];

export const STATIC_PROJECT_DATA: ProjectRecord[] = [
  { id: 'proj-1', name: 'PMS Web App',             tasks: 48, done: 36, teamSize: 8, status: 'Active',    color: '#3B82F6' },
  { id: 'proj-2', name: 'Mobile CRM',              tasks: 32, done: 20, teamSize: 5, status: 'Active',    color: '#8B5CF6' },
  { id: 'proj-3', name: 'SalesForce Integration',  tasks: 18, done: 18, teamSize: 3, status: 'Completed', color: '#10B981' },
];

export const STATIC_BUG_SEVERITY_DATA: BugSeverityRecord[] = [
  { severity: 'Show Stopper', count:  2, color: '#EF4444' },
  { severity: 'Critical',     count:  5, color: '#F97316' },
  { severity: 'Major',        count: 12, color: '#F59E0B' },
  { severity: 'Minor',        count: 21, color: '#10B981' },
];

export const STATIC_BUG_CLASSIFICATION_DATA: BugClassificationRecord[] = [
  { classification: 'UI/Usability',  count: 14, color: '#3B82F6' },
  { classification: 'New Bug',       count: 10, color: '#EF4444' },
  { classification: 'Enhancement',   count:  8, color: '#8B5CF6' },
  { classification: 'Performance',   count:  4, color: '#F59E0B' },
  { classification: 'Other',         count:  4, color: '#6B7280' },
];

export const REPORT_PERIODS = [
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
];

export const ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'KPI Appraisal Results — May 2026',
    body: 'May 2026 KPI scores are now published. Top performer: Hemant Atre (96 pts). Team average: 73 pts.',
    date: '2026-05-28',
    type: 'info' as const,
  },
  {
    id: '2',
    title: 'SalesForce Integration — Project Closed',
    body: 'SalesForce Integration project has been successfully completed. All 18 tasks delivered on time.',
    date: '2026-05-25',
    type: 'success' as const,
  },
  {
    id: '3',
    title: 'Phase 12 Planning',
    body: 'Phase 12 (Timesheets & Leave) planning kickoff scheduled for June 3, 2026. All team leads to attend.',
    date: '2026-05-22',
    type: 'info' as const,
  },
  {
    id: '4',
    title: 'Bug Triage — 2 Show Stoppers',
    body: 'Two show-stopper bugs have been identified in PMS Web App. Priority fix required before next sprint.',
    date: '2026-05-20',
    type: 'warning' as const,
  },
];
