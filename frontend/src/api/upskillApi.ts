import { apiClient } from './client';

export type UpskillType = 'LEARNING' | 'AUTOMATION';
export type UpskillStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface UpskillProgressLog {
  id: string;
  assignmentId: string;
  userId: string;
  percentComplete: number;
  hoursSpent: number;
  notes: string | null;
  createdAt: string;
}

export interface UpskillAssignment {
  id: string;
  type: UpskillType;
  assignedToId: string;
  createdById: string;
  description: string;
  toolScript: string | null;
  startDate: string;
  endDate: string;
  status: UpskillStatus;
  evidenceFilePath: string | null;
  evidenceFileName: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; fullName: string };
  createdBy?: { id: string; fullName: string };
  approvedBy?: { id: string; fullName: string } | null;
  progressLogs?: UpskillProgressLog[];
}

export interface CreateAssignmentDto {
  type: UpskillType;
  assignedToId: string;
  description: string;
  toolScript?: string;
  startDate: string;
  endDate: string;
}

export interface AssignableUser {
  id: string;
  fullName: string;
  systemRole: string;
  department: { name: string } | null;
}

export interface UpskillPage {
  data: UpskillAssignment[];
  total: number;
  page: number;
  limit: number;
}

export const upskillApi = {
  isManager: (): Promise<{ isManager: boolean }> =>
    apiClient.get('/upskill/is-manager').then((r) => r.data),

  assignableUsers: (): Promise<AssignableUser[]> =>
    apiClient.get('/upskill/assignable-users').then((r) => r.data),

  listAssignments: (params?: {
    mine?: boolean;
    status?: UpskillStatus;
    assignedToId?: string;
    period?: string;
    page?: number;
    limit?: number;
  }): Promise<UpskillPage> =>
    apiClient.get('/upskill/assignments', { params }).then((r) => r.data),

  getAssignment: (id: string): Promise<UpskillAssignment> =>
    apiClient.get(`/upskill/assignments/${id}`).then((r) => r.data),

  createAssignment: (dto: CreateAssignmentDto): Promise<UpskillAssignment> =>
    apiClient.post('/upskill/assignments', dto).then((r) => r.data),

  logProgress: (
    id: string,
    dto: { percentComplete: number; hoursSpent: number; notes?: string },
  ): Promise<UpskillProgressLog> =>
    apiClient.post(`/upskill/assignments/${id}/progress`, dto).then((r) => r.data),

  submitEvidence: (id: string, file: File): Promise<UpskillAssignment> => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post(`/upskill/assignments/${id}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  updateAssignment: (id: string, dto: Partial<Omit<CreateAssignmentDto, 'type'>>): Promise<UpskillAssignment> =>
    apiClient.patch(`/upskill/assignments/${id}`, dto).then((r) => r.data),

  deleteAssignment: (id: string): Promise<void> =>
    apiClient.delete(`/upskill/assignments/${id}`).then((r) => r.data),

  approve: (id: string): Promise<UpskillAssignment> =>
    apiClient.patch(`/upskill/assignments/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string): Promise<UpskillAssignment> =>
    apiClient.patch(`/upskill/assignments/${id}/reject`, { reason }).then((r) => r.data),

  downloadEvidence: async (id: string, fileName: string): Promise<void> => {
    const response = await apiClient.get(`/upskill/assignments/${id}/evidence`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};
