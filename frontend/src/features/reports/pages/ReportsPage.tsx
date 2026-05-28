import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuthStore } from '../../../store/authStore';
import { STATIC_KPI_DATA, buildTeamSummary, GRADE_CONFIG } from '../../kpi/data/kpiStaticData';
import {
  STATIC_PRODUCTIVITY_DATA,
  STATIC_PROJECT_DATA,
  STATIC_BUG_SEVERITY_DATA,
  STATIC_BUG_CLASSIFICATION_DATA,
  STATIC_ALLOCATION_DATA,
  STATIC_TIMESHEET_DATA,
  REPORT_PERIODS,
  type TimesheetStatus,
} from '../data/reportsStaticData';

type Tab = 'productivity' | 'kpi' | 'projects' | 'bugs' | 'allocation' | 'timesheet';

const TABS: { id: Tab; label: string }[] = [
  { id: 'productivity', label: 'Team Productivity' },
  { id: 'kpi',         label: 'KPI Appraisal'    },
  { id: 'projects',    label: 'Project Summary'  },
  { id: 'bugs',        label: 'Bug Summary'       },
  { id: 'allocation',  label: 'Task Allocation'  },
  { id: 'timesheet',   label: 'Timesheet'        },
];

// ─── CSV export utility ───────────────────────────────────────────────────────

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

function csvForTab(tab: Tab): void {
  switch (tab) {
    case 'productivity':
      downloadCsv('team-productivity-report-may-2026.csv', [
        ['Name', 'Role', 'Tasks Done', 'Hours Logged', 'On-Time %', 'Score'],
        ...STATIC_PRODUCTIVITY_DATA.map((r) => [r.name, r.role, String(r.tasksDone), String(r.hoursLogged), `${r.onTimePct}%`, String(r.score)]),
      ]);
      break;
    case 'kpi':
      downloadCsv('kpi-appraisal-report-may-2026.csv', [
        ['Name', 'Role', 'Department', 'Total Score', 'Grade'],
        ...[...STATIC_KPI_DATA].sort((a, b) => b.totalScore - a.totalScore).map((e) => [e.name, e.role, e.department, String(e.totalScore), e.grade]),
      ]);
      break;
    case 'projects':
      downloadCsv('project-summary-report-may-2026.csv', [
        ['Project', 'Total Tasks', 'Done', 'Team Size', 'Completion %', 'Status'],
        ...STATIC_PROJECT_DATA.map((p) => [p.name, String(p.tasks), String(p.done), String(p.teamSize), `${Math.round((p.done / p.tasks) * 100)}%`, p.status]),
      ]);
      break;
    case 'bugs':
      downloadCsv('bug-summary-report-may-2026.csv', [
        ['Severity', 'Count'],
        ...STATIC_BUG_SEVERITY_DATA.map((d) => [d.severity, String(d.count)]),
      ]);
      break;
    case 'allocation':
      downloadCsv('task-allocation-report-may-2026.csv', [
        ['Name', 'Role', 'Tasks Allocated', 'Hours Allocated', 'Utilisation %'],
        ...STATIC_ALLOCATION_DATA.map((r) => [r.name, r.role, String(r.tasksAllocated), String(r.hoursAllocated), `${r.utilisationPct}%`]),
      ]);
      break;
    case 'timesheet':
      downloadCsv('timesheet-report-may-2026.csv', [
        ['Name', 'Role', 'Project', 'Hours Logged', 'Status'],
        ...STATIC_TIMESHEET_DATA.map((r) => [r.name, r.role, r.project, String(r.hoursLogged), r.status]),
      ]);
      break;
  }
}

// ─── Shared export button ─────────────────────────────────────────────────────

function ExportBar({ tab }: { tab: Tab }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
        onClick={() => csvForTab(tab)}
        data-testid="export-csv-btn"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export CSV
      </button>
      <button
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
        onClick={() => undefined}
        title="PDF export coming in a future phase"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export PDF
      </button>
    </div>
  );
}

// ─── Score bar helper ─────────────────────────────────────────────────────────

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

// ─── Team Productivity Tab ────────────────────────────────────────────────────

