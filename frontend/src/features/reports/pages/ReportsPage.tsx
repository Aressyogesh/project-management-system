import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../../../api/analyticsApi';
import { projectsApi } from '../../../api/projects.api';
import { usePageSize } from '../../../hooks/usePageSize';
import { useAuthStore } from '../../../store/authStore';
import { GRADE_CONFIG, buildTeamSummary, transformLiveKpi } from '../../kpi/data/kpiStaticData';
import { CapacityReportTab } from '../components/CapacityReportTab';

type Tab = 'productivity' | 'kpi' | 'projects' | 'bugs' | 'allocation' | 'timesheet' | 'planned-actual' | 'capacity';

const TABS: { id: Tab; label: string }[] = [
  { id: 'productivity',   label: 'Team Productivity'  },
  { id: 'kpi',            label: 'KPI Appraisal'      },
  { id: 'projects',       label: 'Project Summary'    },
  { id: 'bugs',           label: 'Bug Summary'         },
  { id: 'allocation',     label: 'Task Allocation'    },
  { id: 'timesheet',      label: 'Timesheet'          },
  { id: 'planned-actual', label: 'Planned vs Actual'  },
  { id: 'capacity',       label: 'Capacity'            },
];

// ─── Period helpers ────────────────────────────────────────────────────────────

function buildPeriodOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { value, label };
  });
}

const PERIOD_OPTIONS = buildPeriodOptions();
const DEFAULT_PERIOD = PERIOD_OPTIONS[0].value;

// ─── CSV utility ──────────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 25];

function usePagination<T>(data: T[], storageKey: string, defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = usePageSize(`reports_${storageKey}`, defaultPageSize);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedData = data.slice(start, start + pageSize);
  function handlePageSizeChange(size: number) { setPageSizeRaw(size); setPage(1); }
  return {
    paginatedData, page: safePage, setPage, pageSize,
    setPageSize: handlePageSizeChange, totalPages, totalItems: data.length,
    startIndex: data.length === 0 ? 0 : start + 1,
    endIndex: Math.min(start + pageSize, data.length),
  };
}

