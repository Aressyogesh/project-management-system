import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sprintsApi } from '../api/boardApi';
import type { Sprint } from '../types/board.types';

export function useSprints(projectId: string) {
  const qc = useQueryClient();
  const key = ['sprints', projectId];

  const query = useQuery({
    queryKey: key,
    queryFn: () => sprintsApi.getSprints(projectId),
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: (data: Partial<Sprint>) => sprintsApi.createSprint(projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Sprint> }) => sprintsApi.updateSprint(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const activate = useMutation({
    mutationFn: (id: string) => sprintsApi.activateSprint(id, projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sprintsApi.deleteSprint(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const activeSprint = query.data?.find((s) => s.isActive) ?? null;

  return { sprints: query.data ?? [], activeSprint, isLoading: query.isLoading, create, update, activate, remove };
}
