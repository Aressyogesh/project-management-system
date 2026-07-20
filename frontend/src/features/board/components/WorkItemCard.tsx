import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { PRIORITY_CONFIG, TYPE_CONFIG, type WorkItem } from '../types/board.types';
import { UserAvatar } from '../../../components/shared/UserAvatar';

interface MemberOption { id: string; fullName: string; }

interface Props {
  item: WorkItem;
  index: number;
  members?: MemberOption[];
  onClick: (item: WorkItem) => void;
  onAssigneeChange?: (itemId: string, assigneeId: string | null) => void;
  onDelete?: (itemId: string) => void;
}

const BUG_CLASS_LABELS: Record<string, string> = {
  SECURITY:      'Security',
  CRASH_HANG:    'Crash/Hang',
  DATA_LOSS:     'Data Loss',
  PERFORMANCE:   'Performance',
  UI_USABILITY:  'UI/UX',
  OTHER_BUG:     'Other Bug',
  OTHER:         'Other',
  FEATURE_NEW:   'New Feature',
  ENHANCEMENT:   'Enhancement',
  DESIGN:        'Design',
  NEW_BUG:       'New Bug',
  CODE_REVIEW:   'Code Review',
  UNIT_TESTING:  'Unit Testing',
  SUGGESTION:    'Suggestion',
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getTotalLoggedHours(item: WorkItem): number {
  if (!item.timesheetEntries) return 0;
  return item.timesheetEntries.reduce((sum, e) => sum + Number(e.hours), 0);
}

function getAge(createdAt: string, completedAt?: string | null): string {
  const end  = completedAt ? new Date(completedAt).getTime() : Date.now();
  const days = Math.floor((end - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  return `${days}d`;
}

export function WorkItemCard({ item, index, members = [], onClick, onAssigneeChange, onDelete }: Props) {
  const priority = PRIORITY_CONFIG[item.priority];
  const loggedHours = getTotalLoggedHours(item);
  const childCount = item._count?.children ?? item.children?.length ?? 0;
  const commentCount = item._count?.comments ?? item.comments?.length ?? 0;

  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showCtxMenu, setShowCtxMenu] = useState(false);
  const [ctxPos, setCtxPos] = useState({ top: 0, right: 0 });
  const ctxTriggerRef = useRef<HTMLButtonElement>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu && !showCtxMenu) return;
    function handleOutside(e: MouseEvent) {
      if (showMenu && !menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (showCtxMenu && !ctxMenuRef.current?.contains(e.target as Node) && !ctxTriggerRef.current?.contains(e.target as Node)) {
        setShowCtxMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMenu, showCtxMenu]);

  function handleCtxMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (ctxTriggerRef.current) {
      const rect = ctxTriggerRef.current.getBoundingClientRect();
      setCtxPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowCtxMenu((v) => !v);
  }

  function copyItemId(e: React.MouseEvent) {
    e.stopPropagation();
    if (item.displayId) navigator.clipboard.writeText(item.displayId).catch(() => {});
    setShowCtxMenu(false);
  }

  function handleViewDetails(e: React.MouseEvent) {
    e.stopPropagation();
    setShowCtxMenu(false);
    onClick(item);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setShowCtxMenu(false);
    onDelete?.(item.id);
  }

  function handleAssigneeClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onAssigneeChange || members.length === 0) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setShowMenu((v) => !v);
  }

  function selectMember(e: React.MouseEvent, memberId: string | null) {
    e.stopPropagation();
    setShowMenu(false);
    onAssigneeChange?.(item.id, memberId);
  }

  return (
    <>
      <Draggable draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onClick(item)}
            title={TYPE_CONFIG[item.type].label}
            style={{ ...provided.draggableProps.style, borderLeftColor: TYPE_CONFIG[item.type].color }}
            className={`group relative bg-white border border-l-4 rounded-lg p-3 cursor-pointer transition-all select-none ${
              snapshot.isDragging
                ? 'shadow-lg rotate-1'
                : 'border-[#cccccc] hover:border-primary-300 hover:shadow-sm'
            }`}
          >
            {/* ⋯ button — absolute top-right corner */}
            <button
              ref={ctxTriggerRef}
              onClick={handleCtxMenu}
              title="More actions"
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-opacity leading-none z-10"
            >
              ⋯
            </button>

            {/* Parent breadcrumb */}
            {item.parent && (
              <div className="flex items-center gap-1 mb-1.5 -mt-0.5">
                <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${TYPE_CONFIG[item.parent.type].bg} ${TYPE_CONFIG[item.parent.type].text}`}>
                  {TYPE_CONFIG[item.parent.type].label}
                </span>
                <span className="text-[9px] text-gray-400 truncate max-w-[120px]">{item.parent.title}</span>
              </div>
            )}

            {/* Type label + DisplayId + Priority */}
            <div className="flex items-center justify-between gap-2 mb-1.5 pr-5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide shrink-0"
                  style={{ color: TYPE_CONFIG[item.type].color }}
                >
                  {TYPE_CONFIG[item.type].label}
                </span>
                {item.displayId && (
                  <span className="text-[9px] font-mono text-gray-400 truncate">#{item.displayId}</span>
                )}
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${priority.bg} ${priority.text}`}>
                {priority.label}
              </span>
            </div>

            {/* Title */}
            <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-2 leading-snug">
              {item.title}
            </p>

            {/* Story points */}
            {item.storyPoints != null && (
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                  {item.storyPoints} pts
                </span>
              </div>
            )}

            {/* Labels */}
            {item.labels && item.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {item.labels.map((label) => (
                  <span
                    key={label}
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Dates + Age */}
            {(item.startDate || item.dueDate || item.createdAt) && (
              <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-400">
                {item.startDate && (
                  <span>{new Date(item.startDate.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                )}
                {item.startDate && item.dueDate && <span>→</span>}
                {item.dueDate && (
                  <span className={new Date(item.dueDate.slice(0, 10)) < new Date() && item.status !== 'QA_DONE' ? 'text-red-500 font-medium' : ''}>
                    {new Date(item.dueDate.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                )}
                {(item.startDate || item.dueDate) && <span className="text-gray-300">·</span>}
                <span>Age: {getAge(item.createdAt, item.completedAt)}</span>
              </div>
            )}

            {/* Bug classification */}
            {item.type === 'BUG' && item.bugClassification && (
              <div className="mb-2">
                <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                  {BUG_CLASS_LABELS[item.bugClassification] ?? item.bugClassification}
                </span>
              </div>
            )}

            {/* Est. hours · Logged hours — same line */}
            {(item.estimatedHours != null || loggedHours > 0) && (
              <div className="text-[10px] text-gray-400 mb-2 flex items-center gap-1.5">
                {item.estimatedHours != null && (
                  <span>Est. {Number(item.estimatedHours)}h</span>
                )}
                {item.estimatedHours != null && loggedHours > 0 && (
                  <span className="text-gray-300">·</span>
                )}
                {loggedHours > 0 && (
                  <span>{loggedHours}h logged</span>
                )}
              </div>
            )}

            {/* Footer: children, comments, PR link, assignee */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2">
                {childCount > 0 && (
                  <span className="text-[10px] text-gray-400">{childCount} sub</span>
                )}
                {commentCount > 0 && (
                  <span className="text-[10px] text-gray-400">💬 {commentCount}</span>
                )}
                {item.prUrl && (
                  <a
                    href={item.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title={`PR #${item.prNumber}${item.prTitle ? ` — ${item.prTitle}` : ''}`}
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                      item.prState === 'merged'
                        ? 'bg-purple-100 text-purple-700'
                        : item.prState === 'closed'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
                    </svg>
                    PR #{item.prNumber}
                  </a>
                )}
              </div>

              {/* Assignee trigger */}
              <button
                ref={triggerRef}
                onClick={handleAssigneeClick}
                title={item.assignee ? `${item.assignee.fullName} — click to reassign` : 'Unassigned — click to assign'}
                className="shrink-0 focus:outline-none"
              >
                {item.assignee ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="ring-2 ring-transparent hover:ring-primary-300 transition rounded-full">
                      <UserAvatar
                        name={item.assignee.fullName}
                        photo={item.assignee.profilePhoto}
                        size="card"
                      />
                    </div>
                    {item.assignee.profilePhoto && (
                      <span className="text-[8px] text-gray-400 font-medium leading-none">
                        {getInitials(item.assignee.fullName)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400 hover:text-primary-600 transition">
                    Unassigned
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </Draggable>

      {/* 3-dot context menu */}
      {showCtxMenu && createPortal(
        <div
          ref={ctxMenuRef}
          style={{ position: 'fixed', top: ctxPos.top, right: ctxPos.right, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-xl border border-[#cccccc] py-1 min-w-[160px]"
        >
          {item.displayId && (
            <button
              onClick={copyItemId}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy ID ({item.displayId})
            </button>
          )}
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
          {onDelete && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>,
        document.body,
      )}

      {/* Portal dropdown — rendered in document.body to escape overflow clipping */}
      {showMenu && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            bottom: menuPos.bottom,
            right: menuPos.right,
            zIndex: 9999,
          }}
          className="bg-white rounded-xl shadow-xl border border-[#cccccc] py-1 min-w-[190px] max-h-72 overflow-y-auto"
        >
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-1.5 border-b border-gray-100">
            Assign to
          </p>
          {item.assignee && (
            <button
              onClick={(e) => selectMember(e, null)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition"
            >
              <span className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400 shrink-0">
                —
              </span>
              Unassign
            </button>
          )}
          {members.map((m) => (
            <button
              key={m.id}
              onClick={(e) => selectMember(e, m.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs hover:bg-gray-50 transition ${
                item.assignee?.id === m.id ? 'font-semibold text-primary-700' : 'text-gray-700'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                {getInitials(m.fullName)}
              </span>
              <span className="flex-1 text-left">{m.fullName}</span>
              {item.assignee?.id === m.id && (
                <svg className="w-3 h-3 shrink-0 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
