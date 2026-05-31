import type { BoardFiltersQuery } from '../api/boardApi';
import type { Sprint, TaskPriority, WorkItemType } from '../types/board.types';

const TYPE_OPTIONS: { value: WorkItemType; label: string }[] = [
  { value: 'EPIC', label: 'Epic' },
  { value: 'USER_STORY', label: 'User Story' },
  { value: 'TASK', label: 'Task' },
  { value: 'SUB_TASK', label: 'Sub Task' },
  { value: 'BUG', label: 'Bug' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

interface Member {
  id: string;
  fullName: string;
}

interface Props {
  sprints: Sprint[];
  filters: BoardFiltersQuery;
  onFiltersChange: (f: BoardFiltersQuery) => void;
  members: Member[];
  onCreateItem: () => void;
  onManageSprints: () => void;
  onAddMilestone: () => void;
  canManageSprints: boolean;
}

export function BoardToolbar({
  sprints,
  filters,
  onFiltersChange,
  members,
  onCreateItem,
  onManageSprints,
  onAddMilestone,
  canManageSprints,
}: Props) {
  const hasFilters = !!(filters.type || filters.assigneeId || filters.priority || filters.search || filters.sprintId);

  const selectClass =
    'text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Sprint selector */}
      <select
        value={filters.sprintId ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, sprintId: e.target.value || undefined })}
        className={selectClass}
      >
        <option value="">All Sprints</option>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}{s.isActive ? ' ★' : ''}
          </option>
        ))}
      </select>

      {/* Type filter */}
      <select
        value={filters.type ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, type: (e.target.value as WorkItemType) || undefined })}
        className={selectClass}
      >
        <option value="">All Types</option>
        {TYPE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Assignee filter */}
      <select
        value={filters.assigneeId ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, assigneeId: e.target.value || undefined })}
        className={selectClass}
      >
        <option value="">All Assignees</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.fullName}</option>
        ))}
      </select>

      {/* Priority filter */}
      <select
        value={filters.priority ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value || undefined })}
        className={selectClass}
      >
        <option value="">All Priorities</option>
        {PRIORITY_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search items…"
          value={filters.search ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="text-xs border border-gray-200 rounded-lg pl-7 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-36 text-gray-700"
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => onFiltersChange({})}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
        >
          Clear
        </button>
      )}

      <div className="flex-1" />

      {/* Add Milestone */}
      {canManageSprints && (
        <button
          onClick={onAddMilestone}
          className="flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900 px-3 py-1.5 border border-violet-200 rounded-lg hover:bg-violet-50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21l9-18 9 18M6.5 15h11" />
          </svg>
          Milestone
        </button>
      )}

      {/* Manage Sprints */}
      {canManageSprints && (
        <button
          onClick={onManageSprints}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Sprints
        </button>
      )}

      {/* Create Item */}
      <button
        onClick={onCreateItem}
        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create
      </button>
    </div>
  );
}
