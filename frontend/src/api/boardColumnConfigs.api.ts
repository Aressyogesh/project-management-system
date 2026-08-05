import { apiClient } from './client';
import type { BoardStatus } from '../features/board/types/board.types';

export interface BoardColumnConfigDto {
  status: BoardStatus;
  label: string;
}

export const boardColumnConfigsApi = {
  getByProject: (projectId: string) =>
    apiClient.get<BoardColumnConfigDto[]>(`/board-column-configs/${projectId}`).then((r) => r.data),

  upsertMany: (projectId: string, configs: BoardColumnConfigDto[]) =>
    apiClient.put<BoardColumnConfigDto[]>(`/board-column-configs/${projectId}`, configs).then((r) => r.data),
};
