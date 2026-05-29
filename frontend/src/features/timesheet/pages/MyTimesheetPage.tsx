import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timesheetApi, type TimesheetApprovalStatus, type TimesheetEntryFull } from '../../../api/timesheetApi';
import { useAuthStore } from '../../../store/authStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon start
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDisplay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG: Record<TimesheetApprovalStatus, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pending',   bg: 'bg-gray-100',   text: 'text-gray-600' },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-100',   text: 'text-blue-700' },
  APPROVED:  { label: 'Approved',  bg: 'bg-emerald-100', text: 'text-emerald-700' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-100',    text: 'text-red-700' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function MyTimesheetPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';
  const canApprove = isAdmin;

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const weekEnd = addDays(weekStart, 6);
  const fromStr = fmt(weekStart);
  const toStr = fmt(weekEnd);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timesheet', fromStr, toStr],
    queryFn: () => timesheetApi.getMyEntries({ from: fromStr, to: toStr }),
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => timesheetApi.submit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => timesheetApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => timesheetApi.reject(id, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timesheet'] }); setRejectId(null); setRejectionNote(''); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => timesheetApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet'] }),
  });

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  // Group entries by date
  const byDate = entries.reduce<Record<string, TimesheetEntryFull[]>>((acc, e) => {
    const d = e.date.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const approvedHours = entries.filter((e) => e.approvalStatus === 'APPROVED').reduce((s, e) => s + Number(e.hours), 0);
  const submittedHours = entries.filter((e) => e.approvalStatus === 'SUBMITTED').reduce((s, e) => s + Number(e.hours), 0);
  const pendingCount = entries.filter((e) => e.approvalStatus === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{isAdmin ? 'Team Timesheet' : 'My Timesheet'}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Log and manage work hours against project tasks</p>
          </div>
          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-600">
              Today
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
              {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button onClick={nextWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-gray-500 mt-1">Total Logged</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
            <p className="text-2xl font-bold text-emerald-700">{approvedHours.toFixed(1)}h</p>
            <p className="text-xs text-emerald-600 mt-1">Approved</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <p className="text-2xl font-bold text-blue-700">{submittedHours.toFixed(1)}h</p>
            <p className="text-xs text-blue-600 mt-1">Awaiting Approval</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
            <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600 mt-1">Pending Submission</p>
          </div>
        </div>
      </div>

      {/* Timesheet entries */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading entries…</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No timesheet entries for this week.</p>
            <p className="text-gray-300 text-xs mt-1">Log time against work items on the Kanban board.</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[120px_1fr_140px_80px_120px_120px_100px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <span>Date</span>
              <span>Work Item / Project</span>
              <span>Description</span>
              <span className="text-right">Hours</span>
              <span>Logged By</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Days */}
            {Object.entries(byDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dayEntries]) => {
                const dayTotal = dayEntries.reduce((s, e) => s + Number(e.hours), 0);
                return (
                  <div key={date}>
                    {/* Day header */}
                    <div className="flex items-center justify-between px-5 py-2 bg-gray-50/60 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-600">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span className="text-xs font-bold text-gray-700">{dayTotal.toFixed(1)}h</span>
                    </div>

                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[120px_1fr_140px_80px_120px_120px_100px] gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/50 items-center"
                      >
                        {/* Date */}
                        <span className="text-xs text-gray-500">{fmtDisplay(entry.date)}</span>

                        {/* Work item */}
                        <div>
                          <p className="text-sm font-medium text-gray-800 truncate">{entry.workItem.title}</p>
                          <p className="text-[11px] text-gray-400">{entry.workItem.project.name} · {entry.workItem.type.replace(/_/g, ' ')}</p>
                        </div>

                        {/* Description */}
                        <span className="text-xs text-gray-500 truncate">{entry.description ?? '—'}</span>

                        {/* Hours */}
                        <span className="text-sm font-semibold text-gray-800 text-right">{Number(entry.hours).toFixed(1)}h</span>

                        {/* Logged by */}
                        <span className="text-xs text-gray-600 truncate">{entry.user.fullName}</span>

                        {/* Status */}
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

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Submit (own pending/rejected entries) */}
                          {entry.userId === user?.id && (entry.approvalStatus === 'PENDING' || entry.approvalStatus === 'REJECTED') && (
                            <button
                              onClick={() => submitMut.mutate(entry.id)}
                              disabled={submitMut.isPending}
                              title="Submit for approval"
                              className="text-[11px] px-2 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
                            >
                              Submit
                            </button>
                          )}
                          {/* Approve / Reject (admin/manager) */}
                          {canApprove && entry.approvalStatus === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => approveMut.mutate(entry.id)}
                                disabled={approveMut.isPending}
                                title="Approve"
                                className="text-[11px] px-2 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setRejectId(entry.id)}
                                title="Reject"
                                className="text-[11px] px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                              >
                                ✕
                              </button>
                            </>
                          )}
                          {/* Delete (own non-approved) */}
                          {(entry.userId === user?.id || isAdmin) && entry.approvalStatus !== 'APPROVED' && (
                            <button
                              onClick={() => deleteMut.mutate(entry.id)}
                              disabled={deleteMut.isPending}
                              title="Delete"
                              className="text-gray-300 hover:text-red-500 transition p-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
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

      {/* Phase 7: Actual vs Estimated note */}
      {entries.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">Actual vs Estimated Hours</p>
          <p className="text-xs text-blue-600">
            Open any work item on the Kanban board and go to the Log Time tab to see estimated vs logged hours per item.
            Use the Reports page for project-level timesheet summaries.
          </p>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Reject Timesheet Entry</h3>
            <label className="text-xs text-gray-500 mb-1 block">Rejection Note (optional)</label>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              rows={3}
              placeholder="Reason for rejection…"
              className="input-sm w-full resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectId(null); setRejectionNote(''); }} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              <button
                onClick={() => rejectMut.mutate({ id: rejectId, note: rejectionNote || undefined })}
                disabled={rejectMut.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl font-medium hover:bg-red-700 transition"
              >
                {rejectMut.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
