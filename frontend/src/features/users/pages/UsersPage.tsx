import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { usersApi } from '../../../api/users.api';
import { useAuthStore } from '../../../store/authStore';
import type { User } from '../../../types/users.types';
import { UserFormModal } from '../components/UserFormModal';
import { usePageSize } from '../../../hooks/usePageSize';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ROLE_LABELS: Record<string, string> = {
  SUPER_USER: 'Super User',
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, photo }: { name: string; photo?: string | null }) {
  if (photo) {
    return <img src={`/api/${photo}`} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center shrink-0">
      {initials(name)}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

interface ToastState { message: string }

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-gray-900 min-w-[240px] max-w-xs animate-fade-in">
      <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition ml-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('users');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<User | undefined>(undefined);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const showToast = (message: string) => setToast({ message });

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, pageSize, debouncedSearch],
    queryFn: () => usersApi.list({ page, limit: pageSize, search: debouncedSearch || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usersApi.setStatus(id, isActive),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      showToast(variables.isActive ? 'User activated' : 'User deactivated');
    },
  });

  function openAdd() { setEditTarget(undefined); setModalMode('create'); }
  function openEdit(u: User) { setEditTarget(u); setModalMode('edit'); }
  function closeModal() { setModalMode(null); setEditTarget(undefined); }

  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setPage(1); }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageNumbers: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push('…');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push('…');
    pageNumbers.push(totalPages);
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">User Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {data ? `${data.total} user${data.total !== 1 ? 's' : ''} total` : 'Loading…'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading users…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">Failed to load users.</div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400 gap-2">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015-3.87M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {search ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-50">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Shift</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {data.data.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} photo={u.profilePhoto} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{u.fullName}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-sm text-gray-600">{u.department?.name ?? <span className="text-gray-300">—</span>}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{u.shift?.name ?? <span className="text-gray-300">—</span>}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-600">{ROLE_LABELS[u.systemRole] ?? u.systemRole}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge isActive={u.isActive} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} title="Edit user"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => statusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                              disabled={statusMutation.isPending}
                              title={u.isActive ? 'Deactivate' : 'Activate'}
                              className={`p-1.5 rounded-lg transition ${
                                u.isActive
                                  ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {u.isActive ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/40 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page:</span>
                <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                  {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="ml-1">
                  {total === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, total)}`} of {total}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={safePage === 1}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition" title="First page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                  </svg>
                </button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition" title="Previous page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {pageNumbers.map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition ${
                        p === safePage ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}>
                      {p}
                    </button>
                  ),
                )}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition" title="Next page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition" title="Last page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalMode && (
        <UserFormModal mode={modalMode} user={editTarget} onClose={closeModal} onSuccess={showToast} />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
