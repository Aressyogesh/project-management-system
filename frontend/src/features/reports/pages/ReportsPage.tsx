import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
// Legend intentionally omitted — not used after PvA redesign
import * as XLSX from 'xlsx-js-style';
import { analyticsApi, PlannedVsActualRecord } from '../../../api/analyticsApi';
import { projectsApi } from '../../../api/projects.api';
import { usePageSize } from '../../../hooks/usePageSize';
import { useAuthStore } from '../../../store/authStore';
import { CapacityReportTab } from '../components/CapacityReportTab';
import { BillingReportPage } from './BillingReportPage';
import { transformLiveKpi } from '../../kpi/data/kpiStaticData';

type Tab = 'productivity' | 'projects' | 'bugs' | 'allocation' | 'timesheet' | 'planned-actual' | 'capacity' | 'billing';

const TABS: { id: Tab; label: string }[] = [
  { id: 'productivity',   label: 'Team Productivity'  },
  { id: 'projects',       label: 'Project Summary'    },
  { id: 'bugs',           label: 'Bug Summary'         },
  { id: 'allocation',     label: 'Task Allocation'    },
  { id: 'timesheet',      label: 'Timesheet'          },
  { id: 'planned-actual', label: 'Planned vs Actual'  },
  { id: 'capacity',       label: 'Capacity'            },
  { id: 'billing',        label: 'Billing'             },
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
          ['Name', 'Role', 'Work Item Assigned', 'Work Item Completed', 'Hours Logged', 'On-Time %', 'Score'],
          ...data.map((r) => [r.name, r.role, String(r.storiesAssigned ?? 0), String(r.tasksDone), String(r.hoursLogged), `${r.onTimePct}%`, String(r.score)]),
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
                <th className="px-5 py-3 text-right">Work Item Assigned</th>
                <th className="px-5 py-3 text-right">Work Item Completed</th>
                <th className="px-5 py-3 text-right">Hours</th>
                <th className="px-5 py-3 text-right">On-Time %</th>
                <th className="px-5 py-3 text-left min-w-[140px]">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">No data for this period.</td></tr>
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
                    <td className="px-5 py-3 text-right text-gray-600">{r.storiesAssigned ?? 0}</td>
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

// ─── Project Summary Tab ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  EPIC: 'Epic',
  USER_STORY: 'Story',
  TASK: 'Task',
  SUB_TASK: 'Sub Task',
  BUG: 'Bug',
};

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
          ['Project', 'Type', 'Total', 'Done', 'Complete %', 'Status'],
          ...projects.flatMap((p) =>
            (p.breakdown ?? []).map((b) => [p.name, TYPE_LABELS[b.type] ?? b.type, String(b.total), String(b.done), `${b.completePct}%`, p.status])
          ),
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

            {/* Work Item Type Breakdown */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Done</th>
                    <th className="px-3 py-2 text-right">Complete %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(proj.breakdown ?? []).filter((b) => b.total > 0).map((b) => (
                    <tr key={b.type} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-medium text-gray-700">{TYPE_LABELS[b.type] ?? b.type}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{b.total}</td>
                      <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{b.done}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-semibold ${b.completePct === 100 ? 'text-emerald-600' : b.completePct >= 50 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {b.completePct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(proj.breakdown ?? []).every((b) => b.total === 0) && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">No work items in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Overall Progress</span><span>{pct}%</span></div>
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

const SEVERITY_LABELS: Record<string, string> = {
  SHOW_STOPPER: 'Show Stopper',
  BLOCKER: 'Blocker',
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
  TRIVIAL: 'Trivial',
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  SECURITY: 'Security',
  CRASH_HANG: 'Crash / Hang',
  DATA_LOSS: 'Data Loss',
  PERFORMANCE: 'Performance',
  UI_USABILITY: 'UI / Usability',
  OTHER_BUG: 'Other Bug',
  OTHER: 'Other',
  FEATURE_NEW: 'Feature Request',
  ENHANCEMENT: 'Enhancement',
  DESIGN: 'Design',
  NEW_BUG: 'New Bug',
  CODE_REVIEW: 'Code Review',
  UNIT_TESTING: 'Unit Testing',
  SUGGESTION: 'Suggestion',
  PROJECT_MANAGEMENT: 'Project Management',
};

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
        <CsvButton onClick={() => {
          const severityRows = (data?.severity ?? []).filter((d) => d.count > 0);
          const classRows    = (data?.classification ?? []).filter((d) => d.count > 0);
          const sevTotal     = severityRows.reduce((s, d) => s + d.count, 0);
          const clsTotal     = classRows.reduce((s, d) => s + d.count, 0);
          const periodLabel  = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;
          downloadCsv(`bug-summary-report-${period}.csv`, [
            [`Bug Summary Report — ${periodLabel}`, '', ''],
            ['', '', ''],
            ['=== BUG SEVERITY ===', '', ''],
            ['Severity', 'Count', '% of Total'],
            ...severityRows.map((d) => [SEVERITY_LABELS[d.severity] ?? d.severity, String(d.count), sevTotal > 0 ? `${Math.round((d.count / sevTotal) * 100)}%` : '0%']),
            ['TOTAL', String(sevTotal), '100%'],
            ['', '', ''],
            ['=== BUG CLASSIFICATION ===', '', ''],
            ['Classification', 'Count', '% of Total'],
            ...classRows.map((d) => [CLASSIFICATION_LABELS[d.classification] ?? d.classification, String(d.count), clsTotal > 0 ? `${Math.round((d.count / clsTotal) * 100)}%` : '0%']),
            ['TOTAL', String(clsTotal), '100%'],
          ]);
        }} />
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
                  formatter={(v: number, name: string) => [`${v} bugs`, SEVERITY_LABELS[name] ?? name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {allSeverityData.map((d) => (
              <div key={d.severity} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-gray-500">{SEVERITY_LABELS[d.severity] ?? d.severity} — <span className="font-semibold text-gray-700">{d.count}</span></span>
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
                    <span className="text-gray-600 font-medium">{CLASSIFICATION_LABELS[d.classification] ?? d.classification}</span>
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
            <p className="text-xs text-gray-400 mt-1">{SEVERITY_LABELS[d.severity] ?? d.severity}</p>
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

function TimesheetTab({ currentUserId, period, project }: { currentUserId?: string; period: string; project: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports-timesheet', period, project],
    queryFn: () => analyticsApi.getTimesheet(period, project),
    staleTime: 60_000,
  });

  const totalHours = data.reduce((s, r) => s + r.hoursLogged, 0);
  const { paginatedData, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex } = usePagination(data, 'timesheet');
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  if (isLoading) return <TabSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CsvButton onClick={() => downloadCsv(`timesheet-report-${period}.csv`, [
          ['Name', 'Role', 'Project', 'Hours Logged'],
          ...data.map((r) => [r.name, r.role, r.project, String(r.hoursLogged)]),
        ])} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{totalHours}h</p>
          <p className="text-xs text-gray-400 mt-1">Total Hours Logged</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-700">{data.length}</p>
          <p className="text-xs text-gray-400 mt-1">Team Members</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-700">
            {data.length > 0 ? Math.round(totalHours / data.length * 10) / 10 : 0}h
          </p>
          <p className="text-xs text-gray-400 mt-1">Avg Hours / Member</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-sm text-gray-400">No timesheet data for this period.</td></tr>
              )}
              {paginatedData.map((r, i) => {
                const isMe = r.userId === currentUserId;
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

// ─── Planned vs Actual — helpers ─────────────────────────────────────────────

const PVA_MONTHS = [
  { v: 1, l: 'Jan' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' },
  { v: 4, l: 'Apr' }, { v: 5, l: 'May' }, { v: 6, l: 'Jun' },
  { v: 7, l: 'Jul' }, { v: 8, l: 'Aug' }, { v: 9, l: 'Sep' },
  { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dec' },
];
const PVA_MONTH_FULL = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function pvaYears() {
  const y = new Date().getFullYear();
  return Array.from({ length: y - 2023 }, (_, i) => y - i);
}
function pvaPeriod(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`;
}

type PvaStatus = 'over' | 'under' | 'ontrack';

function pvaStatusCfg(s: PvaStatus) {
  if (s === 'over')  return { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Over Budget', color: '#EF4444', rgb: 'FEE2E2', fontRgb: 'DC2626' };
  if (s === 'under') return { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Under',       color: '#F59E0B', rgb: 'FEF3C7', fontRgb: 'D97706' };
  return               { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'On Track',    color: '#10B981', rgb: 'D1FAE5', fontRgb: '059669' };
}
function effStatus(eff: number): PvaStatus { return eff > 110 ? 'over' : eff < 80 ? 'under' : 'ontrack'; }

interface ConsolidatedPva {
  userId: string; name: string; role: string;
  monthData: Map<number, PlannedVsActualRecord>;
  totalPlanned: number; totalActual: number; totalTasks: number;
  totalVariance: number; efficiency: number; status: PvaStatus;
}

// Bullet bar: track = planned, fill = actual, overflow = red when over
function BulletBar({ planned, actual }: { planned: number; actual: number }) {
  if (planned === 0 && actual === 0) return <span className="text-xs text-gray-300">—</span>;
  const eff      = planned > 0 ? (actual / planned) * 100 : 100;
  const isOver   = eff > 100;
  const barColor = eff > 110 ? '#EF4444' : eff >= 80 ? '#10B981' : '#F59E0B';
  const trackBg  = eff > 110 ? '#FEE2E2' : eff >= 80 ? '#ECFDF5' : '#FFFBEB';
  // When over: bar width = 100% (actual), planned marker at (planned/actual)*100
  // When under: bar width = (actual/planned)*100, planned marker at 100%
  const fillPct   = isOver ? 100 : (actual / planned) * 100;
  const markerPct = isOver ? (planned / actual) * 100 : 100;
  const effRounded = Math.round(eff);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 relative h-5 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
        <div className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-500"
          style={{ width: `${fillPct}%`, backgroundColor: barColor, opacity: 0.75 }} />
        <div className="absolute inset-y-0 w-[2px] z-10"
          style={{ left: `${markerPct}%`, backgroundColor: '#334155', opacity: 0.45 }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 z-20 drop-shadow-sm">
          {effRounded}% efficiency
        </span>
      </div>
      <div className="shrink-0 text-right w-[90px]">
        <span className="text-xs font-semibold" style={{ color: barColor }}>{actual}h</span>
        <span className="text-xs text-gray-400"> / {planned}h</span>
      </div>
    </div>
  );
}

// Mini efficiency pill used in the multi-month grid
function EffPill({ planned, actual }: { planned?: number; actual?: number }) {
  if (!planned && !actual) return <span className="text-xs text-gray-300">—</span>;
  const p = planned ?? 0; const a = actual ?? 0;
  const eff = p > 0 ? Math.round((a / p) * 100) : a > 0 ? 100 : 0;
  const cfg = pvaStatusCfg(effStatus(eff));
  return (
    <div className="text-center">
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{eff}%</span>
      <div className="text-[9px] text-gray-400 mt-0.5">{a}h / {p}h</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XS = Record<string, any>;
function xc(v: string | number, t: 's' | 'n', s: XS): XLSX.CellObject { return { v, t, s } as XLSX.CellObject; }
const PVA_HDR: XS = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
  fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { bottom: { style: 'thin', color: { rgb: '334155' } } },
};
function savePvaXlsx(wb: XLSX.WorkBook, fileName: string) {
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportPvaSingle(rows: PlannedVsActualRecord[], year: number, month: number) {
  const wb = XLSX.utils.book_new(); const ws: XLSX.WorkSheet = {};
  const mn = PVA_MONTH_FULL[month];
  const totalP = rows.reduce((s, r) => s + r.plannedHours, 0);
  const totalA = rows.reduce((s, r) => s + r.actualHours, 0);
  const eff = totalP > 0 ? Math.round((totalA / totalP) * 100) : 0;

  ws['A1'] = xc(`Planned vs Actual — ${mn} ${year}`, 's', { font: { bold: true, sz: 14, color: { rgb: '1E293B' } } });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

  // Summary band
  const sumL = ['Total Planned', 'Total Actual', 'Variance', 'Efficiency', 'Over Budget', 'Under', 'On Track'];
  const sumV = [
    `${totalP}h`, `${totalA}h`,
    `${Math.round((totalA - totalP) * 10) / 10 > 0 ? '+' : ''}${Math.round((totalA - totalP) * 10) / 10}h`,
    `${eff}%`,
    String(rows.filter(r => r.status === 'over').length),
    String(rows.filter(r => r.status === 'under').length),
    String(rows.filter(r => r.status === 'ontrack').length),
  ];
  sumL.forEach((l, i) => {
    ws[XLSX.utils.encode_cell({ r: 1, c: i })] = xc(l, 's', { font: { sz: 9, color: { rgb: '94A3B8' } }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: 2, c: i })] = xc(sumV[i], 's', { font: { bold: true, sz: 13, color: { rgb: '1E293B' } }, alignment: { horizontal: 'center' } });
  });

  // Header row 4
  ['#', 'Employee', 'Role', 'Tasks', 'Planned (h)', 'Actual (h)', 'Variance (h)', 'Efficiency %', 'Status'].forEach((h, i) =>
    ws[XLSX.utils.encode_cell({ r: 4, c: i })] = xc(h, 's', PVA_HDR));

  rows.forEach((r, idx) => {
    const row = 5 + idx;
    const bg  = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
    const e   = r.plannedHours > 0 ? Math.round((r.actualHours / r.plannedHours) * 100) : 0;
    const cfg = pvaStatusCfg(r.status);
    const fill = (rgb: string): XS => ({ fill: { patternType: 'solid', fgColor: { rgb } } });
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = xc(idx + 1, 'n', { ...fill(bg), font: { sz: 9, color: { rgb: '94A3B8' } }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = xc(r.name, 's', { ...fill(bg), font: { bold: true, sz: 10 } });
    ws[XLSX.utils.encode_cell({ r: row, c: 2 })] = xc(r.role.replace(/_/g, ' '), 's', { ...fill(bg), font: { sz: 9, color: { rgb: '64748B' } } });
    ws[XLSX.utils.encode_cell({ r: row, c: 3 })] = xc(r.taskCount, 'n', { ...fill(bg), alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: 4 })] = xc(r.plannedHours, 'n', { ...fill(bg), font: { bold: true }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: 5 })] = xc(r.actualHours, 'n', { ...fill(bg), font: { bold: true, color: { rgb: cfg.fontRgb } }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: 6 })] = xc(`${r.variance > 0 ? '+' : ''}${r.variance}h`, 's', { ...fill(bg), font: { bold: true, color: { rgb: r.variance > 0 ? 'DC2626' : r.variance < 0 ? 'D97706' : '059669' } }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: 7 })] = xc(`${e}%`, 's', { fill: { patternType: 'solid', fgColor: { rgb: cfg.rgb } }, font: { bold: true, color: { rgb: cfg.fontRgb } }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: 8 })] = xc(cfg.label, 's', { fill: { patternType: 'solid', fgColor: { rgb: cfg.rgb } }, font: { bold: true, color: { rgb: cfg.fontRgb } }, alignment: { horizontal: 'center' } });
  });

  ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 12 }];
  ws['!rows'] = [{ hpt: 22 }, { hpt: 14 }, { hpt: 22 }, { hpt: 6 }, { hpt: 24 }];
  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 5 + rows.length - 1, c: 8 } });
  ws['!freeze'] = { xSplit: 2, ySplit: 5 };
  XLSX.utils.book_append_sheet(wb, ws, mn);
  savePvaXlsx(wb, `PvA_${mn}_${year}.xlsx`);
}

function exportPvaConsolidated(consolidated: ConsolidatedPva[], months: number[], year: number) {
  const wb = XLSX.utils.book_new(); const ws: XLSX.WorkSheet = {};
  ws['A1'] = xc(`Planned vs Actual — Consolidated ${year}`, 's', { font: { bold: true, sz: 14, color: { rgb: '1E293B' } } });

  const hdrRow = 2; let col = 0;
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc('Employee', 's', PVA_HDR);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc('Role',     's', PVA_HDR);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc('Tasks',    's', PVA_HDR);
  months.forEach(m => {
    const ml = PVA_MONTHS.find(x => x.v === m)?.l ?? '';
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc(`${ml}\nPlanned`, 's', PVA_HDR);
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc(`${ml}\nActual`,  's', PVA_HDR);
    ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc(`${ml}\nEff%`,    's', PVA_HDR);
  });
  const dkHdr = { ...PVA_HDR, fill: { patternType: 'solid', fgColor: { rgb: '334155' } } };
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc('Total\nPlanned', 's', dkHdr);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc('Total\nActual',  's', dkHdr);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc('Efficiency',     's', dkHdr);
  ws[XLSX.utils.encode_cell({ r: hdrRow, c: col++ })] = xc('Status',         's', dkHdr);
  const totalCols = col;

  consolidated.forEach((emp, empIdx) => {
    const row = hdrRow + 1 + empIdx;
    const bg  = empIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
    const cfg = pvaStatusCfg(emp.status);
    const fill = (rgb: string): XS => ({ fill: { patternType: 'solid', fgColor: { rgb } } });
    let c = 0;
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(emp.name, 's', { ...fill(bg), font: { bold: true, sz: 10 } });
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(emp.role.replace(/_/g, ' '), 's', { ...fill(bg), font: { sz: 9, color: { rgb: '64748B' } } });
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(emp.totalTasks, 'n', { ...fill(bg), alignment: { horizontal: 'center' } });
    months.forEach(m => {
      const md  = emp.monthData.get(m);
      const mEff = md && md.plannedHours > 0 ? Math.round((md.actualHours / md.plannedHours) * 100) : 0;
      const effRgb = !md ? 'F8FAFC' : mEff > 110 ? 'FEE2E2' : mEff >= 80 ? 'D1FAE5' : 'FEF3C7';
      const effFont = !md ? '94A3B8' : mEff > 110 ? 'DC2626' : mEff >= 80 ? '059669' : 'D97706';
      ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(md?.plannedHours ?? '-', md ? 'n' : 's', { ...fill(bg), alignment: { horizontal: 'center' } });
      ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(md?.actualHours  ?? '-', md ? 'n' : 's', { ...fill(bg), alignment: { horizontal: 'center' } });
      ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(md ? `${mEff}%` : '-', 's', { fill: { patternType: 'solid', fgColor: { rgb: effRgb } }, font: { bold: !!md, color: { rgb: effFont } }, alignment: { horizontal: 'center' } });
    });
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(emp.totalPlanned, 'n', { ...fill('F1F5F9'), font: { bold: true }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(emp.totalActual,  'n', { fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }, font: { bold: true, color: { rgb: cfg.fontRgb } }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(`${emp.efficiency}%`, 's', { fill: { patternType: 'solid', fgColor: { rgb: cfg.rgb } }, font: { bold: true, color: { rgb: cfg.fontRgb } }, alignment: { horizontal: 'center' } });
    ws[XLSX.utils.encode_cell({ r: row, c: c++ })] = xc(cfg.label, 's', { fill: { patternType: 'solid', fgColor: { rgb: cfg.rgb } }, font: { bold: true, color: { rgb: cfg.fontRgb } }, alignment: { horizontal: 'center' } });
  });

  ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 7 }, ...months.flatMap(() => [{ wch: 10 }, { wch: 10 }, { wch: 8 }]), { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 12 }];
  ws['!rows'] = [{ hpt: 22 }, { hpt: 28 }];
  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: hdrRow + consolidated.length, c: totalCols - 1 } });
  ws['!freeze'] = { xSplit: 2, ySplit: hdrRow + 1 };
  XLSX.utils.book_append_sheet(wb, ws, `PvA ${year}`);
  savePvaXlsx(wb, `PvA_Consolidated_${year}.xlsx`);
}

// ─── Planned vs Actual Tab ────────────────────────────────────────────────────

function PlannedVsActualTab({ currentUserId, project }: { currentUserId?: string; period: string; project: string }) {
  const today = new Date();
  const [year, setYear]             = useState(today.getFullYear());
  const [selectedMonths, setMonths] = useState<number[]>([today.getMonth() + 1]);

  const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
  const projectId    = project && project !== 'all' ? project : undefined;

  function toggleMonth(m: number) {
    setMonths(prev => prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m]);
  }

  const results = useQueries({
    queries: sortedMonths.map(m => ({
      queryKey: ['reports-pva', year, m, projectId],
      queryFn:  () => analyticsApi.getPlannedVsActual(pvaPeriod(year, m), projectId),
      staleTime: 60_000,
    })),
  });

  const isLoading    = results.some(r => r.isLoading);
  const allMonthData = results.map(r => r.data ?? []) as PlannedVsActualRecord[][];
  const isSingle     = sortedMonths.length === 1;

  const consolidated = useMemo((): ConsolidatedPva[] => {
    const map = new Map<string, ConsolidatedPva>();
    sortedMonths.forEach((m, idx) => {
      for (const rec of allMonthData[idx]) {
        if (!map.has(rec.userId)) map.set(rec.userId, { userId: rec.userId, name: rec.name, role: rec.role, monthData: new Map(), totalPlanned: 0, totalActual: 0, totalTasks: 0, totalVariance: 0, efficiency: 0, status: 'ontrack' });
        const e = map.get(rec.userId)!;
        e.monthData.set(m, rec);
        e.totalPlanned += rec.plannedHours;
        e.totalActual  += rec.actualHours;
        e.totalTasks   += rec.taskCount;
      }
    });
    return Array.from(map.values()).map(e => {
      const eff = e.totalPlanned > 0 ? Math.round((e.totalActual / e.totalPlanned) * 100) : 0;
      const variance = Math.round((e.totalActual - e.totalPlanned) * 10) / 10;
      return { ...e, totalVariance: variance, efficiency: eff, status: effStatus(eff) };
    }).sort((a, b) => Math.abs(b.totalVariance) - Math.abs(a.totalVariance));
  }, [allMonthData.map(d => d.length).join(','), sortedMonths.join(',')]);

  const displayData: PlannedVsActualRecord[] = isSingle
    ? (allMonthData[0] ?? [])
    : consolidated.map(e => ({ userId: e.userId, name: e.name, role: e.role, taskCount: e.totalTasks, plannedHours: e.totalPlanned, actualHours: e.totalActual, variance: e.totalVariance, variancePct: e.efficiency - 100, status: e.status }));

  const totalPlanned  = displayData.reduce((s, r) => s + r.plannedHours, 0);
  const totalActual   = displayData.reduce((s, r) => s + r.actualHours, 0);
  const totalVariance = Math.round((totalActual - totalPlanned) * 10) / 10;
  const efficiency    = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
  const overCount     = displayData.filter(r => r.status === 'over').length;
  const underCount    = displayData.filter(r => r.status === 'under').length;
  const onTrackCount  = displayData.filter(r => r.status === 'ontrack').length;
  const effCfg        = pvaStatusCfg(effStatus(efficiency));

  const barData  = (isSingle ? allMonthData[0] ?? [] : displayData).slice(0, 10).map(r => ({ name: r.name.split(' ')[0], Planned: r.plannedHours, Actual: r.actualHours }));
  const trendData = sortedMonths.map((m, i) => ({ month: PVA_MONTHS.find(x => x.v === m)?.l ?? '', Planned: Math.round(allMonthData[i].reduce((s, r) => s + r.plannedHours, 0) * 10) / 10, Actual: Math.round(allMonthData[i].reduce((s, r) => s + r.actualHours, 0) * 10) / 10 }));

  const { paginatedData, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex } = usePagination(displayData, 'planned-actual');

  if (isLoading) return <TabSpinner />;

  return (
    <div className="space-y-5">

      {/* ── Header + selectors ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="shrink-0">
            <h3 className="text-sm font-semibold text-gray-800">Planned vs Actual</h3>
            <p className="text-xs text-gray-400 mt-0.5">Estimation accuracy across your team</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400">
              {pvaYears().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex flex-wrap gap-1">
              {PVA_MONTHS.map(m => {
                const on = selectedMonths.includes(m.v);
                return (
                  <label key={m.v} className={`flex items-center px-2 py-1 rounded-lg border text-xs cursor-pointer select-none transition-colors ${on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                    <input type="checkbox" className="hidden" checked={on} onChange={() => toggleMonth(m.v)} />{m.l}
                  </label>
                );
              })}
            </div>
            {!isLoading && displayData.length > 0 && (
              <button
                onClick={() => isSingle ? exportPvaSingle(displayData, year, sortedMonths[0]) : exportPvaConsolidated(consolidated, sortedMonths, year)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Hero Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1">Total Planned</p>
          <p className="text-2xl font-bold text-gray-800">{totalPlanned}h</p>
          <p className="text-xs text-gray-400 mt-1">{displayData.length} members</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1">Total Actual</p>
          <p className="text-2xl font-bold text-gray-800">{totalActual}h</p>
          <p className="text-xs text-gray-400 mt-1">{displayData.reduce((s, r) => s + r.taskCount, 0)} tasks</p>
        </div>
        <div className={`bg-white rounded-2xl border p-4 shadow-sm text-center ${totalVariance > 0 ? 'border-red-100' : totalVariance < 0 ? 'border-amber-100' : 'border-gray-100'}`}>
          <p className="text-xs text-gray-400 mb-1">Variance</p>
          <p className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-600' : totalVariance < 0 ? 'text-amber-600' : 'text-gray-800'}`}>
            {totalVariance > 0 ? '+' : ''}{totalVariance}h
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalVariance > 0 ? 'over estimate' : totalVariance < 0 ? 'under estimate' : 'exact'}</p>
        </div>
        <div className={`rounded-2xl border-transparent border p-4 shadow-sm text-center ${effCfg.bg}`}>
          <p className={`text-xs mb-1 opacity-60 ${effCfg.text}`}>Team Efficiency</p>
          <p className={`text-2xl font-bold ${effCfg.text}`}>{efficiency}%</p>
          <p className={`text-xs mt-1 opacity-60 ${effCfg.text}`}>actual ÷ planned</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1">Over Budget</p>
          <p className="text-2xl font-bold text-red-600">{overCount}</p>
          <p className="text-xs text-red-400 mt-1">&gt;110% used</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1">On Track</p>
          <p className="text-2xl font-bold text-emerald-600">{onTrackCount}</p>
          <p className="text-xs text-emerald-400 mt-1">80–110%</p>
        </div>
      </div>

      {/* ── Chart ── */}
      {barData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                {isSingle ? `Hours Comparison — ${PVA_MONTH_FULL[sortedMonths[0]]} ${year}` : `Monthly Trend — ${year}`}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isSingle ? `Top ${Math.min(10, barData.length)} members by variance` : `${sortedMonths.length} months selected`}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-slate-400" />Planned</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-blue-500" />Actual</span>
            </div>
          </div>
          {isSingle ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barGap={2} barCategoryGap="30%" margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }} formatter={(v: number, name: string) => [`${v}h`, name]} />
                <Bar dataKey="Planned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual"  fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }} formatter={(v: number, name: string) => [`${v}h`, name]} />
                <Line type="monotone" dataKey="Planned" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4, fill: '#94a3b8' }} />
                <Line type="monotone" dataKey="Actual"  stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Detail Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{isSingle ? 'Member Breakdown' : 'Consolidated Breakdown'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{displayData.length} members · sorted by highest variance</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{overCount} Over</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{underCount} Under</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{onTrackCount} On Track</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isSingle ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-right">Tasks</th>
                  <th className="px-4 py-3 text-center min-w-[280px]">Efficiency (Actual / Planned)</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayData.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">No data for this period.</td></tr>
                )}
                {paginatedData.map((r, i) => {
                  const isMe = r.userId === currentUserId;
                  const cfg  = pvaStatusCfg(r.status);
                  return (
                    <tr key={r.userId} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{startIndex + i}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-indigo-700">{r.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{r.name}</p>
                            <p className="text-[10px] text-gray-400">{r.role.replace(/_/g, ' ')}</p>
                          </div>
                          {isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600 text-xs font-medium">{r.taskCount}</td>
                      <td className="px-4 py-3.5"><BulletBar planned={r.plannedHours} actual={r.actualHours} /></td>
                      <td className={`px-4 py-3.5 text-right font-bold text-xs ${r.variance > 0 ? 'text-red-600' : r.variance < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {r.variance > 0 ? '+' : ''}{r.variance}h
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="sticky left-0 bg-gray-900 px-4 py-3 text-left font-semibold">Employee</th>
                  <th className="px-3 py-3 text-left font-semibold">Role</th>
                  {sortedMonths.map(m => (
                    <th key={m} className="px-3 py-3 text-center font-semibold min-w-[90px]">
                      {PVA_MONTHS.find(x => x.v === m)?.l}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold bg-gray-700 min-w-[110px]">Total</th>
                  <th className="px-3 py-3 text-center font-semibold bg-gray-700">Efficiency</th>
                  <th className="px-3 py-3 text-center font-semibold bg-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {consolidated.length === 0 ? (
                  <tr><td colSpan={sortedMonths.length + 5} className="text-center py-10 text-gray-400">No data.</td></tr>
                ) : consolidated.map((emp, idx) => {
                  const cfg = pvaStatusCfg(emp.status);
                  return (
                    <tr key={emp.userId} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/30 hover:bg-gray-50/60'}>
                      <td className="sticky left-0 bg-inherit px-4 py-3 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-semibold text-indigo-700">{emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                          </div>
                          <p className="font-semibold text-gray-800 text-xs truncate max-w-[120px]">{emp.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-[10px]">{emp.role.replace(/_/g, ' ')}</td>
                      {sortedMonths.map(m => (
                        <td key={m} className="px-3 py-3 text-center">
                          <EffPill planned={emp.monthData.get(m)?.plannedHours} actual={emp.monthData.get(m)?.actualHours} />
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center border-l border-gray-100 bg-gray-50/50">
                        <p className="font-bold text-gray-800 text-xs">{emp.totalActual}h <span className="text-gray-400 font-normal">/ {emp.totalPlanned}h</span></p>
                        <p className="text-[9px] text-gray-400">{emp.totalTasks} tasks</p>
                      </td>
                      <td className="px-3 py-3 text-center border-l border-gray-100">
                        <span className={`font-bold text-base ${cfg.text}`}>{emp.efficiency}%</span>
                      </td>
                      <td className="px-3 py-3 text-center border-l border-gray-100">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {isSingle && totalItems > 0 && (
          <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems}
            startIndex={startIndex} endIndex={endIndex} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>
    </div>
  );
}

// ─── Employee Personal Summary (live) ────────────────────────────────────────

function MyPerformanceSummary({ userId, userName, period, project }: { userId: string; userName: string; period: string; project: string }) {
  const { data: kpiRaw = [] } = useQuery({
    queryKey: ['kpi-live', period],
    queryFn: () => analyticsApi.getKpi(period),
    staleTime: 60_000,
  });
  const { data: prodData = [] } = useQuery({
    queryKey: ['reports-productivity', period, project],
    queryFn: () => analyticsApi.getProductivity(period, project),
    staleTime: 60_000,
  });
  const { data: allocData = [] } = useQuery({
    queryKey: ['reports-allocation', period, project],
    queryFn: () => analyticsApi.getAllocation(period, project),
    staleTime: 60_000,
  });
  const { data: tsData = [] } = useQuery({
    queryKey: ['reports-timesheet', period, project],
    queryFn: () => analyticsApi.getTimesheet(period, project),
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
              <p className="text-xs text-gray-400">Hours Logged</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{myTs.hoursLogged}h</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Main ReportsPage ─────────────────────────────────────────────────────────

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('productivity');
  const [period, setPeriod] = useState(DEFAULT_PERIOD);

  const isAdmin = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_USER';
  const [project, setProject] = useState(isAdmin ? 'all' : '');

  const { data: projectRoleData } = useQuery({
    queryKey: ['my-project-role'],
    queryFn: analyticsApi.getMyProjectRole,
    staleTime: 300_000,
  });
  const isManager = isAdmin || (projectRoleData?.isManager ?? false);

  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects-list', 'active'],
    queryFn: () => projectsApi.list({ status: 'ACTIVE' }),
    staleTime: 120_000,
  });

  // Admin sees "All Projects" option; non-admin must pick one of their assigned projects
  const projectOptions = useMemo(() => {
    const mapped = (projectsList as { id: string; name: string }[]).map((p) => ({ value: p.id, label: p.name }));
    return isAdmin ? [{ value: 'all', label: 'All Projects' }, ...mapped] : mapped;
  }, [projectsList, isAdmin]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-400 mt-0.5">Team performance overview and analytics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {!isAdmin && (
              <option value="">{projectOptions.length === 0 ? 'No projects assigned' : '— Select a Project —'}</option>
            )}
            {projectOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {activeTab !== 'capacity' && activeTab !== 'billing' && (
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Personal summary card — shown to non-admin users as a quick personal view */}
      {!isAdmin && user && (
        <MyPerformanceSummary userId={user.id} userName={user.fullName} period={period} project={project} />
      )}

      {/* Full report tabs — available to all roles */}
      <div className="flex flex-wrap gap-1 bg-gray-100/70 p-1 rounded-2xl w-fit">
        {TABS.filter((tab) => isManager || tab.id !== 'capacity').map((tab) => (
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
      {activeTab === 'projects'     && <ProjectSummaryTab  key={`proj-${period}-${project}`}   period={period} project={project} />}
      {activeTab === 'bugs'         && <BugSummaryTab      key={`bug-${period}-${project}`}    period={period} project={project} />}
      {activeTab === 'allocation'   && <TaskAllocationTab  key={`alloc-${period}-${project}`}  currentUserId={user?.id} period={period} project={project} />}
      {activeTab === 'timesheet'    && <TimesheetTab       key={`ts-${period}-${project}`}      currentUserId={user?.id} period={period} project={project} />}
      {activeTab === 'planned-actual' && <PlannedVsActualTab key={`pva-${period}-${project}`}  currentUserId={user?.id} period={period} project={project} />}
      {activeTab === 'capacity' && isManager && <CapacityReportTab project={project} />}
      {activeTab === 'billing'      && <BillingReportPage />}
    </div>
  );
}
