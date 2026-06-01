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

interface Milestone {
  id: string;
  name: string | null;
  description: string;
}

interface Member {
  id: string;
  fullName: string;
}

interface Props {
  sprints: Sprint[];
  milestones: Milestone[];
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
  milestones,
  filters,
  onFiltersChange,
  members,
  onCreateItem,
  onManageSprints,
  onAddMilestone,
  canManageSprints,
}: Props) {
  const hasFilters = !!(
    filters.type || filters.assigneeId || filters.priority ||
    filters.search || filters.sprintId || filters.milestoneId || filters.backlog
  );

  const selectClass =
    'text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700';

  // Filter sprints by selected milestone (if any)
  const visibleSprints = filters.milestoneId
    ? sprints.filter((s) => s.milestoneId === filters.milestoneId)
    : sprints;

  function handleMilestoneChange(milestoneId: string) {
    onFiltersChange({
      ...filters,
      milestoneId: milestoneId || undefined,
      // Clear sprint if it doesn't belong to the new milestone
      sprintId: milestoneId
        ? (sprints.find((s) => s.id === filters.sprintId && s.milestoneId === milestoneId) ? filters.sprintId : undefined)
        : filters.sprintId,
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Backlog toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        <button
          onClick={() => onFiltersChange({ ...filters, backlog: undefined })}
          className={`px-3 py-1.5 font-medium transition ${
            !filters.backlog ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => {
            const active = sprints.find((s) => s.isActive);
            onFiltersChange({ ...filters, backlog: 'sprint', sprintId: active?.id });
          }}
          className={`px-3 py-1.5 font-medium border-l border-gray-200 transition ${
            filters.backlog === 'sprint' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Sprint Backlog
        </button>
        <button
          onClick={() => onFiltersChange({ ...filters, backlog: 'product', sprintId: undefined })}
          title="Work items not yet assigned to any sprint"
          className={`px-3 py-1.5 font-medium border-l border-gray-200 transition ${
            filters.backlog === 'product' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Product Backlog
        </button>
      </div>

      {/* Milestone filter */}
      <select
        value={filters.milestoneId ?? ''}
        onChange={(e) => handleMilestoneChange(e.target.value)}
        className={selectClass}
      >
        <option value="">All Milestones</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name ?? m.description.slice(0, 30)}
          </option>
        ))}
      </select>

      {/* Sprint selector */}
      <select
        value={filters.sprintId ?? ''}
        onChange={(e) => onFiltersChange({
          ...filters,
          sprintId: e.target.value || undefined,
          backlog: filters.backlog === 'sprint' ? 'sprint' : undefined,
        })}
        className={selectClass}
        disabled={filters.backlog === 'product'}
      >
        <option value="">All Sprints</option>
        {visibleSprints.map((s) => (
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
