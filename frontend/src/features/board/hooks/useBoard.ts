import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardApi, type BoardFiltersQuery } from '../api/boardApi';
import type { BoardStatus, WorkItem } from '../types/board.types';
import { BOARD_COLUMNS } from '../types/board.types';

export function useBoard(projectId: string, filters: BoardFiltersQuery) {
  const qc = useQueryClient();
  const key = ['board', projectId, filters];

  const query = useQuery({
    queryKey: key,
    queryFn: () => boardApi.getWorkItems(projectId, filters),
    enabled: !!projectId,
  });

  const items = query.data ?? [];

  // Group items by status for the Kanban columns
  const columns = BOARD_COLUMNS.map((col) => ({
    ...col,
    items: items.filter((item) => item.status === col.status).sort((a, b) => a.position - b.position),
  }));

  const move = useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: BoardStatus; position?: number }) =>
      boardApi.moveWorkItem(id, status, position),
    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<WorkItem[]>(key);
      qc.setQueryData<WorkItem[]>(key, (old) =>
        (old ?? []).map((item) =>
          item.id === id ? { ...item, status, position: position ?? 0 } : item,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['workItem', vars.id] });
    },
  });

  const create = useMutation({
    mutationFn: (data: Partial<WorkItem>) => boardApi.createWorkItem(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkItem> }) => boardApi.updateWorkItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => boardApi.deleteWorkItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { columns, items, isLoading: query.isLoading, move, create, update, remove };
}
