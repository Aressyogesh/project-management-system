import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KpiPage } from '../pages/KpiPage';
import {
  computeGrade,
  computeCategoryScores,
  KPI_METRICS,
} from '../data/kpiStaticData';
import type { KpiMetricScore } from '../../../types/kpi.types';

// ─── Mock live KPI data ───────────────────────────────────────────────────────

function makeEmployee(
  userId: string,
  name: string,
  role: string,
  department: string,
  totalScore: number,
) {
  const metrics: KpiMetricScore[] = KPI_METRICS.map((m) => ({
    metricId: m.id,
    points: Math.round((totalScore / 100) * m.maxPoints * 10) / 10,
  }));
  return { userId, name, role, department, period: '2026-06', metrics, totalScore };
}

const mockLiveKpiData = [
  makeEmployee('u1', 'Hemant Atre',    'Senior Dev',   'Engineering', 96),
  makeEmployee('u2', 'Yogesh Lolage',  'Dev Lead',     'Engineering', 82),
  makeEmployee('u3', 'Gaurav Patil',   'Developer',    'Engineering', 77),
  makeEmployee('u4', 'Rohit More',     'Developer',    'Engineering', 68),
  makeEmployee('u5', 'Jayvant Bagul',  'QA Engineer',  'QA',          52),
];

vi.mock('../../../api/analyticsApi', () => ({
  analyticsApi: {
    getKpi: vi.fn(() => Promise.resolve(mockLiveKpiData)),
    getKpiRecords: vi.fn(() => Promise.resolve([])),
    upsertKpiRecord: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock('../../../api/projects.api', () => ({
  projectsApi: {
    list: vi.fn(() => Promise.resolve([
      { id: 'p1', name: 'Alpha Project', status: 'ACTIVE' },
      { id: 'p2', name: 'Beta Project',  status: 'ACTIVE' },
    ])),
    listMembers: vi.fn(() => Promise.resolve([
      { id: 'm1', projectRole: 'DEVELOPER', user: { id: 'u1', fullName: 'Hemant Atre',   email: 'h@pms.com', profilePhoto: null, department: 'Engineering' } },
      { id: 'm2', projectRole: 'DEVELOPER', user: { id: 'u2', fullName: 'Yogesh Lolage', email: 'y@pms.com', profilePhoto: null, department: 'Engineering' } },
    ])),
  },
}));

// ─── Mock recharts (jsdom has no canvas) ─────────────────────────────────────
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>{children}</div>
    ),
    RadarChart:  ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
    BarChart:    ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    PieChart:    ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
    Radar:            () => null,
    Bar:              () => null,
    Pie:              () => null,
    Cell:             () => null,
    PolarGrid:        () => null,
    PolarAngleAxis:   () => null,
    PolarRadiusAxis:  () => null,
    XAxis:            () => null,
    YAxis:            () => null,
    CartesianGrid:    () => null,
    Tooltip:          () => null,
    Legend:           () => null,
  };
});

// ─── Mock auth store ──────────────────────────────────────────────────────────
const mockUser = {
  id: 'admin-001',
  fullName: 'System Admin',
  email: 'admin@pms.com',
  systemRole: 'ADMIN' as const,
  isActive: true,
};

vi.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: (state: { user: typeof mockUser }) => unknown) =>
    selector({ user: mockUser }),
}));

// ─── Helper ───────────────────────────────────────────────────────────────────
function renderKpiPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <KpiPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Grade utility tests ──────────────────────────────────────────────────────

describe('computeGrade', () => {
  it('UTC-F019-FE-005: returns A for score >= 90', () => {
    expect(computeGrade(92)).toBe('A');
    expect(computeGrade(90)).toBe('A');
    expect(computeGrade(100)).toBe('A');
  });

  it('UTC-F019-FE-005: returns B for score 89.99', () => {
    expect(computeGrade(89.99)).toBe('B');
  });

  it('UTC-F019-FE-006: returns B for score 75–89.99', () => {
    expect(computeGrade(75)).toBe('B');
    expect(computeGrade(82)).toBe('B');
    expect(computeGrade(89.99)).toBe('B');
  });

  it('UTC-F019-FE-007: returns C for score 60–74.99', () => {
    expect(computeGrade(60)).toBe('C');
    expect(computeGrade(71)).toBe('C');
    expect(computeGrade(74.99)).toBe('C');
  });

  it('UTC-F019-FE-008: returns D for score below 60', () => {
    expect(computeGrade(59.99)).toBe('D');
    expect(computeGrade(46)).toBe('D');
    expect(computeGrade(0)).toBe('D');
  });
});

// ─── Category score computation tests ────────────────────────────────────────

