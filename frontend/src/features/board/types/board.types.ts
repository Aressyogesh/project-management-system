export type WorkItemType = 'EPIC' | 'USER_STORY' | 'TASK' | 'SUB_TASK' | 'BUG';
export type BoardStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'QA' | 'QA_DONE';
export type BugSeverity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'TRIVIAL';
export type BugClassification = 'UI_USABILITY' | 'NEW_BUG' | 'ENHANCEMENT' | 'PERFORMANCE' | 'OTHER';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WorkItemUser {
  id: string;
  fullName: string;
  profilePhoto?: string | null;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TimesheetEntry {
  id: string;
  workItemId: string;
  userId: string;
  date: string;
  hours: number;
  description?: string | null;
  createdAt: string;
  user: WorkItemUser;
}

export interface WorkItemComment {
  id: string;
  workItemId: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: WorkItemUser;
}

export interface WorkItemAttachment {
  id: string;
  workItemId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: string;
  uploadedBy: WorkItemUser;
}

export interface WorkItemChild {
  id: string;
  title: string;
  type: WorkItemType;
  status: BoardStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
}

export interface WorkItem {
  id: string;
  projectId: string;
  parentId?: string | null;
  sprintId?: string | null;
  type: WorkItemType;
  status: BoardStatus;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  assigneeId?: string | null;
  reporterId: string;
  storyPoints?: number | null;
  estimatedHours?: number | null;
  labels: string[];
  components: string[];
  fixVersion?: string | null;
  severity?: BugSeverity | null;
  bugClassification?: BugClassification | null;
  environment?: string | null;
  stepsToRepro?: string | null;
  completedAt?: string | null;
  reopenCount: number;
  position: number;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  // relations
  assignee?: WorkItemUser | null;
  reporter: WorkItemUser;
  sprint?: Sprint | null;
  parent?: WorkItemChild | null;
  children?: WorkItemChild[];
  comments?: WorkItemComment[];
  attachments?: WorkItemAttachment[];
  timesheetEntries?: TimesheetEntry[];
  // computed
  _count?: { children: number; comments: number; timesheetEntries: number };
}

export interface BoardFilters {
  types: WorkItemType[];
  sprintId: string;
  assigneeId: string;
  priority: TaskPriority | '';
  search: string;
}

export const BOARD_COLUMNS: { status: BoardStatus; label: string; color: string; headerClass: string }[] = [
  { status: 'TODO',        label: 'To Do',       color: '#6b7280', headerClass: 'bg-gray-100 text-gray-700' },
  { status: 'IN_PROGRESS', label: 'In Progress',  color: '#3b82f6', headerClass: 'bg-blue-100 text-blue-700' },
  { status: 'BLOCKED',     label: 'Blocked',      color: '#ef4444', headerClass: 'bg-red-100 text-red-700' },
  { status: 'IN_REVIEW',   label: 'In Review',    color: '#f59e0b', headerClass: 'bg-amber-100 text-amber-700' },
  { status: 'QA',          label: 'QA',           color: '#8b5cf6', headerClass: 'bg-purple-100 text-purple-700' },
  { status: 'QA_DONE',     label: 'QA Done',      color: '#10b981', headerClass: 'bg-emerald-100 text-emerald-700' },
];

export const TYPE_CONFIG: Record<WorkItemType, { label: string; color: string; bg: string; text: string }> = {
  EPIC:       { label: 'Epic',      color: '#8b5cf6', bg: 'bg-purple-100', text: 'text-purple-700' },
  USER_STORY: { label: 'Story',     color: '#3b82f6', bg: 'bg-blue-100',   text: 'text-blue-700' },
  TASK:       { label: 'Task',      color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  SUB_TASK:   { label: 'Sub Task',  color: '#06b6d4', bg: 'bg-cyan-100',   text: 'text-cyan-700' },
  BUG:        { label: 'Bug',       color: '#ef4444', bg: 'bg-red-100',    text: 'text-red-700' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  LOW:      { label: 'Low',      bg: 'bg-gray-100',   text: 'text-gray-500' },
  MEDIUM:   { label: 'Medium',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  HIGH:     { label: 'High',     bg: 'bg-orange-100', text: 'text-orange-700' },
  CRITICAL: { label: 'Critical', bg: 'bg-red-100',    text: 'text-red-600' },
};
