import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WorkItem } from '../types/board.types';

interface Column {
  status: string;
  label: string;
  items: WorkItem[];
}

interface MemberOption { id: string; fullName: string; }

interface Props {
  columns: Column[];
  onCardClick: (item: WorkItem) => void;
  onDelete?: (itemId: string) => void;
  canReassign?: boolean;
  members?: MemberOption[];
  onAssigneeChange?: (itemId: string, assigneeId: string | null) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const TYPE_STYLES: Record<string, string> = {
  EPIC:       'bg-purple-100 text-purple-700',
  USER_STORY: 'bg-blue-100 text-blue-700',
  TASK:       'bg-green-100 text-green-700',
  SUB_TASK:   'bg-gray-100 text-gray-600',
  BUG:        'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  EPIC:       'Epic',
  USER_STORY: 'Story',
  TASK:       'Task',
  SUB_TASK:   'Sub-Task',
  BUG:        'Bug',
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-yellow-400',
  LOW:      'bg-gray-400',
};

const STATUS_STYLES: Record<string, string> = {
  TODO:         'bg-gray-100 text-gray-600',
  IN_PROGRESS:  'bg-blue-100 text-blue-700',
  BLOCKED:      'bg-red-100 text-red-700',
  IN_REVIEW:    'bg-amber-100 text-amber-700',
  READY_FOR_QA: 'bg-yellow-100 text-yellow-700',
  IN_QA:        'bg-violet-100 text-violet-700',
  QA_DONE:      'bg-teal-100 text-teal-700',
  CLOSED:       'bg-emerald-100 text-emerald-700',
};

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function ListView({ columns, onCardClick, onDelete, canReassign, members = [], onAssigneeChange }: Props) {
  const [reassignOpenId, setReassignOpenId] = useState<string | null>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reassignOpenId) return;
    function handleOutside(e: MouseEvent) {
      if (!dropRef.current?.contains(e.target as Node)) setReassignOpenId(null);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [reassignOpenId]);

  function openReassign(e: React.MouseEvent, itemId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left });
    setReassignOpenId((id) => (id === itemId ? null : itemId));
  }

  function selectAssignee(e: React.MouseEvent, itemId: string, assigneeId: string | null) {
    e.stopPropagation();
    setReassignOpenId(null);
    onAssigneeChange?.(itemId, assigneeId);
  }
  const items = columns.flatMap((col) =>
    col.items.map((item) => ({ ...item, _columnLabel: col.label })),
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-gray-100 shadow-sm gap-2">
        <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm text-gray-400">No work items assigned to you match the current filters.</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Start Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Assignee</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Est. Hrs</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">SP</th>
              {onDelete && <th className="w-10 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const isOverdue =
                item.dueDate &&
                new Date(item.dueDate.slice(0, 10) + 'T00:00:00') < today &&
                item.status !== 'QA_DONE' &&
                item.status !== 'CLOSED';

              return (
                <tr
                  key={item.id}
                  onClick={() => onCardClick(item)}
                  className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                >
                  {/* ID */}
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                    {item.displayId ?? item.id.slice(0, 8)}
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3 max-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                    {item.parent && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">↳ {item.parent.title}</p>
                    )}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_STYLES[item.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {item._columnLabel}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[item.priority] ?? 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-600">
                        {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </td>

                  {/* Start Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.startDate
                      ? <span className="text-xs text-gray-600">{fmtDate(item.startDate)}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.dueDate ? (
                      <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {fmtDate(item.dueDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {canReassign ? (
                      <button
                        onClick={(e) => openReassign(e, item.id)}
                        title={item.assignee ? `${item.assignee.fullName} — click to reassign` : 'Unassigned — click to assign'}
                        className="flex items-center gap-1.5 hover:opacity-80 transition"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0 ring-2 ring-transparent hover:ring-primary-300 transition">
                          <span className="text-white text-[9px] font-semibold">
                            {item.assignee ? getInitials(item.assignee.fullName) : '?'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-700 truncate max-w-[80px]">
                          {item.assignee ? item.assignee.fullName.split(' ')[0] : <span className="text-gray-300">Unassigned</span>}
                        </span>
                      </button>
                    ) : item.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                          <span className="text-white text-[9px] font-semibold">{getInitials(item.assignee.fullName)}</span>
                        </div>
                        <span className="text-xs text-gray-700 truncate max-w-[90px]">{item.assignee.fullName.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Estimated Hours */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-xs text-gray-600">
                      {item.estimatedHours != null ? `${item.estimatedHours}h` : '—'}
                    </span>
                  </td>

                  {/* Story Points */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-xs font-medium text-gray-600">
                      {item.storyPoints ?? '—'}
                    </span>
                  </td>

                  {/* Delete */}
                  {onDelete && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDelete(item.id)}
                        title="Delete"
                        className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/40">
        <p className="text-[10px] text-gray-400">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>

    {/* Reassign dropdown portal */}
    {reassignOpenId && createPortal(
      <div
        ref={dropRef}
        style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
        className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[190px] max-h-72 overflow-y-auto"
      >
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-1.5 border-b border-gray-100">
          Assign to
        </p>
        {items.find((i) => i.id === reassignOpenId)?.assignee && (
          <button
            onClick={(e) => selectAssignee(e, reassignOpenId, null)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition"
          >
            <span className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">—</span>
            Unassign
          </button>
        )}
        {members.map((m) => {
          const currentAssignee = items.find((i) => i.id === reassignOpenId)?.assignee;
          return (
            <button
              key={m.id}
              onClick={(e) => selectAssignee(e, reassignOpenId, m.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs hover:bg-gray-50 transition ${
                currentAssignee?.id === m.id ? 'font-semibold text-primary-700' : 'text-gray-700'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                {getInitials(m.fullName)}
              </span>
              <span className="flex-1 text-left">{m.fullName}</span>
              {currentAssignee?.id === m.id && (
                <svg className="w-3 h-3 shrink-0 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>,
      document.body,
    )}
    </>
  );
}
