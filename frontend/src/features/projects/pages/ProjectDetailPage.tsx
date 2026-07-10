import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserAvatar } from '../../../components/shared/UserAvatar';
import { milestonesApi } from '../../../api/milestones.api';
import { projectsApi } from '../../../api/projects.api';
import { useAuthStore } from '../../../store/authStore';
import type { Milestone, MilestoneStatus } from '../../../types/milestones.types';
import type { ProjectMember, ProjectRole, ProjectStatus, ProjectType } from '../../../types/projects.types';
import { AddMemberModal } from '../components/AddMemberModal';
import { MilestoneFormModal } from '../components/MilestoneFormModal';

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

function Toast({ message, variant = 'success', onClose }: { message: string; variant?: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white min-w-[240px] max-w-sm ${variant === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
      {variant === 'error' ? (
        <svg className="w-4 h-4 shrink-0 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white/60 hover:text-white transition">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}


export function ProjectDetailPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdminOrSuper = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN' || user?.systemRole === 'BU_HEAD';

  const [showAddMember, setShowAddMember] = useState(false);
  const [editingRole, setEditingRole] = useState<{ userId: string; role: ProjectRole } | null>(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);
  const [membersPage, setMembersPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const MEMBERS_PAGE_SIZE = 10;

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

  const isUserPM = members.some((m) => m.user.id === user?.id && m.projectRole === 'PROJECT_MANAGER');
  const canEdit = isAdminOrSuper || isUserPM;

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId!),
    enabled: !!projectId,
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const removeMilestoneMutation = useMutation({
    mutationFn: (id: string) => milestonesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', projectId] });
      setDeleteConfirmId(null);
      setToast({ message: 'Milestone deleted' });
    },
    onError: (err: any) => {
      setDeleteConfirmId(null);
      setToast({ message: err?.response?.data?.message ?? 'Failed to delete milestone', variant: 'error' });
    },
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

  const membersTotalPages = Math.max(1, Math.ceil(members.length / MEMBERS_PAGE_SIZE));
  const safeMembersPage = Math.min(membersPage, membersTotalPages);
  const pagedMembers = useMemo(
    () => members.slice((safeMembersPage - 1) * MEMBERS_PAGE_SIZE, safeMembersPage * MEMBERS_PAGE_SIZE),
    [members, safeMembersPage],
  );

  if (projLoading) {
    return <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading…</div>;
  }

  if (projError || !project) {
    return <div className="flex items-center justify-center py-20 text-sm text-red-500">Failed to load project.</div>;
  }

  const isOverdue = project.status === 'ACTIVE' && project.endDate !== null && new Date(project.endDate) < new Date();

  return (
    <div className="space-y-5">
      {/* Back link + Board link */}
      <div className="flex items-center justify-between">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
        <Link
          to={`/projects/${projectId}/board`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Open Board
        </Link>
      </div>

      {/* Project Header */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-6">
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
              <p className="text-sm text-gray-500 mt-2 max-w-2xl" dangerouslySetInnerHTML={{ __html: project.description }} />
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-50">
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
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm">
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
                {pagedMembers.map((member: ProjectMember) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.user.fullName} photo={member.user.profilePhoto} size="md" />
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
                          <button onClick={() => setEditingRole(null)} className="text-xs text-gray-500 hover:text-gray-700">
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

            {membersTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm">
                <span className="text-xs text-gray-400">
                  Showing <span className="font-medium text-gray-600">{(safeMembersPage - 1) * MEMBERS_PAGE_SIZE + 1}–{Math.min(safeMembersPage * MEMBERS_PAGE_SIZE, members.length)}</span> of{' '}
                  <span className="font-medium text-gray-600">{members.length}</span> members
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
                    disabled={safeMembersPage === 1}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {Array.from({ length: membersTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setMembersPage(p)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition ${
                        safeMembersPage === p ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setMembersPage((p) => Math.min(membersTotalPages, p + 1))}
                    disabled={safeMembersPage === membersTotalPages}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm">
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
                      <p className="text-sm font-medium text-gray-800">{ms.name ?? ms.description}</p>
                      {ms.description && ms.name && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {ms.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                        </p>
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
                          {deleteConfirmId === ms.id ? (
                            <>
                              <span className="text-[10px] text-gray-500 mr-1">Delete?</span>
                              <button
                                onClick={() => removeMilestoneMutation.mutate(ms.id)}
                                disabled={removeMilestoneMutation.isPending}
                                className="text-[10px] font-medium text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
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
                                onClick={() => setDeleteConfirmId(ms.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
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
          onSuccess={(msg) => setToast({ message: msg })}
        />
      )}

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
