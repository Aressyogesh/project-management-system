import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveApi, type LeaveRequest, type LeaveStatus, type LeaveType } from '../../../api/leaveApi';
import { useAuthStore } from '../../../store/authStore';

// ── Design tokens (match rest of app) ────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

// ── Config ────────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  SICK:      'Sick Leave',
  CASUAL:    'Casual Leave',
  EARNED:    'Earned Leave',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  UNPAID:    'Unpaid Leave',
  OTHER:     'Other',
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  SICK:      'bg-red-100 text-red-700',
  CASUAL:    'bg-blue-100 text-blue-700',
  EARNED:    'bg-emerald-100 text-emerald-700',
  MATERNITY: 'bg-pink-100 text-pink-700',
  PATERNITY: 'bg-indigo-100 text-indigo-700',
  UNPAID:    'bg-gray-100 text-gray-600',
  OTHER:     'bg-amber-100 text-amber-700',
};

const STATUS_CONFIG: Record<LeaveStatus, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-700'   },
  APPROVED:  { label: 'Approved',  bg: 'bg-green-100',   text: 'text-green-700'   },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-100',     text: 'text-red-600'     },
  CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100',    text: 'text-gray-500'    },
};

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

// ── Apply Leave Modal ─────────────────────────────────────────────────────────

function ApplyLeaveModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      leaveApi.create({ type, startDate, endDate, reason: reason.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      onSuccess('Leave request submitted successfully');
      onClose();
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message ?? 'Failed to submit leave request'),
  });

  const totalDays =
    startDate && endDate
      ? Math.max(
          0,
          Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000,
          ) + 1,
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Apply for Leave</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <form
          onSubmit={(e) => { e.preventDefault(); setError(''); mut.mutate(); }}
          className="px-6 py-5 space-y-4"
        >
          <div>
            <label className={labelCls}>Leave Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className={inputCls}
            >
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => (
                <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={inputCls}
              />
            </div>
          </div>

          {totalDays > 0 && (
            <p className="text-xs font-medium text-primary-700 bg-primary-50 border border-primary-100 px-3 py-2 rounded-lg">
              {totalDays} working day{totalDays !== 1 ? 's' : ''} of leave
            </p>
          )}

          <div>
            <label className={labelCls}>Reason <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Brief reason for leave…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!startDate || !endDate || mut.isPending}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition"
            >
              {mut.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  leave,
  onClose,
  onSuccess,
}: {
  leave: LeaveRequest;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const mut = useMutation({
    mutationFn: () => leaveApi.reject(leave.id, note.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      onSuccess('Leave request rejected');
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Reject Leave Request</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <p className="font-medium text-gray-800">{leave.user.fullName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {LEAVE_TYPE_LABELS[leave.type]} · {fmtDate(leave.startDate.slice(0, 10))} – {fmtDate(leave.endDate.slice(0, 10))} · {leave.totalDays}d
            </p>
          </div>
          <div>
            <label className={labelCls}>Rejection Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Reason for rejection…"
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition"
            >
              {mut.isPending ? 'Rejecting…' : 'Reject Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LeavePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';
  const isSuperUser = user?.systemRole === 'SUPER_USER';

  const [showApply, setShowApply] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: leaves = [], isLoading, error } = useQuery({
    queryKey: ['leave-requests', statusFilter],
    queryFn: () => leaveApi.list(statusFilter ? { status: statusFilter } : undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['leave-requests'] });

  const approveMut = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: () => { invalidate(); setToast('Leave request approved'); },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => leaveApi.cancel(id),
    onSuccess: () => { invalidate(); setToast('Leave request cancelled'); },
  });

  // Summary counts
  const pending          = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedAll      = leaves.filter((l) => l.status === 'APPROVED').length;
  const thisYear         = new Date().getFullYear();
  const approvedDaysThisYear = leaves
    .filter((l) => l.status === 'APPROVED' && new Date(l.startDate).getFullYear() === thisYear)
    .reduce((s, l) => s + l.totalDays, 0);

  const statusTabs: Array<LeaveStatus | ''> = ['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
  const tabLabel = (s: LeaveStatus | '') =>
    s === '' ? 'All' : STATUS_CONFIG[s].label;

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Leave Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAdmin
                ? 'Review and manage all team leave requests'
                : 'Apply for leave and track your request status'}
            </p>
          </div>
          {!isSuperUser && (
            <button
              onClick={() => setShowApply(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Apply for Leave
            </button>
          )}
        </div>

        {/* Summary stat chips */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <span className="text-lg font-bold text-amber-700">{pending}</span>
            <span className="text-xs text-amber-600">Pending</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl">
            <span className="text-lg font-bold text-green-700">{approvedAll}</span>
            <span className="text-xs text-green-600">Approved</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-xl">
            <span className="text-lg font-bold text-primary-700">{approvedDaysThisYear}</span>
            <span className="text-xs text-primary-600">Days used {thisYear}</span>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 mt-4 flex-wrap">
          {statusTabs.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tabLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">
            Failed to load leave requests.
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            No leave requests found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                {isAdmin && (
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                )}
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {leaves.map((leave) => (
                <LeaveRow
                  key={leave.id}
                  leave={leave}
                  isAdmin={isAdmin}
                  currentUserId={user?.id ?? ''}
                  onApprove={() => approveMut.mutate(leave.id)}
                  onReject={() => setRejectTarget(leave)}
                  onCancel={() => cancelMut.mutate(leave.id)}
                  isApprovePending={approveMut.isPending && approveMut.variables === leave.id}
                  isCancelPending={cancelMut.isPending && cancelMut.variables === leave.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showApply && (
        <ApplyLeaveModal
          onClose={() => setShowApply(false)}
          onSuccess={(msg) => setToast(msg)}
        />
      )}
      {rejectTarget && (
        <RejectModal
          leave={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={(msg) => setToast(msg)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function LeaveRow({
  leave,
  isAdmin,
  currentUserId,
  onApprove,
  onReject,
  onCancel,
  isApprovePending,
  isCancelPending,
}: {
  leave: LeaveRequest;
  isAdmin: boolean;
  currentUserId: string;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  isApprovePending: boolean;
  isCancelPending: boolean;
}) {
  const isOwn = leave.userId === currentUserId;
  const { bg, text, label } = STATUS_CONFIG[leave.status];

  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Employee (admin only) */}
      {isAdmin && (
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {leave.user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span className="text-sm font-medium text-gray-800">{leave.user.fullName}</span>
          </div>
        </td>
      )}

      {/* Leave type */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEAVE_TYPE_COLORS[leave.type]}`}>
          {LEAVE_TYPE_LABELS[leave.type]}
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
      </td>

      {/* Reason */}
      <td className="px-5 py-3.5 max-w-[200px]">
        <p className="text-xs text-gray-500 truncate" title={leave.reason ?? undefined}>
          {leave.reason ?? <span className="text-gray-300">—</span>}
        </p>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
            {label}
          </span>
          {leave.status === 'APPROVED' && leave.approvedBy && (
            <p className="text-[10px] text-gray-400 mt-0.5">by {leave.approvedBy.fullName}</p>
          )}
          {leave.status === 'REJECTED' && leave.approvalNote && (
            <p className="text-[10px] text-red-500 mt-0.5 max-w-[140px] truncate" title={leave.approvalNote}>
              {leave.approvalNote}
            </p>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {isAdmin && leave.status === 'PENDING' && (
            <>
              <button
                onClick={onApprove}
                disabled={isApprovePending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition"
              >
                {isApprovePending ? 'Approving…' : 'Approve'}
              </button>
              <button
                onClick={onReject}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
              >
                Reject
              </button>
            </>
          )}
          {isOwn && leave.status === 'PENDING' && (
            <button
              onClick={onCancel}
              disabled={isCancelPending}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition"
            >
              {isCancelPending ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
          {leave.status !== 'PENDING' && !isOwn && !isAdmin && (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
