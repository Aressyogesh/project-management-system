import { Draggable } from '@hello-pangea/dnd';
import { PRIORITY_CONFIG, type WorkItem } from '../types/board.types';
import { TypeBadge } from './TypeBadge';

interface Props {
  item: WorkItem;
  index: number;
  onClick: (item: WorkItem) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getTotalLoggedHours(item: WorkItem): number {
  if (!item.timesheetEntries) return 0;
  return item.timesheetEntries.reduce((sum, e) => sum + Number(e.hours), 0);
}

export function WorkItemCard({ item, index, onClick }: Props) {
  const priority = PRIORITY_CONFIG[item.priority];
  const loggedHours = getTotalLoggedHours(item);
  const childCount = item._count?.children ?? item.children?.length ?? 0;
  const commentCount = item._count?.comments ?? item.comments?.length ?? 0;

  return (
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

          {/* Footer: logged hours, children count, assignee */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              {loggedHours > 0 && (
                <span className="text-[10px] text-gray-400">
                  {loggedHours}h logged
                </span>
              )}
              {childCount > 0 && (
                <span className="text-[10px] text-gray-400">{childCount} sub</span>
              )}
              {commentCount > 0 && (
                <span className="text-[10px] text-gray-400">💬 {commentCount}</span>
              )}
            </div>

            {item.assignee ? (
              <div
                className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0"
                title={item.assignee.fullName}
              >
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
              <span className="text-[10px] text-gray-400">Unassigned</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
