export type TrendDirection = 'up' | 'down';
export type CardColor = 'green' | 'blue' | 'purple' | 'rose';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_REVIEW' | 'COMPLETED';

export interface StatCard {
  label: string;
  value: number;
  change: number;
  trend: TrendDirection;
  color: CardColor;
}

export interface ActivityPoint {
  month: string;
  high: number;
  low: number;
}

export interface TasksProgress {
  notStarted: number;
  inProgress: number;
  onReview: number;
  completed: number;
}

export interface MyTask {
  id: string;
  projectName: string;
  taskName: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface DashboardStats {
  cards: StatCard[];
  activityData: ActivityPoint[];
  tasksProgress: TasksProgress;
  myTasks: MyTask[];
  todayTask: { name: string; progress: number } | null;
  teamPerformance: { score: number; change: number };
}
