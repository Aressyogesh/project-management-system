import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { businessUnitsApi } from '../../../api/businessUnits.api';
import { RichTextEditor } from '../../../components/shared/RichTextEditor';
import type { BusinessUnit } from '../../../types/businessUnit.types';
import { usePageSize } from '../../../hooks/usePageSize';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ── Toast ──────────────────────────────────────────────────────────────────────

interface ToastState { message: string; type: 'success' | 'error' }

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
  bu?: BusinessUnit;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function BUFormModal({ bu, onClose, onSuccess }: FormModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState(bu?.name ?? '');
  const [description, setDescription] = useState(bu?.description ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      bu
        ? businessUnitsApi.update(bu.id, { name: name.trim(), description: description || undefined })
        : businessUnitsApi.create({ name: name.trim(), description: description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-units'] });
      onSuccess(bu ? 'Business unit updated successfully' : 'Business unit created successfully');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save business unit'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Business unit name is required'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {bu ? 'Edit Business Unit' : 'Add Business Unit'}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Business Unit Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Technology, Finance, Operations"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Optional description…"
              minHeight="120px"
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

export function BusinessUnitsPage() {
  const qc = useQueryClient();
  const [modalTarget, setModalTarget] = useState<BusinessUnit | null | 'create'>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('business-units');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message: string, type: ToastState['type'] = 'success') =>
    setToast({ message, type });

  const { data: all = [], isLoading, error } = useQuery({
    queryKey: ['business-units'],
    queryFn: () => businessUnitsApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      businessUnitsApi.setStatus(id, isActive),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['business-units'] });
      showToast(variables.isActive ? 'Business unit activated' : 'Business unit deactivated');
    },
  });

  const filtered = all.filter((bu) =>
    bu.name.toLowerCase().includes(search.toLowerCase()) ||
    (bu.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const active = all.filter((bu) => bu.isActive).length;

  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setPage(1); }
  function handleSearch(val: string) { setSearch(val); setPage(1); }

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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Business Unit Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {active} active · {all.length - active} inactive
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
            />
            <button
              onClick={() => setModalTarget('create')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Business Unit
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">Failed to load business units.</div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {search ? 'No results match your search.' : 'No business units yet. Click "Add Business Unit" to create one.'}
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {paged.map((bu, idx) => (
                  <tr key={bu.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {(safePage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{bu.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 max-w-xs">
                      {bu.description
                        ? <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: bu.description }} />
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge isActive={bu.isActive} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModalTarget(bu)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: bu.id, isActive: !bu.isActive })}
                          disabled={statusMutation.isPending}
                          title={bu.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition ${
                            bu.isActive
                              ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {bu.isActive ? (
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
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="ml-1">
                  {filtered.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)}`} of {filtered.length}
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
                    <button key={p} onClick={() => setPage(p)}
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

      {modalTarget && (
        <BUFormModal
          bu={modalTarget === 'create' ? undefined : modalTarget}
          onClose={() => setModalTarget(null)}
          onSuccess={showToast}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
