import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../../../api/analyticsApi';
import type { LiveEmployeeKpiRecord } from '../../../api/analyticsApi';
import { dashboardApi } from '../../../api/dashboard.api';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import type { EmployeeKpiRecord } from '../../../types/kpi.types';
import { ProjectRiskScoreCard } from '../../dashboard/components/ProjectRiskScoreCard';
import { KpiLeaderboard } from '../components/KpiLeaderboard';
import { KpiParameterGroups } from '../components/KpiParameterGroups';
import {
  GRADE_CONFIG,
  KPI_METRICS,
  buildTeamSummary,
  transformLiveKpi,
} from '../data/kpiStaticData';

// ─── Period types ─────────────────────────────────────────────────────────────

type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

// ─── Financial year helpers (Apr → Mar) ──────────────────────────────────────
// fyYear = calendar year when April falls (e.g. 2026 for FY2026-27).

function getFyYear(date: Date): number {
  return date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1;
}

function fyLabel(fyYear: number): string {
  return `FY${fyYear}-${String(fyYear + 1).slice(-2)}`;
}

function getFyQuarter(date: Date): number {
  const m = date.getMonth() + 1;
  if (m >= 4 && m <= 6) return 1;
  if (m >= 7 && m <= 9) return 2;
  if (m >= 10) return 3;
  return 4; // Jan–Mar
}

function getFyHalf(date: Date): number {
  const m = date.getMonth() + 1;
  return m >= 4 && m <= 9 ? 1 : 2;
}

function fyQuarterMonths(fyYear: number, q: number): string[] {
  switch (q) {
    case 1: return [`${fyYear}-04`, `${fyYear}-05`, `${fyYear}-06`];
    case 2: return [`${fyYear}-07`, `${fyYear}-08`, `${fyYear}-09`];
    case 3: return [`${fyYear}-10`, `${fyYear}-11`, `${fyYear}-12`];
    default: return [`${fyYear + 1}-01`, `${fyYear + 1}-02`, `${fyYear + 1}-03`];
  }
}

// ─── Period option builders ───────────────────────────────────────────────────

function buildPeriodOptions() {
  const now = new Date();
  const fyYear = getFyYear(now);
  // Months from FY start (April of fyYear) up to current month, newest first
  const fyStartMonth = `${fyYear}-04`;
  const opts: { value: string; label: string }[] = [];
  let d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (true) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (value < fyStartMonth) break;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    opts.push({ value, label });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    if (opts.length > 12) break; // safety cap
  }
  return opts;
}

function buildQuarterOptions() {
  const now = new Date();
  let fyYear = getFyYear(now);
  let q = getFyQuarter(now);
  const cap = nowYM();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const months = fyQuarterMonths(fyYear, q);
    if (months[0] <= cap) {
      opts.push({ value: `${fyYear}-Q${q}`, label: `Q${q} ${fyLabel(fyYear)}` });
    }
    q--;
    if (q === 0) { q = 4; fyYear--; }
  }
  return opts;
}

function buildHalfOptions() {
  const now = new Date();
  const currentFyYear = getFyYear(now);
  const currentH = getFyHalf(now);
  const opts: { value: string; label: string }[] = [];
  // Current half
  opts.push({ value: `${currentFyYear}-H${currentH}`, label: `H${currentH} ${fyLabel(currentFyYear)}` });
  // If in H2, also add H1 of same FY (already completed)
  if (currentH === 2) {
    opts.push({ value: `${currentFyYear}-H1`, label: `H1 ${fyLabel(currentFyYear)}` });
  }
  // Previous 2 financial years
  for (let y = currentFyYear - 1; y >= currentFyYear - 2; y--) {
    opts.push({ value: `${y}-H2`, label: `H2 ${fyLabel(y)}` });
    opts.push({ value: `${y}-H1`, label: `H1 ${fyLabel(y)}` });
  }
  return opts;
}

function buildYearOptions() {
  const fyYear = getFyYear(new Date());
  return [fyYear, fyYear - 1, fyYear - 2].map((y) => ({ value: y, label: fyLabel(y) }));
}

// ─── Month range helpers ───────────────────────────────────────────────────────

