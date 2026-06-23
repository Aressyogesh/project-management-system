import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pagination } from '../../../components/shared/Pagination';
import { UserAvatar } from '../../../components/shared/UserAvatar';
import { settingsApi } from '../../../api/settings.api';

const PAGE_SIZE = 25;

type SystemRole = 'SUPER_USER' | 'ADMIN' | 'EMPLOYEE';

const ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_USER: 'Super User',
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

const ROLES: SystemRole[] = ['SUPER_USER', 'ADMIN', 'EMPLOYEE'];


export function UserSettingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['settings-users'],
    queryFn: settingsApi.getUsers,
    retry: false,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      settingsApi.updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      setDeleteId(null);
    },
  });

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name / Email</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSearch('')}
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-gray-400">
            <p>Could not load users — start the backend to see live data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-12">Sr.No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-44">Role</th>
                  <th className="px-4 py-3 w-24 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No users found</td>
                  </tr>
                ) : paginated.map((user, i) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.fullName} photo={user.profilePhoto} size="lg" />
                        <div>
                          <p className="font-medium text-gray-800">{user.fullName}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${user.isActive ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.systemRole}
                        onChange={(e) => roleMutation.mutate({ id: user.id, role: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleteId(user.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination + summary */}
        {!isLoading && !error && (
          <div className="border-t border-gray-100">
            {filtered.length > PAGE_SIZE ? (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onChange={setPage}
              />
            ) : filtered.length > 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400">
                Showing {filtered.length} of {users.length} users
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Deactivate User?</h3>
            <p className="text-sm text-gray-400 mb-5">The user will be marked inactive and lose access.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteMutation.mutate(deleteId!)} disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-60 transition">
                {deleteMutation.isPending ? 'Processing…' : 'Deactivate'}
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
