import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '../api/boardApi';
import { UserAvatar } from '../../../components/shared/UserAvatar';
import { futureDateStr, pastDateStr, todayStr } from '../../../utils/dateUtils';
import {
  DEFAULT_BOARD_COLUMNS,
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
import { RichTextEditor } from '../../../components/shared/RichTextEditor';
import { testCasesApi, type TestCase, type TestCaseStatus } from '../../../api/testCasesApi';

type ActivityTab = 'comments' | 'logTime' | 'attachments' | 'activities' | 'testCases';

interface MemberOption { id: string; fullName: string; profilePhoto?: string | null; }

interface Props {
  item: WorkItem | null;
  sprints: Sprint[];
  members: MemberOption[];
  milestones: Milestone[];
  canDelete?: boolean;
  canChangeBilling?: boolean;
  canEditSidebar?: boolean;
  canAddChild?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSuccess?: (msg: string) => void;
  onOpenChild?: (childId: string) => void;
}

interface CreateProps {
  projectId: string;
  sprints: Sprint[];
  members?: MemberOption[];
  milestones?: Milestone[];
  defaultType?: WorkItemType;
  parentId?: string;
  prefill?: { title?: string; stepsToRepro?: string };
  bugOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSuccess?: (msg: string) => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Avatar({ name, photo, size = 'sm' }: { name: string; photo?: string | null; size?: 'sm' | 'xs' }) {
  return <UserAvatar name={name} photo={photo} size={size === 'xs' ? 'xs' : 'sm'} />;
}

// Right sidebar property row
function SidebarRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-[11px] font-medium text-gray-500 w-28 shrink-0 pt-1.5 leading-tight">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

function fmtRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(iso);
}

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked',
  IN_REVIEW: 'In Review', READY_FOR_QA: 'Ready for QA', IN_QA: 'In QA',
  QA_DONE: 'QA Done', CLOSED: 'Closed', QA: 'QA',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};

function fmt(val: string | null | undefined, map?: Record<string, string>) {
  if (!val) return '—';
  return map?.[val] ?? val;
}

function stripHtml(val: string | null | undefined): string | null {
  if (!val) return null;
  return val.replace(/<[^>]*>/g, '').trim() || null;
}

function activityLabel(action: string, field?: string | null, oldVal?: string | null, newVal?: string | null): React.ReactNode {
  if (action === 'created') return 'created this item';
  if (action === 'commented') {
    const preview = (newVal ?? '').slice(0, 80);
    return <span>added a comment{preview ? <span className="italic text-gray-400"> — "{preview}{(newVal ?? '').length > 80 ? '…' : ''}"</span> : ''}</span>;
  }
  if (action === 'attachment_added') return <span>attached <span className="font-medium text-gray-700">"{newVal ?? 'a file'}"</span></span>;
  if (action === 'attachment_deleted') return <span>removed attachment <span className="font-medium text-red-600 line-through">"{oldVal ?? 'a file'}"</span></span>;
  if (action === 'comment_deleted') return <span>deleted a comment{oldVal ? <span className="italic text-gray-400"> — "{oldVal.slice(0, 60)}{oldVal.length > 60 ? '…' : ''}"</span> : ''}</span>;
  if (action === 'status_changed') return (
    <span>moved from <span className="font-medium text-gray-700">{fmt(oldVal, STATUS_LABEL)}</span> → <span className="font-medium text-gray-700">{fmt(newVal, STATUS_LABEL)}</span></span>
  );
  if (action === 'assignee_changed') return (
    <span>changed assignee from <span className="font-medium text-gray-700">{oldVal ?? 'Unassigned'}</span> → <span className="font-medium text-gray-700">{newVal ?? 'Unassigned'}</span></span>
  );
  if (action === 'priority_changed') return (
    <span>changed priority from <span className="font-medium text-gray-700">{fmt(oldVal, PRIORITY_LABEL)}</span> → <span className="font-medium text-gray-700">{fmt(newVal, PRIORITY_LABEL)}</span></span>
  );
  if (action === 'title_changed') return <span>renamed to <span className="font-medium text-gray-700">"{newVal}"</span></span>;
  if (action === 'sprint_changed') return (
    <span>moved sprint from <span className="font-medium text-gray-700">{oldVal ?? 'Backlog'}</span> → <span className="font-medium text-gray-700">{newVal ?? 'Backlog'}</span></span>
  );
  if (action === 'due_date_changed') return (
    <span>changed due date{oldVal ? <span> from <span className="font-medium text-gray-700">{oldVal}</span></span> : ''}{newVal ? <span> to <span className="font-medium text-gray-700">{newVal}</span></span> : ' (cleared)'}</span>
  );
  if (action === 'story_points_changed') return (
    <span>changed story points from <span className="font-medium text-gray-700">{oldVal ?? '—'}</span> → <span className="font-medium text-gray-700">{newVal ?? '—'}</span></span>
  );
  if (action === 'description_updated') return 'updated the description';
  if (action === 'time_logged') return (
    <span>logged time <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">{newVal}</span></span>
  );
  if (action === 'time_deleted') return (
    <span>deleted time log <span className="font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[10px] line-through">{oldVal}</span></span>
  );
  if (action === 'label_added') return (
    <span>added label <span className="font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200 text-[10px]">{newVal}</span></span>
  );
  if (action === 'label_removed') return (
    <span>removed label <span className="font-medium text-gray-500 line-through text-[10px]">{oldVal}</span></span>
  );
  if (action === 'child_added') return (
    <span>added sub task <span className="font-medium text-gray-700">"{newVal}"</span></span>
  );
  if (action === 'child_time_logged') return (
    <span>
      <span className="font-medium text-gray-700">"{oldVal}"</span>: logged time{' '}
      <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">{newVal}</span>
    </span>
  );
  if (action.startsWith('child_')) {
    const verb = action.replace(/^child_/, '').replace(/_/g, ' ');
    return (
      <span>
        <span className="font-medium text-gray-700">"{oldVal}"</span>: {verb}
        {newVal ? <> — <span className="font-medium text-gray-700">{newVal}</span></> : null}
      </span>
    );
  }
  if (action === 'estimated_hours_changed') return (
    <span>changed estimated hours from <span className="font-medium text-gray-700">{oldVal ?? '—'}</span> → <span className="font-medium text-gray-700">{newVal ?? '—'}</span></span>
  );
  if (action === 'start_date_changed') return (
    <span>changed start date{oldVal ? <span> from <span className="font-medium text-gray-700">{oldVal}</span></span> : ''}{newVal ? <span> to <span className="font-medium text-gray-700">{newVal}</span></span> : ' (cleared)'}</span>
  );
  if (action === 'severity_changed') return (
    <span>changed severity from <span className="font-medium text-gray-700">{oldVal ?? '—'}</span> → <span className="font-medium text-gray-700">{newVal ?? '—'}</span></span>
  );
  if (action === 'bug_status_changed') return (
    <span>changed bug status from <span className="font-medium text-gray-700">{oldVal ?? '—'}</span> → <span className="font-medium text-gray-700">{newVal ?? '—'}</span></span>
  );
  if (action === 'module_changed') return (
    <span>changed module{oldVal ? <span> from <span className="font-medium text-gray-700">{oldVal}</span></span> : ''}{newVal ? <span> to <span className="font-medium text-gray-700">{newVal}</span></span> : ' (cleared)'}</span>
  );
  if (action === 'fix_version_changed') return (
    <span>changed fix version{oldVal ? <span> from <span className="font-medium text-gray-700">{oldVal}</span></span> : ''}{newVal ? <span> to <span className="font-medium text-gray-700">{newVal}</span></span> : ' (cleared)'}</span>
  );
  if (action === 'classification_changed') return (
    <span>changed classification from <span className="font-medium text-gray-700">{fmt(oldVal)}</span> → <span className="font-medium text-gray-700">{fmt(newVal)}</span></span>
  );
  if (action === 'flag_changed') return (
    <span>changed flag from <span className="font-medium text-gray-700">{fmt(oldVal)}</span> → <span className="font-medium text-gray-700">{fmt(newVal)}</span></span>
  );
  if (action === 'reproducibility_changed') return (
    <span>changed reproducibility from <span className="font-medium text-gray-700">{fmt(oldVal)}</span> → <span className="font-medium text-gray-700">{fmt(newVal)}</span></span>
  );
  if (action === 'billing_changed') return (
    <span>changed billing from <span className="font-medium text-gray-700">{fmt(oldVal)}</span> → <span className="font-medium text-gray-700">{fmt(newVal)}</span></span>
  );
  if (action === 'environment_changed') return (
    <span>changed environment{oldVal ? <span> from <span className="font-medium text-gray-700">{oldVal}</span></span> : ''}{newVal ? <span> to <span className="font-medium text-gray-700">{newVal}</span></span> : ' (cleared)'}</span>
  );
  if (action === 'affected_build_changed') return (
    <span>changed affected build{oldVal ? <span> from <span className="font-medium text-gray-700">{oldVal}</span></span> : ''}{newVal ? <span> to <span className="font-medium text-gray-700">{newVal}</span></span> : ' (cleared)'}</span>
  );
  if (action === 'fixed_build_changed') return (
    <span>changed fixed build{oldVal ? <span> from <span className="font-medium text-gray-700">{oldVal}</span></span> : ''}{newVal ? <span> to <span className="font-medium text-gray-700">{newVal}</span></span> : ' (cleared)'}</span>
  );
  if (action === 'reminder_changed') return (
    <span>changed reminder from <span className="font-medium text-gray-700">{fmt(oldVal)}</span> → <span className="font-medium text-gray-700">{fmt(newVal)}</span></span>
  );
  if (action === 'steps_updated') return 'updated steps to reproduce';
  if (action === 'responsible_changed') return (
    <span>changed responsible dev from <span className="font-medium text-gray-700">{oldVal ?? 'None'}</span> → <span className="font-medium text-gray-700">{newVal ?? 'None'}</span></span>
  );
  if (action === 'release_milestone_changed') return (
    <span>changed release milestone from <span className="font-medium text-gray-700">{stripHtml(oldVal) ?? 'None'}</span> → <span className="font-medium text-gray-700">{stripHtml(newVal) ?? 'None'}</span></span>
  );
  if (action === 'affected_milestone_changed') return (
    <span>changed affected milestone from <span className="font-medium text-gray-700">{stripHtml(oldVal) ?? 'None'}</span> → <span className="font-medium text-gray-700">{stripHtml(newVal) ?? 'None'}</span></span>
  );
  if (action === 'parent_changed') return (
    <span>changed parent from <span className="font-medium text-gray-700">{oldVal ?? 'None'}</span> → <span className="font-medium text-gray-700">{newVal ?? 'None'}</span></span>
  );
  if (action === 'component_added') return (
    <span>added component <span className="font-medium text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded-full border border-cyan-200 text-[10px]">{newVal}</span></span>
  );
  if (action === 'component_removed') return (
    <span>removed component <span className="font-medium text-gray-500 line-through text-[10px]">{oldVal}</span></span>
  );
  if (field) return `updated ${field}`;
  return action.replace(/_/g, ' ');
}