function TeamProductivityTab({ currentUserId }: { currentUserId?: string }) {
  const chartData = STATIC_PRODUCTIVITY_DATA.slice(0, 10).map((r) => ({
    name: r.name.split(' ')[0],
    tasks: r.tasksDone,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Tasks Completed — May 2026</h3>
        <p className="text-xs text-gray-400 mb-4">Top 10 team members by tasks completed</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
              formatter={(v: number) => [`${v} tasks`, 'Completed']}
            />
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
              {STATIC_PRODUCTIVITY_DATA.map((r, i) => {
                const isMe = r.userId === currentUserId;
                return (
                  <tr key={r.userId} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
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
      </div>
      <ExportBar tab="productivity" />
    </div>
  );
}

// ─── KPI Appraisal Tab ────────────────────────────────────────────────────────

function KpiAppraisalTab({ currentUserId }: { currentUserId?: string }) {
  const summary = buildTeamSummary(STATIC_KPI_DATA, '2026-05');

  const pieData = [
    { name: 'Grade A', value: summary.gradeACcount, color: '#10B981' },
    { name: 'Grade B', value: summary.gradeBCount,  color: '#3B82F6' },
    { name: 'Grade C', value: summary.gradeCCount,  color: '#F59E0B' },
    { name: 'Grade D', value: summary.gradeDCount,  color: '#EF4444' },
  ].filter((d) => d.value > 0);

  const gradeConfig = GRADE_CONFIG[summary.teamGrade];
  const topPerformers = [...STATIC_KPI_DATA].sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Grade Distribution</h3>
          <p className="text-xs text-gray-400 mb-3">{STATIC_KPI_DATA.length} employees this period</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
                formatter={(v: number, name: string) => [`${v} employee${v !== 1 ? 's' : ''}`, name]}
              />
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
            <span className="text-2xl font-bold text-gray-800">{summary.teamAverage}</span>
            <span className={`text-sm font-bold ${gradeConfig.text}`}>{summary.teamGrade}</span>
          </div>
          <p className={`mt-3 text-xs font-semibold px-3 py-1 rounded-full ${gradeConfig.bg} ${gradeConfig.text}`}>
            {gradeConfig.label}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Performers</h3>
          <div className="space-y-3">
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
          <h3 className="text-sm font-semibold text-gray-800">Employee KPI Details — May 2026</h3>
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
              {[...STATIC_KPI_DATA]
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((e) => {
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
      </div>
      <ExportBar tab="kpi" />
    </div>
  );
}

// ─── Project Summary Tab ──────────────────────────────────────────────────────

function ProjectSummaryTab() {
  const statusColors: Record<string, { bg: string; text: string }> = {
    Active:    { bg: 'bg-blue-100',    text: 'text-blue-700'    },
    Completed: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'On Hold': { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  };

  return (
    <div className="space-y-4">
      {STATIC_PROJECT_DATA.map((project) => {
        const pct = Math.round((project.done / project.tasks) * 100);
        const sc = statusColors[project.status];
        return (
          <div key={project.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${project.color}20` }}>
                  <svg className="w-5 h-5" fill="none" stroke={project.color} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{project.name}</h3>
                  <p className="text-xs text-gray-400">{project.teamSize} team members</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{project.status}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{project.done}</p>
                <p className="text-xs text-gray-400">Tasks Done</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{project.tasks}</p>
                <p className="text-xs text-gray-400">Total Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">{pct}%</p>
                <p className="text-xs text-gray-400">Complete</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project.color }} />
              </div>
            </div>
          </div>
        );
      })}
      <ExportBar tab="projects" />
    </div>
  );
}

// ─── Bug Summary Tab ──────────────────────────────────────────────────────────

function BugSummaryTab() {
  const total = STATIC_BUG_SEVERITY_DATA.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Bug Severity Distribution</h3>
          <p className="text-xs text-gray-400 mb-3">Total: {total} bugs — May 2026</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={STATIC_BUG_SEVERITY_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                paddingAngle={3} dataKey="count" nameKey="severity">
                {STATIC_BUG_SEVERITY_DATA.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
                formatter={(v: number, name: string) => [`${v} bugs`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {STATIC_BUG_SEVERITY_DATA.map((d) => (
              <div key={d.severity} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-gray-500">{d.severity} — <span className="font-semibold text-gray-700">{d.count}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Bug Classification</h3>
          <div className="space-y-3">
            {STATIC_BUG_CLASSIFICATION_DATA.map((d) => (
              <div key={d.classification}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{d.classification}</span>
                  <span className="text-gray-500">{d.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.round((d.count / total) * 100)}%`, backgroundColor: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATIC_BUG_SEVERITY_DATA.map((d) => (
          <div key={d.severity} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{d.count}</p>
            <p className="text-xs text-gray-400 mt-1">{d.severity}</p>
            <div className="w-6 h-1 rounded-full mx-auto mt-2" style={{ backgroundColor: d.color }} />
          </div>
        ))}
      </div>
      <ExportBar tab="bugs" />
    </div>
  );
}

// ─── Task Allocation Tab ──────────────────────────────────────────────────────

function TaskAllocationTab({ currentUserId }: { currentUserId?: string }) {
  const chartData = STATIC_ALLOCATION_DATA.slice(0, 10).map((r) => ({
    name: r.name.split(' ')[0],
    hours: r.hoursAllocated,
  }));

  const totalHours = STATIC_ALLOCATION_DATA.reduce((s, r) => s + r.hoursAllocated, 0);
  const avgUtilisation = Math.round(
    STATIC_ALLOCATION_DATA.reduce((s, r) => s + r.utilisationPct, 0) / STATIC_ALLOCATION_DATA.length,
  );
  const overAllocated = STATIC_ALLOCATION_DATA.filter((r) => r.utilisationPct > 100).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{totalHours}h</p>
          <p className="text-xs text-gray-400 mt-1">Total Hours Allocated</p>
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

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Hours Allocated — May 2026</h3>
        <p className="text-xs text-gray-400 mb-4">Top 10 team members by allocated hours</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #E5E7EB' }}
              formatter={(v: number) => [`${v}h`, 'Allocated']}
            />
            <Bar dataKey="hours" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
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
              {STATIC_ALLOCATION_DATA.map((r, i) => {
                const isMe = r.userId === currentUserId;
                const isOver = r.utilisationPct > 100;
                return (
                  <tr key={r.userId} className={isMe ? 'bg-blue-50' : isOver ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
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
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(r.utilisationPct, 100)}%`,
                              backgroundColor: isOver ? '#EF4444' : r.utilisationPct >= 80 ? '#10B981' : '#F59E0B',
                            }}
                          />
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
      </div>
      <ExportBar tab="allocation" />
    </div>
  );
}

// ─── Timesheet Tab ────────────────────────────────────────────────────────────

const TIMESHEET_STATUS_STYLE: Record<TimesheetStatus, { bg: string; text: string }> = {
  Approved:  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Submitted: { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  Draft:     { bg: 'bg-gray-100',    text: 'text-gray-600'    },
};

function TimesheetTab({ currentUserId }: { currentUserId?: string }) {
  const totalHours = STATIC_TIMESHEET_DATA.reduce((s, r) => s + r.hoursLogged, 0);
  const approvedCount = STATIC_TIMESHEET_DATA.filter((r) => r.status === 'Approved').length;
  const submittedCount = STATIC_TIMESHEET_DATA.filter((r) => r.status === 'Submitted').length;
  const draftCount = STATIC_TIMESHEET_DATA.filter((r) => r.status === 'Draft').length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Timesheet Summary — May 2026</h3>
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
              {STATIC_TIMESHEET_DATA.map((r, i) => {
                const isMe = r.userId === currentUserId;
                const sc = TIMESHEET_STATUS_STYLE[r.status];
                return (
                  <tr key={r.userId} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
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
      </div>
      <ExportBar tab="timesheet" />
    </div>
  );
}

// ─── Employee Personal Summary (EMPLOYEE role) ────────────────────────────────

function MyPerformanceSummary({ userId, userName }: { userId: string; userName: string }) {
  const myProd = STATIC_PRODUCTIVITY_DATA.find((r) => r.userId === userId);
  const myKpi = STATIC_KPI_DATA.find((e) => e.userId === userId);
  const myAllocation = STATIC_ALLOCATION_DATA.find((r) => r.userId === userId);
  const myTimesheet = STATIC_TIMESHEET_DATA.find((r) => r.userId === userId);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-blue-800 mb-1">My Performance — May 2026</h3>
        <p className="text-xs text-blue-600">{userName}</p>
      </div>

      {myProd && myKpi && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{myProd.tasksDone}</p>
            <p className="text-xs text-gray-400 mt-1">Tasks Done</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{myProd.hoursLogged}h</p>
            <p className="text-xs text-gray-400 mt-1">Hours Logged</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{myKpi.totalScore}</p>
            <p className="text-xs text-gray-400 mt-1">KPI Score (Grade {myKpi.grade})</p>
          </div>
          {myAllocation && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-800">{myAllocation.utilisationPct}%</p>
              <p className="text-xs text-gray-400 mt-1">Utilisation</p>
            </div>
          )}
        </div>
      )}

      {myTimesheet && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">My Allocation & Timesheet</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Project</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{myTimesheet.project}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Timesheet Status</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block ${TIMESHEET_STATUS_STYLE[myTimesheet.status].bg} ${TIMESHEET_STATUS_STYLE[myTimesheet.status].text}`}>
                {myTimesheet.status}
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
  const [period, setPeriod] = useState('2026-05');

  const isAdminView = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_USER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-400 mt-0.5">Team performance overview and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {REPORT_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee personal view */}
      {!isAdminView && user && (
        <MyPerformanceSummary userId={user.id} userName={user.fullName} />
      )}

      {/* Tabs — visible to admin/super user */}
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

          {activeTab === 'productivity' && <TeamProductivityTab currentUserId={user?.id} />}
          {activeTab === 'kpi'          && <KpiAppraisalTab    currentUserId={user?.id} />}
          {activeTab === 'projects'     && <ProjectSummaryTab />}
          {activeTab === 'bugs'         && <BugSummaryTab />}
          {activeTab === 'allocation'   && <TaskAllocationTab  currentUserId={user?.id} />}
          {activeTab === 'timesheet'    && <TimesheetTab       currentUserId={user?.id} />}
        </>
      )}
    </div>
  );
}
