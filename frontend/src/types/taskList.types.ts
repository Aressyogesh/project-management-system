export type TaskListType =
  | 'GENERAL'
  | 'PROJECT_MANAGEMENT'
  | 'DEVELOPMENT'
  | 'QA'
  | 'SPRINT';

export interface TaskList {
  id: string;
  name: string;
  type: TaskListType;
  sprintNumber: number | null;
  description: string | null;
  createdAt: string;
}

export interface CreateTaskListPayload {
  name: string;
  type: TaskListType;
  sprintNumber?: number;
  description?: string;
}
