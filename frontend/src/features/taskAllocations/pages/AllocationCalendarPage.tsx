import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { taskAllocationsApi } from '../../../api/taskAllocations.api';
import { usersApi } from '../../../api/users.api';
import { useAuthStore } from '../../../store/authStore';
import type { TaskAllocation } from '../../../types/taskAllocation.types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildCalendarWeeks(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // ISO weekday: Mon=1 … Sun=7. JS getDay(): Sun=0, Mon=1 … Sat=6
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalDays = lastDay.getDate();

  const cells: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1)),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function dayColor(totalHours: number): string {
  if (totalHours === 0) return '';
  if (totalHours >= 8) return 'bg-red-50 border-red-200';
  if (totalHours >= 6) return 'bg-yellow-50 border-yellow-200';
  return 'bg-green-50 border-green-200';
}

export function hoursBarColor(totalHours: number): string {
  if (totalHours >= 8) return 'bg-red-400';
  if (totalHours >= 6) return 'bg-yellow-400';
  return 'bg-green-400';
}

export function AllocationCalendarPage() {
  const user = useAuthStore((s) => s.user);
  const isPrivileged = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id ?? '');

  const from = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
  const to = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;

  const { data: usersPage } = useQuery({
    queryKey: ['users-all-active'],
    queryFn: () => usersApi.list({ limit: 500 }),
    enabled: isPrivileged,
  });
  const activeUsers = (usersPage?.data ?? []).filter((u) => u.isActive);

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['task-allocations-user', selectedUserId, from, to],
    queryFn: () => taskAllocationsApi.listByUser(selectedUserId, from, to),
    enabled: !!selectedUserId,
  });

  // Group allocations by date string
  const byDate = useMemo(() => {
    const map: Record<string, TaskAllocation[]> = {};
    for (const alloc of allocations) {
      const key = alloc.date.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(alloc);
    }
    return map;
  }, [allocations]);

  const weeks = buildCalendarWeeks(viewYear, viewMonth);

  const todayStr = toLocalDateStr(today);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  const totalMonthHours = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
  const totalDaysAllocated = Object.keys(byDate).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Allocation Calendar</h1>
          <p className="text-xs text-gray-400 mt-0.5">Task hours allocated per day</p>
        </div>

        {isPrivileged && (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value={user?.id}>My Allocations</option>
            {activeUsers
              .filter((u) => u.id !== user?.id)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
          </select>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-400">Total Hours (Month)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalMonthHours}h</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-400">Days with Allocations</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalDaysAllocated}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-400">Avg Hours / Allocated Day</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalDaysAllocated > 0 ? (totalMonthHours / totalDaysAllocated).toFixed(1) : '—'}h
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Calendar Nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-gray-900 w-40 text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToday}
              className="ml-2 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Today
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />
              &lt; 6h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />
              6–7.5h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
              8h (full)
            </span>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 divide-x divide-gray-50">
                {week.map((date, di) => {
                  if (!date) {
                    return <div key={di} className="min-h-[110px] bg-gray-50/40" />;
                  }

                  const dateStr = toLocalDateStr(date);
                  const dayAllocs = byDate[dateStr] ?? [];
                  const totalHours = dayAllocs.reduce((s, a) => s + a.allocatedHours, 0);
                  const isToday = dateStr === todayStr;
                  const isWeekend = di >= 5;

                  return (
                    <div
                      key={di}
                      className={`min-h-[110px] p-2 flex flex-col gap-1.5 transition ${
                        isWeekend ? 'bg-gray-50/60' : ''
                      } ${totalHours > 0 ? dayColor(totalHours) : ''} border ${
                        isToday ? 'border-primary-400' : 'border-transparent'
                      }`}
                    >
                      {/* Day number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-500'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {totalHours > 0 && (
                          <span className="text-xs font-medium text-gray-600">{totalHours}h</span>
                        )}
                      </div>

                      {/* Hours bar */}
                      {totalHours > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${hoursBarColor(totalHours)}`}
                            style={{ width: `${Math.min(100, (totalHours / 8) * 100)}%` }}
                          />
                        </div>
                      )}

                      {/* Allocation chips */}
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {dayAllocs.slice(0, 3).map((alloc) => (
                          <div
                            key={alloc.id}
                            title={`${alloc.task.title} — ${alloc.allocatedHours}h`}
                            className="text-xs px-1.5 py-0.5 bg-white/80 border border-gray-200 rounded text-gray-700 truncate leading-tight"
                          >
                            {alloc.task.title}
                            <span className="text-gray-400 ml-1">{alloc.allocatedHours}h</span>
                          </div>
                        ))}
                        {dayAllocs.length > 3 && (
                          <span className="text-xs text-gray-400 pl-1">
                            +{dayAllocs.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
