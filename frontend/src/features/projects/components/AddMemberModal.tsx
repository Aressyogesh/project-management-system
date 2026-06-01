import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { departmentsApi } from '../../../api/departments.api';
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
  const [tab, setTab] = useState<'individual' | 'team'>('individual');

  // Individual tab state
  const [userId, setUserId] = useState('');
  const [projectRole, setProjectRole] = useState<ProjectRole>('DEVELOPER');
  const [error, setError] = useState('');

  // Team / by department tab state
  const [deptId, setDeptId] = useState('');
  const [teamRole, setTeamRole] = useState<ProjectRole>('DEVELOPER');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const existingIds = new Set(existingMembers.map((m) => m.user.id));

  const { data: usersPage } = useQuery({
    queryKey: ['users-all-active'],
    queryFn: () => usersApi.list({ limit: 500 }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const allActiveUsers = (usersPage?.data ?? []).filter((u) => u.isActive);
  const availableUsers = allActiveUsers.filter((u) => !existingIds.has(u.id));

  const deptUsers = deptId
    ? availableUsers.filter((u) => u.department?.id === deptId)
    : [];

  const addOneMut = useMutation({
    mutationFn: () => projectsApi.addMember(projectId, userId, projectRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to add member'),
  });

  const addTeamMut = useMutation({
    mutationFn: async () => {
      for (const uid of selectedUserIds) {
        await projectsApi.addMember(projectId, uid, teamRole);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] });
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to add team'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (tab === 'individual') {
      if (!userId) { setError('Please select a user'); return; }
      addOneMut.mutate();
    } else {
      if (!selectedUserIds.size) { setError('Select at least one team member'); return; }
      addTeamMut.mutate();
    }
  }

  function toggleUser(id: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedUserIds(new Set(deptUsers.map((u) => u.id)));
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

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(['individual', 'team'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`px-4 py-2.5 text-xs font-medium transition ${
                tab === t ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'individual' ? 'Add Individual' : 'Add by Department'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          {tab === 'individual' ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Department</label>
                <select value={deptId} onChange={(e) => { setDeptId(e.target.value); setSelectedUserIds(new Set()); }} className={inputCls}>
                  <option value="">e.g. Development, Design, QA…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Project Role for all <span className="text-red-500">*</span></label>
                <select value={teamRole} onChange={(e) => setTeamRole(e.target.value as ProjectRole)} className={inputCls}>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {deptId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>
                      Team members ({deptUsers.length} available)
                    </label>
                    {deptUsers.length > 0 && (
                      <button type="button" onClick={selectAll} className="text-xs text-primary-600 hover:underline">
                        Select all
                      </button>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {deptUsers.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-3">No available users in this department.</p>
                    ) : (
                      deptUsers.map((u) => (
                        <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(u.id)}
                            onChange={() => toggleUser(u.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-800">{u.fullName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{u.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedUserIds.size > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{selectedUserIds.size} selected</p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={addOneMut.isPending || addTeamMut.isPending}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
              {addOneMut.isPending || addTeamMut.isPending
                ? 'Adding…'
                : tab === 'individual' ? 'Add Member' : `Add ${selectedUserIds.size || ''} Member${selectedUserIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
