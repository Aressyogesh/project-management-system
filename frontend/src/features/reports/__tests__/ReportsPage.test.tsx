import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsPage } from '../pages/ReportsPage';
import {
  STATIC_PRODUCTIVITY_DATA,
  STATIC_PROJECT_DATA,
  STATIC_BUG_SEVERITY_DATA,
  STATIC_BUG_CLASSIFICATION_DATA,
  STATIC_ALLOCATION_DATA,
  STATIC_TIMESHEET_DATA,
} from '../data/reportsStaticData';

// ─── Mock recharts (jsdom has no canvas) ─────────────────────────────────────
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
        {children}
      </div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Bar: () => null,
    Pie: () => null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

// ─── Mock analyticsApi (live data) ───────────────────────────────────────────
const mockKpiLive = STATIC_PRODUCTIVITY_DATA.map((r) => ({
  userId: r.userId,
  name: r.name,
  role: r.role,
  department: 'Digital',
  period: '2026-05',
  metrics: [],
  totalScore: r.score,
}));

vi.mock('../../../api/analyticsApi', () => ({
  analyticsApi: {
    getProductivity: vi.fn(() => Promise.resolve(STATIC_PRODUCTIVITY_DATA)),
    getProjects: vi.fn(() => Promise.resolve(STATIC_PROJECT_DATA)),
    getBugs: vi.fn(() => Promise.resolve({
      severity: STATIC_BUG_SEVERITY_DATA,
      classification: STATIC_BUG_CLASSIFICATION_DATA,
    })),
    getAllocation: vi.fn(() => Promise.resolve(STATIC_ALLOCATION_DATA)),
    getTimesheet: vi.fn(() => Promise.resolve(STATIC_TIMESHEET_DATA)),
    getKpi: vi.fn(() => Promise.resolve(mockKpiLive)),
    getCapacity: vi.fn(() => Promise.resolve({
      period: '2026-05', year: 2026, month: 5, daysInMonth: 31, days: [], employees: [],
    })),
    upsertKpiRecord: vi.fn(() => Promise.resolve({})),
    getKpiRecords: vi.fn(() => Promise.resolve([])),
  },
}));

// ─── Auth store mocks ─────────────────────────────────────────────────────────
const adminUser = {
  id: 'e10eba00-cd85-4933-abc9-82c335f0a201',
  fullName: 'System Admin',
  email: 'admin@pms.com',
  systemRole: 'ADMIN' as const,
  isActive: true,
};

const employeeUser = {
  id: 'be927bba-6130-4361-8bd2-f7569bfc5903',
  fullName: 'Yogesh Lolage',
  email: 'yogesh@pms.com',
  systemRole: 'EMPLOYEE' as const,
  isActive: true,
};

let mockCurrentUser: typeof adminUser | typeof employeeUser = adminUser;

vi.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: (state: { user: typeof adminUser }) => unknown) =>
    selector({ user: mockCurrentUser }),
}));

// ─── Test wrapper ─────────────────────────────────────────────────────────────
function renderReportsPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── UTC-F020-FE-001 ──────────────────────────────────────────────────────────
describe('ReportsPage render', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F020-FE-001: renders Reports page heading for ADMIN', () => {
    renderReportsPage();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });
});

