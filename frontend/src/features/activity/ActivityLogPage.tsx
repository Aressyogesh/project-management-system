import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { UserAvatar } from '../../components/shared/UserAvatar';
import { auditLogsApi, type AuditAction, type AuditEntity, type AuditLogEntry } from '../../api/auditLogsApi';
import type { Project } from '../../types/projects.types';
import { projectsApi } from '../../api/projects.api';
import { useAuthStore } from '../../store/authStore';

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: 'logged in',
  WORK_ITEM_CREATED: 'created work item',
  WORK_ITEM_UPDATED: 'updated work item',
  WORK_ITEM_STATUS_CHANGED: 'moved work item',
  WORK_ITEM_DELETED: 'deleted work item',
  WORK_ITEM_ASSIGNED: 'assigned work item',
  SPRINT_CREATED: 'created sprint',
  SPRINT_UPDATED: 'updated sprint',
  SPRINT_ACTIVATED: 'activated sprint',
  SPRINT_DELETED: 'deleted sprint',
  MEMBER_ADDED: 'added member',
  MEMBER_REMOVED: 'removed member',
  MEMBER_ROLE_CHANGED: 'changed member role',
  PROFILE_UPDATED: 'updated profile',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  WORK_ITEM_CREATED: 'bg-emerald-100 text-emerald-700',
  WORK_ITEM_UPDATED: 'bg-amber-100 text-amber-700',
  WORK_ITEM_STATUS_CHANGED: 'bg-purple-100 text-purple-700',
  WORK_ITEM_DELETED: 'bg-red-100 text-red-700',
  WORK_ITEM_ASSIGNED: 'bg-sky-100 text-sky-700',
  SPRINT_CREATED: 'bg-emerald-100 text-emerald-700',
  SPRINT_UPDATED: 'bg-amber-100 text-amber-700',
  SPRINT_ACTIVATED: 'bg-green-100 text-green-700',
  SPRINT_DELETED: 'bg-red-100 text-red-700',
  MEMBER_ADDED: 'bg-indigo-100 text-indigo-700',
  MEMBER_REMOVED: 'bg-red-100 text-red-700',
  MEMBER_ROLE_CHANGED: 'bg-violet-100 text-violet-700',
  PROFILE_UPDATED: 'bg-gray-100 text-gray-700',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


export function ActivityLogPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const [action, setAction] = useState<AuditAction | ''>('');
  const [entity, setEntity] = useState<AuditEntity | ''>('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { action, entity, projectId, startDate, endDate, page }],
    queryFn: () =>
      auditLogsApi.getAll({
        action: action || undefined,
        entity: entity || undefined,
        projectId: projectId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 20,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list(),
    enabled: isAdmin,
  });

  function resetFilters() {
    setAction('');
    setEntity('');
    setProjectId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-4 shrink-0">
        <h1 className="text-base font-semibold text-gray-900 mb-1">Activity Log</h1>
        <p className="text-xs text-gray-400">Track all user actions across the system</p>

        {isAdmin && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value as AuditAction | ''); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">All Actions</option>
              {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>

            <select
              value={entity}
              onChange={(e) => { setEntity(e.target.value as AuditEntity | ''); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">All Entities</option>
              <option value="AUTH">Auth</option>
              <option value="WORK_ITEM">Work Item</option>
              <option value="SPRINT">Sprint</option>
              <option value="PROJECT_MEMBER">Member</option>
              <option value="USER_PROFILE">Profile</option>
            </select>

            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400"
            />

            {(action || entity || projectId || startDate || endDate) && (
              <button
                onClick={resetFilters}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Log feed */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-gray-400">No activity found matching your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {data.data.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition">
                  <UserAvatar name={entry.user.fullName} photo={entry.user.profilePhoto} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900">{entry.user.fullName}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </div>
                    {entry.entityTitle && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{entry.entityTitle}</p>
                    )}
                    {entry.action === 'WORK_ITEM_STATUS_CHANGED' && entry.metadata && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {String(entry.metadata['from'])} → {String(entry.metadata['to'])}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className="text-[10px] text-gray-400 cursor-default"
                      title={new Date(entry.createdAt).toLocaleString()}
                    >
                      {relativeTime(entry.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-400">
                  {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
