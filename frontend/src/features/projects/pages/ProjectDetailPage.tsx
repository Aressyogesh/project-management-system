import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { milestonesApi } from '../../../api/milestones.api';
import { projectsApi } from '../../../api/projects.api';
import { taskAllocationsApi } from '../../../api/taskAllocations.api';
import { taskListsApi } from '../../../api/taskLists.api';
import { tasksApi } from '../../../api/tasks.api';
import { useAuthStore } from '../../../store/authStore';
import type { Milestone, MilestoneStatus } from '../../../types/milestones.types';
import type { ProjectMember, ProjectRole, ProjectStatus, ProjectType } from '../../../types/projects.types';
import type { Task, TaskPriority, TaskStatus } from '../../../types/task.types';
import type { TaskAllocation } from '../../../types/taskAllocation.types';
import type { TaskList, TaskListType } from '../../../types/taskList.types';
import { AddMemberModal } from '../components/AddMemberModal';
import { AllocationFormModal } from '../components/AllocationFormModal';
import { MilestoneFormModal } from '../components/MilestoneFormModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskFormModal } from '../components/TaskFormModal';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { TaskListFormModal } from '../components/TaskListFormModal';

const TYPE_LABEL: Record<ProjectType, string> = {
  DEDICATED: 'Dedicated',
  T_AND_M: 'T&M',
  FIXED: 'Fixed',
};

const TYPE_COLOR: Record<ProjectType, string> = {
  DEDICATED: 'bg-blue-100 text-blue-700',
  T_AND_M: 'bg-purple-100 text-purple-700',
  FIXED: 'bg-orange-100 text-orange-700',
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVE: 'bg-gray-100 text-gray-500',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVE: 'Archive',
  ON_HOLD: 'On Hold',
};

const ROLE_LABEL: Record<ProjectRole, string> = {
  PROJECT_MANAGER: 'Project Manager',
  TEAM_LEAD: 'Team Lead',
  DEVELOPER: 'Developer',
  QA: 'QA',
  DESIGNER: 'Designer',
  DEVOPS: 'DevOps',
};

const ROLE_COLOR: Record<ProjectRole, string> = {
  PROJECT_MANAGER: 'bg-indigo-100 text-indigo-700',
  TEAM_LEAD: 'bg-blue-100 text-blue-700',
  DEVELOPER: 'bg-teal-100 text-teal-700',
  QA: 'bg-orange-100 text-orange-700',
  DESIGNER: 'bg-pink-100 text-pink-700',
  DEVOPS: 'bg-gray-100 text-gray-700',
};

const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};
const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-600',
};
const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', ON_REVIEW: 'On Review', COMPLETED: 'Completed',
};
const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  ON_REVIEW: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const TL_TYPE_LABEL: Record<TaskListType, string> = {
  GENERAL: 'General',
  PROJECT_MANAGEMENT: 'PM',
  DEVELOPMENT: 'Development',
  QA: 'QA',
  SPRINT: 'Sprint',
};

const TL_TYPE_COLOR: Record<TaskListType, string> = {
  GENERAL: 'bg-gray-100 text-gray-600',
  PROJECT_MANAGEMENT: 'bg-indigo-100 text-indigo-700',
  DEVELOPMENT: 'bg-teal-100 text-teal-700',
  QA: 'bg-orange-100 text-orange-700',
  SPRINT: 'bg-blue-100 text-blue-700',
};

const MS_STATUS_LABEL: Record<MilestoneStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DELAYED: 'Delayed',
};

const MS_STATUS_COLOR: Record<MilestoneStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DELAYED: 'bg-red-100 text-red-600',
};

const ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'QA', label: 'QA' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'DEVOPS', label: 'DevOps' },
];

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    return <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  }
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

