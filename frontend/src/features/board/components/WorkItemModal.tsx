import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '../api/boardApi';
import {
  BOARD_COLUMNS,
  BUG_STATUS_CONFIG,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  type BillingStatus,
  type BoardStatus,
  type BugClassification,
  type BugFlag,
  type BugReminderType,
  type BugReproducibility,
  type BugSeverity,
  type BugStatus,
  type Sprint,
  type TaskPriority,
  type WorkItem,
  type WorkItemType,
} from '../types/board.types';
import { TypeBadge } from './TypeBadge';
import { useAuthStore } from '../../../store/authStore';
import type { Milestone } from '../../../types/milestones.types';

type ActivityTab = 'comments' | 'logTime' | 'attachments';

interface MemberOption { id: string; fullName: string; }

interface Props {
  item: WorkItem | null;
  sprints: Sprint[];
  members: MemberOption[];
  milestones: Milestone[];
  onClose: () => void;
  onSaved: () => void;
}

interface CreateProps {
  projectId: string;
  sprints: Sprint[];
  members?: MemberOption[];
  milestones?: Milestone[];
  defaultType?: WorkItemType;
  parentId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'xs' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-primary-600 text-white font-bold shrink-0 ${size === 'xs' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-[10px]'}`}>
      {initials}
    </span>
  );
}

// Right sidebar property row
function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-[11px] text-gray-500 w-28 shrink-0 pt-1">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── WorkItemModal (edit existing) ───────────────────────────────────────────

