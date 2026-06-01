import { Droppable } from '@hello-pangea/dnd';
import type { WorkItem } from '../types/board.types';
import { WorkItemCard } from './WorkItemCard';

interface MemberOption { id: string; fullName: string; }

interface Props {
  status: string;
  label: string;
  headerClass: string;
  items: WorkItem[];
  members?: MemberOption[];
  onCardClick: (item: WorkItem) => void;
  onAssigneeChange?: (itemId: string, assigneeId: string | null) => void;
}

export function KanbanColumn({ status, label, headerClass, items, members, onCardClick, onAssigneeChange }: Props) {
  return (
    <div className="flex flex-col min-w-[240px] w-[240px] shrink-0 h-full">
      {/* Column header — fixed, does not scroll with cards */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 shrink-0 ${headerClass}`}>
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-xs font-medium opacity-70 bg-white/40 px-1.5 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      {/* Droppable zone — scrolls vertically */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 flex-1 overflow-y-auto rounded-lg p-1 transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary-50' : ''
            }`}
          >
            {items.length === 0 && !snapshot.isDraggingOver ? (
              <div className="flex items-center justify-center h-20 border border-dashed border-gray-200 rounded-lg">
                <span className="text-xs text-gray-400">No items</span>
              </div>
            ) : (
              items.map((item, index) => (
                <WorkItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  members={members}
                  onClick={onCardClick}
                  onAssigneeChange={onAssigneeChange}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