// ─── UTC-F020-FE-002/003 ─────────────────────────────────────────────────────
describe('ReportsPage tabs', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F020-FE-002: renders all 4 tab buttons', () => {
    renderReportsPage();
    expect(screen.getByText('Team Productivity')).toBeInTheDocument();
    expect(screen.getByText('KPI Appraisal')).toBeInTheDocument();
    expect(screen.getByText('Project Summary')).toBeInTheDocument();
    expect(screen.getByText('Bug Summary')).toBeInTheDocument();
  });

  it('UTC-F020-FE-003: Team Productivity tab is active by default', async () => {
    renderReportsPage();
    expect(await screen.findByText('Team Productivity Details')).toBeInTheDocument();
  });

  it('UTC-F020-FE-004: clicking KPI Appraisal tab shows KPI content', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('KPI Appraisal'));
    await waitFor(() => {
      expect(
        screen.queryByText('Grade Distribution') ?? screen.queryByText('Team Average Score'),
      ).toBeInTheDocument();
    });
  });

  it('UTC-F020-FE-005: clicking Project Summary tab shows project content', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Project Summary'));
    expect(await screen.findAllByText('PMS Web App')).not.toHaveLength(0);
  });

  it('UTC-F020-FE-006: clicking Bug Summary tab shows bug content', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Bug Summary'));
    await waitFor(() => {
      const showStoppers = screen.queryAllByText(/Show Stopper/i);
      const criticals = screen.queryAllByText(/Critical/i);
      expect(showStoppers.length > 0 || criticals.length > 0).toBe(true);
    });
  });
});

// ─── UTC-F020-FE-007/008/009 — Productivity static data ──────────────────────
describe('Static data integrity — productivity', () => {
  it('UTC-F020-FE-007: STATIC_PRODUCTIVITY_DATA has 14 entries', () => {
    expect(STATIC_PRODUCTIVITY_DATA.length).toBe(14);
  });

  it('UTC-F020-FE-008: Hemant Atre is highest productivity scorer', () => {
    const sorted = [...STATIC_PRODUCTIVITY_DATA].sort((a, b) => b.score - a.score);
    expect(sorted[0].name).toBe('Hemant Atre');
  });

  it('UTC-F020-FE-009: Jayvant Bagul is lowest productivity scorer', () => {
    const sorted = [...STATIC_PRODUCTIVITY_DATA].sort((a, b) => a.score - b.score);
    expect(sorted[0].name).toBe('Jayvant Bagul');
  });
});

// ─── UTC-F020-FE-010/011 — Project static data ───────────────────────────────
describe('Static data integrity — projects', () => {
  it('UTC-F020-FE-010: STATIC_PROJECT_DATA has 3 projects', () => {
    expect(STATIC_PROJECT_DATA.length).toBe(3);
  });

  it('UTC-F020-FE-011: SalesForce Integration project is Completed', () => {
    const project = STATIC_PROJECT_DATA.find((p) => p.name === 'SalesForce Integration');
    expect(project).toBeDefined();
    expect(project!.status).toBe('Completed');
    expect(project!.done).toBe(project!.tasks);
  });
});

// ─── UTC-F020-FE-012 — Bug static data ───────────────────────────────────────
describe('Static data integrity — bugs', () => {
  it('UTC-F020-FE-012: total bug count sums to 40', () => {
    const total = STATIC_BUG_SEVERITY_DATA.reduce((s, d) => s + d.count, 0);
    expect(total).toBe(40);
  });
});

// ─── UTC-F020-FE-013 ─────────────────────────────────────────────────────────
describe('ReportsPage render — team productivity', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F020-FE-013: shows Hemant Atre in productivity table', async () => {
    renderReportsPage();
    expect(await screen.findAllByText('Hemant Atre')).not.toHaveLength(0);
  });
});

// ─── UTC-F020-FE-014 ─────────────────────────────────────────────────────────
describe('ReportsPage — KPI tab', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F020-FE-014: KPI tab shows Yogesh Lolage', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('KPI Appraisal'));
    expect(await screen.findAllByText('Yogesh Lolage')).not.toHaveLength(0);
  });
});

// ─── UTC-F020-FE-015 — Dashboard Announcements ───────────────────────────────
describe('AnnouncementsWidget', () => {
  it('UTC-F020-FE-015: Announcements widget renders', async () => {
    const { AnnouncementsWidget } = await import('../../dashboard/components/AnnouncementsWidget');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AnnouncementsWidget />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const heading = screen.queryByText('Announcements') ?? screen.queryByText("What's New");
    expect(heading).toBeInTheDocument();
  });
});