function PaginationBar({
  page, totalPages, totalItems, startIndex, endIndex, pageSize, onPageChange, onPageSizeChange,
}: {
  page: number; totalPages: number; totalItems: number; startIndex: number; endIndex: number;
  pageSize: number; onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-t border-gray-50">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-300"
        >
          {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ml-1">Showing {startIndex}–{endIndex} of {totalItems} records</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
          ‹ Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-7 h-7 text-xs rounded-lg border transition-colors ${
              p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}>
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
          Next ›
        </button>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color = '#3B82F6' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
      data-testid="export-csv-btn"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export CSV
    </button>
  );
}

function TabSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

// ─── Team Productivity Tab ─────────────────────────────────────────────────────

function TeamProductivityTab({ currentUserId, period, project }: { currentUserId?: string; period: string; project: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports-productivity', period, project],
    queryFn: () => analyticsApi.getProductivity(period, project),
    staleTime: 60_000,
  });

  const chartData = data.slice(0, 10).map((r) => ({ name: r.name.split(' ')[0], tasks: r.tasksDone }));
  const { paginatedData, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex } = usePagination(data, 'productivity');
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  if (isLoading) return <TabSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`team-productivity-report-${period}.csv`, [
          ['Name', 'Role', 'Tasks Done', 'Hours Logged', 'On-Time %', 'Score'],
          ...data.map((r) => [r.name, r.role, String(r.tasksDone), String(r.hoursLogged), `${r.onTimePct}%`, String(r.score)]),
        ])} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Tasks Completed — {periodLabel}</h3>
        <p className="text-xs text-gray-400 mb-4">
          {data.length > 10 ? 'Top 10 team members' : `${data.length} team members`} by tasks completed
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
              formatter={(v: number) => [`${v} tasks`, 'Completed']} />
            <Bar dataKey="tasks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Team Productivity Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-right">Tasks</th>
                <th className="px-5 py-3 text-right">Hours</th>
                <th className="px-5 py-3 text-right">On-Time %</th>
                <th className="px-5 py-3 text-left min-w-[140px]">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">No data for this period.</td></tr>
              )}
              {paginatedData.map((r, i) => {
                const isMe = r.userId === currentUserId;
                return (
                  <tr key={r.userId} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{startIndex + i}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary-700">
                            {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.role}</p>
                        </div>
                        {isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-700">{r.tasksDone}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{r.hoursLogged}h</td>
                    <td className="px-5 py-3 text-right text-gray-600">{r.onTimePct}%</td>
                    <td className="px-5 py-3">
                      <ScoreBar value={r.score} color={r.score >= 80 ? '#10B981' : r.score >= 60 ? '#F59E0B' : '#EF4444'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && (
          <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems}
            startIndex={startIndex} endIndex={endIndex} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    </div>
  );
}

// ─── KPI Appraisal Tab ────────────────────────────────────────────────────────

function KpiAppraisalTab({ currentUserId, period }: { currentUserId?: string; period: string }) {
  const { data: liveData = [], isLoading } = useQuery({
    queryKey: ['kpi-live', period],
    queryFn: () => analyticsApi.getKpi(period),
    staleTime: 60_000,
  });

  const kpiData = useMemo(() => liveData.map(transformLiveKpi), [liveData]);
  const summary = kpiData.length > 0 ? buildTeamSummary(kpiData, period) : null;

  const pieData = summary ? [
    { name: 'Grade A', value: summary.gradeACcount, color: '#10B981' },
    { name: 'Grade B', value: summary.gradeBCount,  color: '#3B82F6' },
    { name: 'Grade C', value: summary.gradeCCount,  color: '#F59E0B' },
    { name: 'Grade D', value: summary.gradeDCount,  color: '#EF4444' },
  ].filter((d) => d.value > 0) : [];

  const topPerformers = [...kpiData].sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  const sortedKpi = [...kpiData].sort((a, b) => b.totalScore - a.totalScore);
  const { paginatedData, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex } = usePagination(sortedKpi, 'kpi');
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;
  const gradeConfig = summary ? GRADE_CONFIG[summary.teamGrade] : GRADE_CONFIG['C'];

  if (isLoading) return <TabSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`kpi-appraisal-report-${period}.csv`, [
          ['Name', 'Role', 'Department', 'Total Score', 'Grade'],
          ...sortedKpi.map((e) => [e.name, e.role, e.department, String(e.totalScore), e.grade]),
        ])} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Grade Distribution</h3>
          <p className="text-xs text-gray-400 mb-3">{kpiData.length} employees this period</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
                formatter={(v: number, name: string) => [`${v} employee${v !== 1 ? 's' : ''}`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-gray-500">{d.name} — <span className="font-semibold text-gray-700">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-xs text-gray-400 mb-2">Team Average Score</p>
          <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 ${gradeConfig.border}`}>
            <span className="text-2xl font-bold text-gray-800">{summary?.teamAverage ?? 0}</span>
            <span className={`text-sm font-bold ${gradeConfig.text}`}>{summary?.teamGrade ?? '—'}</span>
          </div>
          <p className={`mt-3 text-xs font-semibold px-3 py-1 rounded-full ${gradeConfig.bg} ${gradeConfig.text}`}>
            {gradeConfig.label}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.length === 0 && <p className="text-xs text-gray-400">No data for this period.</p>}
            {topPerformers.map((e, i) => {
              const gc = GRADE_CONFIG[e.grade];
              return (
                <div key={e.userId} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{e.name}</p>
                    <p className="text-xs text-gray-400">{e.role}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gc.bg} ${gc.text}`}>{e.totalScore}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Employee KPI Details — {periodLabel}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-right">Score</th>
                <th className="px-5 py-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-sm text-gray-400">No KPI data for this period.</td></tr>
              )}
              {paginatedData.map((e) => {
                const gc = GRADE_CONFIG[e.grade];
                const isMe = e.userId === currentUserId;
                return (
                  <tr key={e.userId} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary-700">
                            {e.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800 text-xs">{e.name}</span>
                        {isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{e.role}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-700">{e.totalScore}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gc.bg} ${gc.text}`}>
                        {e.grade} — {gc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && (
          <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems}
            startIndex={startIndex} endIndex={endIndex} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    </div>
  );
}

// ─── Project Summary Tab ──────────────────────────────────────────────────────

function ProjectSummaryTab({ period, project }: { period: string; project: string }) {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['reports-projects', period, project],
    queryFn: () => analyticsApi.getProjects(period, project),
    staleTime: 60_000,
  });

  if (isLoading) return <TabSpinner />;

  const statusColors: Record<string, { bg: string; text: string }> = {
    Active:    { bg: 'bg-blue-100',    text: 'text-blue-700'    },
    Completed: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'On Hold': { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`project-summary-report-${period}.csv`, [
          ['Project', 'Total Tasks', 'Done', 'Team Size', 'Completion %', 'Status'],
          ...projects.map((p) => [p.name, String(p.tasks), String(p.done), String(p.teamSize),
            `${p.tasks > 0 ? Math.round((p.done / p.tasks) * 100) : 0}%`, p.status]),
        ])} />
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-400">No active projects for this period.</div>
      )}

      {projects.map((proj) => {
        const pct = proj.tasks > 0 ? Math.round((proj.done / proj.tasks) * 100) : 0;
        const sc = statusColors[proj.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
        return (
          <div key={proj.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${proj.color}20` }}>
                  <svg className="w-5 h-5" fill="none" stroke={proj.color} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{proj.name}</h3>
                  <p className="text-xs text-gray-400">{proj.teamSize} team members</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{proj.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{proj.done}</p>
                <p className="text-xs text-gray-400">Tasks Done</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{proj.tasks}</p>
                <p className="text-xs text-gray-400">Total Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{pct}%</p>
                <p className="text-xs text-gray-400">Complete</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Progress</span><span>{pct}%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: proj.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bug Summary Tab ──────────────────────────────────────────────────────────

function BugSummaryTab({ period, project }: { period: string; project: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-bugs', period, project],
    queryFn: () => analyticsApi.getBugs(period, project),
    staleTime: 60_000,
  });

  if (isLoading) return <TabSpinner />;

  const allSeverityData = (data?.severity ?? []);
  const severityChartData = allSeverityData.filter((d) => d.count > 0);
  const classificationData = (data?.classification ?? []).filter((d) => d.count > 0);
  const total = allSeverityData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`bug-summary-report-${period}.csv`, [
          ['Section', 'Label', 'Count'],
          ...(data?.severity ?? []).map((d) => ['Severity', d.severity, String(d.count)]),
          ['', '', ''],
          ...(data?.classification ?? []).map((d) => ['Classification', d.classification, String(d.count)]),
        ])} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Bug Severity Distribution</h3>
          <p className="text-xs text-gray-400 mb-3">
            Total: {total} bug{total !== 1 ? 's' : ''} — {PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period}
          </p>
          {total === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No bugs this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="count" nameKey="severity">
                  {severityChartData.map((entry, idx) => <Cell key={idx} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
                  formatter={(v: number, name: string) => [`${v} bugs`, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {allSeverityData.map((d) => (
              <div key={d.severity} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-gray-500">{d.severity} — <span className="font-semibold text-gray-700">{d.count}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Bug Classification</h3>
          {classificationData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              {total > 0 ? 'No classification data for this period.' : 'No bugs this period.'}
            </div>
          ) : (
            <div className="space-y-3">
              {classificationData.map((d) => (
                <div key={d.classification}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{d.classification}</span>
                    <span className="text-gray-500">{d.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full"
                      style={{ width: `${total > 0 ? Math.round((d.count / total) * 100) : 0}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {(data?.severity ?? []).map((d) => (
          <div key={d.severity} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{d.count}</p>
            <p className="text-xs text-gray-400 mt-1">{d.severity}</p>
            <div className="w-6 h-1 rounded-full mx-auto mt-2" style={{ backgroundColor: d.color }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Task Allocation Tab ──────────────────────────────────────────────────────

function TaskAllocationTab({ currentUserId, period, project }: { currentUserId?: string; period: string; project: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports-allocation', period, project],
    queryFn: () => analyticsApi.getAllocation(period, project),
    staleTime: 60_000,
  });

  const chartData = data.slice(0, 10).map((r) => ({ name: r.name.split(' ')[0], hours: r.hoursAllocated }));
  const totalHours = data.reduce((s, r) => s + r.hoursAllocated, 0);
  const avgUtilisation = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.utilisationPct, 0) / data.length) : 0;
  const overAllocated = data.filter((r) => r.utilisationPct > 100).length;
  const { paginatedData, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex } = usePagination(data, 'allocation');
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  if (isLoading) return <TabSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`task-allocation-report-${period}.csv`, [
          ['Name', 'Role', 'Tasks Allocated', 'Hours Allocated', 'Utilisation %'],
          ...data.map((r) => [r.name, r.role, String(r.tasksAllocated), String(r.hoursAllocated), `${r.utilisationPct}%`]),
        ])} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{totalHours}h</p>
          <p className="text-xs text-gray-400 mt-1">Total Hours Logged</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{avgUtilisation}%</p>
          <p className="text-xs text-gray-400 mt-1">Avg Utilisation</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className={`text-2xl font-bold ${overAllocated > 0 ? 'text-red-600' : 'text-gray-800'}`}>{overAllocated}</p>
          <p className="text-xs text-gray-400 mt-1">Over-Allocated</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Hours Allocated — {periodLabel}</h3>
        <p className="text-xs text-gray-400 mb-4">
          {data.length > 10 ? 'Top 10 team members' : `${data.length} team members`} by allocated hours
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
              formatter={(v: number) => [`${v}h`, 'Logged']} />
            <Bar dataKey="hours" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Task Allocation Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-right">Tasks</th>
                <th className="px-5 py-3 text-right">Hours</th>
                <th className="px-5 py-3 text-left min-w-[140px]">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">No allocation data for this period.</td></tr>
              )}
              {paginatedData.map((r, i) => {
                const isMe = r.userId === currentUserId;
                const isOver = r.utilisationPct > 100;
                return (
                  <tr key={r.userId} className={isMe ? 'bg-blue-50' : isOver ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{startIndex + i}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-purple-700">
                            {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.role}</p>
                        </div>
                        {isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                        {isOver && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Over</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-700">{r.tasksAllocated}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{r.hoursAllocated}h</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full"
                            style={{ width: `${Math.min(r.utilisationPct, 100)}%`,
                              backgroundColor: isOver ? '#EF4444' : r.utilisationPct >= 80 ? '#10B981' : '#F59E0B' }} />
                        </div>
                        <span className={`text-xs font-semibold w-10 text-right ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
                          {r.utilisationPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && (
          <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems}
            startIndex={startIndex} endIndex={endIndex} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    </div>
  );
}

// ─── Timesheet Tab ────────────────────────────────────────────────────────────

const TIMESHEET_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Approved:  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Submitted: { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  Draft:     { bg: 'bg-gray-100',    text: 'text-gray-600'    },
};

function TimesheetTab({ currentUserId, period, project }: { currentUserId?: string; period: string; project: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports-timesheet', period, project],
    queryFn: () => analyticsApi.getTimesheet(period, project),
    staleTime: 60_000,
  });

  const totalHours = data.reduce((s, r) => s + r.hoursLogged, 0);
  const approvedCount = data.filter((r) => r.status === 'Approved').length;
  const submittedCount = data.filter((r) => r.status === 'Submitted').length;
  const draftCount = data.filter((r) => r.status === 'Draft').length;
  const { paginatedData, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex } = usePagination(data, 'timesheet');
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  if (isLoading) return <TabSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`timesheet-report-${period}.csv`, [
          ['Name', 'Role', 'Project', 'Hours Logged', 'Status'],
          ...data.map((r) => [r.name, r.role, r.project, String(r.hoursLogged), r.status]),
        ])} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{totalHours}h</p>
          <p className="text-xs text-gray-400 mt-1">Total Hours Logged</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
          <p className="text-xs text-gray-400 mt-1">Approved</p>
        </div>
        <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{submittedCount}</p>
          <p className="text-xs text-gray-400 mt-1">Submitted</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-500">{draftCount}</p>
          <p className="text-xs text-gray-400 mt-1">Draft</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Timesheet Summary — {periodLabel}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-left">Project</th>
                <th className="px-5 py-3 text-right">Hours</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">No timesheet data for this period.</td></tr>
              )}
              {paginatedData.map((r, i) => {
                const isMe = r.userId === currentUserId;
                const sc = TIMESHEET_STATUS_STYLE[r.status] ?? TIMESHEET_STATUS_STYLE['Approved'];
                return (
                  <tr key={r.userId} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{startIndex + i}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-amber-700">
                            {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.role}</p>
                        </div>
                        {isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{r.project}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-700">{r.hoursLogged}h</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && (
          <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems}
            startIndex={startIndex} endIndex={endIndex} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    </div>
  );
}

// ─── Planned vs Actual Tab ────────────────────────────────────────────────────

function PlannedVsActualTab({ currentUserId, period, project }: { currentUserId?: string; period: string; project: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports-planned-actual', period, project],
    queryFn: () => analyticsApi.getPlannedVsActual(period, project),
    staleTime: 60_000,
  });

  const totalPlanned  = data.reduce((s, r) => s + r.plannedHours, 0);
  const totalActual   = data.reduce((s, r) => s + r.actualHours, 0);
  const totalVariance = Math.round((totalActual - totalPlanned) * 10) / 10;
  const overCount     = data.filter((r) => r.status === 'over').length;
  const underCount    = data.filter((r) => r.status === 'under').length;
  const onTrackCount  = data.filter((r) => r.status === 'ontrack').length;

  const chartData = data.slice(0, 10).map((r) => ({
    name:    r.name.split(' ')[0],
    Planned: r.plannedHours,
    Actual:  r.actualHours,
  }));

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;
  const { paginatedData, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex } = usePagination(data, 'planned-actual');

  if (isLoading) return <TabSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`planned-vs-actual-${period}.csv`, [
          ['Name', 'Role', 'Tasks', 'Planned (h)', 'Actual (h)', 'Variance (h)', 'Variance %', 'Status'],
          ...data.map((r) => [r.name, r.role, String(r.taskCount), String(r.plannedHours), String(r.actualHours), String(r.variance), `${r.variancePct}%`, r.status]),
        ])} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{totalPlanned}h</p>
          <p className="text-xs text-gray-400 mt-1">Total Planned</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{totalActual}h</p>
          <p className="text-xs text-gray-400 mt-1">Total Actual</p>
        </div>
        <div className={`bg-white rounded-2xl border p-4 shadow-sm text-center ${totalVariance > 0 ? 'border-red-100' : totalVariance < 0 ? 'border-emerald-100' : 'border-gray-100'}`}>
          <p className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-600' : totalVariance < 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
            {totalVariance > 0 ? '+' : ''}{totalVariance}h
          </p>
          <p className="text-xs text-gray-400 mt-1">Total Variance</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-600">{overCount}</p>
          <p className="text-xs text-gray-400 mt-1">Over Budget</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{onTrackCount}</p>
          <p className="text-xs text-gray-400 mt-1">On Track</p>
        </div>
      </div>

      {/* Side-by-side bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Planned vs Actual Hours — {periodLabel}</h3>
          <p className="text-xs text-gray-400 mb-4">
            {data.length > 10 ? 'Top 10 members' : `${data.length} members`} sorted by variance
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2} barCategoryGap="30%" margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
                formatter={(v: number, name: string) => [`${v}h`, name]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '10px' }} />
              <Bar dataKey="Planned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual"  fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Planned vs Actual Details</h3>
            <p className="text-xs text-gray-400 mt-0.5">{data.length} members · sorted by highest variance</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{overCount} Over</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{underCount} Under</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{onTrackCount} On Track</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-right">Tasks</th>
                <th className="px-5 py-3 text-right">Planned</th>
                <th className="px-5 py-3 text-right">Actual</th>
                <th className="px-5 py-3 text-right">Variance</th>
                <th className="px-5 py-3 text-left min-w-[160px]">Progress</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-sm text-gray-400">No data for this period.</td></tr>
              )}
              {paginatedData.map((r, i) => {
                const isMe = r.userId === currentUserId;
                const isOver  = r.status === 'over';
                const isUnder = r.status === 'under';
                const statusCfg = isOver
                  ? { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Over'     }
                  : isUnder
                  ? { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Under'    }
                  : { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'On Track' };

                const maxBar = Math.max(r.plannedHours, r.actualHours, 1);
                const plannedPct = Math.round((r.plannedHours / maxBar) * 100);
                const actualPct  = Math.round((r.actualHours  / maxBar) * 100);

                return (
                  <tr key={r.userId} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{startIndex + i}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-indigo-700">
                            {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.role}</p>
                        </div>
                        {isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 text-xs">{r.taskCount}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-700">{r.plannedHours}h</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-700">{r.actualHours}h</td>
                    <td className={`px-5 py-3 text-right font-semibold text-xs ${isOver ? 'text-red-600' : isUnder ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {r.variance > 0 ? '+' : ''}{r.variance}h ({r.variancePct > 0 ? '+' : ''}{r.variancePct}%)
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 w-10 shrink-0">Plan</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${plannedPct}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 w-10 shrink-0">Act</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{
                              width: `${actualPct}%`,
                              backgroundColor: isOver ? '#EF4444' : isUnder ? '#F59E0B' : '#10B981',
                            }} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalItems > 0 && (
          <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems}
            startIndex={startIndex} endIndex={endIndex} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    </div>
  );
}

// ─── Employee Personal Summary (live) ────────────────────────────────────────

function MyPerformanceSummary({ userId, userName, period }: { userId: string; userName: string; period: string }) {
  const { data: kpiRaw = [] } = useQuery({
    queryKey: ['kpi-live', period],
    queryFn: () => analyticsApi.getKpi(period),
    staleTime: 60_000,
  });
  const { data: prodData = [] } = useQuery({
    queryKey: ['reports-productivity', period, 'all'],
    queryFn: () => analyticsApi.getProductivity(period),
    staleTime: 60_000,
  });
  const { data: allocData = [] } = useQuery({
    queryKey: ['reports-allocation', period, 'all'],
    queryFn: () => analyticsApi.getAllocation(period),
    staleTime: 60_000,
  });
  const { data: tsData = [] } = useQuery({
    queryKey: ['reports-timesheet', period, 'all'],
    queryFn: () => analyticsApi.getTimesheet(period),
    staleTime: 60_000,
  });

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  const myKpiRaw = kpiRaw.find((r) => r.userId === userId);
  const myKpi = myKpiRaw ? transformLiveKpi(myKpiRaw) : null;
  const myProd = prodData.find((r) => r.userId === userId);
  const myAlloc = allocData.find((r) => r.userId === userId);
  const myTs = tsData.find((r) => r.userId === userId);

  const grade = myKpi?.grade ?? null;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-1">My Performance — {periodLabel}</h3>
        <p className="text-xs text-blue-600">{userName}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{myProd?.tasksDone ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Tasks Done</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{myProd ? `${myProd.hoursLogged}h` : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Hours Logged</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{myKpi ? myKpi.totalScore : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">KPI Score{grade ? ` (Grade ${grade})` : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{myAlloc ? `${myAlloc.utilisationPct}%` : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Utilisation</p>
        </div>
      </div>

      {myTs && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">My Allocation &amp; Timesheet</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Project</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{myTs.project}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Timesheet Status</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block
                ${TIMESHEET_STATUS_STYLE[myTs.status]?.bg ?? 'bg-gray-100'}
                ${TIMESHEET_STATUS_STYLE[myTs.status]?.text ?? 'text-gray-600'}`}>
                {myTs.status}
              </span>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Full team reports are available to Admin and Super User roles.
      </p>
    </div>
  );
}

// ─── Main ReportsPage ─────────────────────────────────────────────────────────

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('productivity');
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [project, setProject] = useState('all');

  const isAdminView = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_USER';

  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects-list', 'active'],
    queryFn: () => projectsApi.list({ status: 'ACTIVE' }),
    enabled: isAdminView,
    staleTime: 120_000,
  });

  const projectOptions = useMemo(() => [
    { value: 'all', label: 'All Projects' },
    ...(projectsList as { id: string; name: string }[]).map((p) => ({ value: p.id, label: p.name })),
  ], [projectsList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-400 mt-0.5">Team performance overview and analytics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdminView && (
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              {projectOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee personal view (RBAC: Employee only sees own data) */}
      {!isAdminView && user && (
        <MyPerformanceSummary userId={user.id} userName={user.fullName} period={period} />
      )}

      {/* Admin / Super User tabs */}
      {isAdminView && (
        <>
          <div className="flex flex-wrap gap-1 bg-gray-100/70 p-1 rounded-2xl w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'productivity' && <TeamProductivityTab key={`prod-${period}-${project}`} currentUserId={user?.id} period={period} project={project} />}
          {activeTab === 'kpi'          && <KpiAppraisalTab    key={`kpi-${period}`}               currentUserId={user?.id} period={period} />}
          {activeTab === 'projects'     && <ProjectSummaryTab  key={`proj-${period}-${project}`}   period={period} project={project} />}
          {activeTab === 'bugs'         && <BugSummaryTab      key={`bug-${period}-${project}`}    period={period} project={project} />}
          {activeTab === 'allocation'   && <TaskAllocationTab  key={`alloc-${period}-${project}`}  currentUserId={user?.id} period={period} project={project} />}
          {activeTab === 'timesheet'      && <TimesheetTab         key={`ts-${period}-${project}`}      currentUserId={user?.id} period={period} project={project} />}
          {activeTab === 'planned-actual' && <PlannedVsActualTab  key={`pva-${period}-${project}`}     currentUserId={user?.id} period={period} project={project} />}
          {activeTab === 'capacity'       && <CapacityReportTab />}
        </>
      )}
    </div>
  );
}
