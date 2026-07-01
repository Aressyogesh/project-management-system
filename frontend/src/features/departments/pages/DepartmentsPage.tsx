import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { businessUnitsApi } from '../../../api/businessUnits.api';
import { departmentsApi } from '../../../api/departments.api';
import type { Department } from '../../../types/users.types';
import { usePageSize } from '../../../hooks/usePageSize';
import { FilterCombobox } from '../../../components/shared/FilterCombobox';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const sel = (v: string) => `${inputCls} ${!v ? 'text-gray-400' : 'text-gray-900'}`;

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-gray-900 min-w-[240px] max-w-xs animate-fade-in">
      <svg className="w-4 h-4 shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition ml-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── Form modal ─────────────────────────────────────────────────────────────────

interface FormModalProps {
  dept?: Department;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function DepartmentFormModal({ dept, onClose, onSuccess }: FormModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState(dept?.name ?? '');
  const [businessUnitId, setBusinessUnitId] = useState(dept?.businessUnit?.id ?? '');
  const [error, setError] = useState('');

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['business-units-active'],
    queryFn: () => businessUnitsApi.list(false),
  });

  const mutation = useMutation({
    mutationFn: () =>
      dept
        ? departmentsApi.update(dept.id, { name: name.trim(), businessUnitId: businessUnitId || null })
        : departmentsApi.create({ name: name.trim(), businessUnitId: businessUnitId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments-all'] });
      onSuccess(dept ? 'Department updated successfully' : 'Department created successfully');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save department'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Department name is required'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {dept ? 'Edit Department' : 'Add Department'}
          </h2>
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
            <label className={labelCls}>Business Unit</label>
            <select value={businessUnitId} onChange={(e) => setBusinessUnitId(e.target.value)} className={sel(businessUnitId)}>
              <option value="">Select Business Unit</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>{bu.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Department Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Digital, Mobile, SalesForce"
              autoFocus
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DepartmentsPage() {
  const qc = useQueryClient();
  const [modalTarget, setModalTarget] = useState<Department | null | 'create'>(null);
  const [filterBuId, setFilterBuId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('departments');
  const [toast, setToast] = useState<string | null>(null);

  const { data: businessUnits = [], isLoading: buLoading } = useQuery({
    queryKey: ['business-units-active'],
    queryFn: () => businessUnitsApi.list(false),
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: departments = [], isLoading, error } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentsApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      departmentsApi.setStatus(id, isActive),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['departments-all'] });
      setToast(variables.isActive ? 'Department activated' : 'Department deactivated');
    },
  });

  const filtered = filterBuId
    ? departments.filter((d) => d.businessUnit?.id === filterBuId)
    : departments;

  const active = departments.filter((d) => d.isActive).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setPage(1); }
  function handleBuFilter(id: string) { setFilterBuId(id); setPage(1); }

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
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Department Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {active} active · {departments.length - active} inactive
              {filterBuId && filtered.length !== departments.length && ` · ${filtered.length} shown`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterCombobox
              options={businessUnits.map((bu) => ({ id: bu.id, name: bu.name }))}
              value={filterBuId}
              onChange={handleBuFilter}
              placeholder="All Business Units"
              loading={buLoading}
            />
            <button
              onClick={() => setModalTarget('create')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Department
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">Failed to load departments.</div>
        ) : !departments.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            No departments yet. Click "Add Department" to create one.
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {paged.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {dept.businessUnit ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {dept.businessUnit.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge isActive={dept.isActive} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModalTarget(dept)} title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: dept.id, isActive: !dept.isActive })}
                          disabled={statusMutation.isPending}
                          title={dept.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition ${dept.isActive ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                        >
                          {dept.isActive ? (
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/40 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page:</span>
                <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                  {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="ml-1">
                  {filtered.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)}`} of {filtered.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={safePage === 1} title="First page"
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} title="Previous"
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                {pageNumbers.map((p, i) =>
                  p === '…' ? <span key={`e-${i}`} className="px-1.5 text-xs text-gray-400">…</span> : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition ${p === safePage ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} title="Next"
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} title="Last page"
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalTarget && (
        <DepartmentFormModal
          dept={modalTarget === 'create' ? undefined : modalTarget}
          onClose={() => setModalTarget(null)}
          onSuccess={setToast}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
