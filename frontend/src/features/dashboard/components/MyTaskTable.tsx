import { MyTask, TaskPriority, TaskStatus } from '../../../types/dashboard.types';

interface MyTaskTableProps {
  tasks: MyTask[];
}

const priorityStyle: Record<TaskPriority, string> = {
  LOW:      'text-gray-600 bg-gray-100',
  MEDIUM:   'text-amber-700 bg-amber-100',
  HIGH:     'text-orange-700 bg-orange-100',
  CRITICAL: 'text-red-700 bg-red-100',
};

const statusStyle: Record<TaskStatus, string> = {
  NOT_STARTED: 'text-gray-600 bg-gray-100',
  IN_PROGRESS: 'text-blue-700 bg-blue-100',
  ON_REVIEW:   'text-amber-700 bg-amber-100',
  COMPLETED:   'text-green-700 bg-green-100',
};

const statusLabel: Record<TaskStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  ON_REVIEW:   'On Review',
  COMPLETED:   'Completed',
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatDue(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs text-primary-700 font-semibold shrink-0">
      {initials}
    </div>
  );
}

export function MyTaskTable({ tasks }: MyTaskTableProps) {
  const overdueCount = tasks.filter((t) => isOverdue(t.dueDate)).length;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#cccccc]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800 text-base">Current Tasks</h2>
          {overdueCount > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-3 text-xs font-medium text-gray-400 pr-4">Project Details</th>
              <th className="text-left pb-3 text-xs font-medium text-gray-400 pr-4">Assigned</th>
              <th className="text-left pb-3 text-xs font-medium text-gray-400 pr-4">Due</th>
              <th className="text-left pb-3 text-xs font-medium text-gray-400 pr-4">Priority</th>
              <th className="text-left pb-3 text-xs font-medium text-gray-400">Stage</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm">No tasks assigned yet</span>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const overdue = isOverdue(task.dueDate);
                return (
                  <tr
                    key={task.id}
                    className={`border-b last:border-0 transition-colors ${
                      overdue
                        ? 'border-red-100 bg-red-50/40 hover:bg-red-50'
                        : 'border-gray-50 hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        {overdue && (
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                        )}
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-[160px]">{task.projectName}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{task.taskName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={task.assignee} />
                        <span className="text-xs text-gray-600 truncate max-w-[90px]">{task.assignee}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {task.dueDate ? (
                        <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {formatDue(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${priorityStyle[task.priority]}`}>
                        {task.priority.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[task.status]}`}>
                        {statusLabel[task.status]}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
