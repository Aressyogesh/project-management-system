import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { PRIORITY_CONFIG, TYPE_CONFIG, type WorkItem } from '../types/board.types';
import { TypeBadge } from './TypeBadge';

interface MemberOption { id: string; fullName: string; }

interface Props {
  item: WorkItem;
  index: number;
  members?: MemberOption[];
  onClick: (item: WorkItem) => void;
  onAssigneeChange?: (itemId: string, assigneeId: string | null) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getTotalLoggedHours(item: WorkItem): number {
  if (!item.timesheetEntries) return 0;
  return item.timesheetEntries.reduce((sum, e) => sum + Number(e.hours), 0);
}

export function WorkItemCard({ item, index, members = [], onClick, onAssigneeChange }: Props) {
  const priority = PRIORITY_CONFIG[item.priority];
  const loggedHours = getTotalLoggedHours(item);
  const childCount = item._count?.children ?? item.children?.length ?? 0;
  const commentCount = item._count?.comments ?? item.comments?.length ?? 0;

  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleOutside(e: MouseEvent) {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMenu]);

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
            className={`bg-white border rounded-lg p-3 cursor-pointer transition-all select-none ${
              snapshot.isDragging
                ? 'shadow-lg border-primary-400 rotate-1'
                : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
            }`}
          >
            {/* Parent breadcrumb */}
            {item.parent && (
              <div className="flex items-center gap-1 mb-1.5 -mt-0.5">
                <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${TYPE_CONFIG[item.parent.type].bg} ${TYPE_CONFIG[item.parent.type].text}`}>
                  {TYPE_CONFIG[item.parent.type].label}
                </span>
                <span className="text-[9px] text-gray-400 truncate max-w-[120px]">{item.parent.title}</span>
              </div>
            )}

            {/* Type badge + priority */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <TypeBadge type={item.type} />
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priority.bg} ${priority.text}`}>
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

            {/* Footer: logged hours, children count, assignee */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2">
                {loggedHours > 0 && (
                  <span className="text-[10px] text-gray-400">{loggedHours}h logged</span>
                )}
                {childCount > 0 && (
                  <span className="text-[10px] text-gray-400">{childCount} sub</span>
                )}
                {commentCount > 0 && (
                  <span className="text-[10px] text-gray-400">💬 {commentCount}</span>
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
                  <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center ring-2 ring-transparent hover:ring-primary-300 transition">
                    {item.assignee.profilePhoto ? (
                      <img
                        src={item.assignee.profilePhoto}
                        alt={item.assignee.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-[9px] font-bold">
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
          className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[190px] max-h-72 overflow-y-auto"
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
