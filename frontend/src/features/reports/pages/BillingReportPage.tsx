import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { timesheetApi, type TimesheetEntryFull } from '../../../api/timesheetApi';
import { projectsApi } from '../../../api/projects.api';
import { usersApi } from '../../../api/users.api';
import { useAuthStore } from '../../../store/authStore';

// ── helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  { v: 1, l: 'January' }, { v: 2,  l: 'February'  }, { v: 3,  l: 'March'     },
  { v: 4, l: 'April'   }, { v: 5,  l: 'May'        }, { v: 6,  l: 'June'      },
  { v: 7, l: 'July'    }, { v: 8,  l: 'August'     }, { v: 9,  l: 'September' },
  { v: 10, l: 'October' }, { v: 11, l: 'November'  }, { v: 12, l: 'December'  },
];

function buildYears() {
  const cur = new Date().getFullYear();
  const years: number[] = [];
  for (let y = cur; y >= 2024; y--) years.push(y);
  return years;
}

interface Metrics {
  total: number; billable: number; nonBillable: number; rework: number; bugFix: number;
}

function computeMetrics(entries: TimesheetEntryFull[]): Metrics {
  const m: Metrics = { total: 0, billable: 0, nonBillable: 0, rework: 0, bugFix: 0 };
  for (const e of entries) {
    const h = Number(e.hours);
    m.total += h;
    if (e.isRework) { m.nonBillable += h; m.rework += h; }
    else if (e.isBugFix) { m.nonBillable += h; m.bugFix += h; }
    else if (e.workItem.billingStatus === 'BILLABLE') { m.billable += h; }
    else { m.nonBillable += h; }
  }
  return m;
}

function fmt(n: number) { return n % 1 === 0 ? String(n) : n.toFixed(1); }
function pct(a: number, b: number) { return b === 0 ? '0' : ((a / b) * 100).toFixed(1); }

const PIE_COLORS = ['#4f46e5', '#e5e7eb', '#ef4444', '#f59e0b'];

// ── component ─────────────────────────────────────────────────────────────────