export function ProjectDetailPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const [showAddMember, setShowAddMember] = useState(false);
  const [editingRole, setEditingRole] = useState<{ userId: string; role: ProjectRole } | null>(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);
  const [showTaskListForm, setShowTaskListForm] = useState(false);
  const [editTaskList, setEditTaskList] = useState<TaskList | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [collapsedLists, setCollapsedLists] = useState<Record<string, boolean>>({});
  const [taskView, setTaskView] = useState<'list' | 'board'>('list');
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [editAllocation, setEditAllocation] = useState<TaskAllocation | null>(null);

  const { data: project, isLoading: projLoading, error: projError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.listMembers(projectId!),
    enabled: !!projectId,
  });

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId!),
    enabled: !!projectId,
  });

  const { data: taskLists = [], isLoading: taskListsLoading } = useQuery({
    queryKey: ['task-lists', projectId],
    queryFn: () => taskListsApi.list(projectId!),
    enabled: !!projectId,
  });

  const removeMilestoneMutation = useMutation({
    mutationFn: (id: string) => milestonesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', projectId] }),
  });

  const removeTaskListMutation = useMutation({
    mutationFn: (id: string) => taskListsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-lists', projectId] }),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId!),
    enabled: !!projectId,
  });

  const removeTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ['task-allocations', projectId],
    queryFn: () => taskAllocationsApi.listByProject(projectId!),
    enabled: !!projectId,
  });

  const removeAllocationMutation = useMutation({
    mutationFn: (id: string) => taskAllocationsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-allocations', projectId] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      projectsApi.updateMemberRole(projectId!, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      setEditingRole(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', projectId] }),
  });

  const myProjectRole = members.find((m) => m.user.id === user?.id)?.projectRole;
  const canManageAllocations =
    canEdit ||
    myProjectRole === 'PROJECT_MANAGER' ||
    myProjectRole === 'TEAM_LEAD';

  if (projLoading) {
    return <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading…</div>;
  }

  if (projError || !project) {
    return <div className="flex items-center justify-center py-20 text-sm text-red-500">Failed to load project.</div>;
  }

  const isOverdue = project.status === 'ACTIVE' && project.endDate !== null && new Date(project.endDate) < new Date();

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Projects
      </Link>

      {/* Project Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[project.status]}`}>
                {STATUS_LABEL[project.status]}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[project.projectType]}`}>
                {TYPE_LABEL[project.projectType]}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Overdue</span>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-gray-500 mt-2 max-w-2xl">{project.description}</p>
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Client</p>
            <p className="text-sm font-medium text-gray-700">{project.client?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Department</p>
            <p className="text-sm font-medium text-gray-700">{project.department?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Timeline</p>
            <p className="text-sm font-medium text-gray-700">
              {project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              {' → '}
              {project.endDate ? new Date(project.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Budget</p>
            <p className="text-sm font-medium text-gray-700">
              {project.budget ? `₹${Number(project.budget).toLocaleString('en-IN')}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Team Members</h2>
            <p className="text-xs text-gray-400 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </button>
          )}
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            No members yet.{canEdit && ' Click "Add Member" to add the first team member.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Project Role</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  {canEdit && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((member: ProjectMember) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.user.fullName} photo={member.user.profilePhoto} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{member.user.fullName}</p>
                          <p className="text-xs text-gray-400">{member.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {member.user.department?.name ?? '—'}
                    </td>
                    <td className="px-6 py-3">
                      {canEdit && editingRole?.userId === member.user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingRole.role}
                            onChange={(e) => setEditingRole({ userId: member.user.id, role: e.target.value as ProjectRole })}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => updateRoleMutation.mutate({ userId: member.user.id, role: editingRole.role })}
                            disabled={updateRoleMutation.isPending}
                            className="text-xs text-white bg-primary-600 hover:bg-primary-700 px-2 py-1 rounded-md transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRole(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[member.projectRole]}`}>
                          {ROLE_LABEL[member.projectRole]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-400">
                      {new Date(member.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Change role"
                            onClick={() => setEditingRole({ userId: member.user.id, role: member.projectRole })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            title="Remove member"
                            onClick={() => removeMutation.mutate(member.user.id)}
                            disabled={removeMutation.isPending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Milestones</h2>
            <p className="text-xs text-gray-400 mt-0.5">{milestones.length} milestone{milestones.length !== 1 ? 's' : ''}</p>
          </div>
          {canEdit && (
            <button
              onClick={() => { setEditMilestone(null); setShowMilestoneForm(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Milestone
            </button>
          )}
        </div>

        {milestonesLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            No milestones yet.{canEdit && ' Click "Add Milestone" to create one.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {canEdit && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {milestones.map((ms: Milestone) => (
                  <tr key={ms.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-800">{ms.description}</p>
                      {ms.deliveryNote && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ms.deliveryNote}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {ms.startDate
                        ? new Date(ms.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                      {' → '}
                      {ms.dueDate
                        ? new Date(ms.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {ms.responsibleUser?.fullName ?? '—'}
                    </td>
                    <td className="px-6 py-3 min-w-[140px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{ms.completedTasks} / {ms.totalTasks} tasks</span>
                          <span className="text-xs font-medium text-gray-700">{ms.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${ms.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MS_STATUS_COLOR[ms.status]}`}>
                        {MS_STATUS_LABEL[ms.status]}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Edit"
                            onClick={() => { setEditMilestone(ms); setShowMilestoneForm(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            title="Delete"
                            onClick={() => removeMilestoneMutation.mutate(ms.id)}
                            disabled={removeMilestoneMutation.isPending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Lists */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Task Lists</h2>
            <p className="text-xs text-gray-400 mt-0.5">{taskLists.length} list{taskLists.length !== 1 ? 's' : ''}</p>
          </div>
          {canEdit && (
            <button
              onClick={() => { setEditTaskList(null); setShowTaskListForm(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task List
            </button>
          )}
        </div>

        {taskListsLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
        ) : taskLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            No task lists yet.{canEdit && ' Click "Add Task List" to create one.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  {canEdit && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {taskLists.map((tl: TaskList) => (
                  <tr key={tl.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-800">{tl.name}</p>
                      {tl.type === 'SPRINT' && tl.sprintNumber && (
                        <p className="text-xs text-gray-400 mt-0.5">Sprint {tl.sprintNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TL_TYPE_COLOR[tl.type]}`}>
                        {TL_TYPE_LABEL[tl.type]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {tl.description ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {new Date(tl.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Edit"
                            onClick={() => { setEditTaskList(tl); setShowTaskListForm(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            title="Delete"
                            onClick={() => removeTaskListMutation.mutate(tl.id)}
                            disabled={removeTaskListMutation.isPending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          projectId={projectId!}
          existingMembers={members}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {showMilestoneForm && (
        <MilestoneFormModal
          projectId={projectId!}
          milestone={editMilestone ?? undefined}
          onClose={() => { setShowMilestoneForm(false); setEditMilestone(null); }}
        />
      )}

      {/* Tasks */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Tasks</h2>
            <p className="text-xs text-gray-400 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setTaskView('list')}
                aria-label="List view"
                className={`px-3 py-1.5 text-xs font-medium transition ${taskView === 'list' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                List
              </button>
              <button
                onClick={() => setTaskView('board')}
                aria-label="Board view"
                className={`px-3 py-1.5 text-xs font-medium transition ${taskView === 'board' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Board
              </button>
            </div>

            {canEdit && (
              <button
                onClick={() => { setEditTask(null); setShowTaskForm(true); }}
                disabled={taskLists.length === 0}
                title={taskLists.length === 0 ? 'Create a task list first' : undefined}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Task
              </button>
            )}
          </div>
        </div>

        {tasksLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
        ) : taskView === 'board' ? (
          <TaskKanbanBoard tasks={tasks} onTaskClick={setSelectedTask} />
        ) : taskLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Create a task list first before adding tasks.
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l-3 3-1.5-1.5" />
            </svg>
            No tasks yet.{canEdit && ' Click "Add Task" to create one.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {taskLists.map((tl) => {
              const listTasks = tasks.filter((t: Task) => t.taskList.id === tl.id);
              const isCollapsed = collapsedLists[tl.id];
              return (
                <div key={tl.id}>
                  <button
                    className="w-full flex items-center gap-3 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                    onClick={() => setCollapsedLists((prev) => ({ ...prev, [tl.id]: !prev[tl.id] }))}
                  >
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TL_TYPE_COLOR[tl.type as TaskListType]}`}>
                      {TL_TYPE_LABEL[tl.type as TaskListType]}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{tl.name}</span>
                    {tl.type === 'SPRINT' && tl.sprintNumber && (
                      <span className="text-xs text-gray-400">Sprint {tl.sprintNumber}</span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">{listTasks.length} task{listTasks.length !== 1 ? 's' : ''}</span>
                  </button>

                  {!isCollapsed && (
                    listTasks.length === 0 ? (
                      <p className="px-8 py-4 text-xs text-gray-400">No tasks in this list yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left px-8 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Assignee</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Due</th>
                              {canEdit && <th className="px-4 py-2" />}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {listTasks.map((task: Task) => (
                              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-8 py-3">
                                  <button
                                    onClick={() => setSelectedTask(task)}
                                    className="text-sm font-medium text-gray-800 hover:text-primary-600 text-left transition"
                                  >
                                    {task.title}
                                  </button>
                                  {task.milestone && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                                      &#127937; {task.milestone.description}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TASK_PRIORITY_COLOR[task.priority]}`}>
                                    {TASK_PRIORITY_LABEL[task.priority]}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS_COLOR[task.status]}`}>
                                    {TASK_STATUS_LABEL[task.status]}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {task.assignedTo ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar name={task.assignedTo.fullName} photo={task.assignedTo.profilePhoto} />
                                      <span className="text-xs">{task.assignedTo.fullName}</span>
                                    </div>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                  {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'}
                                </td>
                                {canEdit && (
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        title="Edit"
                                        onClick={() => { setEditTask(task); setShowTaskForm(true); }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        title="Delete"
                                        onClick={() => removeTaskMutation.mutate(task.id)}
                                        disabled={removeTaskMutation.isPending}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Allocations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Task Allocations</h2>
            <p className="text-xs text-gray-400 mt-0.5">{allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</p>
          </div>
          {canManageAllocations && (
            <button
              onClick={() => { setEditAllocation(null); setShowAllocationForm(true); }}
              disabled={tasks.length === 0}
              title={tasks.length === 0 ? 'Add tasks first' : undefined}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Log Hours
            </button>
          )}
        </div>

        {allocationsLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
        ) : allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No allocations yet.{canManageAllocations && ' Click "Log Hours" to assign hours.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  {canManageAllocations && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allocations.map((alloc: TaskAllocation) => (
                  <tr key={alloc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-800">{alloc.task.title}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={alloc.user.fullName} photo={alloc.user.profilePhoto} />
                        <span className="text-sm text-gray-700">{alloc.user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(alloc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {alloc.allocatedHours}h
                      </span>
                    </td>
                    {canManageAllocations && (
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Edit"
                            onClick={() => { setEditAllocation(alloc); setShowAllocationForm(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            title="Delete"
                            onClick={() => removeAllocationMutation.mutate(alloc.id)}
                            disabled={removeAllocationMutation.isPending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showTaskListForm && (
        <TaskListFormModal
          projectId={projectId!}
          editTaskList={editTaskList}
          onClose={() => { setShowTaskListForm(false); setEditTaskList(null); }}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          canEdit={canEdit}
          currentUserId={user?.id ?? ''}
        />
      )}

      {showTaskForm && (
        <TaskFormModal
          projectId={projectId!}
          taskLists={taskLists}
          milestones={milestones}
          members={members.map((m) => ({
            id: m.user.id,
            fullName: m.user.fullName,
            profilePhoto: m.user.profilePhoto,
          }))}
          editTask={editTask}
          onClose={() => { setShowTaskForm(false); setEditTask(null); }}
        />
      )}

      {showAllocationForm && (
        <AllocationFormModal
          projectId={projectId!}
          tasks={tasks}
          members={members}
          allocation={editAllocation ?? undefined}
          onClose={() => { setShowAllocationForm(false); setEditAllocation(null); }}
        />
      )}
    </div>
  );
}
