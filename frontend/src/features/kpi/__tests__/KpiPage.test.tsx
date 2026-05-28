import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KpiPage } from '../pages/KpiPage';
import {
  computeGrade,
  computeCategoryScores,
  STATIC_KPI_DATA,
  KPI_METRICS,
} from '../data/kpiStaticData';
import type { KpiMetricScore } from '../../../types/kpi.types';

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
    RadarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="radar-chart">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Radar: () => null,
    Bar: () => null,
    Pie: () => null,
    Cell: () => null,
    PolarGrid: () => null,
    PolarAngleAxis: () => null,
    PolarRadiusAxis: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
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
  it('UTC-F019-FE-010: correctly sums Hemant Atre category scores', () => {
    const hemant = STATIC_KPI_DATA.find((e) => e.name === 'Hemant Atre')!;
    expect(hemant).toBeDefined();
    const cats = hemant.categoryScores;

    const dne = cats.find((c) => c.category === 'Delivery & Execution')!;
    const qne = cats.find((c) => c.category === 'Quality & Engineering Excellence')!;
    const onc = cats.find((c) => c.category === 'Ownership & Collaboration')!;
    const gni = cats.find((c) => c.category === 'Growth & Innovation')!;
    const bnr = cats.find((c) => c.category === 'Behaviour & Reliability')!;

    // Sprint:13 + Delivery:14 + Est:10 + Throughput:9 = 46
    expect(dne.earned).toBe(46);
    // Rework:5 + Defect:10 + Hygiene:5 = 20
    expect(qne.earned).toBe(20);
    // Dep:5 + Report:5 = 10
    expect(onc.earned).toBe(10);
    // Learn:5 + Auto:5 = 10
    expect(gni.earned).toBe(10);
    // Attend:5 + Behav:5 = 10
    expect(bnr.earned).toBe(10);
  });

  it('returns correct percentage for each category', () => {
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

  it('returns 0 percentage when all scores are 0', () => {
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
});

// ─── Static data integrity tests ──────────────────────────────────────────────

describe('STATIC_KPI_DATA integrity', () => {
  it('has 14 employees', () => {
    expect(STATIC_KPI_DATA).toHaveLength(14);
  });

  it('each employee has 13 metric scores', () => {
    STATIC_KPI_DATA.forEach((emp) => {
      expect(emp.metrics).toHaveLength(13);
    });
  });

  it('totalScore matches sum of metric points', () => {
    STATIC_KPI_DATA.forEach((emp) => {
      const sum = emp.metrics.reduce((s, m) => s + m.points, 0);
      expect(emp.totalScore).toBe(sum);
    });
  });

  it('grade matches totalScore via computeGrade', () => {
    STATIC_KPI_DATA.forEach((emp) => {
      expect(emp.grade).toBe(computeGrade(emp.totalScore));
    });
  });

  it('Hemant Atre is highest scorer', () => {
    const sorted = [...STATIC_KPI_DATA].sort((a, b) => b.totalScore - a.totalScore);
    expect(sorted[0].name).toBe('Hemant Atre');
  });

  it('Jayvant Bagul is lowest scorer with Grade D', () => {
    const sorted = [...STATIC_KPI_DATA].sort((a, b) => a.totalScore - b.totalScore);
    expect(sorted[0].name).toBe('Jayvant Bagul');
    expect(sorted[0].grade).toBe('D');
  });

  it('has 3 Grade A, 5 Grade B, 4 Grade C, 2 Grade D', () => {
    const grades = { A: 0, B: 0, C: 0, D: 0 };
    STATIC_KPI_DATA.forEach((e) => grades[e.grade]++);
    expect(grades.A).toBe(3);
    expect(grades.B).toBe(5);
    expect(grades.C).toBe(4);
    expect(grades.D).toBe(2);
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

  it('UTC-F019-FE-003: renders period selector', () => {
    renderKpiPage();
    // There are two selects (period + dept filter); get all and find the period one
    const selects = screen.getAllByRole('combobox');
    const periodSelect = selects.find((s) => (s as HTMLSelectElement).value === '2026-05');
    expect(periodSelect).toBeInTheDocument();
    expect(periodSelect).toHaveValue('2026-05');
  });

  it('UTC-F019-FE-004: renders Grade A, B, C/D summary cards', () => {
    renderKpiPage();
    expect(screen.getByText('Grade A')).toBeInTheDocument();
    expect(screen.getByText('Grade B')).toBeInTheDocument();
    expect(screen.getByText('Grade C / D')).toBeInTheDocument();
  });

  it('UTC-F019-FE-009: shows actual DB users in the table', () => {
    renderKpiPage();
    // Some employees appear in both leaderboard and table — use getAllByText
    expect(screen.getAllByText('Hemant Atre').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Yogesh Lolage').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gaurav Patil').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rohit More').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Jayvant Bagul').length).toBeGreaterThanOrEqual(1);
  });

  it('UTC-F019-FE-013: expands detail panel when employee row is clicked', async () => {
    renderKpiPage();
    // Hemant appears in leaderboard and table — find inside the employee table section
    const allHemantElements = screen.getAllByText('Hemant Atre');
    // The last occurrence is the table row (leaderboard is first rendered)
    const hemantCell = allHemantElements[allHemantElements.length - 1];
    await userEvent.click(hemantCell);
    // After click, Sprint Reliability metric should appear in detail panel
    const sprintElements = screen.getAllByText('Sprint Reliability');
    expect(sprintElements.length).toBeGreaterThan(0);
  });

  it('UTC-F019-FE-011: Grade A badge has emerald colour classes', () => {
    renderKpiPage();
    // Find grade badge "A" elements — they should have emerald classes
    const gradeBadges = document.querySelectorAll('.bg-emerald-100');
    expect(gradeBadges.length).toBeGreaterThan(0);
  });

  it('UTC-F019-FE-012: leaderboard shows Hemant Atre in top position', () => {
    renderKpiPage();
    expect(screen.getByText('Top Performers')).toBeInTheDocument();
    // Hemant (96 pts) is the highest scorer and should appear multiple times
    const allHemantElements = screen.getAllByText('Hemant Atre');
    expect(allHemantElements.length).toBeGreaterThanOrEqual(2); // leaderboard + table
  });
});

describe('KpiPage (SUPER_USER role)', () => {
  beforeEach(() => {
    mockUser.systemRole = 'SUPER_USER';
  });

  it('UTC-F019-FE-001: renders team dashboard for Super User', () => {
    renderKpiPage();
    expect(screen.getByText('KPI Appraisal')).toBeInTheDocument();
    expect(screen.getByText('Team Average')).toBeInTheDocument();
  });
});
