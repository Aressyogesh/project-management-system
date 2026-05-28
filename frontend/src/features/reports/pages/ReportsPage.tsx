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
  REPORT_PERIODS,
} from '../data/reportsStaticData';

type Tab = 'productivity' | 'kpi' | 'projects' | 'bugs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'productivity', label: 'Team Productivity' },
  { id: 'kpi',         label: 'KPI Appraisal'    },
  { id: 'projects',    label: 'Project Summary'  },
  { id: 'bugs',        label: 'Bug Summary'      },
];

// ─── Score bar helper ─────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color = '#3B82F6' }: { value: number; max?: number; color?: string }) {
  const pct = Math.round((value / max) * 100);
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
      {/* Bar chart */}
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

      {/* Table */}
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
                        {isMe && (
                          <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                        )}
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
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Grade distribution pie */}
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

        {/* Team average score card */}
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

        {/* Top performers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.map((e, i) => {
              const gc = GRADE_CONFIG[e.grade];
              return (
                <div key={e.userId} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{e.name}</p>
                    <p className="text-xs text-gray-400">{e.role}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gc.bg} ${gc.text}`}>
                    {e.totalScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full KPI table */}
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
                          {isMe && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                          )}
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
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                {project.status}
              </span>
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
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: project.color }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Export placeholder */}
      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
          onClick={() => undefined}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export PDF
        </button>
      </div>
    </div>
  );
}

// ─── Bug Summary Tab ──────────────────────────────────────────────────────────

function BugSummaryTab() {
  const total = STATIC_BUG_SEVERITY_DATA.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Bug Severity Distribution</h3>
          <p className="text-xs text-gray-400 mb-3">Total: {total} bugs — May 2026</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={STATIC_BUG_SEVERITY_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="severity"
              >
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

        {/* Classification breakdown */}
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
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${Math.round((d.count / total) * 100)}%`, backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Severity summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATIC_BUG_SEVERITY_DATA.map((d) => (
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

// ─── Employee Personal Summary (EMPLOYEE role) ────────────────────────────────

function MyPerformanceSummary({ userId, userName }: { userId: string; userName: string }) {
  const myProd = STATIC_PRODUCTIVITY_DATA.find((r) => r.userId === userId);
  const myKpi = STATIC_KPI_DATA.find((e) => e.userId === userId);

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
            <p className="text-2xl font-bold text-gray-800">{myProd.onTimePct}%</p>
            <p className="text-xs text-gray-400 mt-1">On-Time Rate</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{myKpi.totalScore}</p>
            <p className="text-xs text-gray-400 mt-1">KPI Score (Grade {myKpi.grade})</p>
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
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => undefined}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Employee personal view */}
      {!isAdminView && user && (
        <MyPerformanceSummary userId={user.id} userName={user.fullName} />
      )}

      {/* Tabs — visible to admin/super user */}
      {isAdminView && (
        <>
          <div className="flex gap-1 bg-gray-100/70 p-1 rounded-2xl w-fit">
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
        </>
      )}
    </div>
  );
}
