import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveApi, type LeaveRequest } from '../../../api/leaveApi';
import { lateComingsApi, type LateComingLog } from '../../../api/lateComingsApi';
import { useAuthStore } from '../../../store/authStore';


// ── Design tokens ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-gray-900 min-w-[240px] max-w-xs animate-fade-in">
      <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition ml-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Record Log Modal (tabbed: Leave + Late Comings) ──────────────────────────

function RecordLogModal({
  onClose,
  onSuccess,
  members,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  members: { id: string; fullName: string }[];
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'leave' | 'late'>('leave');

  // ── Leave tab state ──
  const [targetUserId, setTargetUserId] = useState('');
  const [isPlanned, setIsPlanned]       = useState(true);
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [isHalfDay, setIsHalfDay]       = useState(false);
  const [reason, setReason]             = useState('');
  const [leaveError, setLeaveError]     = useState('');

  const leaveMut = useMutation({
    mutationFn: () =>
      leaveApi.create({ targetUserId, isPlanned, startDate, endDate, isHalfDay, reason: reason.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['kpi-live'] });
      onSuccess('Leave recorded successfully');
      onClose();
    },
    onError: (e: any) => setLeaveError(e?.response?.data?.message ?? 'Failed to record leave'),
  });

  const rawDays = startDate && endDate
    ? Math.max(0, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 0;
  const totalDays = isHalfDay ? 0.5 : rawDays;

  // ── Late Comings tab state ──
  const [lateUserId,    setLateUserId]    = useState('');
  const [lateDate,      setLateDate]      = useState('');
  const [minutesLate,   setMinutesLate]   = useState(0);
  const [lateReason,    setLateReason]    = useState('');
  const [lateError,     setLateError]     = useState('');

  const lateMut = useMutation({
    mutationFn: () =>
      lateComingsApi.create({
        targetUserId: lateUserId,
        date: lateDate,
        minutesLate,
        reason: lateReason.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['late-comings'] });
      onSuccess('Late coming recorded successfully');
      onClose();
    },
    onError: (e: any) => setLateError(e?.response?.data?.message ?? 'Failed to record late coming'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Record Log</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(['leave', 'late'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 mr-6 transition ${
                tab === t
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'leave' ? 'Record Leave' : 'Record Late Comings'}
            </button>
          ))}
        </div>

        {/* ── Record Leave form ── */}
        {tab === 'leave' && (
          <form
            onSubmit={(e) => { e.preventDefault(); setLeaveError(''); leaveMut.mutate(); }}
            className="px-6 py-5 space-y-4"
          >
            <div>
              <label className={labelCls}>Team Member <span className="text-red-400">*</span></label>
              <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} required className={inputCls}>
                <option value="">Select member…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Leave Category <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsPlanned(true)}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition ${isPlanned ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  Planned
                </button>
                <button type="button" onClick={() => {
                  setIsPlanned(false);
                  const today = new Date().toISOString().split('T')[0];
                  if (startDate > today) { setStartDate(''); setEndDate(''); }
                  if (endDate > today) setEndDate('');
                }}
                  className={`flex-1 py-2 text-sm rounded-lg border font-medium transition ${!isPlanned ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  Unplanned
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
                <input type="date" value={startDate}
                  max={!isPlanned ? new Date().toISOString().split('T')[0] : undefined}
                  onChange={(e) => { setStartDate(e.target.value); if (isHalfDay) setEndDate(e.target.value); }}
                  required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>End Date <span className="text-red-400">*</span></label>
                <input type="date" value={isHalfDay ? startDate : endDate} min={startDate}
                  onChange={(e) => setEndDate(e.target.value)} required disabled={isHalfDay}
                  className={`${inputCls} ${isHalfDay ? 'opacity-60 cursor-not-allowed' : ''}`} />
              </div>
            </div>

            <div className="flex items-center gap-2 -mt-1">
              <input id="half-day" type="checkbox" checked={isHalfDay}
                onChange={(e) => { setIsHalfDay(e.target.checked); if (e.target.checked && startDate) setEndDate(startDate); }}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
              <label htmlFor="half-day" className="text-sm text-gray-600 cursor-pointer select-none">Half-day leave</label>
            </div>

            <p className="text-[11px] text-gray-400 -mt-1">
              Both dates are inclusive. For a single day off, set both dates to the same day.
            </p>

            {totalDays > 0 && (
              <p className="text-xs font-medium text-primary-700 bg-primary-50 border border-primary-100 px-3 py-2 rounded-lg">
                {totalDays} day{totalDays !== 1 ? 's' : ''} of leave
              </p>
            )}

            <div>
              <label className={labelCls}>Reason <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500}
                placeholder="Brief reason…" className={`${inputCls} resize-none`} />
            </div>

            {leaveError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{leaveError}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</button>
              <button type="submit" disabled={!targetUserId || !startDate || !endDate || leaveMut.isPending}
                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
                {leaveMut.isPending ? 'Saving…' : 'Record Leave'}
              </button>
            </div>
          </form>
        )}

        {/* ── Record Late Comings form ── */}
        {tab === 'late' && (
          <form
            onSubmit={(e) => { e.preventDefault(); setLateError(''); lateMut.mutate(); }}
            className="px-6 py-5 space-y-4"
          >
            <div>
              <label className={labelCls}>Team Member <span className="text-red-400">*</span></label>
              <select value={lateUserId} onChange={(e) => setLateUserId(e.target.value)} required className={inputCls}>
                <option value="">Select member…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Date <span className="text-red-400">*</span></label>
              <input type="date" value={lateDate} max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setLateDate(e.target.value)} required className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Minutes Late <span className="text-red-400">*</span></label>

              {/* Quick presets */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {[5, 10, 15, 20, 30, 45, 60, 90].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMinutesLate(v)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      minutesLate === v
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                    }`}
                  >
                    {v < 60 ? `${v}m` : `${v / 60}h`}
                  </button>
                ))}
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setMinutesLate((p) => Math.max(1, p - 1))}
                  disabled={minutesLate <= 1}
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition text-lg font-bold"
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-800 tabular-nums">{minutesLate || '—'}</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">{minutesLate === 1 ? 'minute late' : minutesLate > 0 ? 'minutes late' : 'select or adjust'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMinutesLate((p) => Math.min(480, p + 1))}
                  disabled={minutesLate >= 480}
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Reason <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={lateReason} onChange={(e) => setLateReason(e.target.value)} rows={2} maxLength={500}
                placeholder="Brief reason…" className={`${inputCls} resize-none`} />
            </div>

            {lateError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{lateError}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</button>
              <button type="submit" disabled={!lateUserId || !lateDate || minutesLate < 1 || lateMut.isPending}
                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
                {lateMut.isPending ? 'Saving…' : 'Record Late Coming'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LeavePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const isAllowed =
    user?.systemRole === 'SUPER_USER' ||
    user?.systemRole === 'ADMIN' ||
    user?.systemRole === 'BU_HEAD' ||
    user?.hasPmRole === true;

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm text-gray-400">Access restricted to Project Managers, Admins, and Super Admins.</p>
      </div>
    );
  }

  const [showRecord, setShowRecord]     = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState<'' | 'PLANNED' | 'UNPLANNED'>('');
  const [toast, setToast]               = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: members = [] } = useQuery({
    queryKey: ['leave-members'],
    queryFn: leaveApi.getMembers,
    staleTime: 120_000,
  });

  const { data: leaves = [], isLoading, error } = useQuery({
    queryKey: ['leave-requests', memberFilter],
    queryFn: () => leaveApi.list(memberFilter ? { userId: memberFilter } : undefined),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => leaveApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['kpi-live'] });
      setToast('Leave record removed');
    },
  });

  const { data: lateComings = [], isLoading: lateLoading } = useQuery({
    queryKey: ['late-comings', memberFilter],
    queryFn: () => lateComingsApi.list(memberFilter ? { userId: memberFilter } : undefined),
  });

  const deleteLateComingMut = useMutation({
    mutationFn: (id: string) => lateComingsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['late-comings'] });
      setToast('Late coming record removed');
    },
  });

  // Apply client-side planned/unplanned filter
  const filteredLeaves = typeFilter
    ? leaves.filter((l) => (typeFilter === 'PLANNED' ? l.isPlanned : !l.isPlanned))
    : leaves;

  // Summary
  const thisYear = new Date().getFullYear();
  const totalRecorded     = leaves.filter((l) => l.status === 'APPROVED').length;
  const plannedCount      = leaves.filter((l) => l.status === 'APPROVED' && l.isPlanned).length;
  const unplannedCount    = leaves.filter((l) => l.status === 'APPROVED' && !l.isPlanned).length;
  const daysThisYear      = leaves
    .filter((l) => l.status === 'APPROVED' && new Date(l.startDate).getFullYear() === thisYear)
    .reduce((s, l) => s + l.totalDays, 0);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Attendance Log</h1>
            <p className="text-xs text-gray-400 mt-0.5">Record leaves and late comings for your team</p>
          </div>
          <button
            onClick={() => setShowRecord(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record Log
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-[#cccccc] rounded-xl">
            <span className="text-lg font-bold text-gray-700">{totalRecorded}</span>
            <span className="text-xs text-gray-500">Total Recorded</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
            <span className="text-lg font-bold text-blue-700">{plannedCount}</span>
            <span className="text-xs text-blue-600">Planned</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
            <span className="text-lg font-bold text-orange-700">{unplannedCount}</span>
            <span className="text-xs text-orange-600">Unplanned</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-xl">
            <span className="text-lg font-bold text-primary-700">{daysThisYear}</span>
            <span className="text-xs text-primary-600">Days recorded {thisYear}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Member filter */}
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-700"
          >
            <option value="">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </select>

          {/* Planned / Unplanned filter tabs */}
          {(['', 'PLANNED', 'UNPLANNED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                typeFilter === f
                  ? f === 'PLANNED'
                    ? 'bg-primary-600 text-white'
                    : f === 'UNPLANNED'
                      ? 'bg-orange-500 text-white'
                      : 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === '' ? 'All' : f === 'PLANNED' ? 'Planned' : 'Unplanned'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">
            Failed to load leave records.
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            No leave records found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded By</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredLeaves.map((leave) => (
                <LeaveRow
                  key={leave.id}
                  leave={leave}
                  onCancel={() => cancelMut.mutate(leave.id)}
                  isCancelPending={cancelMut.isPending && cancelMut.variables === leave.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Late Comings Table ── */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Late Comings</h2>
          {lateLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
        </div>
        {lateComings.length === 0 && !lateLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-sm text-gray-400">
            <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No late coming records found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Minutes Late</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded By</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {lateComings.map((lc: LateComingLog) => (
                <tr key={lc.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {lc.user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{lc.user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-700">{fmtDate(lc.date.slice(0, 10))}</p>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      {lc.minutesLate} min
                    </span>
                  </td>
                  <td className="px-5 py-3.5 max-w-[180px]">
                    <p className="text-xs text-gray-500 truncate" title={lc.reason ?? undefined}>
                      {lc.reason ?? <span className="text-gray-300">—</span>}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-500">{lc.recordedBy.fullName}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => deleteLateComingMut.mutate(lc.id)}
                      disabled={deleteLateComingMut.isPending && deleteLateComingMut.variables === lc.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showRecord && (
        <RecordLogModal
          onClose={() => setShowRecord(false)}
          onSuccess={(msg) => setToast(msg)}
          members={members}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────────────

function LeaveRow({
  leave,
  onCancel,
  isCancelPending,
}: {
  leave: LeaveRequest;
  onCancel: () => void;
  isCancelPending: boolean;
}) {
  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Employee */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {leave.user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <span className="text-sm font-medium text-gray-800">{leave.user.fullName}</span>
        </div>
      </td>

      {/* Category */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          leave.isPlanned ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {leave.isPlanned ? 'Planned' : 'Unplanned'}
        </span>
      </td>

      {/* Period */}
      <td className="px-5 py-3.5">
        <p className="text-sm text-gray-700">{fmtDate(leave.startDate.slice(0, 10))}</p>
        <p className="text-xs text-gray-400 mt-0.5">→ {fmtDate(leave.endDate.slice(0, 10))}</p>
      </td>

      {/* Days */}
      <td className="px-5 py-3.5 text-center">
        <span className="text-sm font-semibold text-gray-800">{leave.totalDays}</span>
        <span className="text-xs text-gray-400 ml-0.5">d</span>
        {leave.isHalfDay && (
          <span className="block text-[10px] text-primary-600 font-medium mt-0.5">half-day</span>
        )}
      </td>

      {/* Reason */}
      <td className="px-5 py-3.5 max-w-[180px]">
        <p className="text-xs text-gray-500 truncate" title={leave.reason ?? undefined}>
          {leave.reason ?? <span className="text-gray-300">—</span>}
        </p>
      </td>

      {/* Recorded by */}
      <td className="px-5 py-3.5">
        <p className="text-xs text-gray-500">{leave.approvedBy?.fullName ?? '—'}</p>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 text-right">
        {leave.status !== 'CANCELLED' && (
          <button
            onClick={onCancel}
            disabled={isCancelPending}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 rounded-lg transition"
          >
            {isCancelPending ? 'Removing…' : 'Remove'}
          </button>
        )}
        {leave.status === 'CANCELLED' && (
          <span className="text-xs text-gray-300 italic">Removed</span>
        )}
      </td>
    </tr>
  );
}
