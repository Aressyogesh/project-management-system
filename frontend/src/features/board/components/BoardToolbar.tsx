import type { BoardFiltersQuery } from '../api/boardApi';
import type { BoardStatus, Sprint, TaskPriority, WorkItemType } from '../types/board.types';
import { DEFAULT_BOARD_COLUMNS } from '../types/board.types';

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
  onImportItems?: () => void;
  onManageSprints: () => void;
  onAddMilestone: () => void;
  canManageSprints: boolean;
  canCreateItem?: boolean;
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
}

export function BoardToolbar({
  sprints,
  milestones,
  filters,
  onFiltersChange,
  members,
  onCreateItem,
  onImportItems,
  onManageSprints,
  onAddMilestone,
  canManageSprints,
  canCreateItem = false,
  viewMode,
  onViewModeChange,
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

      {/* Status filter */}
      <select
        value={filters.status ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, status: (e.target.value as BoardStatus) || undefined })}
        className={selectClass}
      >
        <option value="">All Statuses</option>
        {DEFAULT_BOARD_COLUMNS.map((col) => (
          <option key={col.status} value={col.status}>{col.label}</option>
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
          placeholder="Search title or ID…"
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

      {/* View mode toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => onViewModeChange('kanban')}
          title="Kanban view"
          className={`px-2.5 py-1.5 transition ${viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          title="List view"
          className={`px-2.5 py-1.5 border-l border-gray-200 transition ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Add Milestone */}
      {canManageSprints && (
        <button
          onClick={onAddMilestone}
          className="flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900 px-3 py-1.5 border border-violet-200 rounded-lg hover:bg-violet-50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 21V4M4 4h14l-4 5.5 4 5.5H4" />
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

      {/* Import Items — PM / Admin / Super only */}
      {canCreateItem && onImportItems && (
        <button
          onClick={onImportItems}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import
        </button>
      )}

      {/* Create Item — PM / Admin / Super only */}
      {canCreateItem && (
        <button
          onClick={onCreateItem}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create
        </button>
      )}
    </div>
  );
}
