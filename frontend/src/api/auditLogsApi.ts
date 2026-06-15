import { apiClient } from './client';

export type AuditAction =
  | 'LOGIN'
  | 'WORK_ITEM_CREATED'
  | 'WORK_ITEM_UPDATED'
  | 'WORK_ITEM_STATUS_CHANGED'
  | 'WORK_ITEM_DELETED'
  | 'WORK_ITEM_ASSIGNED'
  | 'SPRINT_CREATED'
  | 'SPRINT_UPDATED'
  | 'SPRINT_ACTIVATED'
  | 'SPRINT_DELETED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'PROFILE_UPDATED';

export type AuditEntity = 'AUTH' | 'WORK_ITEM' | 'SPRINT' | 'PROJECT_MEMBER' | 'USER_PROFILE';

export interface AuditLogEntry {
  id: string;
  userId: string;
  user: { id: string; fullName: string; profilePhoto: string | null };
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  entityTitle: string | null;
  projectId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsQuery {
  userId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const auditLogsApi = {
  getAll: async (query: AuditLogsQuery = {}): Promise<AuditLogsResponse> => {
    const params = new URLSearchParams();
    if (query.userId) params.set('userId', query.userId);
    if (query.action) params.set('action', query.action);
    if (query.entity) params.set('entity', query.entity);
    if (query.projectId) params.set('projectId', query.projectId);
    if (query.startDate) params.set('startDate', query.startDate);
    if (query.endDate) params.set('endDate', query.endDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    const res = await apiClient.get<AuditLogsResponse>(`/audit-logs?${params}`);
    return res.data;
  },
};
