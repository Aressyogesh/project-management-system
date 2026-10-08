export interface AllocationTask {
  id: string;
  title: string;
  projectId: string;
}

export interface AllocationUser {
  id: string;
  fullName: string;
  profilePhoto: string | null;
}

export interface TaskAllocation {
  id: string;
  date: string;
  allocatedHours: number;
  task: AllocationTask;
  user: AllocationUser;
}

export interface CreateTaskAllocationPayload {
  taskId: string;
  userId: string;
  date: string;
  allocatedHours: number;
}

export interface UpdateTaskAllocationPayload {
  allocatedHours: number;
}

export interface AllocationCheck {
  allocatedHours: number;
  remainingHours: number;
}
