export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_REVIEW' | 'COMPLETED';
export type BillingStatus = 'BILLABLE' | 'NON_BILLABLE';

export interface TaskUser {
  id: string;
  fullName: string;
  profilePhoto: string | null;
}

export interface TaskListRef {
  id: string;
  name: string;
  type: string;
}

export interface MilestoneRef {
  id: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  billingStatus: BillingStatus;
  status: TaskStatus;
  estimatedHours: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  taskList: TaskListRef;
  milestone: MilestoneRef | null;
  assignedTo: TaskUser | null;
  createdBy: { id: string; fullName: string };
}

export interface CreateTaskPayload {
  title: string;
  taskListId: string;
  milestoneId?: string;
  description?: string;
  assignedToId?: string;
  estimatedHours?: number;
  priority?: TaskPriority;
  billingStatus?: BillingStatus;
  status?: TaskStatus;
  startDate?: string;
  dueDate?: string;
}