function nowYM(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthsForQuarter(q: string): string[] {
  // value: "2026-Q2" → fyYear=2026, quarter=2
  const [fyYearStr, qStr] = q.split('-');
  const months = fyQuarterMonths(parseInt(fyYearStr), parseInt(qStr.replace('Q', '')));
  const cap = nowYM();
  return months.filter((m) => m <= cap);
}

function getMonthsForHalf(h: string): string[] {
  // value: "2026-H1" → fyYear=2026, half=1
  const [fyYearStr, hStr] = h.split('-');
  const fyYear = parseInt(fyYearStr);
  const half = parseInt(hStr.replace('H', ''));
  const months = half === 1
    ? [...fyQuarterMonths(fyYear, 1), ...fyQuarterMonths(fyYear, 2)]
    : [...fyQuarterMonths(fyYear, 3), ...fyQuarterMonths(fyYear, 4)];
  const cap = nowYM();
  return months.filter((m) => m <= cap);
}

function getMonthsForYear(fyYear: number): string[] {
  const allMonths = [
    ...fyQuarterMonths(fyYear, 1),
    ...fyQuarterMonths(fyYear, 2),
    ...fyQuarterMonths(fyYear, 3),
    ...fyQuarterMonths(fyYear, 4),
  ];
  const cap = nowYM();
  return allMonths.filter((m) => m <= cap);
}

// ─── KPI aggregation ──────────────────────────────────────────────────────────

function aggregateKpiRecords(allRecords: LiveEmployeeKpiRecord[]): LiveEmployeeKpiRecord[] {
  if (allRecords.length === 0) return [];
  const byUser = new Map<string, LiveEmployeeKpiRecord[]>();
  for (const r of allRecords) {
    const arr = byUser.get(r.userId) ?? [];
    arr.push(r);
    byUser.set(r.userId, arr);
  }
  return Array.from(byUser.values()).map((records) => {
    const first = records[0];
    const active = records.filter((r) => !r.hasNoActivity);
    if (active.length === 0) return { ...first, hasNoActivity: true, totalScore: 0, metrics: [] };
    const avgTotal = active.reduce((s, r) => s + r.totalScore, 0) / active.length;
    const metricMap = new Map<string, number[]>();
    for (const r of active) {
      for (const m of r.metrics) {
        const pts = metricMap.get(m.metricId) ?? [];
        pts.push(m.points);
        metricMap.set(m.metricId, pts);
      }
    }
    const avgMetrics = Array.from(metricMap.entries()).map(([metricId, pts]) => ({
      metricId,
      points: Math.round((pts.reduce((s, p) => s + p, 0) / pts.length) * 100) / 100,
    }));
    return { ...first, totalScore: Math.round(avgTotal * 10) / 10, metrics: avgMetrics, hasNoActivity: false };
  });
}

// ─── Static option arrays ─────────────────────────────────────────────────────

const PERIOD_OPTIONS = buildPeriodOptions();
const DEFAULT_PERIOD = PERIOD_OPTIONS[0].value;
const QUARTER_OPTIONS = buildQuarterOptions();
const HALF_OPTIONS = buildHalfOptions();
const YEAR_OPTIONS = buildYearOptions();

const MANUAL_METRICS = KPI_METRICS.filter((m) => m.badge === 'MANUAL').map((m) => ({
  id: m.id,
  label: m.name,
  max: m.maxPoints,
}));

// ─── Trend chart ──────────────────────────────────────────────────────────────

interface TrendPoint { month: string; score: number; hasData: boolean; }

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: TrendPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const { hasData, score } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {hasData
        ? <p className="text-gray-600">KPI Score: <span className="font-bold text-gray-900">{score.toFixed(1)}</span></p>
        : <p className="text-gray-400 text-xs">No data</p>}
    </div>
  );
}