// ─── UTC-F020-FE-016 — Employee role ─────────────────────────────────────────
describe('ReportsPage — EMPLOYEE role', () => {
  beforeEach(() => { mockCurrentUser = employeeUser; });

  it('UTC-F020-FE-016: Employee sees personal summary card', () => {
    renderReportsPage();
    const personal =
      screen.queryByText(/My Performance/i) ??
      screen.queryByText(/personal/i);
    expect(personal).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F-021 — Phase 11 Complete: Task Allocation, Timesheet & Export Reports
// ═════════════════════════════════════════════════════════════════════════════

// ─── UTC-F021-FE-001 — 6 tabs ────────────────────────────────────────────────
describe('ReportsPage tabs — F-021', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F021-FE-001: renders all 6 tab buttons after F-021', () => {
    renderReportsPage();
    expect(screen.getByText('Team Productivity')).toBeInTheDocument();
    expect(screen.getByText('KPI Appraisal')).toBeInTheDocument();
    expect(screen.getByText('Project Summary')).toBeInTheDocument();
    expect(screen.getByText('Bug Summary')).toBeInTheDocument();
    expect(screen.getByText('Task Allocation')).toBeInTheDocument();
    expect(screen.getByText('Timesheet')).toBeInTheDocument();
  });
});

// ─── UTC-F021-FE-002/003 — New tab navigation ────────────────────────────────
describe('ReportsPage — Task Allocation & Timesheet tabs', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F021-FE-002: clicking Task Allocation tab shows allocation content', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Task Allocation'));
    expect(await screen.findByText('Task Allocation Details')).toBeInTheDocument();
  });

  it('UTC-F021-FE-003: clicking Timesheet tab shows timesheet content', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Timesheet'));
    expect(await screen.findByText(/Timesheet Summary/i)).toBeInTheDocument();
  });
});

// ─── UTC-F021-FE-004/005/006 — Allocation static data ────────────────────────
describe('Static data integrity — allocation', () => {
  it('UTC-F021-FE-004: STATIC_ALLOCATION_DATA has 14 entries', () => {
    expect(STATIC_ALLOCATION_DATA.length).toBe(14);
  });

  it('UTC-F021-FE-005: Hemant Atre has highest allocation hours', () => {
    const sorted = [...STATIC_ALLOCATION_DATA].sort((a, b) => b.hoursAllocated - a.hoursAllocated);
    expect(sorted[0].name).toBe('Hemant Atre');
  });

  it('UTC-F021-FE-006: Jayvant Bagul has lowest allocation hours', () => {
    const sorted = [...STATIC_ALLOCATION_DATA].sort((a, b) => a.hoursAllocated - b.hoursAllocated);
    expect(sorted[0].name).toBe('Jayvant Bagul');
  });
});

// ─── UTC-F021-FE-007/008/009 — Timesheet static data ────────────────────────
describe('Static data integrity — timesheet', () => {
  it('UTC-F021-FE-007: STATIC_TIMESHEET_DATA has 14 entries', () => {
    expect(STATIC_TIMESHEET_DATA.length).toBe(14);
  });

  it('UTC-F021-FE-008: total timesheet hours sums correctly', () => {
    const total = STATIC_TIMESHEET_DATA.reduce((s, r) => s + r.hoursLogged, 0);
    expect(total).toBe(1562);
  });

  it('UTC-F021-FE-009: approved timesheet count is 8', () => {
    const approved = STATIC_TIMESHEET_DATA.filter((r) => r.status === 'Approved');
    expect(approved.length).toBe(8);
  });
});

// ─── UTC-F021-FE-010/011 — Data in rendered tabs ─────────────────────────────
describe('ReportsPage — rendered allocation & timesheet data', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F021-FE-010: shows Hemant Atre in allocation table', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Task Allocation'));
    expect(await screen.findAllByText('Hemant Atre')).not.toHaveLength(0);
  });

  it('UTC-F021-FE-011: shows Yogesh Lolage in timesheet table', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Timesheet'));
    expect(await screen.findAllByText('Yogesh Lolage')).not.toHaveLength(0);
  });
});

