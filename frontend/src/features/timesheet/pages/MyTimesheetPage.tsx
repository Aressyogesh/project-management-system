import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timesheetApi, type TimesheetEntryFull } from '../../../api/timesheetApi';
import { projectsApi } from '../../../api/projects.api';
import { analyticsApi } from '../../../api/analyticsApi';
import { useAuthStore } from '../../../store/authStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildYearOptions(): number[] {
  const cur = new Date().getFullYear();
  const years: number[] = [];
  for (let y = cur; y >= 2024; y--) years.push(y);
  return years;
}

const MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
];

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

interface DayMetrics {
  total: number;
  billable: number;
  nonBillable: number;
  rework: number;
  bugFix: number;
}

function computeMetrics(entries: TimesheetEntryFull[]): DayMetrics {
  const m: DayMetrics = { total: 0, billable: 0, nonBillable: 0, rework: 0, bugFix: 0 };

  // Pre-compute total logged per BILLABLE work item to cap at estimatedHours
  const itemTotals = new Map<string, { total: number; cap: number | null }>();
  for (const e of entries) {
    if (!e.isRework && !e.isBugFix && e.workItem.billingStatus === 'BILLABLE') {
      const prev = itemTotals.get(e.workItem.id) ?? { total: 0, cap: e.workItem.estimatedHours };
      itemTotals.set(e.workItem.id, { total: prev.total + Number(e.hours), cap: prev.cap });
    }
  }

  for (const e of entries) {
    const h = Number(e.hours);
    m.total += h;

    if (e.isRework) {
      m.nonBillable += h;
      m.rework += h;
    } else if (e.isBugFix) {
      m.nonBillable += h;
      m.bugFix += h;
    } else if (e.workItem.billingStatus === 'BILLABLE') {
      const item = itemTotals.get(e.workItem.id);
      if (item && item.cap != null && item.total > item.cap) {
        const billableFraction = h * (item.cap / item.total);
        m.billable    += billableFraction;
        m.nonBillable += h - billableFraction;
      } else {
        m.billable += h;
      }
    } else {
      m.nonBillable += h;
    }
  }
  return m;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MyTimesheetPage() {
  const { user } = useAuthStore();
  const isAdminOrSuper = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const { data: myProjectRole } = useQuery({
    queryKey: ['my-project-role'],
    queryFn: analyticsApi.getMyProjectRole,
    enabled: !isAdminOrSuper,
    staleTime: 300_000,
  });
  const canViewTeam = isAdminOrSuper || myProjectRole?.isManager === true;

  const now = new Date();
  const [year,              setYear]              = useState(now.getFullYear());
  const [month,             setMonth]             = useState(now.getMonth() + 1);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedUserId,    setSelectedUserId]    = useState('');

  const yearOptions = buildYearOptions();

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const to   = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });
  const projects = allProjects.filter((p) => p.status !== 'ARCHIVE');

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', selectedProjectId],
    queryFn: () => projectsApi.listMembers(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timesheet', from, to, selectedProjectId, selectedUserId],
    queryFn: () => timesheetApi.getMyEntries({
      from,
      to,
      ...(selectedProjectId && { projectId: selectedProjectId }),
      ...(selectedUserId    && { userId:    selectedUserId    }),
    }),
  });

  const byDay = entries.reduce<Record<string, TimesheetEntryFull[]>>((acc, e) => {
    const d = e.date.slice(0, 10);
    (acc[d] ??= []).push(e);
    return acc;
  }, {});

  const monthMetrics = computeMetrics(entries);

  const memberSummary = (canViewTeam && selectedProjectId && !selectedUserId)
    ? members
        .map((m) => ({ ...m.user, ...computeMetrics(entries.filter((e) => e.userId === m.user.id)) }))
        .filter((m) => m.total > 0)
    : [];

  const calendarDays = getCalendarDays(year, month);
  const todayStr = fmt(now);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function dayStr(d: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? '';

  return (
    <div className="space-y-5">

      {/* ── Header + Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Timesheet</h1>
            <p className="text-xs text-gray-500 mt-0.5">Time logged against project work items</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 shrink-0">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input-sm text-sm"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 shrink-0">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="input-sm text-sm"
            >
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-[220px]">
            <label className="text-xs font-medium text-gray-500 shrink-0">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedUserId(''); }}
              className="input-sm flex-1 text-sm"
            >
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {selectedProjectId && canViewTeam && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500 shrink-0">Employee</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-sm flex-1 text-sm"
              >
                <option value="">All Members</option>
                {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>)}
              </select>
            </div>
          )}

          {(selectedProjectId || selectedUserId) && (
            <button
              onClick={() => { setSelectedProjectId(''); setSelectedUserId(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Summary bar */}
        <div className="mt-5">
          <div className="inline-flex items-center gap-5 bg-gray-50 rounded-xl px-6 py-4 border border-gray-100 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{monthMetrics.total.toFixed(1)}h</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Logged</p>
            </div>
            {monthMetrics.total > 0 && (
              <>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{monthMetrics.billable.toFixed(1)}h</p>
                  <p className="text-xs text-green-500 mt-0.5">Billable</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-500">{monthMetrics.nonBillable.toFixed(1)}h</p>
                  <p className="text-xs text-orange-400 mt-0.5">Non-Billable</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">{monthMetrics.rework.toFixed(1)}h</p>
                  <p className="text-xs text-purple-400 mt-0.5">Rework</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{monthMetrics.bugFix.toFixed(1)}h</p>
                  <p className="text-xs text-red-400 mt-0.5">Bug Fix</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Billable vs Non-Billable bar */}
        {monthMetrics.total > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
              {monthMetrics.billable > 0 && (
                <div className="h-full bg-green-500 transition-all" style={{ width: `${(monthMetrics.billable / monthMetrics.total) * 100}%` }} />
              )}
              {monthMetrics.nonBillable > 0 && (
                <div className="h-full bg-orange-400 transition-all" style={{ width: `${(monthMetrics.nonBillable / monthMetrics.total) * 100}%` }} />
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] shrink-0">
              <span className="flex items-center gap-1 text-gray-500">
                <span className="w-2 h-2 rounded-sm bg-green-500" />
                Billable {Math.round((monthMetrics.billable / monthMetrics.total) * 100)}%
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <span className="w-2 h-2 rounded-sm bg-orange-400" />
                Non-Billable {Math.round((monthMetrics.nonBillable / monthMetrics.total) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Team breakdown (managers, project selected, no member filter) ── */}
      {memberSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Team Hours — {monthLabel} {year}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {memberSummary.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedUserId(m.id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left"
              >
                <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {m.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="text-sm font-medium text-gray-800 flex-1">{m.fullName}</span>
                <div className="flex items-center gap-4 text-xs mr-2">
                  <span className="text-green-600 font-medium">{m.billable.toFixed(1)}h B</span>
                  <span className="text-orange-500 font-medium">{m.nonBillable.toFixed(1)}h NB</span>
                  {m.rework > 0 && <span className="text-purple-500 font-medium">{m.rework.toFixed(1)}h RW</span>}
                  {m.bugFix > 0 && <span className="text-red-500 font-medium">{m.bugFix.toFixed(1)}h Bug</span>}
                  <span className="font-bold text-gray-900 w-14 text-right">{m.total.toFixed(1)}h</span>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Calendar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">{monthLabel} {year}</h2>
          {isLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {DOW_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`blank-${idx}`}
                  className="min-h-[108px] border-b border-r border-gray-100 bg-gray-50/40 last:border-r-0"
                />
              );
            }

            const ds = dayStr(day);
            const dayEntries = byDay[ds] ?? [];
            const m = dayEntries.length > 0 ? computeMetrics(dayEntries) : null;
            const isToday  = isCurrentMonth && ds === todayStr;
            const isFuture = ds > todayStr;
            const isWeekend = idx % 7 >= 5;

            return (
              <div
                key={ds}
                className={`min-h-[108px] border-b border-r border-gray-100 p-2 flex flex-col last:border-r-0 ${
                  isToday   ? 'bg-primary-50/50' :
                  isWeekend ? 'bg-slate-50/60' :
                  isFuture  ? 'bg-white/50' : 'bg-white'
                }`}
              >
                {/* Day number */}
                <span className={`text-[11px] font-bold self-start w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  isToday  ? 'bg-primary-600 text-white' :
                  isFuture ? 'text-gray-300' :
                  isWeekend? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {day}
                </span>

                {/* Metrics */}
                {m && (
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold text-gray-800 leading-none">{m.total.toFixed(1)}h</p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1 py-0.5 rounded">
                        {m.billable.toFixed(1)}B
                      </span>
                      <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-1 py-0.5 rounded">
                        {m.nonBillable.toFixed(1)}NB
                      </span>
                    </div>

                    {(m.rework > 0 || m.bugFix > 0) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {m.rework > 0 && (
                          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
                            {m.rework.toFixed(1)}RW
                          </span>
                        )}
                        {m.bugFix > 0 && (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1 py-0.5 rounded">
                            {m.bugFix.toFixed(1)}Bug
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-5 flex-wrap">
          <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Legend</span>
          <span className="flex items-center gap-1.5 text-[11px] text-green-600">
            <span className="w-2 h-2 rounded-sm bg-green-500" /> Billable (B)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-orange-500">
            <span className="w-2 h-2 rounded-sm bg-orange-400" /> Non-Billable (NB)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-purple-600">
            <span className="w-2 h-2 rounded-sm bg-purple-500" /> Rework (RW)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-red-600">
            <span className="w-2 h-2 rounded-sm bg-red-500" /> Bug Fix (Bug)
          </span>
        </div>
      </div>
    </div>
  );
}
