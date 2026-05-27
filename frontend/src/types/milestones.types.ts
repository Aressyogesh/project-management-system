export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

export interface MilestoneUser {
  id: string;
  fullName: string;
  profilePhoto: string | null;
}

export interface Milestone {
  id: string;
  description: string;
  deliveryNote: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: MilestoneStatus;
  createdAt: string;
  responsibleUser: MilestoneUser | null;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

export interface CreateMilestonePayload {
  description: string;
  deliveryNote?: string;
  startDate?: string;
  dueDate?: string;
  responsibleUserId?: string;
  status?: MilestoneStatus;
}
