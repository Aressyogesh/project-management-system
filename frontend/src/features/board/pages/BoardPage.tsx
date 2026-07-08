import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { milestonesApi } from '../../../api/milestones.api';
import { projectsApi } from '../../../api/projects.api';
import { boardColumnConfigsApi, type BoardColumnConfigDto } from '../../../api/boardColumnConfigs.api';
import { useAuthStore } from '../../../store/authStore';
import { MilestoneFormModal } from '../../projects/components/MilestoneFormModal';
import { boardApi } from '../api/boardApi';
import type { BoardFiltersQuery } from '../api/boardApi';
import { BoardToolbar } from '../components/BoardToolbar';
import { KanbanColumn } from '../components/KanbanColumn';
import { ListView } from '../components/ListView';
import { SprintManager } from '../components/SprintManager';
import { CreateWorkItemModal, WorkItemModal } from '../components/WorkItemModal';
import { ImportWorkItemsModal } from '../components/ImportWorkItemsModal';
import { useBoard } from '../hooks/useBoard';
import { useSprints } from '../hooks/useSprints';
import type { BoardStatus, WorkItem } from '../types/board.types';
import { DEFAULT_BOARD_COLUMNS } from '../types/board.types';

function EditColumnLabelsModal({
  projectId,
  currentLabels,
  onClose,
  onSaved,
}: {
  projectId: string;
  currentLabels: BoardColumnConfigDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [labels, setLabels] = useState<BoardColumnConfigDto[]>(currentLabels);

  const saveMut = useMutation({
    mutationFn: () => boardColumnConfigsApi.upsertMany(projectId, labels),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-column-configs', projectId] });
      onSaved();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Edit Column Labels</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {labels.map((col, i) => (
            <div key={col.status} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-28 shrink-0">{DEFAULT_BOARD_COLUMNS.find((c) => c.status === col.status)?.label ?? col.status}</span>
              <input
                type="text"
                value={col.label}
                onChange={(e) => {
                  const next = [...labels];
                  next[i] = { ...next[i], label: e.target.value };
                  setLabels(next);
                }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary-400"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {saveMut.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BoardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<BoardFiltersQuery>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  function handleViewModeChange(mode: 'kanban' | 'list') {
    setViewMode(mode);
  }
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSprintManager, setShowSprintManager] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showEditLabels, setShowEditLabels] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const qc = useQueryClient();
  const { columns: rawColumns, move } = useBoard(projectId!, filters);
  const { sprints, activeSprint } = useSprints(projectId!);

  const assignMut = useMutation({
    mutationFn: ({ itemId, assigneeId }: { itemId: string; assigneeId: string | null }) =>
      boardApi.updateWorkItem(itemId, { assigneeId: assigneeId ?? undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', projectId] }),
  });

  const deleteMut = useMutation({
    mutationFn: (itemId: string) => boardApi.deleteWorkItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] });
      setToast('Item deleted');
    },
    onError: () => setToast('Failed to delete item'),
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.listMembers(projectId!),
    enabled: !!projectId,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId!),
    enabled: !!projectId,
  });

  const { data: savedConfigs = [] } = useQuery({
    queryKey: ['board-column-configs', projectId],
    queryFn: () => boardColumnConfigsApi.getByProject(projectId!),
    enabled: !!projectId,
  });

  // Merge saved custom labels into the default columns
  const columns = useMemo(() => {
    const customMap = new Map(savedConfigs.map((c) => [c.status, c.label]));
    return rawColumns.map((col) => ({
      ...col,
      label: customMap.get(col.status as BoardStatus) ?? col.label,
    }));
  }, [rawColumns, savedConfigs]);

  // Build the label list for the edit modal (default label → current custom or default)
  const editableLabels: BoardColumnConfigDto[] = useMemo(() => {
    const customMap = new Map(savedConfigs.map((c) => [c.status, c.label]));
    return DEFAULT_BOARD_COLUMNS.map((col) => ({
      status: col.status as BoardStatus,
      label: customMap.get(col.status as BoardStatus) ?? col.label,
    }));
  }, [savedConfigs]);

  const systemRole = user?.systemRole;
  const myProjectRole = members.find((m) => m.user.id === user?.id)?.projectRole;
  const isAdminOrSuper = systemRole === 'SUPER_USER' || systemRole === 'ADMIN' || systemRole === 'BU_HEAD';

  const isMgmt = myProjectRole === 'PROJECT_MANAGER' || myProjectRole === 'TEAM_LEAD' || user?.hasManagementRole === true;

  const canManageSprints  = isAdminOrSuper || isMgmt;
  const canDeleteWorkItem = isAdminOrSuper || isMgmt;
  const canChangeBilling  = isAdminOrSuper || myProjectRole === 'PROJECT_MANAGER';
  const canEditSidebar    = isAdminOrSuper || myProjectRole === 'PROJECT_MANAGER';
  const canEditColumns    = isAdminOrSuper || isMgmt;
  const canCreateItem     = isAdminOrSuper || !!myProjectRole;
  const bugOnly           = canCreateItem && !canEditSidebar;
  const canAddChild       = canEditSidebar || myProjectRole === 'QA';

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleOpenChild(childId: string) {
    const child = await boardApi.getWorkItem(childId);
    setSelectedItem(child);
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as BoardStatus;
    try {
      await move.mutateAsync({ id: draggableId, status: newStatus, position: destination.index });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to move item';
      setToast(msg);
    }
  }

  const memberOptions = members.map((m) => ({ id: m.user.id, fullName: m.user.fullName, profilePhoto: m.user.profilePhoto }));

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Link to="/projects" className="text-xs text-gray-400 hover:text-primary-600 transition">Projects</Link>
          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs text-gray-500">{project?.name ?? '…'}</span>
          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-medium text-gray-700">Board</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-900">
              {project?.name ?? 'Loading…'}
            </h1>
            {activeSprint && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {activeSprint.name} · Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Edit column labels button — PM / TL only */}
            {canEditColumns && (
              <button
                onClick={() => setShowEditLabels(true)}
                title="Edit column labels"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Columns
              </button>
            )}

            <Link
              to={`/projects/${projectId}`}
              className="text-xs text-gray-500 hover:text-primary-600 transition flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Project Details
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-3">
          <BoardToolbar
            sprints={sprints}
            milestones={milestones}
            filters={filters}
            onFiltersChange={setFilters}
            members={memberOptions}
            onCreateItem={() => setShowCreate(true)}
            onImportItems={canEditSidebar ? () => setShowImport(true) : undefined}
            canCreateItem={canCreateItem}
            onManageSprints={() => setShowSprintManager(true)}
            onAddMilestone={() => setShowMilestoneModal(true)}
            canManageSprints={canManageSprints}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-auto min-h-0 pb-4">
        {viewMode === 'list' ? (
          <ListView
            columns={columns}
            onCardClick={setSelectedItem}
            onDelete={canDeleteWorkItem ? (itemId) => deleteMut.mutate(itemId) : undefined}
            canReassign={isAdminOrSuper || myProjectRole === 'PROJECT_MANAGER'}
            members={memberOptions}
            onAssigneeChange={(itemId, assigneeId) => assignMut.mutate({ itemId, assigneeId })}
          />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 items-stretch min-h-[500px] px-1">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.status}
                  status={col.status}
                  label={col.label}
                  headerClass={col.headerClass}
                  items={col.items}
                  members={memberOptions}
                  onCardClick={setSelectedItem}
                  onAssigneeChange={(itemId, assigneeId) => assignMut.mutate({ itemId, assigneeId })}
                  onDelete={canDeleteWorkItem ? (itemId) => deleteMut.mutate(itemId) : undefined}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Modals */}
      {selectedItem && (
        <WorkItemModal
          item={selectedItem}
          sprints={sprints}
          members={memberOptions}
          milestones={milestones}
          canDelete={canDeleteWorkItem}
          canChangeBilling={canChangeBilling}
          canEditSidebar={canEditSidebar}
          canAddChild={canAddChild}
          onClose={() => setSelectedItem(null)}
          onSaved={() => setSelectedItem(null)}
          onSuccess={setToast}
          onOpenChild={handleOpenChild}
        />
      )}

      {showCreate && canCreateItem && (
        <CreateWorkItemModal
          projectId={projectId!}
          sprints={sprints}
          members={memberOptions}
          milestones={milestones}
          bugOnly={bugOnly}
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
          onSuccess={setToast}
        />
      )}

      {showImport && canEditSidebar && (
        <ImportWorkItemsModal
          projectId={projectId!}
          onClose={() => { setShowImport(false); qc.invalidateQueries({ queryKey: ['board', projectId] }); }}
          onSuccess={(msg) => { setShowImport(false); setToast(msg); qc.invalidateQueries({ queryKey: ['board', projectId] }); }}
        />
      )}

      {showSprintManager && (
        <SprintManager
          projectId={projectId!}
          milestones={milestones.map((m) => ({ id: m.id, name: m.name, description: m.description }))}
          onClose={() => setShowSprintManager(false)}
          onToast={setToast}
        />
      )}

      {showMilestoneModal && (
        <MilestoneFormModal
          projectId={projectId!}
          onClose={() => setShowMilestoneModal(false)}
          onSuccess={setToast}
        />
      )}

      {showEditLabels && (
        <EditColumnLabelsModal
          projectId={projectId!}
          currentLabels={editableLabels}
          onClose={() => setShowEditLabels(false)}
          onSaved={() => {
            setShowEditLabels(false);
            setToast('Column labels updated');
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-gray-900 min-w-[240px] max-w-xs">
          <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