export function WorkItemModal({ item, sprints, members, milestones, onClose, onSaved }: Props) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [activityTab, setActivityTab] = useState<ActivityTab>('comments');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [newChildTitle, setNewChildTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingLabel, setAddingLabel] = useState(false);
  const [expandedLogItems, setExpandedLogItems] = useState<Set<string>>(new Set());
  const [childLogForms, setChildLogForms] = useState<Record<string, { date: string; hours: string; desc: string }>>({});
  const titleRef = useRef<HTMLTextAreaElement>(null);

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

  const createChildMut = useMutation({
    mutationFn: (data: Partial<WorkItem>) => boardApi.createWorkItem(item!.projectId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workItem', item!.id] }); setNewChildTitle(''); },
  });

  const toggleChildDoneMut = useMutation({
    mutationFn: ({ childId, done, status }: { childId: string; done: boolean; status?: BoardStatus }) =>
      boardApi.updateWorkItem(childId, { status: status ?? (done ? 'QA_DONE' : 'TODO') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  const logChildTimeMut = useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: { date: string; hours: number; description?: string } }) =>
      boardApi.logTime(childId, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      setExpandedLogItems((prev) => { const s = new Set(prev); s.delete(vars.childId); return s; });
      setChildLogForms((prev) => { const n = { ...prev }; delete n[vars.childId]; return n; });
    },
  });

  const logTimeMut = useMutation({
    mutationFn: (d: { date: string; hours: number; description?: string }) => boardApi.logTime(item!.id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  const deleteEntryMut = useMutation({
    mutationFn: (entryId: string) => boardApi.deleteTimesheetEntry(entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  const addCommentMut = useMutation({
    mutationFn: (content: string) => boardApi.addComment(item!.id, content),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workItem', item!.id] }); setCommentText(''); },
  });

  const deleteCommentMut = useMutation({
    mutationFn: ({ wid, cid }: { wid: string; cid: string }) => boardApi.deleteComment(wid, cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workItem', item!.id] }),
  });

  if (!item || !detail) return null;

  const totalLogged = (detail.timesheetEntries ?? []).reduce((s, e) => s + Number(e.hours), 0);
  const remaining = detail.estimatedHours ? Number(detail.estimatedHours) - totalLogged : null;

  function saveTitle() {
    if (titleDraft.trim() && titleDraft.trim() !== (detail?.title ?? '')) {
      updateMut.mutate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }

  function saveDesc() {
    if (descDraft !== (detail?.description ?? '')) {
      updateMut.mutate({ description: descDraft || undefined });
    }
    setEditingDesc(false);
  }

  function addLabel() {
    if (!newLabel.trim()) return;
    const updated = [...(detail?.labels ?? []), newLabel.trim()];
    updateMut.mutate({ labels: updated });
    setNewLabel('');
    setAddingLabel(false);
  }

  function removeLabel(label: string) {
    updateMut.mutate({ labels: (detail?.labels ?? []).filter((l) => l !== label) });
  }

  const childType: WorkItemType = detail.type === 'USER_STORY' ? 'TASK' : detail.type === 'TASK' ? 'SUB_TASK' : 'SUB_TASK';
  const canAddChildren = detail.type === 'EPIC' || detail.type === 'USER_STORY' || detail.type === 'TASK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 shrink-0 bg-white">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {detail.parent && (
              <>
                <TypeBadge type={detail.parent.type} />
                <span className="text-xs text-gray-500 truncate max-w-[200px]">{detail.parent.title}</span>
                <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            <TypeBadge type={detail.type} />
            <span className="text-xs text-gray-400 font-mono shrink-0">#{detail.id.slice(-6).toUpperCase()}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 p-1 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Two-panel body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT PANEL ── */}
          <div className="flex-[3] flex flex-col overflow-y-auto border-r border-gray-100">
            <div className="px-8 py-6 space-y-5">

              {/* Title */}
              {editingTitle ? (
                <textarea
                  ref={titleRef}
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTitle(); } if (e.key === 'Escape') setEditingTitle(false); }}
                  className="w-full text-xl font-bold text-gray-900 resize-none border-0 outline-none focus:ring-2 focus:ring-primary-400 rounded-lg p-2 -ml-2 leading-snug"
                  rows={3}
                />
              ) : (
                <h1
                  onClick={() => { setTitleDraft(detail.title); setEditingTitle(true); }}
                  className="text-xl font-bold text-gray-900 leading-snug cursor-pointer hover:bg-gray-50 rounded-lg p-2 -ml-2 transition"
                  title="Click to edit"
                >
                  {detail.title}
                </h1>
              )}

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</p>
                {editingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      rows={6}
                      className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
                      placeholder="Add a description…"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveDesc} className="btn-primary text-xs px-3 py-1.5">Save</button>
                      <button onClick={() => setEditingDesc(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { setDescDraft(detail.description ?? ''); setEditingDesc(true); }}
                    className="cursor-pointer rounded-lg p-3 hover:bg-gray-50 transition min-h-[60px] border border-transparent hover:border-gray-200"
                  >
                    {detail.description ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{detail.description}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Click to add a description…</p>
                    )}
                  </div>
                )}
              </div>

              {/* Child Items — JIRA style with checkbox, strikethrough, inline log time */}
              {canAddChildren && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Child Items ({detail.children?.length ?? 0})
                    </p>
                    {(detail.children ?? []).length > 0 && (
                      <span className="text-[11px] text-gray-400">
                        {(detail.children ?? []).filter((c) => c.status === 'QA_DONE').length} / {detail.children?.length} done
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {(detail.children ?? []).length > 0 && (
                    <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${((detail.children ?? []).filter((c) => c.status === 'QA_DONE').length / (detail.children?.length ?? 1)) * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {(detail.children ?? []).map((child) => {
                      const isDone = child.status === 'QA_DONE';
                      const logOpen = expandedLogItems.has(child.id);
                      const logForm = childLogForms[child.id] ?? { date: new Date().toISOString().slice(0, 10), hours: '', desc: '' };

                      return (
                        <div key={child.id}>
                          {/* Main row */}
                          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 group transition">
                            {/* Circle checkbox */}
                            <button
                              onClick={() => toggleChildDoneMut.mutate({ childId: child.id, done: !isDone, status: !isDone ? 'QA_DONE' : 'TODO' })}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                              }`}
                              title={isDone ? 'Mark as not done' : 'Mark as done'}
                            >
                              {isDone && (
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>

                            {/* Type badge */}
                            <TypeBadge type={child.type} />

                            {/* Title — strikethrough when done */}
                            <span className={`text-sm flex-1 min-w-0 truncate transition-all ${
                              isDone ? 'line-through text-gray-400' : 'text-gray-700'
                            }`}>
                              {child.title}
                            </span>

                            {/* Priority badge */}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${PRIORITY_CONFIG[child.priority].bg} ${PRIORITY_CONFIG[child.priority].text}`}>
                              {child.priority.charAt(0) + child.priority.slice(1).toLowerCase()}
                            </span>


                            {/* Log time button — visible on hover */}
                            <button
                              onClick={() => {
                                setExpandedLogItems((prev) => {
                                  const s = new Set(prev);
                                  if (s.has(child.id)) s.delete(child.id); else s.add(child.id);
                                  return s;
                                });
                                if (!childLogForms[child.id]) {
                                  setChildLogForms((prev) => ({
                                    ...prev,
                                    [child.id]: { date: new Date().toISOString().slice(0, 10), hours: '', desc: '' },
                                  }));
                                }
                              }}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded transition shrink-0 ${
                                logOpen
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50 opacity-0 group-hover:opacity-100'
                              }`}
                              title="Log time against this item"
                            >
                              Log
                            </button>

                            {/* Status dropdown */}
                            <select
                              value={child.status}
                              onChange={(e) => toggleChildDoneMut.mutate({ childId: child.id, done: false, status: e.target.value as BoardStatus })}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-[11px] font-semibold rounded-lg px-2 py-1 border-0 cursor-pointer shrink-0 focus:ring-1 focus:ring-primary-400 ${
                                isDone ? 'bg-emerald-100 text-emerald-700' :
                                child.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                child.status === 'BLOCKED' ? 'bg-red-100 text-red-700' :
                                child.status === 'IN_REVIEW' ? 'bg-amber-100 text-amber-700' :
                                child.status === 'QA' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {BOARD_COLUMNS.map((c) => (
                                <option key={c.status} value={c.status}>{c.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Inline log time form */}
                          {logOpen && (
                            <div className="ml-8 mb-2 bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-2">
                              <p className="text-[11px] font-semibold text-blue-700 mb-1.5">Log time — {child.title}</p>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] text-gray-500 mb-0.5 block">Date</label>
                                  <input
                                    type="date"
                                    value={logForm.date}
                                    onChange={(e) => setChildLogForms((prev) => ({ ...prev, [child.id]: { ...logForm, date: e.target.value } }))}
                                    className="input-sm w-full text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-500 mb-0.5 block">Hours</label>
                                  <input
                                    type="number"
                                    min={0.25} max={24} step={0.25}
                                    value={logForm.hours}
                                    placeholder="e.g. 2.5"
                                    onChange={(e) => setChildLogForms((prev) => ({ ...prev, [child.id]: { ...logForm, hours: e.target.value } }))}
                                    className="input-sm w-full text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-500 mb-0.5 block">Description</label>
                                  <input
                                    type="text"
                                    value={logForm.desc}
                                    placeholder="What did you work on?"
                                    onChange={(e) => setChildLogForms((prev) => ({ ...prev, [child.id]: { ...logForm, desc: e.target.value } }))}
                                    className="input-sm w-full text-xs"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (!logForm.date || !logForm.hours) return;
                                    logChildTimeMut.mutate({
                                      childId: child.id,
                                      data: { date: logForm.date, hours: Number(logForm.hours), description: logForm.desc || undefined },
                                    });
                                  }}
                                  disabled={!logForm.date || !logForm.hours || logChildTimeMut.isPending}
                                  className="btn-primary text-xs px-3 py-1.5"
                                >
                                  {logChildTimeMut.isPending ? 'Logging…' : 'Log Time'}
                                </button>
                                <button
                                  onClick={() => setExpandedLogItems((prev) => { const s = new Set(prev); s.delete(child.id); return s; })}
                                  className="btn-secondary text-xs px-3 py-1.5"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Quick add child */}
                    <div className="flex items-center gap-2 mt-2 pl-2">
                      <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-200 shrink-0" />
                      <input
                        type="text"
                        value={newChildTitle}
                        onChange={(e) => setNewChildTitle(e.target.value)}
                        placeholder={`Add ${childType.replace(/_/g, ' ').toLowerCase()}…`}
                        className="input-sm flex-1 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newChildTitle.trim()) {
                            createChildMut.mutate({ type: childType, title: newChildTitle.trim(), parentId: detail.id } as Partial<WorkItem>);
                          }
                        }}
                      />
                      <button
                        disabled={!newChildTitle.trim() || createChildMut.isPending}
                        onClick={() => {
                          if (newChildTitle.trim()) {
                            createChildMut.mutate({ type: childType, title: newChildTitle.trim(), parentId: detail.id } as Partial<WorkItem>);
                          }
                        }}
                        className="btn-primary text-xs px-3 py-1.5 shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reopens info */}
              {detail.reopenCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
                  This item has been reopened <strong>{detail.reopenCount}</strong> time{detail.reopenCount !== 1 ? 's' : ''}.
                </div>
              )}
            </div>

            {/* ── Activity section ── */}
            <div className="border-t border-gray-100 mt-auto">
              <div className="flex gap-1 px-6 pt-3 border-b border-gray-100">
                {([
                  { id: 'comments' as ActivityTab, label: `Comments (${detail.comments?.length ?? 0})` },
                  { id: 'logTime' as ActivityTab, label: `Log Time${totalLogged > 0 ? ` (${totalLogged}h)` : ''}` },
                  { id: 'attachments' as ActivityTab, label: `Attachments (${detail.attachments?.length ?? 0})` },
                ] as { id: ActivityTab; label: string }[]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActivityTab(t.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-t whitespace-nowrap transition-colors ${
                      activityTab === t.id
                        ? 'text-primary-700 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="px-6 py-4 max-h-72 overflow-y-auto">
                {/* Comments */}
                {activityTab === 'comments' && (
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
                            addCommentMut.mutate(commentText.trim());
                          }
                        }}
                      />
                      <button
                        onClick={() => { if (commentText.trim()) addCommentMut.mutate(commentText.trim()); }}
                        disabled={!commentText.trim() || addCommentMut.isPending}
                        className="btn-primary text-xs px-3 py-1.5"
                      >Post</button>
                    </div>
                    {(detail.comments ?? []).map((c) => (
                      <div key={c.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                        <Avatar name={c.author.fullName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800">{c.author.fullName}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{fmtDate(c.createdAt)}</p>
                        </div>
                        {(c.authorId === user?.id || user?.systemRole !== 'EMPLOYEE') && (
                          <button onClick={() => deleteCommentMut.mutate({ wid: detail.id, cid: c.id })} className="text-gray-300 hover:text-red-500 shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {(detail.comments ?? []).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No comments yet.</p>
                    )}
                  </div>
                )}

                {/* Log Time */}
                {activityTab === 'logTime' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-sm text-center bg-gray-50 rounded-xl p-3">
                      <div>
                        <p className="text-base font-bold text-gray-800">{totalLogged}h</p>
                        <p className="text-[10px] text-gray-500">Logged</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-800">{detail.estimatedHours ? `${detail.estimatedHours}h` : '—'}</p>
                        <p className="text-[10px] text-gray-500">Estimated</p>
                      </div>
                      <div>
                        <p className={`text-base font-bold ${remaining != null && remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {remaining != null ? `${remaining.toFixed(1)}h` : '—'}
                        </p>
                        <p className="text-[10px] text-gray-500">Remaining</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="input-sm" />
                      <input type="number" min={0.25} max={24} step={0.25} placeholder="Hours" value={logHours} onChange={(e) => setLogHours(e.target.value)} className="input-sm" />
                      <input type="text" placeholder="Description" value={logDesc} onChange={(e) => setLogDesc(e.target.value)} className="input-sm" />
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
                    {(detail.timesheetEntries ?? []).length > 0 && (
                      <div className="space-y-1.5">
                        {(detail.timesheetEntries ?? []).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-xs font-medium text-gray-800">{fmtDate(entry.date)} · <span className="text-emerald-600">{entry.hours}h</span></p>
                              {entry.description && <p className="text-xs text-gray-500">{entry.description}</p>}
                              <p className="text-[10px] text-gray-400">{entry.user.fullName}</p>
                            </div>
                            {(entry.userId === user?.id || user?.systemRole !== 'EMPLOYEE') && (
                              <button onClick={() => deleteEntryMut.mutate(entry.id)} className="text-gray-400 hover:text-red-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {activityTab === 'attachments' && (
                  <div className="space-y-2">
                    {(detail.attachments ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No attachments yet.</p>
                    ) : (
                      (detail.attachments ?? []).map((a) => (
                        <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{a.originalName}</p>
                            <p className="text-[10px] text-gray-400">{(a.size / 1024).toFixed(1)} KB · {a.uploadedBy.fullName}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL (Properties Sidebar) ── */}
          <div className="flex-[2] overflow-y-auto bg-gray-50 border-l border-gray-100">
            <div className="px-5 py-5 space-y-1">

              {/* Status */}
              <div className="mb-4">
                <select
                  value={detail.status}
                  onChange={(e) => updateMut.mutate({ status: e.target.value as BoardStatus })}
                  className={`w-full font-semibold text-sm rounded-lg px-3 py-2 border-0 focus:ring-2 focus:ring-primary-400 cursor-pointer ${
                    detail.status === 'TODO' ? 'bg-gray-100 text-gray-700' :
                    detail.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    detail.status === 'BLOCKED' ? 'bg-red-100 text-red-700' :
                    detail.status === 'IN_REVIEW' ? 'bg-amber-100 text-amber-700' :
                    detail.status === 'QA' ? 'bg-purple-100 text-purple-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {BOARD_COLUMNS.map((c) => (
                    <option key={c.status} value={c.status}>{c.label}</option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">Details</p>

              {/* Assignee */}
              <SidebarRow label="Assignee">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {detail.assignee ? (
                      <>
                        <Avatar name={detail.assignee.fullName} size="xs" />
                        <span className="text-xs text-gray-700">{detail.assignee.fullName}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Unassigned</span>
                    )}
                  </div>
                  <select
                    value={detail.assigneeId ?? ''}
                    onChange={(e) => updateMut.mutate({ assigneeId: e.target.value || undefined })}
                    className="input-sm w-full text-xs mt-1"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                  {user && (
                    <button
                      onClick={() => updateMut.mutate({ assigneeId: user.id })}
                      className="text-[11px] text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Assign to me
                    </button>
                  )}
                </div>
              </SidebarRow>

              {/* Reporter */}
              <SidebarRow label="Reporter">
                <div className="flex items-center gap-2">
                  <Avatar name={detail.reporter.fullName} size="xs" />
                  <span className="text-xs text-gray-700">{detail.reporter.fullName}</span>
                </div>
              </SidebarRow>

              {/* Sprint */}
              <SidebarRow label="Sprint">
                <select
                  value={detail.sprintId ?? ''}
                  onChange={(e) => updateMut.mutate({ sprintId: e.target.value || undefined })}
                  className="input-sm w-full text-xs"
                >
                  <option value="">Backlog</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </SidebarRow>

              {/* Priority */}
              <SidebarRow label="Priority">
                <select
                  value={detail.priority}
                  onChange={(e) => updateMut.mutate({ priority: e.target.value as TaskPriority })}
                  className="input-sm w-full text-xs"
                >
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
              </SidebarRow>

              {/* Story Points */}
              <SidebarRow label="Story Points">
                <input
                  type="number" min={0}
                  defaultValue={detail.storyPoints ?? ''}
                  onBlur={(e) => updateMut.mutate({ storyPoints: Number(e.target.value) || undefined })}
                  className="input-sm w-24 text-xs"
                />
              </SidebarRow>

              {/* Estimated Hours */}
              <SidebarRow label="Est. Hours">
                <input
                  type="number" min={0} step={0.5}
                  defaultValue={detail.estimatedHours ?? ''}
                  onBlur={(e) => updateMut.mutate({ estimatedHours: Number(e.target.value) || undefined })}
                  className="input-sm w-24 text-xs"
                />
              </SidebarRow>

              {/* Start Date */}
              <SidebarRow label="Start Date">
                <input
                  type="date"
                  defaultValue={detail.startDate?.slice(0, 10) ?? ''}
                  onBlur={(e) => updateMut.mutate({ startDate: e.target.value || undefined })}
                  className="input-sm w-full text-xs"
                />
              </SidebarRow>

              {/* Due Date */}
              <SidebarRow label="Due Date">
                <input
                  type="date"
                  defaultValue={detail.dueDate?.slice(0, 10) ?? ''}
                  onBlur={(e) => updateMut.mutate({ dueDate: e.target.value || undefined })}
                  className="input-sm w-full text-xs"
                />
              </SidebarRow>

              {/* Labels */}
              <SidebarRow label="Labels">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {(detail.labels ?? []).map((l) => (
                      <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded-full border border-blue-200">
                        {l}
                        <button onClick={() => removeLabel(l)} className="hover:text-red-500 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                  {addingLabel ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addLabel(); if (e.key === 'Escape') setAddingLabel(false); }}
                        placeholder="label…"
                        className="input-sm flex-1 text-xs"
                      />
                      <button onClick={addLabel} className="text-xs text-primary-600 font-medium">Add</button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingLabel(true)} className="text-[11px] text-primary-600 hover:text-primary-700 font-medium">
                      + Add label
                    </button>
                  )}
                </div>
              </SidebarRow>

              {/* Parent */}
              {detail.parent && (
                <SidebarRow label="Parent">
                  <div className="flex items-center gap-1.5">
                    <TypeBadge type={detail.parent.type} />
                    <span className="text-xs text-gray-600 truncate">{detail.parent.title}</span>
                  </div>
                </SidebarRow>
              )}

              {/* Fix Version */}
              <SidebarRow label="Fix Version">
                <input
                  type="text"
                  defaultValue={detail.fixVersion ?? ''}
                  onBlur={(e) => updateMut.mutate({ fixVersion: e.target.value || undefined })}
                  placeholder="e.g. v1.2.0"
                  className="input-sm w-full text-xs"
                />
              </SidebarRow>

              {/* Completed At */}
              {detail.completedAt && (
                <SidebarRow label="Completed">
                  <span className="text-xs text-emerald-600 font-medium">{fmtDate(detail.completedAt)}</span>
                </SidebarRow>
              )}

              {/* Created */}
              <SidebarRow label="Created">
                <span className="text-xs text-gray-500">{fmtDate(detail.createdAt)}</span>
              </SidebarRow>

              {/* ── Bug Details ── */}
              {detail.type === 'BUG' && (
                <div className="pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2 border-t border-gray-200 pt-2">Bug Details</p>

                  {/* Bug Status */}
                  <SidebarRow label="Bug Status">
                    <select
                      value={detail.bugStatus ?? ''}
                      onChange={(e) => updateMut.mutate({ bugStatus: (e.target.value as BugStatus) || undefined })}
                      className={`input-sm w-full text-xs font-medium ${detail.bugStatus ? BUG_STATUS_CONFIG[detail.bugStatus].text : ''}`}
                    >
                      <option value="">— select —</option>
                      {(Object.keys(BUG_STATUS_CONFIG) as BugStatus[]).map((s) => (
                        <option key={s} value={s}>{BUG_STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </SidebarRow>

                  {/* Severity */}
                  <SidebarRow label="Severity">
                    <select
                      value={detail.severity ?? ''}
                      onChange={(e) => updateMut.mutate({ severity: (e.target.value as BugSeverity) || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— select —</option>
                      {(['SHOW_STOPPER', 'BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as BugSeverity[]).map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ').charAt(0) + s.replace(/_/g, ' ').slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </SidebarRow>

                  {/* Classification */}
                  <SidebarRow label="Classification">
                    <select
                      value={detail.bugClassification ?? ''}
                      onChange={(e) => updateMut.mutate({ bugClassification: (e.target.value as BugClassification) || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— select —</option>
                      <option value="UI_USABILITY">UI / Usability</option>
                      <option value="NEW_BUG">New Bug</option>
                      <option value="ENHANCEMENT">Enhancement</option>
                      <option value="PERFORMANCE">Performance</option>
                      <option value="SECURITY">Security</option>
                      <option value="CRASH_HANG">Crash / Hang</option>
                      <option value="DATA_LOSS">Data Loss</option>
                      <option value="OTHER_BUG">Other Bug</option>
                      <option value="FEATURE_NEW">Feature (New)</option>
                      <option value="DESIGN">Design</option>
                      <option value="CODE_REVIEW">Code Review</option>
                      <option value="UNIT_TESTING">Unit Testing</option>
                      <option value="SUGGESTION">Suggestion</option>
                      <option value="PROJECT_MANAGEMENT">Project Management</option>
                      <option value="EXISTING_APPLICATION">Existing Application</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </SidebarRow>

                  {/* Flag */}
                  <SidebarRow label="Flag">
                    <select
                      value={detail.bugFlag ?? ''}
                      onChange={(e) => updateMut.mutate({ bugFlag: (e.target.value as BugFlag) || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— select —</option>
                      <option value="INTERNAL">Internal</option>
                      <option value="EXTERNAL">External</option>
                    </select>
                  </SidebarRow>

                  {/* Reproducibility */}
                  <SidebarRow label="Reproducibility">
                    <select
                      value={detail.bugReproducibility ?? ''}
                      onChange={(e) => updateMut.mutate({ bugReproducibility: (e.target.value as BugReproducibility) || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— select —</option>
                      <option value="ALWAYS">Always</option>
                      <option value="SOMETIMES">Sometimes</option>
                      <option value="RARELY">Rarely</option>
                      <option value="UNABLE">Unable to Reproduce</option>
                      <option value="NEVER_TRIED">Never Tried</option>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                    </select>
                  </SidebarRow>

                  {/* Module */}
                  <SidebarRow label="Module">
                    <input
                      type="text"
                      defaultValue={detail.module ?? ''}
                      onBlur={(e) => updateMut.mutate({ module: e.target.value || undefined })}
                      placeholder="e.g. Auth, Dashboard"
                      className="input-sm w-full text-xs"
                    />
                  </SidebarRow>

                  {/* Responsible Developer */}
                  <SidebarRow label="Responsible Dev">
                    <select
                      value={detail.responsibleUserId ?? ''}
                      onChange={(e) => updateMut.mutate({ responsibleUserId: e.target.value || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— select —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.fullName}</option>
                      ))}
                    </select>
                  </SidebarRow>

                  {/* Billing Status */}
                  <SidebarRow label="Billing">
                    <select
                      value={detail.billingStatus ?? ''}
                      onChange={(e) => updateMut.mutate({ billingStatus: (e.target.value as BillingStatus) || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— select —</option>
                      <option value="BILLABLE">Billable</option>
                      <option value="NON_BILLABLE">Non-Billable</option>
                    </select>
                  </SidebarRow>

                  {/* Affected Build Version */}
                  <SidebarRow label="Affected Build">
                    <input
                      type="text"
                      defaultValue={detail.affectedBuildVersion ?? ''}
                      onBlur={(e) => updateMut.mutate({ affectedBuildVersion: e.target.value || undefined })}
                      placeholder="e.g. 1.0.5"
                      className="input-sm w-full text-xs"
                    />
                  </SidebarRow>

                  {/* Fixed Build Version */}
                  <SidebarRow label="Fixed Build">
                    <input
                      type="text"
                      defaultValue={detail.fixedBuildVersion ?? ''}
                      onBlur={(e) => updateMut.mutate({ fixedBuildVersion: e.target.value || undefined })}
                      placeholder="e.g. 1.0.6"
                      className="input-sm w-full text-xs"
                    />
                  </SidebarRow>

                  {/* Reminder Type */}
                  <SidebarRow label="Reminder">
                    <select
                      value={detail.reminderType ?? 'NONE'}
                      onChange={(e) => updateMut.mutate({ reminderType: e.target.value as BugReminderType })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="NONE">None</option>
                      <option value="DAILY">Daily</option>
                      <option value="ONE_DAY">1 Day before</option>
                      <option value="TWO_DAYS">2 Days before</option>
                      <option value="THREE_DAYS">3 Days before</option>
                    </select>
                  </SidebarRow>

                  {/* Release Milestone */}
                  <SidebarRow label="Release Milestone">
                    <select
                      value={detail.releaseMilestoneId ?? ''}
                      onChange={(e) => updateMut.mutate({ releaseMilestoneId: e.target.value || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— none —</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>{m.description}</option>
                      ))}
                    </select>
                  </SidebarRow>

                  {/* Affected Milestone */}
                  <SidebarRow label="Affected Milestone">
                    <select
                      value={detail.affectedMilestoneId ?? ''}
                      onChange={(e) => updateMut.mutate({ affectedMilestoneId: e.target.value || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— none —</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>{m.description}</option>
                      ))}
                    </select>
                  </SidebarRow>

                  {/* Environment */}
                  <SidebarRow label="Environment">
                    <input
                      type="text"
                      defaultValue={detail.environment ?? ''}
                      onBlur={(e) => updateMut.mutate({ environment: e.target.value || undefined })}
                      placeholder="e.g. Production, Chrome 124"
                      className="input-sm w-full text-xs"
                    />
                  </SidebarRow>

                  {/* Steps to Reproduce */}
                  <SidebarRow label="Steps to Repro">
                    <textarea
                      defaultValue={detail.stepsToRepro ?? ''}
                      onBlur={(e) => updateMut.mutate({ stepsToRepro: e.target.value || undefined })}
                      rows={4}
                      placeholder="1. Go to…&#10;2. Click…&#10;3. Observe…"
                      className="input-sm w-full text-xs resize-none"
                    />
                  </SidebarRow>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CreateWorkItemModal ──────────────────────────────────────────────────────

export function CreateWorkItemModal({
  projectId, sprints, members = [], milestones = [],
  defaultType = 'TASK', parentId, onClose, onSaved,
}: CreateProps) {
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
  const [selectedParentId, setSelectedParentId] = useState(parentId ?? '');
  // Bug fields
  const [severity, setSeverity] = useState<BugSeverity | ''>('');
  const [bugClassification, setBugClassification] = useState<BugClassification | ''>('');
  const [environment, setEnvironment] = useState('');
  const [stepsToRepro, setStepsToRepro] = useState('');
  const [bugFlag, setBugFlag] = useState<BugFlag | ''>('');
  const [bugReproducibility, setBugReproducibility] = useState<BugReproducibility | ''>('');
  const [bugStatus, setBugStatus] = useState<BugStatus | ''>('');
  const [module, setModule] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [billingStatus, setBillingStatus] = useState<BillingStatus | ''>('');
  const [affectedBuildVersion, setAffectedBuildVersion] = useState('');
  const [fixedBuildVersion, setFixedBuildVersion] = useState('');
  const [reminderType, setReminderType] = useState<BugReminderType>('NONE');
  const [releaseMilestoneId, setReleaseMilestoneId] = useState('');
  const [affectedMilestoneId, setAffectedMilestoneId] = useState('');

  // Fetch potential parent items (EPIC + USER_STORY + TASK) for parent selector
  const { data: parentOptions = [] } = useQuery({
    queryKey: ['workItems-parents', projectId],
    queryFn: () => boardApi.getWorkItems(projectId),
    enabled: ['TASK', 'SUB_TASK', 'BUG'].includes(type),
    select: (items) => items.filter((i) => {
      if (type === 'TASK' || type === 'BUG') return i.type === 'EPIC' || i.type === 'USER_STORY';
      if (type === 'SUB_TASK') return i.type === 'TASK' || i.type === 'USER_STORY';
      return false;
    }),
  });

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
      parentId: selectedParentId || parentId || undefined,
      storyPoints: storyPoints ? Number(storyPoints) : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      dueDate: dueDate || undefined,
      // Bug fields
      severity: (severity || undefined) as BugSeverity | undefined,
      bugClassification: (bugClassification || undefined) as BugClassification | undefined,
      environment: environment || undefined,
      stepsToRepro: stepsToRepro || undefined,
      bugFlag: (bugFlag || undefined) as BugFlag | undefined,
      bugReproducibility: (bugReproducibility || undefined) as BugReproducibility | undefined,
      bugStatus: (bugStatus || undefined) as BugStatus | undefined,
      module: module || undefined,
      responsibleUserId: responsibleUserId || undefined,
      billingStatus: (billingStatus || undefined) as BillingStatus | undefined,
      affectedBuildVersion: affectedBuildVersion || undefined,
      fixedBuildVersion: fixedBuildVersion || undefined,
      reminderType: reminderType || undefined,
      releaseMilestoneId: releaseMilestoneId || undefined,
      affectedMilestoneId: affectedMilestoneId || undefined,
    } as Partial<WorkItem>);
  }

  const CREATABLE_TYPES: WorkItemType[] = ['EPIC', 'USER_STORY', 'TASK', 'SUB_TASK', 'BUG'];
  const needsParent = ['TASK', 'SUB_TASK', 'BUG'].includes(type) && !parentId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Create Work Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Type *</label>
            <div className="flex flex-wrap gap-2">
              {CREATABLE_TYPES.map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      type === t ? `${cfg.bg} ${cfg.text} border-transparent` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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

          {/* Parent selector */}
          {needsParent && parentOptions.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Parent</label>
              <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} className="input-sm w-full">
                <option value="">— no parent —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{TYPE_CONFIG[p.type].label}] {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {/* Story Points */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Story Points</label>
              <input type="number" min={0} value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} className="input-sm w-full" />
            </div>
            {/* Estimated Hours */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Est. Hours</label>
              <input type="number" min={0} step={0.5} value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} className="input-sm w-full" />
            </div>
            {/* Due Date */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-sm w-full" />
            </div>
            {/* Assignee */}
            {members.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Assignee</label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input-sm w-full">
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
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
                  <label className="text-xs text-gray-500 mb-1 block">Bug Status</label>
                  <select value={bugStatus} onChange={(e) => setBugStatus(e.target.value as BugStatus)} className="input-sm w-full">
                    <option value="">— select —</option>
                    {(Object.keys(BUG_STATUS_CONFIG) as BugStatus[]).map((s) => (
                      <option key={s} value={s}>{BUG_STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Severity</label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value as BugSeverity)} className="input-sm w-full">
                    <option value="">— select —</option>
                    {(['SHOW_STOPPER', 'BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as BugSeverity[]).map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Classification</label>
                  <select value={bugClassification} onChange={(e) => setBugClassification(e.target.value as BugClassification)} className="input-sm w-full">
                    <option value="">— select —</option>
                    <option value="UI_USABILITY">UI / Usability</option>
                    <option value="NEW_BUG">New Bug</option>
                    <option value="ENHANCEMENT">Enhancement</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="SECURITY">Security</option>
                    <option value="CRASH_HANG">Crash / Hang</option>
                    <option value="DATA_LOSS">Data Loss</option>
                    <option value="OTHER_BUG">Other Bug</option>
                    <option value="FEATURE_NEW">Feature (New)</option>
                    <option value="DESIGN">Design</option>
                    <option value="CODE_REVIEW">Code Review</option>
                    <option value="UNIT_TESTING">Unit Testing</option>
                    <option value="SUGGESTION">Suggestion</option>
                    <option value="PROJECT_MANAGEMENT">Project Management</option>
                    <option value="EXISTING_APPLICATION">Existing Application</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Flag</label>
                  <select value={bugFlag} onChange={(e) => setBugFlag(e.target.value as BugFlag)} className="input-sm w-full">
                    <option value="">— select —</option>
                    <option value="INTERNAL">Internal</option>
                    <option value="EXTERNAL">External</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Reproducibility</label>
                  <select value={bugReproducibility} onChange={(e) => setBugReproducibility(e.target.value as BugReproducibility)} className="input-sm w-full">
                    <option value="">— select —</option>
                    <option value="ALWAYS">Always</option>
                    <option value="SOMETIMES">Sometimes</option>
                    <option value="RARELY">Rarely</option>
                    <option value="UNABLE">Unable to Reproduce</option>
                    <option value="NEVER_TRIED">Never Tried</option>
                    <option value="NOT_APPLICABLE">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Billing</label>
                  <select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value as BillingStatus)} className="input-sm w-full">
                    <option value="">— select —</option>
                    <option value="BILLABLE">Billable</option>
                    <option value="NON_BILLABLE">Non-Billable</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Reminder</label>
                  <select value={reminderType} onChange={(e) => setReminderType(e.target.value as BugReminderType)} className="input-sm w-full">
                    <option value="NONE">None</option>
                    <option value="DAILY">Daily</option>
                    <option value="ONE_DAY">1 Day before</option>
                    <option value="TWO_DAYS">2 Days before</option>
                    <option value="THREE_DAYS">3 Days before</option>
                  </select>
                </div>
                {members.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Responsible Dev</label>
                    <select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} className="input-sm w-full">
                      <option value="">— select —</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Affected Build</label>
                  <input type="text" value={affectedBuildVersion} onChange={(e) => setAffectedBuildVersion(e.target.value)} placeholder="e.g. 1.0.5" className="input-sm w-full" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fixed Build</label>
                  <input type="text" value={fixedBuildVersion} onChange={(e) => setFixedBuildVersion(e.target.value)} placeholder="e.g. 1.0.6" className="input-sm w-full" />
                </div>
                {milestones.length > 0 && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Release Milestone</label>
                      <select value={releaseMilestoneId} onChange={(e) => setReleaseMilestoneId(e.target.value)} className="input-sm w-full">
                        <option value="">— none —</option>
                        {milestones.map((m) => <option key={m.id} value={m.id}>{m.description}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Affected Milestone</label>
                      <select value={affectedMilestoneId} onChange={(e) => setAffectedMilestoneId(e.target.value)} className="input-sm w-full">
                        <option value="">— none —</option>
                        {milestones.map((m) => <option key={m.id} value={m.id}>{m.description}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Module</label>
                <input type="text" value={module} onChange={(e) => setModule(e.target.value)} placeholder="e.g. Auth, Dashboard" className="input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Environment</label>
                <input type="text" value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="e.g. Production, Chrome 124" className="input-sm w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Steps to Reproduce</label>
                <textarea value={stepsToRepro} onChange={(e) => setStepsToRepro(e.target.value)} rows={3} className="input-sm w-full resize-none" placeholder="1. Go to…&#10;2. Click…&#10;3. Observe…" />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
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
