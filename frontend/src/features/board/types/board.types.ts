export type WorkItemType = 'EPIC' | 'USER_STORY' | 'TASK' | 'SUB_TASK' | 'BUG';
export type BoardStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'READY_FOR_QA' | 'IN_QA' | 'QA_DONE' | 'QA';
export type BugSeverity = 'SHOW_STOPPER' | 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'TRIVIAL';
export type BugClassification =
  | 'SECURITY' | 'CRASH_HANG' | 'DATA_LOSS' | 'PERFORMANCE' | 'UI_USABILITY'
  | 'OTHER_BUG' | 'OTHER' | 'FEATURE_NEW' | 'ENHANCEMENT' | 'DESIGN'
  | 'NEW_BUG' | 'CODE_REVIEW' | 'UNIT_TESTING' | 'SUGGESTION'
  | 'PROJECT_MANAGEMENT' | 'EXISTING_APPLICATION';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugFlag = 'INTERNAL' | 'EXTERNAL';
export type BugReproducibility = 'ALWAYS' | 'SOMETIMES' | 'RARELY' | 'UNABLE' | 'NEVER_TRIED' | 'NOT_APPLICABLE';
export type BugReminderType = 'NONE' | 'DAILY' | 'ONE_DAY' | 'TWO_DAYS' | 'THREE_DAYS';
export type BugStatus = 'OPEN' | 'REOPEN' | 'TO_BE_TESTED' | 'IN_PROGRESS' | 'CLOSED' | 'ACKNOWLEDGED' | 'DEFERRED' | 'ON_HOLD';
export type BillingStatus = 'BILLABLE' | 'NON_BILLABLE';

export interface WorkItemUser {
  id: string;
  fullName: string;
  profilePhoto?: string | null;
}

export interface Sprint {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  milestone?: { id: string; description: string } | null;
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

export interface WorkItemActivity {
  id: string;
  workItemId: string;
  userId: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  user: WorkItemUser;
}

export interface WorkItemChild {
  id: string;
  title: string;
  type: WorkItemType;
  status: BoardStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
}

export interface WorkItemMilestone {
  id: string;
  name: string | null;
  description: string;
}

export interface WorkItem {
  id: string;
  displayId?: string | null;
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
  definitionOfDone?: string | null;
  completedAt?: string | null;
  reopenCount: number;
  position: number;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  // Phase 9 Bug Management fields
  bugFlag?: BugFlag | null;
  bugReproducibility?: BugReproducibility | null;
  bugStatus?: BugStatus | null;
  module?: string | null;
  responsibleUserId?: string | null;
  billingStatus?: BillingStatus | null;
  affectedBuildVersion?: string | null;
  fixedBuildVersion?: string | null;
  reminderType?: BugReminderType | null;
  releaseMilestoneId?: string | null;
  affectedMilestoneId?: string | null;
  // relations
  assignee?: WorkItemUser | null;
  reporter: WorkItemUser;
  responsibleUser?: WorkItemUser | null;
  sprint?: Sprint | null;
  parent?: WorkItemChild | null;
  children?: WorkItemChild[];
  comments?: WorkItemComment[];
  attachments?: WorkItemAttachment[];
  timesheetEntries?: TimesheetEntry[];
  releaseMilestone?: WorkItemMilestone | null;
  affectedMilestone?: WorkItemMilestone | null;
  // computed
  _count?: { children: number; comments: number; timesheetEntries: number };
  activities?: WorkItemActivity[];
}

export interface BoardFilters {
  types: WorkItemType[];
  sprintId: string;
  assigneeId: string;
  priority: TaskPriority | '';
  search: string;
}

export interface BoardColumnConfig {
  status: BoardStatus;
  label: string;
}

export const DEFAULT_BOARD_COLUMNS: { status: BoardStatus; label: string; color: string; headerClass: string }[] = [
  { status: 'TODO',         label: 'To Do',         color: '#6b7280', headerClass: 'bg-gray-100 text-gray-700' },
  { status: 'IN_PROGRESS',  label: 'In Progress',   color: '#3b82f6', headerClass: 'bg-blue-100 text-blue-700' },
  { status: 'BLOCKED',      label: 'Blocked',        color: '#ef4444', headerClass: 'bg-red-100 text-red-700' },
  { status: 'IN_REVIEW',    label: 'In Review',      color: '#f59e0b', headerClass: 'bg-amber-100 text-amber-700' },
  { status: 'READY_FOR_QA', label: 'Ready for QA',  color: '#8b5cf6', headerClass: 'bg-purple-100 text-purple-700' },
  { status: 'IN_QA',        label: 'In QA',          color: '#6366f1', headerClass: 'bg-indigo-100 text-indigo-700' },
  { status: 'QA_DONE',      label: 'QA Done',        color: '#10b981', headerClass: 'bg-emerald-100 text-emerald-700' },
];

/** @deprecated Use DEFAULT_BOARD_COLUMNS */
export const BOARD_COLUMNS = DEFAULT_BOARD_COLUMNS;

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

export const BUG_STATUS_CONFIG: Record<BugStatus, { label: string; bg: string; text: string }> = {
  OPEN:          { label: 'Open',          bg: 'bg-red-100',    text: 'text-red-700' },
  REOPEN:        { label: 'Reopen',        bg: 'bg-orange-100', text: 'text-orange-700' },
  TO_BE_TESTED:  { label: 'To Be Tested',  bg: 'bg-purple-100', text: 'text-purple-700' },
  IN_PROGRESS:   { label: 'In Progress',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  CLOSED:        { label: 'Closed',        bg: 'bg-gray-100',   text: 'text-gray-600' },
  ACKNOWLEDGED:  { label: 'Acknowledged',  bg: 'bg-teal-100',   text: 'text-teal-700' },
  DEFERRED:      { label: 'Deferred',      bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ON_HOLD:       { label: 'On Hold',       bg: 'bg-slate-100',  text: 'text-slate-700' },
};