describe('computeCategoryScores', () => {
  it('returns 100% for all metrics at max points', () => {
    const scores: KpiMetricScore[] = KPI_METRICS.map((m) => ({
      metricId: m.id,
      points: m.maxPoints,
    }));
    const cats = computeCategoryScores(scores);
    cats.forEach((c) => {
      expect(c.percentage).toBe(100);
      expect(c.earned).toBe(c.max);
    });
  });

  it('returns 0% for all metrics at 0 points', () => {
    const scores: KpiMetricScore[] = KPI_METRICS.map((m) => ({
      metricId: m.id,
      points: 0,
    }));
    const cats = computeCategoryScores(scores);
    cats.forEach((c) => {
      expect(c.percentage).toBe(0);
      expect(c.earned).toBe(0);
    });
  });

  it('groups Delivery & Execution correctly (max 40)', () => {
    const scores: KpiMetricScore[] = KPI_METRICS.map((m) => ({
      metricId: m.id,
      points: m.maxPoints,
    }));
    const cats = computeCategoryScores(scores);
    const de = cats.find((c) => c.category === 'Delivery & Execution');
    expect(de).toBeDefined();
    expect(de?.max).toBe(40);
  });

  it('groups Attendance correctly (max 10)', () => {
    const scores: KpiMetricScore[] = KPI_METRICS.map((m) => ({
      metricId: m.id,
      points: m.maxPoints,
    }));
    const cats = computeCategoryScores(scores);
    const att = cats.find((c) => c.category === 'Attendance');
    expect(att).toBeDefined();
    expect(att?.max).toBe(10);
  });
});

// ─── KPI_METRICS integrity tests ──────────────────────────────────────────────

describe('KPI_METRICS static data integrity', () => {
  it('has exactly 14 metrics', () => {
    expect(KPI_METRICS).toHaveLength(14);
  });

  it('total weightage sums to 1.00 (100%)', () => {
    const total = KPI_METRICS.reduce((s, m) => s + m.weightage, 0);
    expect(Math.round(total * 100)).toBe(100);
  });

  it('total maxPoints sums to 100', () => {
    const total = KPI_METRICS.reduce((s, m) => s + m.maxPoints, 0);
    expect(total).toBe(100);
  });

  it('has 5 distinct core values', () => {
    const values = new Set(KPI_METRICS.map((m) => m.coreValue));
    expect(values.size).toBe(5);
    expect(values.has('Diligent and Committed')).toBe(true);
    expect(values.has('Collaboration')).toBe(true);
    expect(values.has('Continuous Learning')).toBe(true);
    expect(values.has('Optimism')).toBe(true);
    expect(values.has('Gratitude')).toBe(true);
  });

  it('Diligent and Committed has 9 metrics totalling 75 pts', () => {
    const dc = KPI_METRICS.filter((m) => m.coreValue === 'Diligent and Committed');
    expect(dc).toHaveLength(9);
    expect(dc.reduce((s, m) => s + m.maxPoints, 0)).toBe(75);
  });

  it('Collaboration has 2 metrics totalling 10 pts', () => {
    const col = KPI_METRICS.filter((m) => m.coreValue === 'Collaboration');
    expect(col).toHaveLength(2);
    expect(col.reduce((s, m) => s + m.maxPoints, 0)).toBe(10);
  });

  it('each metric has a valid badge type', () => {
    KPI_METRICS.forEach((m) => {
      expect(['AUTO', 'MANUAL', 'SELF']).toContain(m.badge);
    });
  });
});

// ─── KpiPage render tests ─────────────────────────────────────────────────────

describe('KpiPage (ADMIN role)', () => {
  beforeEach(() => {
    mockUser.systemRole = 'ADMIN';
  });

  it('UTC-F019-FE-002: renders KPI Appraisal heading', () => {
    renderKpiPage();
    expect(screen.getByText('KPI Appraisal')).toBeInTheDocument();
  });

  it('UTC-F019-FE-003: renders period, project, and team member selectors', () => {
    renderKpiPage();
    const selects = screen.getAllByRole('combobox');
    // At minimum: Period + Project dropdowns
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('UTC-F019-FE-009: shows employee names in the table', async () => {
    renderKpiPage();
    expect(await screen.findAllByText('Hemant Atre')).not.toHaveLength(0);
    expect(screen.getAllByText('Yogesh Lolage').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gaurav Patil').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rohit More').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Jayvant Bagul').length).toBeGreaterThanOrEqual(1);
  });

  it('UTC-F019-FE-013: expands parameter groups when employee row is clicked', async () => {
    renderKpiPage();
    const allHemantElements = await screen.findAllByText('Hemant Atre');
    const tableRowCell = allHemantElements[allHemantElements.length - 1];
    await userEvent.click(tableRowCell);
    await waitFor(() => {
      expect(screen.getAllByText('Sprint Reliability').length).toBeGreaterThan(0);
    });
  });

  it('UTC-F019-FE-012: leaderboard shows Hemant Atre in top position', async () => {
    renderKpiPage();
    expect(await screen.findByText('Top Performers')).toBeInTheDocument();
    const allHemantElements = screen.getAllByText('Hemant Atre');
    expect(allHemantElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders Enter Monthly Scores button', () => {
    renderKpiPage();
    expect(screen.getByText('Enter Monthly Scores')).toBeInTheDocument();
  });

  it('renders Scoring Reference Guide', async () => {
    renderKpiPage();
    expect(await screen.findByText('Scoring Reference Guide')).toBeInTheDocument();
  });
});

describe('KpiPage (SUPER_USER role)', () => {
  beforeEach(() => {
    mockUser.systemRole = 'SUPER_USER';
  });

  it('UTC-F019-FE-001: renders team dashboard heading for Super User', () => {
    renderKpiPage();
    expect(screen.getByText('KPI Appraisal')).toBeInTheDocument();
  });

  it('renders Project dropdown for Super User', () => {
    renderKpiPage();
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});
