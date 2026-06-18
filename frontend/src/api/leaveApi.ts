import { apiClient } from './client';

export type LeaveType = 'SICK' | 'CASUAL' | 'EARNED' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  reason: string | null;
  status: LeaveStatus;
  approvedById: string | null;
  approvalNote: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; fullName: string; profilePhoto: string | null };
  approvedBy: { id: string; fullName: string } | null;
}

export interface CreateLeaveRequestDto {
  type: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  reason?: string;
}

export const leaveApi = {
  create: (dto: CreateLeaveRequestDto): Promise<LeaveRequest> =>
    apiClient.post('/leave-requests', dto).then((r) => r.data),

  list: (params?: { status?: LeaveStatus; userId?: string }): Promise<LeaveRequest[]> =>
    apiClient.get('/leave-requests', { params }).then((r) => r.data),

  getOne: (id: string): Promise<LeaveRequest> =>
    apiClient.get(`/leave-requests/${id}`).then((r) => r.data),

  approve: (id: string, approvalNote?: string): Promise<LeaveRequest> =>
    apiClient.patch(`/leave-requests/${id}/approve`, { approvalNote }).then((r) => r.data),

  reject: (id: string, approvalNote?: string): Promise<LeaveRequest> =>
    apiClient.patch(`/leave-requests/${id}/reject`, { approvalNote }).then((r) => r.data),

  cancel: (id: string): Promise<LeaveRequest> =>
    apiClient.patch(`/leave-requests/${id}/cancel`).then((r) => r.data),
};
