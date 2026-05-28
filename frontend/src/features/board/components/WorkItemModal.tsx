import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '../api/boardApi';
import {
  BOARD_COLUMNS,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  type BoardStatus,
  type BugClassification,
  type BugSeverity,
  type Sprint,
  type TaskPriority,
  type WorkItem,
  type WorkItemType,
} from '../types/board.types';
import { TypeBadge } from './TypeBadge';
import { useAuthStore } from '../../../store/authStore';

type Tab = 'details' | 'logTime' | 'comments' | 'attachments' | 'children';

interface Props {
  item: WorkItem | null;
  sprints: Sprint[];
  onClose: () => void;
  onSaved: () => void;
}

interface CreateProps {
  projectId: string;
  sprints: Sprint[];
  members?: { id: string; fullName: string }[];
  defaultType?: WorkItemType;
  parentId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatHours(h: number) {
  return h % 1 === 0 ? `${h}h` : `${h}h`;
}

// ─── Existing item modal ──────────────────────────────────────────────────────

export function WorkItemModal({ item, sprints, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: detail } = useQuery({
    queryKey: ['workItem', item?.id],
    queryFn: () => boardApi.getWorkItem(item!.id),
    enabled: !!item?.id,
    initialData: item ?? undefined,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<WorkItem>) => boardApi.updateWorkItem(item!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workItem', item!.id] }); onSaved(); },
  });

  const logTimeMut = useMutation({
    mutationFn: (d: { date: string; hours: number; description?: string }) =>
      boardApi.logTime(item!.id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  const deleteEntryMut = useMutation({
    mutationFn: (entryId: string) => boardApi.deleteTimesheetEntry(entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  const addCommentMut = useMutation({
    mutationFn: (content: string) => boardApi.addComment(item!.id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  const deleteCommentMut = useMutation({
    mutationFn: ({ wid, cid }: { wid: string; cid: string }) => boardApi.deleteComment(wid, cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [commentText, setCommentText] = useState('');

  if (!item || !detail) return null;

  const totalLogged = (detail.timesheetEntries ?? []).reduce((s, e) => s + Number(e.hours), 0);
  const remaining = detail.estimatedHours ? Number(detail.estimatedHours) - totalLogged : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'logTime', label: `Log Time${totalLogged > 0 ? ` (${totalLogged}h)` : ''}` },
    { id: 'comments', label: `Comments (${detail.comments?.length ?? 0})` },
    { id: 'attachments', label: `Attachments (${detail.attachments?.length ?? 0})` },
    { id: 'children', label: `Child Items (${detail.children?.length ?? 0})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3 border-b border-gray-100">
          <TypeBadge type={detail.type} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{detail.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Reported by {detail.reporter.fullName} · {formatDate(detail.createdAt)}
              {detail.reopenCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">Reopens: {detail.reopenCount}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-2 border-b border-gray-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs font-medium rounded-t whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'text-primary-700 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── Details ── */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Status">
                  <select
                    value={detail.status}
                    onChange={(e) => updateMut.mutate({ status: e.target.value as BoardStatus })}
                    className="input-sm"
                  >
                    {BOARD_COLUMNS.map((c) => (
                      <option key={c.status} value={c.status}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <select
                    value={detail.priority}
                    onChange={(e) => updateMut.mutate({ priority: e.target.value as TaskPriority })}
                    className="input-sm"
                  >
                    {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Assignee">
                  <p className="text-gray-700">{detail.assignee?.fullName ?? 'Unassigned'}</p>
                </Field>
                <Field label="Sprint">
                  <select
                    value={detail.sprintId ?? ''}
                    onChange={(e) => updateMut.mutate({ sprintId: e.target.value || undefined })}
                    className="input-sm"
                  >
                    <option value="">Backlog</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Story Points">
                  <input
                    type="number"
                    min={0}
                    defaultValue={detail.storyPoints ?? ''}
                    onBlur={(e) => updateMut.mutate({ storyPoints: Number(e.target.value) || undefined })}
                    className="input-sm w-24"
                  />
                </Field>
                <Field label="Estimated Hours">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={detail.estimatedHours ?? ''}
                    onBlur={(e) => updateMut.mutate({ estimatedHours: Number(e.target.value) || undefined })}
                    className="input-sm w-24"
                  />
                </Field>
                <Field label="Start Date">
                  <input
                    type="date"
                    defaultValue={detail.startDate?.slice(0, 10) ?? ''}
                    onBlur={(e) => updateMut.mutate({ startDate: e.target.value || undefined })}
                    className="input-sm"
                  />
                </Field>
                <Field label="Due Date">
                  <input
                    type="date"
                    defaultValue={detail.dueDate?.slice(0, 10) ?? ''}
                    onBlur={(e) => updateMut.mutate({ dueDate: e.target.value || undefined })}
                    className="input-sm"
                  />
                </Field>
                {detail.fixVersion != null && (
                  <Field label="Fix Version">
                    <p className="text-gray-700">{detail.fixVersion}</p>
                  </Field>
                )}
                {detail.completedAt && (
                  <Field label="Completed At">
                    <p className="text-gray-700">{formatDate(detail.completedAt)}</p>
                  </Field>
                )}
              </div>

              {/* Bug-specific fields */}
              {detail.type === 'BUG' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bug Details</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Field label="Severity">
                      <select
                        value={detail.severity ?? ''}
                        onChange={(e) => updateMut.mutate({ severity: (e.target.value as BugSeverity) || undefined })}
                        className="input-sm"
                      >
                        <option value="">— select —</option>
                        {(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as BugSeverity[]).map((s) => (
                          <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Classification">
                      <select
                        value={detail.bugClassification ?? ''}
                        onChange={(e) => updateMut.mutate({ bugClassification: (e.target.value as BugClassification) || undefined })}
                        className="input-sm"
                      >
                        <option value="">— select —</option>
                        <option value="UI_USABILITY">UI/Usability</option>
                        <option value="NEW_BUG">New Bug</option>
                        <option value="ENHANCEMENT">Enhancement</option>
                        <option value="PERFORMANCE">Performance</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </Field>
                  </div>
                  {detail.environment && (
                    <Field label="Environment"><p className="text-gray-700 text-sm">{detail.environment}</p></Field>
                  )}
                  {detail.stepsToRepro && (
                    <Field label="Steps to Reproduce">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{detail.stepsToRepro}</pre>
                    </Field>
                  )}
                </div>
              )}

              {/* Labels */}
              {detail.labels.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.labels.map((l) => (
                      <span key={l} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {detail.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Log Time ── */}
          {activeTab === 'logTime' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm text-center bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-lg font-bold text-gray-800">{formatHours(totalLogged)}</p>
                  <p className="text-xs text-gray-500">Logged</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-800">
                    {detail.estimatedHours ? `${detail.estimatedHours}h` : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Estimated</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${remaining != null && remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {remaining != null ? `${remaining.toFixed(1)}h` : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Remaining</p>
                </div>
              </div>

              {/* Log form */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600">Log Work</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Hours</label>
                    <input
                      type="number"
                      min={0.25}
                      max={24}
                      step={0.25}
                      placeholder="e.g. 2.5"
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      className="input-sm w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
                  <input
                    type="text"
                    placeholder="What did you work on?"
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    className="input-sm w-full"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!logDate || !logHours) return;
                    logTimeMut.mutate(
                      { date: logDate, hours: Number(logHours), description: logDesc || undefined },
                      { onSuccess: () => { setLogHours(''); setLogDesc(''); } },
                    );
                  }}
                  disabled={!logDate || !logHours || logTimeMut.isPending}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  {logTimeMut.isPending ? 'Logging…' : 'Log Time'}
                </button>
              </div>

              {/* Previous entries */}
              {(detail.timesheetEntries ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Previous Logs</p>
                  <div className="space-y-2">
                    {(detail.timesheetEntries ?? []).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-gray-800">
                            {formatDate(entry.date)} · <span className="text-emerald-600">{entry.hours}h</span>
                          </p>
                          {entry.description && (
                            <p className="text-xs text-gray-500">{entry.description}</p>
                          )}
                          <p className="text-[10px] text-gray-400">{entry.user.fullName}</p>
                        </div>
                        {(entry.userId === user?.id || user?.systemRole !== 'EMPLOYEE') && (
                          <button
                            onClick={() => deleteEntryMut.mutate(entry.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Comments ── */}
          {activeTab === 'comments' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  className="input-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentText.trim()) {
                      addCommentMut.mutate(commentText.trim(), { onSuccess: () => setCommentText('') });
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (commentText.trim()) {
                      addCommentMut.mutate(commentText.trim(), { onSuccess: () => setCommentText('') });
                    }
                  }}
                  disabled={!commentText.trim() || addCommentMut.isPending}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Post
                </button>
              </div>
              {(detail.comments ?? []).map((c) => (
                <div key={c.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-[9px] font-bold">
                      {c.author.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{c.author.fullName}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(c.createdAt)}</p>
                  </div>
                  {(c.authorId === user?.id || user?.systemRole !== 'EMPLOYEE') && (
                    <button
                      onClick={() => deleteCommentMut.mutate({ wid: detail.id, cid: c.id })}
                      className="text-gray-300 hover:text-red-500 shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Attachments ── */}
          {activeTab === 'attachments' && (
            <div className="space-y-2">
              {(detail.attachments ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No attachments yet.</p>
              ) : (
                (detail.attachments ?? []).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{a.originalName}</p>
                      <p className="text-[10px] text-gray-400">
                        {(a.size / 1024).toFixed(1)} KB · {a.uploadedBy.fullName}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Child Items ── */}
          {activeTab === 'children' && (
            <div className="space-y-2">
              {(detail.children ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No child items.</p>
              ) : (
                (detail.children ?? []).map((child) => (
                  <div key={child.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <TypeBadge type={child.type} />
                    <p className="text-xs text-gray-700 flex-1 truncate">{child.title}</p>
                    <span className="text-[10px] text-gray-400 shrink-0">{child.status.replace(/_/g, ' ')}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Item modal ────────────────────────────────────────────────────────

export function CreateWorkItemModal({ projectId, sprints, members = [], defaultType = 'TASK', parentId, onClose, onSaved }: CreateProps) {
  const qc = useQueryClient();
  const [type, setType] = useState<WorkItemType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [sprintId, setSprintId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [severity, setSeverity] = useState<BugSeverity | ''>('');
  const [bugClassification, setBugClassification] = useState<BugClassification | ''>('');
  const [environment, setEnvironment] = useState('');
  const [stepsToRepro, setStepsToRepro] = useState('');

  const createMut = useMutation({
    mutationFn: (data: Partial<WorkItem>) => boardApi.createWorkItem(projectId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board', projectId] }); onSaved(); },
  });

  function handleSubmit() {
    if (!title.trim()) return;
    createMut.mutate({
      type,
      title: title.trim(),
      description: description || undefined,
      priority,
      sprintId: sprintId || undefined,
      assigneeId: assigneeId || undefined,
      parentId: parentId || undefined,
      storyPoints: storyPoints ? Number(storyPoints) : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      dueDate: dueDate || undefined,
      severity: (severity || undefined) as BugSeverity | undefined,
      bugClassification: (bugClassification || undefined) as BugClassification | undefined,
      environment: environment || undefined,
      stepsToRepro: stepsToRepro || undefined,
    } as Partial<WorkItem>);
  }

  const CREATABLE_TYPES: WorkItemType[] = ['EPIC', 'USER_STORY', 'TASK', 'SUB_TASK', 'BUG'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Create Work Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type *</label>
            <div className="flex flex-wrap gap-2">
              {CREATABLE_TYPES.map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      type === t
                        ? `${cfg.bg} ${cfg.text} border-transparent`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Work item title…"
              className="input-sm w-full"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a description…"
              className="input-sm w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input-sm w-full">
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
            </div>

            {/* Sprint */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sprint</label>
              <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className="input-sm w-full">
                <option value="">Backlog</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Story Points */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Story Points</label>
              <input
                type="number"
                min={0}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                className="input-sm w-full"
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estimated Hours</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="input-sm w-full"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-sm w-full"
              />
            </div>

            {/* Assignee */}
            {members.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Assignee</label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input-sm w-full">
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Bug-specific fields */}
          {type === 'BUG' && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bug Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Severity</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value as BugSeverity)} className="input-sm w-full">
                    <option value="">— select —</option>
                    {(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as BugSeverity[]).map((s) => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Classification</label>
                  <select value={bugClassification} onChange={(e) => setBugClassification(e.target.value as BugClassification)} className="input-sm w-full">
                    <option value="">— select —</option>
                    <option value="UI_USABILITY">UI/Usability</option>
                    <option value="NEW_BUG">New Bug</option>
                    <option value="ENHANCEMENT">Enhancement</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Environment</label>
                <input type="text" value={environment} onChange={(e) => setEnvironment(e.target.value)} className="input-sm w-full" placeholder="e.g. Production, Chrome 124" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Steps to Reproduce</label>
                <textarea value={stepsToRepro} onChange={(e) => setStepsToRepro(e.target.value)} rows={3} className="input-sm w-full resize-none" placeholder="1. Go to…&#10;2. Click…&#10;3. Observe…" />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || createMut.isPending}
            className="btn-primary text-sm px-4 py-2"
          >
            {createMut.isPending ? 'Creating…' : 'Create Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}