// ─── UTC-F021-FE-012/013 — Export CSV buttons ────────────────────────────────
describe('CSV Export buttons', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F021-FE-012: Export CSV button present on Task Allocation tab', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Task Allocation'));
    expect(await screen.findByText(/Export CSV/i)).toBeInTheDocument();
  });

  it('UTC-F021-FE-013: Export CSV button present on Timesheet tab', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Timesheet'));
    expect(await screen.findByText(/Export CSV/i)).toBeInTheDocument();
  });
});

// ─── UTC-F021-FE-014 — Employee sees personal allocation ─────────────────────
describe('ReportsPage — EMPLOYEE allocation view', () => {
  beforeEach(() => { mockCurrentUser = employeeUser; });

  it('UTC-F021-FE-014: Employee sees personal allocation summary', async () => {
    renderReportsPage();
    expect(await screen.findByText(/My Allocation & Timesheet/i)).toBeInTheDocument();
  });
});

// ─── UTC-F021-FE-015 — Total allocated hours ─────────────────────────────────
describe('Static data integrity — allocation totals', () => {
  it('UTC-F021-FE-015: total allocated hours across all users is 1600', () => {
    const total = STATIC_ALLOCATION_DATA.reduce((s, r) => s + r.hoursAllocated, 0);
    expect(total).toBe(1600);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// F-023 — Dynamic KPI & Reports (live data)
// ═════════════════════════════════════════════════════════════════════════════

// ─── UTC-F023-FE-001 — 7 tabs ────────────────────────────────────────────────
describe('ReportsPage tabs — F-023', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F023-FE-001: renders all 7 tabs including Capacity', () => {
    renderReportsPage();
    expect(screen.getByText('Team Productivity')).toBeInTheDocument();
    expect(screen.getByText('KPI Appraisal')).toBeInTheDocument();
    expect(screen.getByText('Project Summary')).toBeInTheDocument();
    expect(screen.getByText('Bug Summary')).toBeInTheDocument();
    expect(screen.getByText('Task Allocation')).toBeInTheDocument();
    expect(screen.getByText('Timesheet')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
  });
});

// ─── UTC-F023-FE-002 — Live productivity data ────────────────────────────────
describe('ReportsPage — F-023 live data', () => {
  beforeEach(() => { mockCurrentUser = adminUser; });

  it('UTC-F023-FE-002: Productivity tab fetches and renders live data', async () => {
    renderReportsPage();
    expect(await screen.findByText('Team Productivity Details')).toBeInTheDocument();
    expect(await screen.findAllByText('Hemant Atre')).not.toHaveLength(0);
  });

  it('UTC-F023-FE-003: KPI tab renders live employee scores', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('KPI Appraisal'));
    expect(await screen.findAllByText('Yogesh Lolage')).not.toHaveLength(0);
  });

  it('UTC-F023-FE-004: Project tab renders live project data', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Project Summary'));
    expect(await screen.findAllByText('PMS Web App')).not.toHaveLength(0);
  });

  it('UTC-F023-FE-005: Capacity tab renders Monthly Capacity Report heading', async () => {
    renderReportsPage();
    await userEvent.click(screen.getByText('Capacity'));
    expect(await screen.findByText('Monthly Capacity Report')).toBeInTheDocument();
  });

  it('UTC-F023-FE-006: each tab shows Export CSV button', async () => {
    renderReportsPage();
    for (const tab of ['Team Productivity', 'Bug Summary', 'Task Allocation', 'Timesheet']) {
      await userEvent.click(screen.getByText(tab));
      expect(await screen.findByText(/Export CSV/i)).toBeInTheDocument();
    }
  });

  it('UTC-F023-FE-007: Employee sees My Performance section with live data', async () => {
    mockCurrentUser = employeeUser;
    renderReportsPage();
    expect(screen.getByText(/My Performance/i)).toBeInTheDocument();
  });
});
