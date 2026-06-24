import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { upskillApi, type CreateAssignmentDto, type UpskillAssignment, type UpskillStatus, type UpskillType } from '../../../api/upskillApi';
import { usersApi } from '../../../api/users.api';
import type { User } from '../../../types/users.types';
import { useAuthStore } from '../../../store/authStore';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<UpskillStatus, { label: string; cls: string }> = {
  ASSIGNED:    { label: 'Assigned',    cls: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED:   { label: 'Submitted',   cls: 'bg-amber-100 text-amber-700' },
  APPROVED:    { label: 'Approved',    cls: 'bg-green-100 text-green-700' },
  REJECTED:    { label: 'Rejected',    cls: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }: { status: UpskillStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Create Assignment Modal ──────────────────────────────────────────────────

function CreateAssignmentModal({ type, onClose }: { type: UpskillType; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: usersPage } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ limit: 200 }),
    staleTime: 60_000,
  });
  const users = usersPage?.data ?? [];

  const [form, setForm] = useState<Partial<CreateAssignmentDto>>({ type });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => upskillApi.createAssignment(form as CreateAssignmentDto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upskill-assignments'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.assignedToId) {
      setError('Please select a resource');
      return;
    }
    if (type === 'AUTOMATION' && !form.toolScript?.trim()) {
      setError('Tool / Script Name is required for Automation type');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError('Start date and end date are required');
      return;
    }
    if (form.endDate <= form.startDate) {
      setError('End date must be after start date');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            Create {type === 'LEARNING' ? 'Learning' : 'Automation'} Assignment
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assign Resource *</label>
            <select
              required
              value={form.assignedToId ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, assignedToId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select a resource…</option>
              {users.map((u: User) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          {type === 'AUTOMATION' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tool / Script Name *</label>
              <input
                required
                value={form.toolScript ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, toolScript: e.target.value }))}
                placeholder="e.g. Selenium regression suite"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {type === 'LEARNING' ? 'What to learn' : 'What to automate'} *
            </label>
            <textarea
              required
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={type === 'LEARNING' ? 'Describe the learning goal…' : 'Describe the automation goal…'}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={form.startDate ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
              <input
                type="date"
                required
                min={form.startDate ? (() => { const d = new Date(form.startDate!); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })() : undefined}
                value={form.endDate ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="text-sm px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition"
            >
              {createMutation.isPending ? 'Creating…' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Progress Log Drawer ──────────────────────────────────────────────────────

function ProgressDrawer({ assignment, onClose }: { assignment: UpskillAssignment; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [pct, setPct] = useState('');
  const [hrs, setHrs] = useState('');
  const [notes, setNotes] = useState('');
  const [formErr, setFormErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileErr, setFileErr] = useState('');

  const isOwner = user?.id === assignment.assignedToId;
  const canLog = isOwner && assignment.status !== 'APPROVED' && assignment.status !== 'SUBMITTED';
  const canSubmit = isOwner && (assignment.status === 'ASSIGNED' || assignment.status === 'IN_PROGRESS' || assignment.status === 'REJECTED');

  const logMutation = useMutation({
    mutationFn: () =>
      upskillApi.logProgress(assignment.id, {
        percentComplete: Number(pct),
        hoursSpent: Number(hrs),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upskill-assignments'] });
      qc.invalidateQueries({ queryKey: ['upskill-detail', assignment.id] });
      setPct(''); setHrs(''); setNotes(''); setFormErr('');
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: (file: File) => upskillApi.submitEvidence(assignment.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upskill-assignments'] });
      qc.invalidateQueries({ queryKey: ['upskill-detail', assignment.id] });
      setFileErr('');
    },
    onError: (e: Error) => setFileErr(e.message),
  });

  const { data: detail } = useQuery({
    queryKey: ['upskill-detail', assignment.id],
    queryFn: () => upskillApi.getAssignment(assignment.id),
    staleTime: 10_000,
  });

  const logs = detail?.progressLogs ?? assignment.progressLogs ?? [];

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileErr('File size must not exceed 10 MB');
      return;
    }
    setFileErr('');
    submitMutation.mutate(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Progress — {assignment.assignedTo?.fullName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{assignment.type === 'LEARNING' ? 'Learning' : 'Automation'} Assignment</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status + rejection reason */}
          <div className="flex items-center gap-3">
            <StatusBadge status={detail?.status ?? assignment.status} />
            {(detail?.status ?? assignment.status) === 'REJECTED' && (detail?.rejectionReason ?? assignment.rejectionReason) && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100 flex-1">
                Rejection: {detail?.rejectionReason ?? assignment.rejectionReason}
              </p>
            )}
          </div>

          {/* Assignment info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-xs text-gray-600">
            <p><span className="font-medium">Description:</span> {assignment.description}</p>
            {assignment.toolScript && <p><span className="font-medium">Tool/Script:</span> {assignment.toolScript}</p>}
            <p><span className="font-medium">Duration:</span> {new Date(assignment.startDate).toLocaleDateString()} – {new Date(assignment.endDate).toLocaleDateString()}</p>
          </div>

          {/* Progress history */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Progress History</h3>
            {logs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No progress logged yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-semibold text-blue-700">{log.percentComplete}%</span>
                      <span className="text-xs text-gray-500">{log.hoursSpent}h spent</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    {log.notes && <p className="text-[10px] text-gray-500">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log progress form */}
          {canLog && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Log Progress</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">% Complete *</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) => setPct(e.target.value)}
                      placeholder="0–100"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hours Spent *</label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={hrs}
                      onChange={(e) => setHrs(e.target.value)}
                      placeholder="e.g. 2.5"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                {formErr && <p className="text-xs text-red-600">{formErr}</p>}
                <button
                  onClick={() => {
                    if (!pct || !hrs) { setFormErr('% Complete and Hours Spent are required'); return; }
                    if (Number(pct) < 0 || Number(pct) > 100) { setFormErr('Must be between 0 and 100'); return; }
                    logMutation.mutate();
                  }}
                  disabled={logMutation.isPending}
                  className="w-full text-sm py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition"
                >
                  {logMutation.isPending ? 'Saving…' : 'Save Progress'}
                </button>
              </div>
            </div>
          )}

          {/* Final submission */}
          {canSubmit && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-1">Final Submission</h3>
              <p className="text-xs text-gray-400 mb-3">Attach certificate or evidence (PDF, DOCX, PNG, JPG — max 10 MB)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={submitMutation.isPending}
                className="w-full text-sm py-2 rounded-lg border-2 border-dashed border-primary-300 text-primary-600 hover:bg-primary-50 disabled:opacity-60 transition"
              >
                {submitMutation.isPending ? 'Uploading…' : '+ Attach & Submit Evidence'}
              </button>
              {fileErr && <p className="text-xs text-red-600 mt-1">{fileErr}</p>}
            </div>
          )}

          {(detail?.status ?? assignment.status) === 'SUBMITTED' && !isOwner && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Evidence submitted — awaiting your approval.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Assignment Row ───────────────────────────────────────────────────────────

function AssignmentRow({
  asgn,
  onProgress,
  onApprove,
  onReject,
}: {
  asgn: UpskillAssignment;
  onProgress: (a: UpskillAssignment) => void;
  onApprove: (id: string) => void;
  onReject: (a: UpskillAssignment) => void;
}) {
  const latestPct = asgn.progressLogs?.[0]?.percentComplete ?? 0;
  const totalHours = asgn.progressLogs?.reduce((s, l) => s + l.hoursSpent, 0) ?? 0;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-800">{asgn.assignedTo?.fullName ?? '—'}</p>
        <p className="text-[10px] text-gray-400">{asgn.createdBy?.fullName}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
        <p className="truncate">{asgn.description}</p>
        {asgn.toolScript && <p className="text-[10px] text-gray-400 truncate">{asgn.toolScript}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        {new Date(asgn.startDate).toLocaleDateString()} –<br />{new Date(asgn.endDate).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        <span className="font-medium">{latestPct}%</span>
        {totalHours > 0 && <span className="text-gray-400"> · {totalHours}h</span>}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={asgn.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onProgress(asgn)}
            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
          >
            View
          </button>
          {asgn.status === 'SUBMITTED' && (
            <>
              <button
                onClick={() => onApprove(asgn.id)}
                className="text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(asgn)}
                className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({ assignment, onClose }: { assignment: UpskillAssignment; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const rejectMutation = useMutation({
    mutationFn: () => upskillApi.reject(assignment.id, reason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upskill-assignments'] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Reject Assignment</h2>
        <p className="text-sm text-gray-600 mb-3">
          Rejecting <span className="font-medium">{assignment.assignedTo?.fullName}</span>'s submission. Provide a reason so they can resubmit.
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button
            onClick={() => {
              if (!reason.trim()) { setErr('Reason is required'); return; }
              rejectMutation.mutate();
            }}
            disabled={rejectMutation.isPending}
            className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition"
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Upskill Page ────────────────────────────────────────────────────────

const TABS: { id: UpskillType; label: string }[] = [
  { id: 'LEARNING', label: 'Learning' },
  { id: 'AUTOMATION', label: 'Automation' },
];

const STATUS_FILTERS: { value: UpskillStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function UpskillPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<UpskillType>('LEARNING');
  const [statusFilter, setStatusFilter] = useState<UpskillStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [progressFor, setProgressFor] = useState<UpskillAssignment | null>(null);
  const [rejectFor, setRejectFor] = useState<UpskillAssignment | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['upskill-assignments', activeTab, statusFilter],
    queryFn: () =>
      upskillApi.listAssignments({
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      }),
    staleTime: 15_000,
  });

  const filtered = assignments.filter((a) => a.type === activeTab);

  const approveMutation = useMutation({
    mutationFn: (id: string) => upskillApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upskill-assignments'] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upskill</h1>
          <p className="text-sm text-gray-400 mt-0.5">Assign and track learning & automation upskilling for your team</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Assignment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UpskillStatus | 'ALL')}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} assignment{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No {activeTab.toLowerCase()} assignments yet</p>
            <p className="text-xs text-gray-400 mt-1">Create an assignment to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resource</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {activeTab === 'AUTOMATION' ? 'Description / Tool' : 'Description'}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((asgn) => (
                  <AssignmentRow
                    key={asgn.id}
                    asgn={asgn}
                    onProgress={(a) => setProgressFor(a)}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(a) => setRejectFor(a)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateAssignmentModal type={activeTab} onClose={() => setShowCreate(false)} />}
      {progressFor && <ProgressDrawer assignment={progressFor} onClose={() => setProgressFor(null)} />}
      {rejectFor && <RejectModal assignment={rejectFor} onClose={() => setRejectFor(null)} />}
    </div>
  );
}