function KpiTrendChart({ data, memberName }: { data: TrendPoint[]; memberName: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-0.5">KPI Score Trend — {memberName}</h3>
      <p className="text-xs text-gray-400 mb-4">Monthly KPI score across the year (0–100)</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }} barSize={26}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: '#F9FAFB' }} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={
                  !entry.hasData ? '#E5E7EB'
                  : entry.score >= 90 ? '#10B981'
                  : entry.score >= 75 ? '#3B82F6'
                  : entry.score >= 60 ? '#F59E0B'
                  : '#EF4444'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── KPI Score Entry Panel ────────────────────────────────────────────────────

function KpiScoreEntryPanel({
  employees,
  period,
  onClose,
}: {
  employees: EmployeeKpiRecord[];
  period: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const initialScores = () => {
    const map: Record<string, Record<string, number>> = {};
    for (const emp of employees) {
      map[emp.userId] = {};
      for (const m of MANUAL_METRICS) {
        const existing = emp.metrics.find((x) => x.metricId === m.id)?.points ?? m.max;
        map[emp.userId][m.id] = existing;
      }
    }
    return map;
  };

  const [scores, setScores] = useState<Record<string, Record<string, number>>>(initialScores);
  const [saveError, setSaveError] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const calls: Promise<unknown>[] = [];
      for (const [userId, metrics] of Object.entries(scores)) {
        for (const [metricId, points] of Object.entries(metrics)) {
          calls.push(analyticsApi.upsertKpiRecord({ userId, period, metricId, points }));
        }
      }
      await Promise.all(calls);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kpi-live'] });
      onClose();
    },
    onError: () => setSaveError('Failed to save scores. Please try again.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Enter Monthly KPI Scores</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Manual metrics · {PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period} · {employees.length} employees
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Employee</th>
                {MANUAL_METRICS.map((m) => (
                  <th key={m.id} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {m.label}
                    <span className="block font-normal normal-case text-[10px] text-gray-400">/{m.max} pts</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.userId} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium text-gray-800">{emp.name}</p>
                    <p className="text-[10px] text-gray-400">{emp.role}</p>
                  </td>
                  {MANUAL_METRICS.map((m) => (
                    <td key={m.id} className="px-3 py-3 text-center">
                      <select
                        value={scores[emp.userId]?.[m.id] ?? m.max}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [emp.userId]: { ...prev[emp.userId], [m.id]: Number(e.target.value) },
                          }))
                        }
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-16"
                      >
                        {Array.from({ length: m.max + 1 }, (_, i) => m.max - i).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
              Cancel
            </button>
            <button
              onClick={() => { setSaveError(''); saveMutation.mutate(); }}
              disabled={saveMutation.isPending}
              className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 px-5 py-2 rounded-lg transition"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save All Scores'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Period sub-selector ──────────────────────────────────────────────────────

function PeriodSubSelector({
  periodType,
  selectedPeriod,
  selectedQuarter,
  selectedHalf,
  selectedYear,
  onPeriodChange,
  onQuarterChange,
  onHalfChange,
  onYearChange,
}: {
  periodType: PeriodType;
  selectedPeriod: string;
  selectedQuarter: string;
  selectedHalf: string;
  selectedYear: number;
  onPeriodChange: (v: string) => void;
  onQuarterChange: (v: string) => void;
  onHalfChange: (v: string) => void;
  onYearChange: (v: number) => void;
}) {
  const cls = 'text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
  if (periodType === 'MONTHLY') {
    return (
      <select value={selectedPeriod} onChange={(e) => onPeriodChange(e.target.value)} className={cls}>
        {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
    );
  }
  if (periodType === 'QUARTERLY') {
    return (
      <select value={selectedQuarter} onChange={(e) => onQuarterChange(e.target.value)} className={cls}>
        {QUARTER_OPTIONS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
      </select>
    );
  }
  if (periodType === 'HALF_YEARLY') {
    return (
      <select value={selectedHalf} onChange={(e) => onHalfChange(e.target.value)} className={cls}>
        {HALF_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
      </select>
    );
  }
  return (
    <select value={selectedYear} onChange={(e) => onYearChange(Number(e.target.value))} className={cls}>
      {YEAR_OPTIONS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
    </select>
  );
}

// ─── Main KpiPage ─────────────────────────────────────────────────────────────

export function KpiPage() {
  const user = useAuthStore((s) => s.user);
  const isAdminOrSuper = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN' || user?.systemRole === 'BU_HEAD';

  // Period state
  const [periodType, setPeriodType] = useState<PeriodType>('MONTHLY');
  const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_PERIOD);
  const [selectedQuarter, setSelectedQuarter] = useState(QUARTER_OPTIONS[0].value);
  const [selectedHalf, setSelectedHalf] = useState(HALF_OPTIONS[0].value);
  const [selectedYear, setSelectedYear] = useState(YEAR_OPTIONS[0].value);

  // Other filters
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Effective months to fetch
  const effectiveMonths = useMemo(() => {
    if (periodType === 'MONTHLY') return [selectedPeriod];
    if (periodType === 'QUARTERLY') return getMonthsForQuarter(selectedQuarter);
    if (periodType === 'HALF_YEARLY') return getMonthsForHalf(selectedHalf);
    return getMonthsForYear(selectedYear);
  }, [periodType, selectedPeriod, selectedQuarter, selectedHalf, selectedYear]);

  // Parallel KPI queries for all effective months
  const kpiQueries = useQueries({
    queries: effectiveMonths.map((period) => ({
      queryKey: ['kpi-live', period],
      queryFn: () => analyticsApi.getKpi(period),
      staleTime: 60_000,
    })),
  });

  const kpiLoading = kpiQueries.length > 0 && kpiQueries.some((q) => q.isLoading);

  // Map monthKey → raw records (for trend chart)
  const kpiDataByMonth = useMemo(() => {
    const map = new Map<string, LiveEmployeeKpiRecord[]>();
    effectiveMonths.forEach((month, i) => {
      const d = kpiQueries[i]?.data;
      if (d) map.set(month, d);
    });
    return map;
  }, [effectiveMonths, kpiQueries]);

  // Aggregate or passthrough
  const liveData = useMemo(() => {
    if (periodType === 'MONTHLY') return kpiQueries[0]?.data ?? [];
    const all = kpiQueries.filter((q) => q.data).flatMap((q) => q.data!);
    return aggregateKpiRecords(all);
  }, [periodType, kpiQueries]);

  // Period label for display
  const periodLabel = useMemo(() => {
    if (periodType === 'MONTHLY') return PERIOD_OPTIONS.find((p) => p.value === selectedPeriod)?.label ?? selectedPeriod;
    if (periodType === 'QUARTERLY') return QUARTER_OPTIONS.find((q) => q.value === selectedQuarter)?.label ?? selectedQuarter;
    if (periodType === 'HALF_YEARLY') return HALF_OPTIONS.find((h) => h.value === selectedHalf)?.label ?? selectedHalf;
    return fyLabel(selectedYear);
  }, [periodType, selectedPeriod, selectedQuarter, selectedHalf, selectedYear]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list(),
    staleTime: 120_000,
    enabled: isAdminOrSuper,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', selectedProjectId],
    queryFn: () => projectsApi.listMembers(selectedProjectId!),
    enabled: !!selectedProjectId,
    staleTime: 60_000,
  });

  const { data: projectActivity = [] } = useQuery({
    queryKey: ['team-activity', selectedProjectId, selectedPeriod],
    queryFn: () => dashboardApi.getTeamActivity(selectedProjectId!, selectedPeriod),
    enabled: !!selectedProjectId && periodType === 'MONTHLY',
    staleTime: 60_000,
  });

  const employees = useMemo(() => liveData.map(transformLiveKpi), [liveData]);

  const projectMemberIds = useMemo(() => projectMembers.map((m) => m.user.id), [projectMembers]);

  const projectEmployees = useMemo(() => {
    if (!selectedProjectId) return employees;
    return employees.filter((e) => projectMemberIds.includes(e.userId));
  }, [employees, selectedProjectId, projectMemberIds]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return projectEmployees;
    const q = searchQuery.toLowerCase();
    return projectEmployees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q),
    );
  }, [projectEmployees, searchQuery]);

  const summary = useMemo(
    () => (filteredEmployees.length > 0 ? buildTeamSummary(filteredEmployees, periodLabel) : null),
    [filteredEmployees, periodLabel],
  );

  const selectedEmployee = selectedMemberId
    ? employees.find((e) => e.userId === selectedMemberId) ?? null
    : null;

  // Trend data: yearly + member selected
  const trendData = useMemo<TrendPoint[] | null>(() => {
    if (periodType !== 'YEARLY' || !selectedMemberId) return null;
    const months = getMonthsForYear(selectedYear);
    return months.map((monthKey) => {
      const monthRecords = kpiDataByMonth.get(monthKey);
      const record = monthRecords?.find((r) => r.userId === selectedMemberId);
      const hasData = !!record && !record.hasNoActivity;
      const date = new Date(`${monthKey}-01`);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        score: hasData ? record!.totalScore : 0,
        hasData,
      };
    });
  }, [periodType, selectedYear, selectedMemberId, kpiDataByMonth]);

  const isLoading = kpiLoading || projectsLoading;

  function handlePeriodTypeChange(type: PeriodType) {
    setPeriodType(type);
    setExpandedUserId(null);
    setSearchQuery('');
  }

  const periodSelectorProps = {
    periodType,
    selectedPeriod,
    selectedQuarter,
    selectedHalf,
    selectedYear,
    onPeriodChange: (v: string) => { setSelectedPeriod(v); setExpandedUserId(null); },
    onQuarterChange: (v: string) => { setSelectedQuarter(v); setExpandedUserId(null); },
    onHalfChange: (v: string) => { setSelectedHalf(v); setExpandedUserId(null); },
    onYearChange: (v: number) => { setSelectedYear(v); setExpandedUserId(null); },
  };

  // ── Employee self-view (non-admin) ─────────────────────────────────────────
  if (!isAdminOrSuper) {
    const ownRecord = employees.find((e) => e.userId === user?.id);

    if (kpiLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My KPI Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {ownRecord && !ownRecord.hasNoActivity && (
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${GRADE_CONFIG[ownRecord.grade].bg} ${GRADE_CONFIG[ownRecord.grade].text}`}>
                Grade {ownRecord.grade} — {ownRecord.totalScore} / 100
              </span>
            )}
            <select
              value={periodType}
              onChange={(e) => handlePeriodTypeChange(e.target.value as PeriodType)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half Yearly</option>
              <option value="YEARLY">Yearly</option>
            </select>
            <PeriodSubSelector {...periodSelectorProps} />
          </div>
        </div>

        {ownRecord ? (
          <KpiParameterGroups
            scores={ownRecord.metrics}
            totalScore={ownRecord.totalScore}
            userId={ownRecord.userId}
            period={selectedPeriod}
            canAddNotes={false}
            currentUserId={user?.id}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#cccccc] p-8 shadow-sm text-center text-sm text-gray-400">
            No KPI data found for this period — auto-computed metrics will appear once work items are logged.
          </div>
        )}
      </div>
    );
  }

  // ── Admin / Super User view ────────────────────────────────────────────────
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {selectedEmployee
              ? `${selectedEmployee.name} · ${selectedProject?.name ?? ''} · ${periodLabel}`
              : selectedProject
              ? `${selectedProject.name} · ${periodLabel}`
              : `Digital Appraisal System · ${periodLabel}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Enter scores — monthly mode only */}
          {periodType === 'MONTHLY' && !selectedMemberId && (
            <button
              onClick={() => setShowScoreEntry(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Enter Monthly Scores
            </button>
          )}

          {/* View type */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium shrink-0">View:</label>
            <select
              value={periodType}
              onChange={(e) => handlePeriodTypeChange(e.target.value as PeriodType)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half Yearly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {/* Period sub-selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium shrink-0">Period:</label>
            <PeriodSubSelector {...periodSelectorProps} />
          </div>

          {/* Project */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium shrink-0">Project:</label>
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value || null);
                setSelectedMemberId(null);
                setExpandedUserId(null);
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
            >
              <option value="">All Projects</option>
              {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Team Member — only when project selected */}
          {selectedProjectId && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 font-medium shrink-0">Team Member:</label>
              <select
                value={selectedMemberId ?? ''}
                onChange={(e) => setSelectedMemberId(e.target.value || null)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
              >
                <option value="">All Members</option>
                {[...projectMembers]
                  .sort((a, b) => a.user.fullName.localeCompare(b.user.fullName))
                  .map((m) => (
                    <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Back button when member selected */}
          {selectedMemberId && (
            <button
              onClick={() => setSelectedMemberId(null)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Team
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : selectedEmployee ? (
        /* ── Individual Member KPI View ── */
        <div className="space-y-4">
          {/* Trend graph above member info — yearly only */}
          {trendData && (
            <KpiTrendChart data={trendData} memberName={selectedEmployee.name} />
          )}

          {/* Member info bar */}
          <div className="bg-white rounded-xl border border-[#cccccc] shadow-sm px-5 py-3 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">
                {selectedEmployee.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{selectedEmployee.name}</p>
              <p className="text-xs text-gray-400">{selectedEmployee.role} · {selectedEmployee.department}</p>
            </div>
            {!selectedEmployee.hasNoActivity && (
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${GRADE_CONFIG[selectedEmployee.grade].bg} ${GRADE_CONFIG[selectedEmployee.grade].text}`}>
                  Grade {selectedEmployee.grade}
                </span>
              </div>
            )}
          </div>

          <KpiParameterGroups
            scores={selectedEmployee.metrics}
            totalScore={selectedEmployee.totalScore}
            userId={selectedEmployee.userId}
            period={selectedPeriod}
            canAddNotes={isAdminOrSuper && periodType === 'MONTHLY'}
            currentUserId={user?.id}
            isAdmin={isAdminOrSuper}
          />
        </div>
      ) : (
        /* ── Team / All-project view ── */
        <>
          {/* Trend graph when yearly + member selected but no drill-down */}
          {trendData && selectedMemberId && (
            <KpiTrendChart
              data={trendData}
              memberName={projectMembers.find((m) => m.user.id === selectedMemberId)?.user.fullName ?? selectedMemberId}
            />
          )}

          {/* Project Risk Score — monthly only */}
          {periodType === 'MONTHLY' && selectedProjectId && projectActivity.length > 0 && (
            <ProjectRiskScoreCard activity={projectActivity} />
          )}

          {summary && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-1">
                <KpiLeaderboard employees={filteredEmployees} />
              </div>
              <div className="xl:col-span-2">
                <ScoreGuideCard />
              </div>
            </div>
          )}

          {/* Employee KPI Table */}
          <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {selectedProject ? `${selectedProject.name} — KPI Records` : 'Employee KPI Records'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} · click a row to view full parameter breakdown
                  {periodType !== 'MONTHLY' && <span className="ml-1 text-blue-500">· scores averaged across period</span>}
                </p>
              </div>
              <div className="sm:ml-auto">
                <div className="relative">
                  <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Employee</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden md:table-cell">
                      Diligent<span className="block font-normal normal-case text-[10px] text-gray-400">/75</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                      Collaboration<span className="block font-normal normal-case text-[10px] text-gray-400">/10</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                      Learning<span className="block font-normal normal-case text-[10px] text-gray-400">/5</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                      Optimism<span className="block font-normal normal-case text-[10px] text-gray-400">/5</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">
                      Gratitude<span className="block font-normal normal-case text-[10px] text-gray-400">/5</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">
                      Total<span className="block font-normal normal-case text-[10px] text-gray-400">/100</span>
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Grade</th>
                    <th className="w-8 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-sm text-gray-400">
                        {selectedProjectId
                          ? "No KPI records found for this project's members this period."
                          : 'No employees found.'}
                      </td>
                    </tr>
                  )}
                  {[...filteredEmployees]
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((emp) => (
                      <EmployeeRow
                        key={emp.userId}
                        employee={emp}
                        isExpanded={expandedUserId === emp.userId}
                        onToggle={() => setExpandedUserId((prev) => (prev === emp.userId ? null : emp.userId))}
                        onViewDetails={() => setSelectedMemberId(emp.userId)}
                        period={selectedPeriod}
                        isAdmin={isAdminOrSuper}
                        currentUserId={user?.id}
                        canAddNotes={periodType === 'MONTHLY'}
                      />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showScoreEntry && (
        <KpiScoreEntryPanel
          employees={filteredEmployees}
          period={selectedPeriod}
          onClose={() => setShowScoreEntry(false)}
        />
      )}
    </div>
  );
}

// ─── Employee Row ─────────────────────────────────────────────────────────────

function EmployeeRow({
  employee,
  isExpanded,
  onToggle,
  onViewDetails,
  period,
  isAdmin,
  currentUserId,
  canAddNotes,
}: {
  employee: EmployeeKpiRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: () => void;
  period?: string;
  isAdmin?: boolean;
  currentUserId?: string;
  canAddNotes?: boolean;
}) {
  const grade = GRADE_CONFIG[employee.grade];

  const getCoreValueScore = (coreValue: string) => {
    const metricIds = KPI_METRICS
      .filter((m) => m.coreValue === coreValue)
      .map((m) => m.id);
    return employee.metrics
      .filter((s) => metricIds.includes(s.metricId))
      .reduce((sum, s) => sum + s.points, 0);
  };

  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-gray-50 cursor-pointer transition-colors ${
          isExpanded ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'
        }`}
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">{employee.name}</p>
              <p className="text-xs text-gray-400">{employee.role} · {employee.department}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3.5 text-center hidden md:table-cell">
          <ScoreCell score={getCoreValueScore('Diligent and Committed')} max={75} />
        </td>
        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
          <ScoreCell score={getCoreValueScore('Collaboration')} max={10} />
        </td>
        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
          <ScoreCell score={getCoreValueScore('Continuous Learning')} max={5} />
        </td>
        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
          <ScoreCell score={getCoreValueScore('Optimism')} max={5} />
        </td>
        <td className="px-3 py-3.5 text-center hidden lg:table-cell">
          <ScoreCell score={getCoreValueScore('Gratitude')} max={5} />
        </td>
        <td className="px-3 py-3.5 text-center">
          {employee.hasNoActivity ? (
            <p className="font-bold text-gray-400 text-base">—</p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold" style={{ color: grade.color }}>
                  {Number(employee.totalScore).toFixed(1)}%
                </span>
                <span className="text-[10px] text-gray-400">/ 100</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${employee.totalScore}%`, backgroundColor: grade.color }} />
              </div>
            </div>
          )}
        </td>
        <td className="px-3 py-3.5 text-center">
          {employee.hasNoActivity ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
              N/A
            </span>
          ) : (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${grade.bg} ${grade.text} border ${grade.border}`}>
              {employee.grade}
            </span>
          )}
        </td>
        <td className="px-3 py-3.5 text-center">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0 bg-gray-50/40">
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View full parameter breakdown
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <KpiParameterGroups
                scores={employee.metrics}
                totalScore={employee.totalScore}
                userId={employee.userId}
                period={period}
                canAddNotes={canAddNotes && isAdmin}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ScoreCell({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#3B82F6' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-semibold text-gray-800">{score.toFixed(1)}</span>
      <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Score Guide Card ─────────────────────────────────────────────────────────

function ScoreGuideCard() {
  const coreValues = [
    { name: 'Diligent and Committed', max: 75, color: '#16A34A', detail: 'Delivery · Quality · Attendance' },
    { name: 'Collaboration',          max: 10, color: '#7C3AED', detail: 'Team Collaboration · Reporting & Docs' },
    { name: 'Continuous Learning',    max: 5,  color: '#1D4ED8', detail: 'Learning Velocity' },
    { name: 'Optimism',               max: 5,  color: '#DC2626', detail: 'Positive Behaviour & Conduct' },
    { name: 'Gratitude',              max: 5,  color: '#EA580C', detail: 'Team Recognition' },
  ];

  const grades = [
    { grade: 'A', range: '90 – 100', label: 'Excellent', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { grade: 'B', range: '75 – 89',  label: 'Good',      bg: 'bg-blue-100',    text: 'text-blue-700'    },
    { grade: 'C', range: '60 – 74',  label: 'Average',   bg: 'bg-amber-100',   text: 'text-amber-700'   },
    { grade: 'D', range: '< 60',     label: 'Poor',      bg: 'bg-red-100',     text: 'text-red-700'     },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#cccccc] p-5 shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Scoring Reference Guide</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Digital Appraisal System — {KPI_METRICS.length} metrics · 5 core values · 100 points total
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Core Values</p>
          {coreValues.map((cv) => (
            <div key={cv.name} className="flex items-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: cv.color }} />
              <div>
                <p className="text-xs font-medium text-gray-700">{cv.name}</p>
                <p className="text-[10px] text-gray-400">{cv.detail} · max {cv.max} pts</p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Grade Thresholds</p>
          <div className="space-y-2">
            {grades.map((g) => (
              <div key={g.grade} className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${g.bg} ${g.text}`}>
                  {g.grade}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-800">{g.label}</p>
                  <p className="text-[10px] text-gray-400">{g.range} points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