export function BillingReportPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [projectId, setProjectId] = useState('');
  const [userId, setUserId]   = useState('');

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to   = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list(),
  });

  const { data: usersPage } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.list({ limit: 200 }),
    enabled: isAdmin,
  });
  const allUsers = usersPage?.data ?? [];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['billing-report', from, to, projectId, userId],
    queryFn: () => timesheetApi.getMyEntries({
      from,
      to,
      ...(projectId ? { projectId } : {}),
      ...(isAdmin && userId ? { userId } : {}),
    }),
  });

  // Overall metrics
  const overall = useMemo(() => computeMetrics(entries), [entries]);

  // Per-user breakdown (admin view)
  const byUser = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, { name: string; photo: string | null; entries: TimesheetEntryFull[] }>();
    for (const e of entries) {
      const uid = e.user.id;
      if (!map.has(uid)) map.set(uid, { name: e.user.fullName, photo: e.user.profilePhoto, entries: [] });
      map.get(uid)!.entries.push(e);
    }
    return Array.from(map.values()).map((u) => ({ ...u, metrics: computeMetrics(u.entries) }))
      .sort((a, b) => b.metrics.total - a.metrics.total);
  }, [entries, isAdmin]);

  // Per-project breakdown (employee view)
  const byProject = useMemo(() => {
    if (isAdmin) return [];
    const map = new Map<string, { name: string; entries: TimesheetEntryFull[] }>();
    for (const e of entries) {
      const pid = e.workItem.project.id;
      if (!map.has(pid)) map.set(pid, { name: e.workItem.project.name, entries: [] });
      map.get(pid)!.entries.push(e);
    }
    return Array.from(map.values()).map((p) => ({ ...p, metrics: computeMetrics(p.entries) }))
      .sort((a, b) => b.metrics.total - a.metrics.total);
  }, [entries, isAdmin]);

  // Charts
  const pieData = [
    { name: 'Billable',     value: overall.billable     },
    { name: 'Non-Billable', value: overall.nonBillable - overall.rework - overall.bugFix },
    { name: 'Rework',       value: overall.rework       },
    { name: 'Bug Fix',      value: overall.bugFix       },
  ].filter((d) => d.value > 0);

  const barData = isAdmin
    ? byUser.slice(0, 15).map((u) => ({
        name: u.name.split(' ')[0],
        Billable: u.metrics.billable,
        Rework: u.metrics.rework,
        'Bug Fix': u.metrics.bugFix,
        'Non-Billable': u.metrics.nonBillable - u.metrics.rework - u.metrics.bugFix,
      }))
    : byProject.map((p) => ({
        name: p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name,
        Billable: p.metrics.billable,
        Rework: p.metrics.rework,
        'Bug Fix': p.metrics.bugFix,
        'Non-Billable': p.metrics.nonBillable - p.metrics.rework - p.metrics.bugFix,
      }));

  const metricCards = [
    { label: 'Total Logged',   value: `${fmt(overall.total)}h`,       bg: 'bg-gray-50',    text: 'text-gray-800'  },
    { label: 'Billable',       value: `${fmt(overall.billable)}h`,     bg: 'bg-indigo-50',  text: 'text-indigo-700' },
    { label: 'Non-Billable',   value: `${fmt(overall.nonBillable)}h`,  bg: 'bg-gray-100',   text: 'text-gray-700'  },
    { label: 'Rework',         value: `${fmt(overall.rework)}h`,       bg: 'bg-amber-50',   text: 'text-amber-700' },
    { label: 'Bug Fix',        value: `${fmt(overall.bugFix)}h`,       bg: 'bg-red-50',     text: 'text-red-700'   },
    { label: 'Billable %',     value: `${pct(overall.billable, overall.total)}%`, bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ];

  return (
    <div className="flex flex-col gap-5 min-h-0">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <h1 className="text-base font-semibold text-gray-900 mb-3">Billing Report</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400"
            >
              {buildYears().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400"
            >
              {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400"
          >
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {isAdmin && (
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400"
            >
              <option value="">All Users</option>
              {allUsers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          )}

          {isLoading && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((c) => (
          <div key={c.label} className={`rounded-xl border border-gray-100 shadow-sm px-4 py-4 ${c.bg}`}>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-700 mb-4">Hours Breakdown</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${fmt(v)}h`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stacked bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-700 mb-4">
              {isAdmin ? 'Hours by Team Member' : 'Hours by Project'}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${fmt(v)}h`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Billable"     stackId="a" fill="#4f46e5" radius={[0,0,0,0]} />
                <Bar dataKey="Rework"       stackId="a" fill="#f59e0b" />
                <Bar dataKey="Bug Fix"      stackId="a" fill="#ef4444" />
                <Bar dataKey="Non-Billable" stackId="a" fill="#e5e7eb" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Details table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-700">
            {isAdmin ? 'Per-User Breakdown' : 'Per-Project Breakdown'}
          </h2>
        </div>

        {entries.length === 0 && !isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No timesheet entries found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    {isAdmin ? 'Team Member' : 'Project'}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-indigo-600">Billable</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Non-Billable</th>
                  <th className="px-4 py-3 text-right font-semibold text-amber-600">Rework</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-600">Bug Fix</th>
                  <th className="px-4 py-3 text-right font-semibold text-emerald-600">Billable %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isAdmin
                  ? byUser.map((u) => (
                    <tr key={u.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          {u.photo
                            ? <img src={`/uploads/avatars/${u.photo}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                            : <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                                {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                          }
                          {u.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">{fmt(u.metrics.total)}h</td>
                      <td className="px-4 py-3 text-right text-indigo-700 font-semibold">{fmt(u.metrics.billable)}h</td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmt(u.metrics.nonBillable)}h</td>
                      <td className="px-4 py-3 text-right text-amber-600">{fmt(u.metrics.rework)}h</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmt(u.metrics.bugFix)}h</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${Number(pct(u.metrics.billable, u.metrics.total)) >= 70 ? 'text-emerald-600' : 'text-orange-500'}`}>
                          {pct(u.metrics.billable, u.metrics.total)}%
                        </span>
                      </td>
                    </tr>
                  ))
                  : byProject.map((p) => (
                    <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">{fmt(p.metrics.total)}h</td>
                      <td className="px-4 py-3 text-right text-indigo-700 font-semibold">{fmt(p.metrics.billable)}h</td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmt(p.metrics.nonBillable)}h</td>
                      <td className="px-4 py-3 text-right text-amber-600">{fmt(p.metrics.rework)}h</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmt(p.metrics.bugFix)}h</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${Number(pct(p.metrics.billable, p.metrics.total)) >= 70 ? 'text-emerald-600' : 'text-orange-500'}`}>
                          {pct(p.metrics.billable, p.metrics.total)}%
                        </span>
                      </td>
                    </tr>
                  ))
                }

                {/* Totals row */}
                {(isAdmin ? byUser : byProject).length > 1 && (
                  <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                    <td className="px-4 py-3 text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right text-gray-800">{fmt(overall.total)}h</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmt(overall.billable)}h</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(overall.nonBillable)}h</td>
                    <td className="px-4 py-3 text-right text-amber-600">{fmt(overall.rework)}h</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(overall.bugFix)}h</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{pct(overall.billable, overall.total)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