function ActivityLog({ workItemId }: { workItemId: string }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['workItem-activities', workItemId],
    queryFn: () => boardApi.getActivities(workItemId),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  if (isLoading) return <p className="text-xs text-gray-400 text-center py-4">Loading…</p>;
  if (activities.length === 0) return <p className="text-xs text-gray-400 text-center py-4">No activity yet.</p>;

  return (
    <div className="space-y-0">
      {activities.map((a, idx) => (
        <div key={a.id} className="flex gap-3 items-start py-2 relative">
          {/* Timeline line */}
          {idx < activities.length - 1 && (
            <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-100" />
          )}
          <Avatar name={a.user.fullName} photo={a.user.profilePhoto} size="xs" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-gray-800">{a.user.fullName}</span>
            {' '}
            <span className="text-xs text-gray-500">{activityLabel(a.action, a.field, a.oldValue, a.newValue)}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">{fmtRelTime(a.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Test Cases Panel ─────────────────────────────────────────────────────────

const TC_STATUS_CONFIG: Record<TestCaseStatus, { label: string; color: string }> = {
  NOT_RUN: { label: 'Not Run', color: 'bg-gray-100 text-gray-600' },
  PASSED:  { label: 'Passed',  color: 'bg-green-100 text-green-700' },
  FAILED:  { label: 'Failed',  color: 'bg-red-100 text-red-700' },
  BLOCKED: { label: 'Blocked', color: 'bg-orange-100 text-orange-700' },
};

interface TestCasesPanelProps {
  workItemId: string;
  projectId: string;
  onCreateBug: (tc: TestCase) => void;
}

function TestCasesPanel({ workItemId, projectId: _projectId, onCreateBug }: TestCasesPanelProps) {
  const qc = useQueryClient();
  const key = ['test-cases', workItemId];
  const { data: testCases = [] } = useQuery({ queryKey: key, queryFn: () => testCasesApi.list(workItemId) });

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => testCasesApi.create(workItemId, { title: newTitle, steps: newSteps, expectedResult: newExpected }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setShowAdd(false); setNewTitle(''); setNewSteps(''); setNewExpected(''); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof testCasesApi.update>[1] }) => testCasesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => testCasesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <div className="space-y-3">
      {testCases.length === 0 && !showAdd && (
        <div className="flex items-center justify-center h-16 border border-dashed border-gray-200 rounded-lg">
          <span className="text-xs text-gray-400">No test cases yet</span>
        </div>
      )}

      {testCases.map((tc) => (
        <div key={tc.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
            <select
              value={tc.status}
              onChange={(e) => updateMut.mutate({ id: tc.id, data: { status: e.target.value as TestCaseStatus } })}
              className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer ${TC_STATUS_CONFIG[tc.status].color}`}
            >
              {Object.entries(TC_STATUS_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
            <span
              className="flex-1 text-xs font-medium text-gray-800 cursor-pointer hover:text-primary-600"
              onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
            >
              {tc.title}
            </span>
            {tc.status === 'FAILED' && (
              <button
                onClick={() => onCreateBug(tc)}
                className="text-[10px] font-medium text-red-600 hover:text-red-800 border border-red-200 rounded px-2 py-0.5 transition"
              >
                + Bug
              </button>
            )}
            <button
              onClick={() => deleteMut.mutate(tc.id)}
              className="text-gray-400 hover:text-red-500 transition p-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {expandedId === tc.id && (
            <div className="px-3 pb-3 pt-2 space-y-2 text-xs text-gray-700">
              {tc.preconditions && <div><span className="font-semibold text-gray-500">Preconditions: </span>{tc.preconditions}</div>}
              <div><span className="font-semibold text-gray-500">Steps: </span><span className="whitespace-pre-wrap">{tc.steps}</span></div>
              <div><span className="font-semibold text-gray-500">Expected: </span>{tc.expectedResult}</div>
              {tc.actualResult && <div><span className="font-semibold text-gray-500">Actual: </span>{tc.actualResult}</div>}
              <textarea
                placeholder="Actual result…"
                defaultValue={tc.actualResult ?? ''}
                onBlur={(e) => { if (e.target.value !== (tc.actualResult ?? '')) updateMut.mutate({ id: tc.id, data: { actualResult: e.target.value } }); }}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 resize-none"
                rows={2}
              />
            </div>
          )}
        </div>
      ))}

      {showAdd ? (
        <div className="border border-primary-200 rounded-lg p-3 space-y-2 bg-primary-50/30">
          <input
            type="text" placeholder="Test case title *" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
          <textarea
            placeholder="Steps to reproduce *" value={newSteps}
            onChange={(e) => setNewSteps(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400 resize-none"
            rows={3}
          />
          <input
            type="text" placeholder="Expected result *" value={newExpected}
            onChange={(e) => setNewExpected(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMut.mutate()}
              disabled={!newTitle.trim() || !newSteps.trim() || !newExpected.trim() || createMut.isPending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {createMut.isPending ? 'Saving…' : 'Add'}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Test Case
        </button>
      )}
    </div>
  );
}

// ─── WorkItemModal (edit existing) ───────────────────────────────────────────

export function WorkItemModal({ item, sprints, members, milestones, canDelete = true, canChangeBilling = false, canEditSidebar = false, canAddChild = false, onClose, onSaved: _onSaved, onSuccess, onOpenChild }: Props) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [activityTab, setActivityTab] = useState<ActivityTab>('comments');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [dodDraft, setDodDraft] = useState('');
  const [bugFromTc, setBugFromTc] = useState<TestCase | null>(null);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [newChildType, setNewChildType] = useState<WorkItemType>('TASK');
  const [bugQuickTitle, setBugQuickTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingLabel, setAddingLabel] = useState(false);
  const [expandedLogItems, setExpandedLogItems] = useState<Set<string>>(new Set());
  const [childLogForms, setChildLogForms] = useState<Record<string, { date: string; hours: string; desc: string }>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Bug detail local state (batch-saved via Save button)
  const [bugSeverityLocal, setBugSeverityLocal] = useState<BugSeverity | ''>((item?.severity as BugSeverity) ?? '');
  const [bugClassificationLocal, setBugClassificationLocal] = useState<BugClassification | ''>((item?.bugClassification as BugClassification) ?? '');
  const [bugStatusLocal, setBugStatusLocal] = useState<BugStatus | ''>((item?.bugStatus as BugStatus) ?? '');
  const [bugFlagLocal, setBugFlagLocal] = useState<BugFlag | ''>((item?.bugFlag as BugFlag) ?? '');
  const [bugReproducibilityLocal, setBugReproducibilityLocal] = useState<BugReproducibility | ''>((item?.bugReproducibility as BugReproducibility) ?? '');
  const [bugModuleLocal, setBugModuleLocal] = useState(item?.module ?? '');
  const [bugResponsibleUserIdLocal, setBugResponsibleUserIdLocal] = useState(item?.responsibleUserId ?? '');
  const [billingStatusLocal, setBillingStatusLocal] = useState<BillingStatus | ''>((item?.billingStatus as BillingStatus) ?? '');
  const [bugAffectedBuildLocal, setBugAffectedBuildLocal] = useState(item?.affectedBuildVersion ?? '');
  const [bugFixedBuildLocal, setBugFixedBuildLocal] = useState(item?.fixedBuildVersion ?? '');
  const [bugReminderTypeLocal, setBugReminderTypeLocal] = useState<BugReminderType>((item?.reminderType as BugReminderType) ?? 'NONE');
  const [bugEnvironmentLocal, setBugEnvironmentLocal] = useState(item?.environment ?? '');
  const [bugStepsToReproLocal, setBugStepsToReproLocal] = useState(item?.stepsToRepro ?? '');
  const [bugDetailError, setBugDetailError] = useState('');
  const [showBugCloseGuard, setShowBugCloseGuard] = useState(false);
  const [estHoursError, setEstHoursError] = useState(false);
  const [startDateError, setStartDateError] = useState(false);
  const [dueDateError, setDueDateError] = useState(false);
  const [billingStatusError, setBillingStatusDetailError] = useState(false);
  // @mention in comments
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionMenuPos, setMentionMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const { data: detail } = useQuery({
    queryKey: ['workItem', item?.id],
    queryFn: () => boardApi.getWorkItem(item!.id),
    enabled: !!item?.id,
    initialData: item ?? undefined,
  });

  const validParentTypes: WorkItemType[] | null =
    item?.type === 'USER_STORY' ? ['EPIC'] :
    item?.type === 'TASK' ? ['EPIC', 'USER_STORY'] :
    item?.type === 'SUB_TASK' ? ['TASK', 'USER_STORY'] :
    item?.type === 'BUG' ? ['EPIC', 'USER_STORY', 'TASK'] :
    null;

  const { data: parentOptions = [] } = useQuery({
    queryKey: ['workItems-parents', item?.projectId],
    queryFn: () => boardApi.getWorkItems(item!.projectId),
    enabled: !!item?.projectId && validParentTypes !== null,
    select: (items) => items.filter((i) => validParentTypes?.includes(i.type) && i.id !== item?.id),
  });

  // Sync drafts and bug detail fields when item changes
  useEffect(() => {
    if (detail) {
      setDescDraft(detail.description ?? '');
      setDodDraft(detail.definitionOfDone ?? '');
      setBugSeverityLocal((detail.severity as BugSeverity) ?? '');
      setBugClassificationLocal((detail.bugClassification as BugClassification) ?? '');
      setBugStatusLocal((detail.bugStatus as BugStatus) ?? '');
      setBugFlagLocal((detail.bugFlag as BugFlag) ?? '');
      setBugReproducibilityLocal((detail.bugReproducibility as BugReproducibility) ?? '');
      setBugModuleLocal(detail.module ?? '');
      setBugResponsibleUserIdLocal(detail.responsibleUserId ?? '');
      setBillingStatusLocal((detail.billingStatus as BillingStatus) ?? '');
      setBugAffectedBuildLocal(detail.affectedBuildVersion ?? '');
      setBugFixedBuildLocal(detail.fixedBuildVersion ?? '');
      setBugReminderTypeLocal((detail.reminderType as BugReminderType) ?? 'NONE');
      setBugEnvironmentLocal(detail.environment ?? '');
      setBugStepsToReproLocal(detail.stepsToRepro ?? '');
      setBugDetailError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const descChanged = descDraft !== (detail?.description ?? '');
  const dodChanged = dodDraft !== (detail?.definitionOfDone ?? '');

  function handleClose() {
    if (detail?.type === 'BUG' && (!detail?.severity || !detail?.bugClassification || !detail?.bugFlag)) {
      setShowBugCloseGuard(true);
      return;
    }
    onClose();
  }

  function saveBugDetails() {
    if (!bugSeverityLocal) { setBugDetailError('Severity is required'); return; }
    if (!bugClassificationLocal) { setBugDetailError('Classification is required'); return; }
    if (!bugFlagLocal) { setBugDetailError('Environment is required'); return; }
    setBugDetailError('');
    updateMut.mutate({
      severity: bugSeverityLocal as BugSeverity,
      bugClassification: bugClassificationLocal as BugClassification,
      bugStatus: (bugStatusLocal || undefined) as BugStatus | undefined,
      bugFlag: (bugFlagLocal || undefined) as BugFlag | undefined,
      bugReproducibility: (bugReproducibilityLocal || undefined) as BugReproducibility | undefined,
      module: bugModuleLocal || undefined,
      responsibleUserId: bugResponsibleUserIdLocal || undefined,
      affectedBuildVersion: bugAffectedBuildLocal || undefined,
      fixedBuildVersion: bugFixedBuildLocal || undefined,
      reminderType: bugReminderTypeLocal,
      environment: bugEnvironmentLocal || undefined,
      stepsToRepro: bugStepsToReproLocal || undefined,
    });
  }

  const updateMut = useMutation({
    mutationFn: (data: Partial<WorkItem>) => boardApi.updateWorkItem(item!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
      qc.invalidateQueries({ queryKey: ['board', item!.projectId] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => boardApi.deleteWorkItem(item!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', item!.projectId] });
      onSuccess?.('Work item deleted successfully');
      onClose();
    },
  });

  const createChildMut = useMutation({
    mutationFn: (data: Partial<WorkItem>) => boardApi.createWorkItem(item!.projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
      qc.invalidateQueries({ queryKey: ['board', item!.projectId] });
      setNewChildTitle('');
    },
  });

  const toggleChildDoneMut = useMutation({
    mutationFn: ({ childId, done, status }: { childId: string; done: boolean; status?: BoardStatus }) =>
      boardApi.updateWorkItem(childId, { status: status ?? (done ? 'QA_DONE' : 'TODO') }),
    onSuccess: (_data, { childId, done, status }) => {
      const resolvedStatus = status ?? (done ? 'QA_DONE' : 'TODO');
      qc.setQueryData(['workItem', item!.id], (old: WorkItem | undefined) => {
        if (!old) return old;
        return {
          ...old,
          children: (old.children ?? []).map((c) =>
            c.id === childId ? { ...c, status: resolvedStatus } : c
          ),
        };
      });
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
      qc.invalidateQueries({ queryKey: ['board', item!.projectId] });
    },
  });

  const logChildTimeMut = useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: { date: string; hours: number; description?: string } }) =>
      boardApi.logTime(childId, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', vars.childId] });
      setExpandedLogItems((prev) => { const s = new Set(prev); s.delete(vars.childId); return s; });
      setChildLogForms((prev) => { const n = { ...prev }; delete n[vars.childId]; return n; });
    },
  });

  const logTimeMut = useMutation({
    mutationFn: (d: { date: string; hours: number; description?: string }) => boardApi.logTime(item!.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
    },
  });

  const deleteEntryMut = useMutation({
    mutationFn: (entryId: string) => boardApi.deleteTimesheetEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
    },
  });

  const addCommentMut = useMutation({
    mutationFn: ({ content, mentions }: { content: string; mentions: string[] }) =>
      boardApi.addComment(item!.id, content, mentions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
      setCommentText('');
      setMentionedIds([]);
    },
  });

  const deleteCommentMut = useMutation({
    mutationFn: ({ wid, cid }: { wid: string; cid: string }) => boardApi.deleteComment(wid, cid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
      qc.invalidateQueries({ queryKey: ['workItem-activities', item!.id] });
    },
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
    updateMut.mutate({ description: descDraft || undefined });
  }

  function saveDod() {
    updateMut.mutate({ definitionOfDone: dodDraft || undefined });
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

  const defaultChildType: WorkItemType = detail.type === 'EPIC' ? 'USER_STORY' : 'TASK';
  const childTypeOptions: WorkItemType[] =
    detail.type === 'EPIC' ? ['USER_STORY', 'BUG'] :
    detail.type === 'USER_STORY' ? ['TASK', 'BUG'] :
    [];
  const childSectionLabel = detail.type === 'EPIC' ? 'Children' : detail.type === 'USER_STORY' ? 'Tasks & Bugs' : 'Sub Tasks';
  const canAddChildren = detail.type === 'EPIC' || detail.type === 'USER_STORY';
  const activeChildType: WorkItemType = childTypeOptions.includes(newChildType) ? newChildType : defaultChildType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {detail.parent && (
              <>
                <TypeBadge type={detail.parent.type} />
                <button
                  onClick={() => onOpenChild?.(detail.parent!.id)}
                  disabled={!onOpenChild}
                  className={`text-xs truncate max-w-[200px] transition ${
                    onOpenChild
                      ? 'text-primary-600 hover:text-primary-800 hover:underline cursor-pointer'
                      : 'text-gray-500 cursor-default'
                  }`}
                  title={onOpenChild ? `Open ${detail.parent.title}` : detail.parent.title}
                >
                  {detail.parent.title}
                </button>
                <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            <TypeBadge type={detail.type} />
            {detail.displayId && (
              <span className="text-xs text-gray-400 font-mono shrink-0">{detail.displayId}</span>
            )}
          </div>
          {/* Delete button with inline confirm */}
          {canDelete && (() => {
            const childCount = detail._count?.children ?? detail.children?.length ?? 0;
            const hasChildren = childCount > 0;
            if (confirmDelete) {
              return (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">Delete this item?</span>
                  <button
                    onClick={() => deleteMut.mutate()}
                    disabled={deleteMut.isPending}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-60"
                  >
                    {deleteMut.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              );
            }
            return (
              <button
                onClick={() => !hasChildren && setConfirmDelete(true)}
                disabled={hasChildren}
                className={`shrink-0 p-1.5 rounded-lg transition ${
                  hasChildren
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
                title={hasChildren ? `Cannot delete — ${childCount} child item${childCount > 1 ? 's' : ''} must be removed first` : 'Delete work item'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            );
          })()}

          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 shrink-0 p-1 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Bug close guard banner */}
        {showBugCloseGuard && (
          <div className="mx-6 mt-3 flex items-center justify-between gap-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm text-red-700 font-semibold">
                Severity, Classification and Environment are required. Please fill in all required fields and click <span className="underline">Save</span> before closing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBugCloseGuard(false)}
              className="text-xs font-semibold text-red-600 hover:text-red-800 underline shrink-0 transition"
            >
              Dismiss
            </button>
          </div>
        )}

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
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                <div className="rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-primary-500 overflow-hidden">
                  <RichTextEditor
                    value={descDraft}
                    onChange={setDescDraft}
                    placeholder="Add a description…"
                    minHeight="120px"
                  />
                </div>
                {descChanged && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveDesc}
                      disabled={updateMut.isPending}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {updateMut.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setDescDraft(detail.description ?? '')}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Definition of Done — USER_STORY only */}
              {detail.type === 'USER_STORY' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Definition of Done</label>
                  <textarea
                    value={dodDraft}
                    onChange={(e) => setDodDraft(e.target.value)}
                    placeholder="e.g. Unit tests pass, code reviewed, deployed to staging…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    rows={3}
                  />
                  {dodChanged && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveDod} disabled={updateMut.isPending} className="btn-primary text-xs px-3 py-1.5">
                        {updateMut.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setDodDraft(detail.definitionOfDone ?? '')} className="btn-secondary text-xs px-3 py-1.5">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Child Items — JIRA style with checkbox, strikethrough, inline log time */}
              {canAddChildren && (() => {
                const visibleChildren = (detail.children ?? []).filter((c) => c.type === activeChildType);
                const doneCount = visibleChildren.filter((c) => c.status === 'QA_DONE').length;
                return (
                  <div>
                    {/* Tab bar — only when multiple child types are possible */}
                    {childTypeOptions.length > 1 ? (
                      <div className="flex items-center gap-0 border-b border-gray-200 mb-3">
                        {childTypeOptions.map((t) => {
                          const count = (detail.children ?? []).filter((c) => c.type === t).length;
                          const isActive = activeChildType === t;
                          return (
                            <button
                              key={t}
                              onClick={() => { setNewChildType(t); setNewChildTitle(''); }}
                              className={`text-xs font-semibold px-4 py-2 border-b-2 transition -mb-px ${
                                isActive
                                  ? t === 'BUG'
                                    ? 'border-red-500 text-red-700'
                                    : 'border-primary-500 text-primary-700'
                                  : 'border-transparent text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              {TYPE_CONFIG[t].label}s
                              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                isActive
                                  ? t === 'BUG' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'
                                  : 'bg-gray-100 text-gray-400'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                        {visibleChildren.length > 0 && (
                          <span className="ml-auto text-[11px] text-gray-400 pb-2">
                            {doneCount} / {visibleChildren.length} done
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                          {childSectionLabel} ({visibleChildren.length})
                        </p>
                        {visibleChildren.length > 0 && (
                          <span className="text-[11px] text-gray-400">{doneCount} / {visibleChildren.length} done</span>
                        )}
                      </div>
                    )}

                    {/* Progress bar */}
                    {visibleChildren.length > 0 && (
                      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${(doneCount / visibleChildren.length) * 100}%` }}
                        />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {visibleChildren.map((child) => {
                        const isDone = child.status === 'QA_DONE';
                        const logOpen = expandedLogItems.has(child.id);
                        const logForm = childLogForms[child.id] ?? { date: new Date().toISOString().slice(0, 10), hours: '', desc: '' };

                        return (
                          <div key={child.id}>
                            {/* Main row */}
                            <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group transition">
                              {/* Status select — colored pill */}
                              <select
                                value={child.status}
                                onChange={(e) => toggleChildDoneMut.mutate({ childId: child.id, done: false, status: e.target.value as BoardStatus })}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer shrink-0 focus:ring-1 focus:ring-primary-400 ${
                                  isDone                                  ? 'bg-emerald-100 text-emerald-700' :
                                  child.status === 'IN_PROGRESS'        ? 'bg-blue-100 text-blue-700' :
                                  child.status === 'BLOCKED'            ? 'bg-red-100 text-red-700' :
                                  child.status === 'IN_REVIEW'          ? 'bg-amber-100 text-amber-700' :
                                  child.status === 'READY_FOR_QA'       ? 'bg-purple-100 text-purple-700' :
                                  child.status === 'IN_QA'              ? 'bg-indigo-100 text-indigo-700' :
                                                                          'bg-gray-100 text-gray-600'
                                }`}
                                title="Change status"
                              >
                                {DEFAULT_BOARD_COLUMNS.map((c) => (
                                  <option key={c.status} value={c.status}>{c.label}</option>
                                ))}
                              </select>

                              {/* Title — clickable to open child, strikethrough when done */}
                              <button
                                onClick={() => onOpenChild?.(child.id)}
                                className={`text-xs flex-1 min-w-0 truncate text-left transition-all ${
                                  isDone ? 'line-through text-gray-400' : 'text-gray-700 hover:text-primary-600 hover:underline'
                                } ${onOpenChild ? 'cursor-pointer' : 'cursor-default'}`}
                                disabled={!onOpenChild}
                                title={onOpenChild ? 'Click to open' : undefined}
                              >
                                {child.title}
                              </button>

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
                            </div>

                            {/* Inline log time form */}
                            {logOpen && (
                              <div className="ml-4 mb-2 bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-2">
                                <p className="text-[11px] font-semibold text-blue-700 mb-1.5">Log time — {child.title}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-gray-500 mb-0.5 block">Date</label>
                                    <input
                                      type="date"
                                      value={logForm.date}
                                      min={pastDateStr(1)}
                                      max={todayStr()}
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
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-500 mb-0.5 block">Description</label>
                                  <textarea
                                    value={logForm.desc}
                                    placeholder="What did you work on?"
                                    maxLength={1000}
                                    rows={2}
                                    onChange={(e) => setChildLogForms((prev) => ({ ...prev, [child.id]: { ...logForm, desc: e.target.value } }))}
                                    className="input-sm w-full text-xs resize-none"
                                  />
                                  <p className="text-[10px] text-gray-400 text-right mt-0.5">{logForm.desc.length}/1000</p>
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

                      {/* Quick-add input — PM/Admin/Super + QA */}
                      {(canEditSidebar || canAddChild) && (
                        <div className="flex items-center gap-2 mt-1.5 pl-2">
                          <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-200 shrink-0" />
                          <input
                            type="text"
                            value={newChildTitle}
                            onChange={(e) => setNewChildTitle(e.target.value)}
                            placeholder={`Add ${activeChildType.replace(/_/g, ' ').toLowerCase()}…`}
                            className="input-sm flex-1 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newChildTitle.trim()) {
                                createChildMut.mutate({ type: activeChildType, title: newChildTitle.trim(), parentId: detail.id } as Partial<WorkItem>);
                              }
                            }}
                          />
                          <button
                            disabled={!newChildTitle.trim() || createChildMut.isPending}
                            onClick={() => {
                              if (newChildTitle.trim()) {
                                createChildMut.mutate({ type: activeChildType, title: newChildTitle.trim(), parentId: detail.id } as Partial<WorkItem>);
                              }
                            }}
                            className="btn-primary text-xs px-3 py-1.5 shrink-0"
                          >
                            {createChildMut.isPending ? '…' : '+ Add'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

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
                  { id: 'activities' as ActivityTab, label: 'Activity' },
                  ...(detail.type === 'USER_STORY' ? [{ id: 'testCases' as ActivityTab, label: 'Test Cases' }] : []),
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
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          ref={commentInputRef}
                          type="text"
                          value={commentText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCommentText(val);
                            const atIdx = val.lastIndexOf('@');
                            if (atIdx !== -1) {
                              const afterAt = val.slice(atIdx + 1);
                              if (!afterAt.includes(' ')) {
                                setMentionSearch(afterAt.toLowerCase());
                                if (commentInputRef.current) {
                                  const rect = commentInputRef.current.getBoundingClientRect();
                                  setMentionMenuPos({ top: rect.top, left: rect.left, width: rect.width });
                                }
                                setShowMentionMenu(true);
                              } else {
                                setShowMentionMenu(false);
                              }
                            } else {
                              setShowMentionMenu(false);
                            }
                          }}
                          placeholder="Add a comment… type @ to mention someone"
                          className="input-sm w-full"
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setShowMentionMenu(false);
                            if (e.key === 'Enter' && !showMentionMenu && commentText.trim()) {
                              addCommentMut.mutate({ content: commentText.trim(), mentions: mentionedIds });
                            }
                          }}
                        />
                      </div>
                      {showMentionMenu && createPortal(
                        <div
                          style={{
                            position: 'fixed',
                            top: mentionMenuPos.top,
                            left: mentionMenuPos.left,
                            width: mentionMenuPos.width,
                            zIndex: 9999,
                            transform: 'translateY(-100%)',
                          }}
                          className="max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl"
                        >
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-1.5 border-b border-gray-100">Mention</p>
                          {members
                            .filter((m) => m.fullName.toLowerCase().includes(mentionSearch))
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const atIdx = commentText.lastIndexOf('@');
                                  const before = commentText.slice(0, atIdx);
                                  setCommentText(`${before}@${m.fullName} `);
                                  setMentionedIds((prev) => prev.includes(m.id) ? prev : [...prev, m.id]);
                                  setShowMentionMenu(false);
                                  commentInputRef.current?.focus();
                                }}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-50 text-xs text-gray-700"
                              >
                                <Avatar name={m.fullName} photo={m.profilePhoto} size="xs" />
                                {m.fullName}
                              </button>
                            ))}
                          {members.filter((m) => m.fullName.toLowerCase().includes(mentionSearch)).length === 0 && (
                            <p className="px-3 py-2 text-xs text-gray-400">No members found</p>
                          )}
                        </div>,
                        document.body,
                      )}
                      {mentionedIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {mentionedIds.map((id) => {
                            const m = members.find((x) => x.id === id);
                            return m ? (
                              <span key={id} className="inline-flex items-center gap-1 text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
                                @{m.fullName}
                                <button onClick={() => setMentionedIds((p) => p.filter((x) => x !== id))} className="hover:text-red-500">×</button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <button
                        onClick={() => { if (commentText.trim()) addCommentMut.mutate({ content: commentText.trim(), mentions: mentionedIds }); }}
                        disabled={!commentText.trim() || addCommentMut.isPending}
                        className="btn-primary text-xs px-3 py-1.5"
                      >Post</button>
                    </div>
                    {(detail.comments ?? []).map((c) => (
                      <div key={c.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                        <Avatar name={c.author.fullName} photo={c.author.profilePhoto} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800">{c.author.fullName}</p>
                          <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{c.content}</p>
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
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={logDate} min={pastDateStr(1)} max={todayStr()} onChange={(e) => setLogDate(e.target.value)} className="input-sm" />
                      <input type="number" min={0.25} max={24} step={0.25} placeholder="Hours" value={logHours} onChange={(e) => setLogHours(e.target.value)} className="input-sm" />
                    </div>
                    <div>
                      <textarea
                        placeholder="Description (optional)"
                        value={logDesc}
                        onChange={(e) => setLogDesc(e.target.value)}
                        maxLength={1000}
                        rows={2}
                        className="input-sm w-full text-xs resize-none"
                      />
                      <p className="text-[10px] text-gray-400 text-right mt-0.5">{logDesc.length}/1000</p>
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
                              <p className="text-[10px] text-gray-400">{entry.user?.fullName}</p>
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

                {/* Activities */}
                {activityTab === 'activities' && (
                  <ActivityLog workItemId={detail.id} />
                )}

                {/* Test Cases */}
                {activityTab === 'testCases' && (
                  <TestCasesPanel
                    workItemId={detail.id}
                    projectId={detail.projectId}
                    onCreateBug={(tc) => setBugFromTc(tc)}
                  />
                )}

                {/* Attachments */}
                {activityTab === 'attachments' && (
                  <div className="space-y-2">
                    {/* Upload button */}
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50/60 cursor-pointer transition text-xs text-gray-500 hover:text-primary-600">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Attach file
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt,.mp4"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f || !item) return;
                          e.target.value = '';
                          try {
                            await boardApi.uploadAttachment(item.id, f);
                            qc.invalidateQueries({ queryKey: ['workItem', item.id] });
                          } catch { /* ignore */ }
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-gray-400">PDF, DOCX, XLSX, PNG, JPG, TXT, MP4 · max 10 MB</p>

                    {(detail.attachments ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">No attachments yet.</p>
                    ) : (
                      (detail.attachments ?? []).map((a) => (
                        <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <a
                              href={boardApi.attachmentDownloadUrl(a.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-primary-600 hover:underline truncate block"
                            >
                              {a.originalName}
                            </a>
                            <p className="text-[10px] text-gray-400">{(a.size / 1024).toFixed(1)} KB · {a.uploadedBy.fullName}</p>
                          </div>
                          <button
                            onClick={async () => {
                              await boardApi.deleteAttachment(a.id);
                              qc.invalidateQueries({ queryKey: ['workItem', item!.id] });
                            }}
                            className="text-gray-400 hover:text-red-500 transition shrink-0"
                            title="Remove attachment"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Bug quick-add (Story only) ── */}
            {detail.type === 'USER_STORY' && (
              <div className="border-t border-red-100 bg-red-50/40 px-6 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="text-xs font-semibold text-red-600 shrink-0">Bug</span>
                <input
                  type="text"
                  value={bugQuickTitle}
                  onChange={(e) => setBugQuickTitle(e.target.value)}
                  placeholder="Describe the bug…"
                  className="flex-1 input-sm text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && bugQuickTitle.trim()) {
                      createChildMut.mutate({ type: 'BUG', title: bugQuickTitle.trim(), parentId: detail.id } as Partial<WorkItem>);
                      setBugQuickTitle('');
                    }
                  }}
                />
                <button
                  disabled={!bugQuickTitle.trim() || createChildMut.isPending}
                  onClick={() => {
                    if (bugQuickTitle.trim()) {
                      createChildMut.mutate({ type: 'BUG', title: bugQuickTitle.trim(), parentId: detail.id } as Partial<WorkItem>);
                      setBugQuickTitle('');
                    }
                  }}
                  className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition shrink-0"
                >
                  + Add
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL (Properties Sidebar) ── */}
          <div className="flex-[2] overflow-y-auto bg-gray-50/60 border-l border-gray-100">
            <div className="px-5 py-5 space-y-1">

              {/* Status */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Status</p>
                <select
                  value={detail.status}
                  onChange={(e) => updateMut.mutate({ status: e.target.value as BoardStatus })}
                  className={`w-full font-semibold text-sm rounded-lg px-3 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer bg-white ${
                    detail.status === 'TODO' ? 'text-gray-700' :
                    detail.status === 'IN_PROGRESS' ? 'text-blue-700' :
                    detail.status === 'BLOCKED' ? 'text-red-700' :
                    detail.status === 'IN_REVIEW' ? 'text-amber-700' :
                    detail.status === 'READY_FOR_QA' ? 'text-purple-700' :
                    detail.status === 'IN_QA' ? 'text-indigo-700' :
                    'text-emerald-700'
                  }`}
                >
                  {DEFAULT_BOARD_COLUMNS.map((c) => (
                    <option key={c.status} value={c.status}>{c.label}</option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest pb-1">Details</p>

              {/* Assignee */}
              <SidebarRow label="Assignee">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {detail.assignee ? (
                      <>
                        <Avatar name={detail.assignee.fullName} photo={detail.assignee.profilePhoto} size="xs" />
                        <span className="text-xs text-gray-700">{detail.assignee.fullName}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Unassigned</span>
                    )}
                  </div>
                  {canEditSidebar && (
                    <>
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
                    </>
                  )}
                </div>
              </SidebarRow>

              {/* Reporter */}
              <SidebarRow label="Reporter">
                <div className="flex items-center gap-2">
                  <Avatar name={detail.reporter.fullName} photo={detail.reporter.profilePhoto} size="xs" />
                  <span className="text-xs text-gray-700">{detail.reporter.fullName}</span>
                </div>
              </SidebarRow>

              {/* Sprint */}
              <SidebarRow label="Sprint">
                {canEditSidebar ? (
                  <select
                    value={detail.sprintId ?? ''}
                    onChange={(e) => updateMut.mutate({ sprintId: e.target.value || undefined })}
                    className="input-sm w-full text-xs"
                  >
                    <option value="">— none —</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-700">{sprints.find((s) => s.id === detail.sprintId)?.name ?? <span className="text-gray-400 italic">None</span>}</span>
                )}
              </SidebarRow>

              {/* Priority */}
              <SidebarRow label="Priority">
                {canEditSidebar ? (
                  <select
                    value={detail.priority}
                    onChange={(e) => updateMut.mutate({ priority: e.target.value as TaskPriority })}
                    className="input-sm w-full text-xs"
                  >
                    {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[detail.priority].bg} ${PRIORITY_CONFIG[detail.priority].text}`}>
                    {PRIORITY_CONFIG[detail.priority].label}
                  </span>
                )}
              </SidebarRow>

              {/* Story Points */}
              <SidebarRow label="Story Points">
                {canEditSidebar ? (
                  <input
                    type="number" min={0}
                    defaultValue={detail.storyPoints ?? ''}
                    onBlur={(e) => updateMut.mutate({ storyPoints: Number(e.target.value) || undefined })}
                    className="input-sm w-24 text-xs"
                  />
                ) : (
                  <span className="text-xs text-gray-700">{detail.storyPoints != null ? detail.storyPoints : '—'}</span>
                )}
              </SidebarRow>

              {/* Estimated Hours */}
              <SidebarRow label={item.type !== 'EPIC' ? <span>Est. Hours <span className="text-red-500">*</span></span> : 'Est. Hours'}>
                {canEditSidebar ? (
                  <div>
                    <input
                      type="number" min={0} step={0.5}
                      defaultValue={detail.estimatedHours ?? ''}
                      required={item.type !== 'EPIC'}
                      onBlur={(e) => {
                        if (item.type !== 'EPIC' && !e.target.value) {
                          setEstHoursError(true);
                          return;
                        }
                        setEstHoursError(false);
                        updateMut.mutate({ estimatedHours: Number(e.target.value) || undefined });
                      }}
                      className={`input-sm w-24 text-xs ${estHoursError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {estHoursError && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </div>
                ) : (
                  <span className="text-xs text-gray-700">{detail.estimatedHours != null ? `${detail.estimatedHours}h` : '—'}</span>
                )}
              </SidebarRow>

              {/* Billing */}
              <SidebarRow label={<span>Billing <span className="text-red-500">*</span></span>}>
                {item.type === 'BUG' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Non-Billable</span>
                    <span className="text-[10px] text-gray-400">(bugs are always non-billable)</span>
                  </div>
                ) : canChangeBilling ? (
                  <div>
                    <select
                      value={billingStatusLocal}
                      onChange={(e) => {
                        if (!e.target.value) {
                          setBillingStatusDetailError(true);
                          return;
                        }
                        setBillingStatusDetailError(false);
                        setBillingStatusLocal(e.target.value as BillingStatus);
                        updateMut.mutate({ billingStatus: e.target.value as BillingStatus });
                      }}
                      className={`input-sm w-full text-xs ${billingStatusError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    >
                      <option value="">— select —</option>
                      <option value="BILLABLE">Billable</option>
                      <option value="NON_BILLABLE">Non-Billable</option>
                    </select>
                    {billingStatusError && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      billingStatusLocal === 'BILLABLE'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-orange-50 text-orange-600'
                    }`}>
                      {billingStatusLocal === 'BILLABLE' ? 'Billable' : billingStatusLocal === 'NON_BILLABLE' ? 'Non-Billable' : '—'}
                    </span>
                    <span className="text-[10px] text-gray-400">(PM only)</span>
                  </div>
                )}
              </SidebarRow>

              {/* Start Date */}
              <SidebarRow label={<span>Start Date <span className="text-red-500">*</span></span>}>
                {canEditSidebar ? (
                  <div>
                    <input
                      type="date"
                      defaultValue={detail.startDate?.slice(0, 10) ?? ''}
                      min={pastDateStr(5)}
                      max={futureDateStr(10)}
                      required
                      onBlur={(e) => {
                        if (!e.target.value) { setStartDateError(true); return; }
                        setStartDateError(false);
                        updateMut.mutate({ startDate: e.target.value });
                      }}
                      className={`input-sm w-full text-xs ${startDateError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {startDateError && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </div>
                ) : (
                  <span className="text-xs text-gray-700">{detail.startDate ? fmtDate(detail.startDate) : '—'}</span>
                )}
              </SidebarRow>

              {/* Due Date */}
              <SidebarRow label={<span>Due Date <span className="text-red-500">*</span></span>}>
                {canEditSidebar ? (
                  <div>
                    <input
                      type="date"
                      defaultValue={detail.dueDate?.slice(0, 10) ?? ''}
                      min={pastDateStr(5)}
                      max={futureDateStr(10)}
                      required
                      onBlur={(e) => {
                        if (!e.target.value) { setDueDateError(true); return; }
                        setDueDateError(false);
                        updateMut.mutate({ dueDate: e.target.value });
                      }}
                      className={`input-sm w-full text-xs ${dueDateError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {dueDateError && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </div>
                ) : (
                  <span className="text-xs text-gray-700">{detail.dueDate ? fmtDate(detail.dueDate) : '—'}</span>
                )}
              </SidebarRow>

              {/* Labels */}
              <SidebarRow label="Labels">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {(detail.labels ?? []).map((l) => (
                      <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded-full border border-blue-200">
                        {l}
                        {canEditSidebar && <button onClick={() => removeLabel(l)} className="hover:text-red-500 leading-none">×</button>}
                      </span>
                    ))}
                    {(detail.labels ?? []).length === 0 && !canEditSidebar && (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </div>
                  {canEditSidebar && (
                    addingLabel ? (
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
                    )
                  )}
                </div>
              </SidebarRow>

              {/* Parent — editable */}
              {validParentTypes && (
                <SidebarRow label="Parent">
                  {canEditSidebar ? (
                    <div className="space-y-1">
                      {detail.parent && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <TypeBadge type={detail.parent.type} />
                          <span className="text-xs text-gray-600 truncate">{detail.parent.title}</span>
                        </div>
                      )}
                      <select
                        value={detail.parentId ?? ''}
                        onChange={(e) => updateMut.mutate({ parentId: e.target.value || undefined })}
                        className="input-sm w-full text-xs"
                      >
                        <option value="">— none —</option>
                        {parentOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{TYPE_CONFIG[p.type].label}] {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    detail.parent ? (
                      <div className="flex items-center gap-1.5">
                        <TypeBadge type={detail.parent.type} />
                        <span className="text-xs text-gray-600 truncate">{detail.parent.title}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )
                  )}
                </SidebarRow>
              )}

              {/* Fix Version */}
              <SidebarRow label="Fix Version">
                {canEditSidebar ? (
                  <input
                    type="text"
                    defaultValue={detail.fixVersion ?? ''}
                    onBlur={(e) => updateMut.mutate({ fixVersion: e.target.value || undefined })}
                    placeholder="e.g. v1.2.0"
                    className="input-sm w-full text-xs"
                  />
                ) : (
                  <span className="text-xs text-gray-700">{detail.fixVersion ?? '—'}</span>
                )}
              </SidebarRow>

              {/* GitHub PR link — read-only, set by webhook */}
              {detail.prUrl && (
                <SidebarRow label="GitHub PR">
                  <div className="flex items-center gap-2">
                    <a
                      href={detail.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:underline truncate"
                    >
                      #{detail.prNumber} {detail.prTitle}
                    </a>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                      detail.prState === 'merged'
                        ? 'bg-purple-100 text-purple-700'
                        : detail.prState === 'closed'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {detail.prState}
                    </span>
                  </div>
                </SidebarRow>
              )}

              {/* Release Milestone — all item types */}
              {milestones.length > 0 && (
                <SidebarRow label="Release Milestone">
                  {canEditSidebar ? (
                    <select
                      value={detail.releaseMilestoneId ?? ''}
                      onChange={(e) => updateMut.mutate({ releaseMilestoneId: e.target.value || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— none —</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>{m.name ?? m.description}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-700">
                      {(() => { const m = milestones.find((x) => x.id === detail.releaseMilestoneId); return m ? (m.name ?? m.description) : '—'; })()}
                    </span>
                  )}
                </SidebarRow>
              )}

              {/* Affected Milestone — all item types */}
              {milestones.length > 0 && (
                <SidebarRow label="Affected Milestone">
                  {canEditSidebar ? (
                    <select
                      value={detail.affectedMilestoneId ?? ''}
                      onChange={(e) => updateMut.mutate({ affectedMilestoneId: e.target.value || undefined })}
                      className="input-sm w-full text-xs"
                    >
                      <option value="">— none —</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>{m.name ?? m.description}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-700">
                      {(() => { const m = milestones.find((x) => x.id === detail.affectedMilestoneId); return m ? (m.name ?? m.description) : '—'; })()}
                    </span>
                  )}
                </SidebarRow>
              )}

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
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3 pb-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Bug Details</p>
                    {canEditSidebar && (
                      <button
                        type="button"
                        onClick={saveBugDetails}
                        disabled={updateMut.isPending}
                        className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1 rounded-md transition disabled:opacity-50"
                      >
                        {updateMut.isPending ? 'Saving…' : 'Save'}
                      </button>
                    )}
                  </div>

                  {bugDetailError && (
                    <p className="text-xs text-red-500 mb-2">{bugDetailError}</p>
                  )}

                  {/* Bug Status */}
                  <SidebarRow label="Bug Status">
                    <select
                      value={bugStatusLocal}
                      onChange={(e) => setBugStatusLocal(e.target.value as BugStatus)}
                      className={`input-sm w-full text-xs font-medium ${bugStatusLocal ? BUG_STATUS_CONFIG[bugStatusLocal as BugStatus].text : ''}`}
                    >
                      <option value="">— select —</option>
                      {(Object.keys(BUG_STATUS_CONFIG) as BugStatus[]).map((s) => (
                        <option key={s} value={s}>{BUG_STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </SidebarRow>

                  {/* Severity — required */}
                  <SidebarRow label={<>Severity {canEditSidebar && <span className="text-red-500">*</span>}</>}>
                    {canEditSidebar ? (
                      <select
                        value={bugSeverityLocal}
                        onChange={(e) => { setBugSeverityLocal(e.target.value as BugSeverity); setBugDetailError(''); }}
                        className={`input-sm w-full text-xs ${!bugSeverityLocal ? 'border-red-300' : ''}`}
                      >
                        <option value="">— select —</option>
                        {(['SHOW_STOPPER', 'BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as BugSeverity[]).map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ').charAt(0) + s.replace(/_/g, ' ').slice(1).toLowerCase()}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-700">
                        {bugSeverityLocal ? (bugSeverityLocal.replace(/_/g, ' ').charAt(0) + bugSeverityLocal.replace(/_/g, ' ').slice(1).toLowerCase()) : '—'}
                      </span>
                    )}
                  </SidebarRow>

                  {/* Classification — required */}
                  <SidebarRow label={<>Classification {canEditSidebar && <span className="text-red-500">*</span>}</>}>
                    {canEditSidebar ? (
                      <select
                        value={bugClassificationLocal}
                        onChange={(e) => { setBugClassificationLocal(e.target.value as BugClassification); setBugDetailError(''); }}
                        className={`input-sm w-full text-xs ${!bugClassificationLocal ? 'border-red-300' : ''}`}
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
                        <option value="FUNCTIONAL">Functional</option>
                        <option value="OTHER">Other</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-700">
                        {bugClassificationLocal ? bugClassificationLocal.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—'}
                      </span>
                    )}
                  </SidebarRow>

                  {/* Environment (formerly Flag) */}
                  <SidebarRow label={<>Environment {canEditSidebar && <span className="text-red-500">*</span>}</>}>
                    {canEditSidebar ? (
                      <select
                        value={bugFlagLocal}
                        onChange={(e) => { setBugFlagLocal(e.target.value as BugFlag); setBugDetailError(''); }}
                        className={`input-sm w-full text-xs ${!bugFlagLocal ? 'border-red-300' : ''}`}
                      >
                        <option value="">— select —</option>
                        <option value="INTERNAL">Development</option>
                        <option value="EXTERNAL">Production</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-700">
                        {bugFlagLocal === 'INTERNAL' ? 'Development' : bugFlagLocal === 'EXTERNAL' ? 'Production' : '—'}
                      </span>
                    )}
                  </SidebarRow>

                  {/* Reproducibility */}
                  <SidebarRow label="Reproducibility">
                    {canEditSidebar ? (
                      <select
                        value={bugReproducibilityLocal}
                        onChange={(e) => setBugReproducibilityLocal(e.target.value as BugReproducibility)}
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
                    ) : (
                      <span className="text-xs text-gray-700">
                        {bugReproducibilityLocal ? ({ ALWAYS: 'Always', SOMETIMES: 'Sometimes', RARELY: 'Rarely', UNABLE: 'Unable to Reproduce', NEVER_TRIED: 'Never Tried', NOT_APPLICABLE: 'Not Applicable' } as Record<string, string>)[bugReproducibilityLocal] ?? '—' : '—'}
                      </span>
                    )}
                  </SidebarRow>

                  {/* Module */}
                  <SidebarRow label="Module">
                    {canEditSidebar ? (
                      <input
                        type="text"
                        value={bugModuleLocal}
                        onChange={(e) => setBugModuleLocal(e.target.value)}
                        placeholder="e.g. Auth, Dashboard"
                        className="input-sm w-full text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-700">{bugModuleLocal || '—'}</span>
                    )}
                  </SidebarRow>

                  {/* Responsible Developer */}
                  <SidebarRow label="Responsible Dev">
                    {canEditSidebar ? (
                      <select
                        value={bugResponsibleUserIdLocal}
                        onChange={(e) => setBugResponsibleUserIdLocal(e.target.value)}
                        className="input-sm w-full text-xs"
                      >
                        <option value="">— select —</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.fullName}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-700">
                        {bugResponsibleUserIdLocal ? (members.find((m) => m.id === bugResponsibleUserIdLocal)?.fullName ?? '—') : '—'}
                      </span>
                    )}
                  </SidebarRow>

                  {/* Affected Build Version */}
                  <SidebarRow label="Affected Build">
                    {canEditSidebar ? (
                      <input
                        type="text"
                        value={bugAffectedBuildLocal}
                        onChange={(e) => setBugAffectedBuildLocal(e.target.value)}
                        placeholder="e.g. 1.0.5"
                        className="input-sm w-full text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-700">{bugAffectedBuildLocal || '—'}</span>
                    )}
                  </SidebarRow>

                  {/* Fixed Build Version */}
                  <SidebarRow label="Fixed Build">
                    {canEditSidebar ? (
                      <input
                        type="text"
                        value={bugFixedBuildLocal}
                        onChange={(e) => setBugFixedBuildLocal(e.target.value)}
                        placeholder="e.g. 1.0.6"
                        className="input-sm w-full text-xs"
                      />
                    ) : (
                      <span className="text-xs text-gray-700">{bugFixedBuildLocal || '—'}</span>
                    )}
                  </SidebarRow>

                  {/* Reminder Type */}
                  <SidebarRow label="Reminder">
                    {canEditSidebar ? (
                      <select
                        value={bugReminderTypeLocal}
                        onChange={(e) => setBugReminderTypeLocal(e.target.value as BugReminderType)}
                        className="input-sm w-full text-xs"
                      >
                        <option value="NONE">None</option>
                        <option value="DAILY">Daily</option>
                        <option value="ONE_DAY">1 Day before</option>
                        <option value="TWO_DAYS">2 Days before</option>
                        <option value="THREE_DAYS">3 Days before</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-700">
                        {({ NONE: 'None', DAILY: 'Daily', ONE_DAY: '1 Day before', TWO_DAYS: '2 Days before', THREE_DAYS: '3 Days before' } as Record<string, string>)[bugReminderTypeLocal] ?? '—'}
                      </span>
                    )}
                  </SidebarRow>

                  {/* Steps to Reproduce */}
                  <SidebarRow label="Steps to Repro">
                    <textarea
                      value={bugStepsToReproLocal}
                      onChange={(e) => setBugStepsToReproLocal(e.target.value)}
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

      {/* Bug from Test Case */}
      {bugFromTc && (
        <CreateWorkItemModal
          projectId={detail.projectId}
          sprints={sprints}
          members={members}
          milestones={milestones}
          defaultType="BUG"
          parentId={detail.id}
          prefill={{ title: `Bug from TC: ${bugFromTc.title}`, stepsToRepro: bugFromTc.steps }}
          onClose={() => setBugFromTc(null)}
          onSaved={() => { setBugFromTc(null); onSuccess?.('Bug created'); }}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

// ─── CreateWorkItemModal ──────────────────────────────────────────────────────

function TypeIcon({ type }: { type: WorkItemType }) {
  if (type === 'EPIC') return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
  if (type === 'USER_STORY') return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
  if (type === 'BUG') return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
  if (type === 'SUB_TASK') return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function CreateWorkItemModal({
  projectId, sprints, members = [], milestones = [],
  defaultType = 'TASK', parentId, prefill, bugOnly = false, onClose, onSaved, onSuccess,
}: CreateProps) {
  const qc = useQueryClient();
  const [type, setType] = useState<WorkItemType>(bugOnly ? 'BUG' : defaultType);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const [showParentMenu, setShowParentMenu] = useState(false);
  const parentMenuRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [sprintId, setSprintId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const todayIso = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayIso);
  const [dueDate, setDueDate] = useState(todayIso);
  const [selectedParentId, setSelectedParentId] = useState(parentId ?? '');
  // Bug fields
  const [severity, setSeverity] = useState<BugSeverity | ''>('');
  const [bugClassification, setBugClassification] = useState<BugClassification | ''>('');
  const [environment] = useState('');
  const [stepsToRepro, setStepsToRepro] = useState(prefill?.stepsToRepro ?? '');
  const [bugFlag, setBugFlag] = useState<BugFlag | ''>('');
  const [bugReproducibility, setBugReproducibility] = useState<BugReproducibility | ''>('');
  const [bugStatus, setBugStatus] = useState<BugStatus | ''>('');
  const [module, setModule] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [billingStatus, setBillingStatus] = useState<BillingStatus | ''>('');
  const [affectedBuildVersion, setAffectedBuildVersion] = useState('');
  const [fixedBuildVersion, setFixedBuildVersion] = useState('');
  const [reminderType, setReminderType] = useState<BugReminderType>('NONE');
  const [milestoneLinkId, setMilestoneLinkId] = useState('');
  const [affectedMilestoneId, setAffectedMilestoneId] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!showTypeMenu) return;
    function handleOutside(e: MouseEvent) {
      if (!typeMenuRef.current?.contains(e.target as Node)) setShowTypeMenu(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showTypeMenu]);

  useEffect(() => {
    if (!showParentMenu) return;
    function handleOutside(e: MouseEvent) {
      if (!parentMenuRef.current?.contains(e.target as Node)) setShowParentMenu(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showParentMenu]);

  const filteredSprints = milestoneLinkId
    ? sprints.filter((s) => s.milestoneId === milestoneLinkId)
    : sprints;

  const { data: parentOptions = [] } = useQuery({
    queryKey: ['workItems-parents', projectId],
    queryFn: () => boardApi.getWorkItems(projectId),
    enabled: ['USER_STORY', 'TASK', 'BUG'].includes(type),
    select: (items) => items.filter((i) => {
      if (type === 'USER_STORY') return i.type === 'EPIC';
      if (type === 'TASK') return i.type === 'EPIC' || i.type === 'USER_STORY';
      if (type === 'BUG') return i.type === 'EPIC' || i.type === 'USER_STORY' || i.type === 'TASK';
      return false;
    }),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<WorkItem>) => boardApi.createWorkItem(projectId, data),
    onSuccess: async (created) => {
      for (const file of pendingFiles) {
        try { await boardApi.uploadAttachment(created.id, file); } catch { /* non-fatal */ }
      }
      qc.invalidateQueries({ queryKey: ['board', projectId] });
      const effectiveParent = selectedParentId || parentId;
      if (effectiveParent) {
        qc.invalidateQueries({ queryKey: ['workItem', effectiveParent] });
      }
      onSuccess?.(`${TYPE_CONFIG[type].label} created successfully`);
      onSaved();
    },
  });

  const [assigneeError, setAssigneeError] = useState(false);
  const [parentError, setParentError] = useState(false);
  const [dateError, setDateError] = useState('');
  const [estHoursError, setEstHoursError] = useState(false);
  const [billingStatusError, setBillingStatusError] = useState(false);
  const [bugSeverityError, setBugSeverityError] = useState(false);
  const [bugClassificationError, setBugClassificationError] = useState(false);
  const [bugEnvError, setBugEnvError] = useState(false);

  function handleSubmit() {
    if (!title.trim()) return;
    const TYPES_NEEDING_PARENT: WorkItemType[] = ['USER_STORY', 'TASK', 'SUB_TASK', 'BUG'];
    if (TYPES_NEEDING_PARENT.includes(type) && !selectedParentId && !parentId) {
      setParentError(true);
      return;
    }
    setParentError(false);
    if (type === 'BUG' && !assigneeId) {
      setAssigneeError(true);
      return;
    }
    setAssigneeError(false);
    if (!startDate || !dueDate) {
      setDateError(!startDate && !dueDate ? 'Start date and due date are required' : !startDate ? 'Start date is required' : 'Due date is required');
      return;
    }
    setDateError('');
    if (type !== 'EPIC' && !estimatedHours) {
      setEstHoursError(true);
      return;
    }
    setEstHoursError(false);
    if (type !== 'BUG' && !billingStatus) {
      setBillingStatusError(true);
      return;
    }
    setBillingStatusError(false);
    if (type === 'BUG' && !severity) {
      setBugSeverityError(true);
      return;
    }
    setBugSeverityError(false);
    if (type === 'BUG' && !bugClassification) {
      setBugClassificationError(true);
      return;
    }
    setBugClassificationError(false);
    if (type === 'BUG' && !bugFlag) {
      setBugEnvError(true);
      return;
    }
    setBugEnvError(false);
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
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      severity: (severity || undefined) as BugSeverity | undefined,
      bugClassification: (bugClassification || undefined) as BugClassification | undefined,
      environment: environment || undefined,
      stepsToRepro: stepsToRepro || undefined,
      bugFlag: (bugFlag || undefined) as BugFlag | undefined,
      bugReproducibility: (bugReproducibility || undefined) as BugReproducibility | undefined,
      bugStatus: (bugStatus || undefined) as BugStatus | undefined,
      module: module || undefined,
      responsibleUserId: responsibleUserId || undefined,
      billingStatus: (type === 'BUG' ? 'NON_BILLABLE' : billingStatus || undefined) as BillingStatus | undefined,
      affectedBuildVersion: affectedBuildVersion || undefined,
      fixedBuildVersion: fixedBuildVersion || undefined,
      reminderType: reminderType || undefined,
      releaseMilestoneId: milestoneLinkId || undefined,
      affectedMilestoneId: affectedMilestoneId || undefined,
    } as Partial<WorkItem>);
  }

  const CREATABLE_TYPES: WorkItemType[] = ['EPIC', 'USER_STORY', 'TASK', 'BUG'];
  const needsParent = ['USER_STORY', 'TASK', 'BUG'].includes(type) && !parentId;
  const cfg = TYPE_CONFIG[type];
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          {/* JIRA-style type selector */}
          <div ref={typeMenuRef} className="relative">
            <button
              onClick={() => !bugOnly && setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${cfg.bg} ${cfg.text} ${bugOnly ? 'cursor-default' : ''}`}
            >
              <TypeIcon type={type} />
              {cfg.label}
              {!bugOnly && (
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-lg border border-[#cccccc] py-1 min-w-[160px] z-10">
                {CREATABLE_TYPES.map((t) => {
                  const tcfg = TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => { setType(t); setShowTypeMenu(false); setAssigneeError(false); setParentError(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-gray-50 transition ${type === t ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${tcfg.bg} ${tcfg.text}`}>
                        <TypeIcon type={t} />
                      </span>
                      {tcfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="text-sm font-semibold text-gray-800">Create Work Item</span>

          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className={labelCls}>Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Work item title…"
              autoFocus
              className={inputCls}
            />
          </div>

          {/* Parent selector */}
          {needsParent && (
            <div>
              <label className={labelCls}>
                Parent <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">
                  {type === 'USER_STORY' && '(Epic)'}
                  {type === 'TASK' && '(Epic / Story)'}
                  {type === 'BUG' && '(Epic / Story / Task)'}
                </span>
              </label>
              {parentOptions.length > 0 ? (
                <div ref={parentMenuRef} className="relative">
                  {/* Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowParentMenu((v) => !v)}
                    className={`${inputCls} flex items-center gap-2 text-left`}
                  >
                    {selectedParentId ? (() => {
                      const p = parentOptions.find((x) => x.id === selectedParentId);
                      if (!p) return <span className="text-gray-400 flex-1">— no parent —</span>;
                      const pcfg = TYPE_CONFIG[p.type];
                      return (
                        <>
                          <span className={`inline-flex items-center justify-center w-4 h-4 rounded shrink-0 ${pcfg.bg} ${pcfg.text}`}>
                            <TypeIcon type={p.type} />
                          </span>
                          <span className="flex-1 truncate text-gray-800">{p.title}</span>
                        </>
                      );
                    })() : <span className="text-gray-400 flex-1">— no parent —</span>}
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown list */}
                  {showParentMenu && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#cccccc] py-1 z-20 max-h-52 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { setSelectedParentId(''); setShowParentMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 transition"
                      >
                        — no parent —
                      </button>
                      {parentOptions.map((p) => {
                        const pcfg = TYPE_CONFIG[p.type];
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setSelectedParentId(p.id); setShowParentMenu(false); setParentError(false); }}
                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-gray-50 transition ${
                              selectedParentId === p.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                            }`}
                          >
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded shrink-0 ${pcfg.bg} ${pcfg.text}`}>
                              <TypeIcon type={p.type} />
                            </span>
                            <span className="flex-1 text-left truncate">{p.title}</span>
                            {selectedParentId === p.id && (
                              <svg className="w-3.5 h-3.5 shrink-0 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                  No eligible parent items found in this project.
                </p>
              )}
              {parentError && (
                <p className="mt-1 text-xs text-red-500">Parent is required. Please select a parent item.</p>
              )}
            </div>
          )}

          {/* Description with RichTextEditor */}
          <div>
            <label className={labelCls}>Description</label>
            <div className="rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-primary-500 overflow-hidden">
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Add a description…"
                minHeight="120px"
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className={labelCls}>Attachments</label>
            <div className="space-y-1.5">
              {pendingFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-xs text-gray-700 flex-1 truncate">{file.name}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50/60 cursor-pointer transition text-xs text-gray-500 hover:text-primary-600">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Attach file
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt,.mp4"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPendingFiles((p) => [...p, f]);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="text-[10px] text-gray-400">PDF, DOCX, XLSX, PNG, JPG, TXT, MP4 · max 10 MB each</p>
            </div>
          </div>

          {/* Core fields grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
            </div>
            {milestones.length > 0 ? (
              <div>
                <label className={labelCls}>Release Milestone</label>
                <select
                  value={milestoneLinkId}
                  onChange={(e) => {
                    const newMid = e.target.value;
                    setMilestoneLinkId(newMid);
                    if (newMid && sprintId) {
                      const sprintStillValid = sprints.some((s) => s.id === sprintId && s.milestoneId === newMid);
                      if (!sprintStillValid) setSprintId('');
                    }
                  }}
                  className={inputCls}
                >
                  <option value="">— none —</option>
                  {milestones.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.description}</option>)}
                </select>
              </div>
            ) : <div />}
            {milestones.length > 0 && (
              <div>
                <label className={labelCls}>Affected Milestone</label>
                <select value={affectedMilestoneId} onChange={(e) => setAffectedMilestoneId(e.target.value)} className={inputCls}>
                  <option value="">— none —</option>
                  {milestones.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.description}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>
                Sprint
                {milestoneLinkId && filteredSprints.length === 0 && (
                  <span className="text-amber-500 font-normal ml-1">(no sprints in this milestone)</span>
                )}
              </label>
              <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className={inputCls}>
                <option value="">{milestoneLinkId ? '— select sprint —' : '— none —'}</option>
                {filteredSprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {members.length > 0 && (
              <div>
                <label className={labelCls}>
                  Assignee
                  {type === 'BUG' && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => { setAssigneeId(e.target.value); if (e.target.value) setAssigneeError(false); }}
                  className={`${inputCls} ${assigneeError ? 'border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
                {assigneeError && <p className="text-xs text-red-500 mt-1">Assignee is required for bugs</p>}
              </div>
            )}
            <div>
              <label className={labelCls}>Start Date <span className="text-red-500">*</span></label>
              <input type="date" value={startDate} min={pastDateStr(5)} max={futureDateStr(10)} onChange={(e) => { setStartDate(e.target.value); setDateError(''); }} className={`${inputCls} ${dateError && !startDate ? 'border-red-500 focus:ring-red-500' : ''}`} />
            </div>
            <div>
              <label className={labelCls}>Due Date <span className="text-red-500">*</span></label>
              <input type="date" value={dueDate} min={pastDateStr(5)} max={futureDateStr(10)} onChange={(e) => { setDueDate(e.target.value); setDateError(''); }} className={`${inputCls} ${dateError && !dueDate ? 'border-red-500 focus:ring-red-500' : ''}`} />
            </div>
            {dateError && (
              <div className="col-span-2">
                <p className="text-xs text-red-500">{dateError}</p>
              </div>
            )}
            <div>
              <label className={labelCls}>Story Points</label>
              <input type="number" min={0} value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                Est. Hours {type !== 'EPIC' && <span className="text-red-500">*</span>}
                {type === 'EPIC' && <span className="text-gray-400 font-normal">(optional)</span>}
              </label>
              <input
                type="number" min={0} step={0.5} value={estimatedHours}
                onChange={(e) => { setEstimatedHours(e.target.value); if (e.target.value) setEstHoursError(false); }}
                className={`${inputCls} ${estHoursError ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {estHoursError && <p className="text-xs text-red-500 mt-1">Estimated hours is required</p>}
            </div>
            <div>
              <label className={labelCls}>Billing <span className="text-red-500">*</span></label>
              {type === 'BUG' ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Non-Billable</span>
                  <span className="text-[10px] text-gray-400">(bugs are always non-billable)</span>
                </div>
              ) : (
                <>
                  <select
                    value={billingStatus}
                    onChange={(e) => { setBillingStatus(e.target.value as BillingStatus); if (e.target.value) setBillingStatusError(false); }}
                    className={`${inputCls} ${billingStatusError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="">— select —</option>
                    <option value="BILLABLE">Billable</option>
                    <option value="NON_BILLABLE">Non-Billable</option>
                  </select>
                  {billingStatusError && <p className="text-xs text-red-500 mt-1">Billing is required</p>}
                </>
              )}
            </div>
          </div>

          {/* Bug-specific fields */}
          {type === 'BUG' && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Bug Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Bug Status</label>
                  <select value={bugStatus} onChange={(e) => setBugStatus(e.target.value as BugStatus)} className={inputCls}>
                    <option value="">— select —</option>
                    {(Object.keys(BUG_STATUS_CONFIG) as BugStatus[]).map((s) => (
                      <option key={s} value={s}>{BUG_STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Severity <span className="text-red-500">*</span></label>
                  <select
                    value={severity}
                    onChange={(e) => { setSeverity(e.target.value as BugSeverity); if (e.target.value) setBugSeverityError(false); }}
                    className={`${inputCls} ${bugSeverityError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="">— select —</option>
                    {(['SHOW_STOPPER', 'BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as BugSeverity[]).map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ').charAt(0) + s.replace(/_/g, ' ').slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                  {bugSeverityError && <p className="text-xs text-red-500 mt-1">Severity is required</p>}
                </div>
                <div>
                  <label className={labelCls}>Classification <span className="text-red-500">*</span></label>
                  <select
                    value={bugClassification}
                    onChange={(e) => { setBugClassification(e.target.value as BugClassification); if (e.target.value) setBugClassificationError(false); }}
                    className={`${inputCls} ${bugClassificationError ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                    <option value="FUNCTIONAL">Functional</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {bugClassificationError && <p className="text-xs text-red-500 mt-1">Classification is required</p>}
                </div>
                <div>
                  <label className={labelCls}>Environment <span className="text-red-500">*</span></label>
                  <select
                    value={bugFlag}
                    onChange={(e) => { setBugFlag(e.target.value as BugFlag); if (e.target.value) setBugEnvError(false); }}
                    className={`${inputCls} ${bugEnvError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="">— select —</option>
                    <option value="INTERNAL">Development</option>
                    <option value="EXTERNAL">Production</option>
                  </select>
                  {bugEnvError && <p className="text-xs text-red-500 mt-1">Environment is required</p>}
                </div>
                <div>
                  <label className={labelCls}>Reproducibility</label>
                  <select value={bugReproducibility} onChange={(e) => setBugReproducibility(e.target.value as BugReproducibility)} className={inputCls}>
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
                  <label className={labelCls}>Reminder</label>
                  <select value={reminderType} onChange={(e) => setReminderType(e.target.value as BugReminderType)} className={inputCls}>
                    <option value="NONE">None</option>
                    <option value="DAILY">Daily</option>
                    <option value="ONE_DAY">1 Day before</option>
                    <option value="TWO_DAYS">2 Days before</option>
                    <option value="THREE_DAYS">3 Days before</option>
                  </select>
                </div>
                {members.length > 0 && (
                  <div>
                    <label className={labelCls}>Responsible Dev</label>
                    <select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} className={inputCls}>
                      <option value="">— select —</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelCls}>Affected Build</label>
                  <input type="text" value={affectedBuildVersion} onChange={(e) => setAffectedBuildVersion(e.target.value)} placeholder="e.g. 1.0.5" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fixed Build</label>
                  <input type="text" value={fixedBuildVersion} onChange={(e) => setFixedBuildVersion(e.target.value)} placeholder="e.g. 1.0.6" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Module</label>
                <input type="text" value={module} onChange={(e) => setModule(e.target.value)} placeholder="e.g. Auth, Dashboard" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Steps to Reproduce</label>
                <textarea
                  value={stepsToRepro}
                  onChange={(e) => setStepsToRepro(e.target.value)}
                  rows={3}
                  placeholder={'1. Go to…\n2. Click…\n3. Observe…'}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || createMut.isPending}
            className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
            {createMut.isPending ? 'Creating…' : 'Create Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
