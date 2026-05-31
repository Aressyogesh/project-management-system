import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timesheetApi, type TimesheetApprovalStatus, type TimesheetEntryFull } from '../../../api/timesheetApi';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDisplay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG: Record<TimesheetApprovalStatus, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pending',   bg: 'bg-gray-100',    text: 'text-gray-600' },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-100',    text: 'text-blue-700' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-100', text: 'text-emerald-700' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-100',     text: 'text-red-700' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function MyTimesheetPage() {
  const { user } = useAuthStore();

  // Admins can view and filter by any team member
  const canViewTeam = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const today = new Date();
  const todayStr = fmt(today);

  // viewMode: 'today' shows only today; 'week' shows the selected week
  const [viewMode, setViewMode] = useState<'today' | 'week'>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(today));
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const weekEnd = addDays(weekStart, 6);

  // Date range sent to API
  const fromStr = viewMode === 'today' ? todayStr : fmt(weekStart);
  const toStr   = viewMode === 'today' ? todayStr : fmt(weekEnd);

  // When a specific member is selected show all-time entries (no date filter)
  const useDateFilter = !selectedUserId;

  const prevWeek = () => { setViewMode('week'); setWeekStart(addDays(weekStart, -7)); };
  const nextWeek = () => { setViewMode('week'); setWeekStart(addDays(weekStart, 7)); };
  const goToday  = () => { setViewMode('today'); setWeekStart(startOfWeek(today)); };

  // Projects list
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // Members of selected project
  const { data: members = [] } = useQuery({
    queryKey: ['project-members', selectedProjectId],
    queryFn: () => projectsApi.listMembers(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  // Timesheet entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timesheet', useDateFilter ? fromStr : 'all', useDateFilter ? toStr : 'all', selectedProjectId, selectedUserId],
    queryFn: () => timesheetApi.getMyEntries({
      ...(useDateFilter && { from: fromStr, to: toStr }),
      ...(selectedProjectId && { projectId: selectedProjectId }),
      ...(selectedUserId && { userId: selectedUserId }),
    }),
  });

  // Group by date
  const byDate = entries.reduce<Record<string, TimesheetEntryFull[]>>((acc, e) => {
    const d = e.date.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const devHours   = entries.filter((e) => e.workItem.type !== 'BUG').reduce((s, e) => s + Number(e.hours), 0);
  const bugHours   = entries.filter((e) => e.workItem.type === 'BUG').reduce((s, e) => s + Number(e.hours), 0);

  // Per-member summary (only when project selected, no specific member)
  const memberSummary = members.map((m) => {
    const mEntries = entries.filter((e) => e.userId === m.user.id);
    return {
      ...m.user,
      hours: mEntries.reduce((s, e) => s + Number(e.hours), 0),
    };
  }).filter((m) => m.hours > 0);

  // ── Date range label ──────────────────────────────────────────────────────
  const dateRangeLabel = (() => {
    if (selectedUserId) {
      return `All time — ${members.find((m) => m.user.id === selectedUserId)?.user.fullName ?? ''}`;
    }
    if (viewMode === 'today') {
      return `Today, ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  })();

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Timesheet</h1>
            <p className="text-xs text-gray-500 mt-0.5">Time logged against project work items</p>
          </div>

          {/* Date navigation — hidden when member selected (all-time mode) */}
          {!selectedUserId ? (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={prevWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToday}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                  viewMode === 'today'
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                Today
              </button>
              <span className="text-sm font-semibold text-gray-700 min-w-[200px] text-center">
                {dateRangeLabel}
              </span>
              <button onClick={nextWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
              {dateRangeLabel}
            </span>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-[220px]">
            <label className="text-xs font-medium text-gray-500 shrink-0">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedUserId(''); }}
              className="input-sm flex-1 text-sm"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProjectId && canViewTeam && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500 shrink-0">Member</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-sm flex-1 text-sm"
              >
                <option value="">All Members</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>
                ))}
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

        {/* ── Total hours card ── */}
        <div className="mt-5">
          <div className="inline-flex items-center gap-4 bg-gray-50 rounded-xl px-6 py-4 border border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Logged</p>
            </div>
            {totalHours > 0 && (
              <>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-primary-700">{devHours.toFixed(1)}h</p>
                  <p className="text-xs text-primary-500 mt-0.5">Development</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{bugHours.toFixed(1)}h</p>
                  <p className="text-xs text-red-400 mt-0.5">Bug Fixing</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Dev vs Bug bar ── */}
        {totalHours > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
              {devHours > 0 && (
                <div className="h-full bg-primary-500" style={{ width: `${(devHours / totalHours) * 100}%` }} />
              )}
              {bugHours > 0 && (
                <div className="h-full bg-red-400" style={{ width: `${(bugHours / totalHours) * 100}%` }} />
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] shrink-0">
              <span className="flex items-center gap-1 text-gray-500">
                <span className="w-2 h-2 rounded-sm bg-primary-500" />
                Dev {Math.round((devHours / totalHours) * 100)}%
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <span className="w-2 h-2 rounded-sm bg-red-400" />
                Bugs {Math.round((bugHours / totalHours) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Team breakdown (managers only, project selected, no specific member) ── */}
      {canViewTeam && selectedProjectId && !selectedUserId && memberSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Team Hours {viewMode === 'today' ? 'Today' : 'This Week'}
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
                <span className="text-sm font-bold text-gray-900 w-16 text-right">{m.hours.toFixed(1)}h</span>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Entries table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading entries…</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">
              No timesheet entries {viewMode === 'today' ? 'for today' : 'for this period'}.
            </p>
            <p className="text-gray-300 text-xs mt-1">Log time against work items from the Kanban board.</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[110px_1fr_150px_70px_140px_120px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <span>Date</span>
              <span>Work Item / Project</span>
              <span>Description</span>
              <span className="text-right">Hours</span>
              <span>Logged By</span>
              <span>Status</span>
            </div>

            {Object.entries(byDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dayEntries]) => {
                const dayTotal = dayEntries.reduce((s, e) => s + Number(e.hours), 0);
                return (
                  <div key={date}>
                    <div className="flex items-center justify-between px-5 py-2 bg-gray-50/60 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span className="text-xs font-bold text-gray-700">{dayTotal.toFixed(1)}h</span>
                    </div>

                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[110px_1fr_150px_70px_140px_120px] gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/50 items-center"
                      >
                        <span className="text-xs text-gray-500">{fmtDisplay(entry.date.slice(0, 10))}</span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${
                              entry.workItem.type === 'BUG'        ? 'bg-red-100 text-red-700' :
                              entry.workItem.type === 'TASK'       ? 'bg-blue-100 text-blue-700' :
                              entry.workItem.type === 'USER_STORY' ? 'bg-violet-100 text-violet-700' :
                              entry.workItem.type === 'EPIC'       ? 'bg-orange-100 text-orange-700' :
                              entry.workItem.type === 'SUB_TASK'   ? 'bg-cyan-100 text-cyan-700' :
                                                                     'bg-gray-100 text-gray-600'
                            }`}>
                              {entry.workItem.type.replace(/_/g, ' ')}
                            </span>
                            <p className="text-sm font-medium text-gray-800 truncate">{entry.workItem.title}</p>
                          </div>
                          <p className="text-[11px] text-gray-400 truncate">{entry.workItem.project.name}</p>
                        </div>

                        <span className="text-xs text-gray-500 truncate">{entry.description ?? '—'}</span>

                        <span className="text-sm font-semibold text-gray-800 text-right">{Number(entry.hours).toFixed(1)}h</span>

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                            {entry.user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span className="text-xs text-gray-600 truncate">{entry.user.fullName}</span>
                        </div>

                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CONFIG[entry.approvalStatus].bg} ${STATUS_CONFIG[entry.approvalStatus].text}`}>
                            {STATUS_CONFIG[entry.approvalStatus].label}
                          </span>
                          {entry.approvalStatus === 'REJECTED' && entry.rejectionNote && (
                            <p className="text-[10px] text-red-500 mt-0.5 truncate" title={entry.rejectionNote}>{entry.rejectionNote}</p>
                          )}
                          {entry.approvalStatus === 'APPROVED' && entry.approvedBy && (
                            <p className="text-[10px] text-gray-400 mt-0.5">by {entry.approvedBy.fullName}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
