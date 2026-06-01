import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { projectsApi } from '../../../api/projects.api';
import { usersApi } from '../../../api/users.api';
import type { ProjectMember, ProjectRole } from '../../../types/projects.types';

interface Props {
  projectId: string;
  existingMembers: ProjectMember[];
  onClose: () => void;
}

const ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'QA', label: 'QA' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'DEVOPS', label: 'DevOps' },
];

export function AddMemberModal({ projectId, existingMembers, onClose }: Props) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [projectRole, setProjectRole] = useState<ProjectRole>('DEVELOPER');
  const [error, setError] = useState('');

  const existingIds = new Set(existingMembers.map((m) => m.user.id));

  const { data: usersPage } = useQuery({
    queryKey: ['users-all-active'],
    queryFn: () => usersApi.list({ limit: 500 }),
  });

  const availableUsers = (usersPage?.data ?? [])
    .filter((u) => u.isActive && !existingIds.has(u.id));

  const addMut = useMutation({
    mutationFn: () => projectsApi.addMember(projectId, userId, projectRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to add member'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!userId) { setError('Please select a user'); return; }
    addMut.mutate();
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className={labelCls}>User <span className="text-red-500">*</span></label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
              <option value="">— Select user —</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
            {availableUsers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">All active users are already members.</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Project Role <span className="text-red-500">*</span></label>
            <select value={projectRole} onChange={(e) => setProjectRole(e.target.value as ProjectRole)} className={inputCls}>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={addMut.isPending}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
              {addMut.isPending ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
