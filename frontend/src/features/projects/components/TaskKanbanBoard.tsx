import type { Task, TaskPriority, TaskStatus } from '../../../types/task.types';

const COLUMNS: { status: TaskStatus; label: string; headerClass: string }[] = [
  { status: 'NOT_STARTED', label: 'Not Started', headerClass: 'bg-gray-100 text-gray-600' },
  { status: 'IN_PROGRESS', label: 'In Progress', headerClass: 'bg-blue-100 text-blue-700' },
  { status: 'ON_REVIEW',   label: 'On Review',   headerClass: 'bg-yellow-100 text-yellow-700' },
  { status: 'COMPLETED',   label: 'Completed',   headerClass: 'bg-green-100 text-green-700' },
];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW:      'bg-gray-100 text-gray-500',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-600',
};

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskKanbanBoard({ tasks, onTaskClick }: Props) {
  return (
    <div className="flex gap-4 overflow-x-auto p-4 pb-6 min-h-[360px]">
      {COLUMNS.map(({ status, label, headerClass }) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="flex flex-col min-w-[220px] w-[220px] shrink-0">
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${headerClass}`}>
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-xs font-medium opacity-70">{columnTasks.length}</span>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-16 border border-dashed border-gray-200 rounded-lg">
                  <span className="text-xs text-gray-400">No tasks</span>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-primary-400 hover:shadow-sm transition w-full"
                  >
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-2">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-400 mb-2 truncate">{task.taskList.name}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {task.assignedTo?.fullName ?? 'Unassigned'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
