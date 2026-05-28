import { useState } from 'react';
import { useSprints } from '../hooks/useSprints';
import type { Sprint } from '../types/board.types';

interface Props {
  projectId: string;
  onClose: () => void;
}

interface SprintFormState {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}

const emptyForm = (): SprintFormState => ({ name: '', goal: '', startDate: '', endDate: '' });

export function SprintManager({ projectId, onClose }: Props) {
  const { sprints, isLoading, create, update, activate, remove } = useSprints(projectId);
  const [form, setForm] = useState<SprintFormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function startCreate() {
    setEditId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function startEdit(s: Sprint) {
    setEditId(s.id);
    setForm({
      name: s.name,
      goal: s.goal ?? '',
      startDate: s.startDate ? s.startDate.slice(0, 10) : '',
      endDate: s.endDate ? s.endDate.slice(0, 10) : '',
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      goal: form.goal.trim() || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };
    if (editId) {
      await update.mutateAsync({ id: editId, data });
    } else {
      await create.mutateAsync(data);
    }
    cancelForm();
  }

  async function handleActivate(id: string) {
    await activate.mutateAsync(id);
  }

  async function handleDelete(id: string) {
    await remove.mutateAsync(id);
    setDeleteConfirm(null);
  }

  const isPending = create.isPending || update.isPending || activate.isPending || remove.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Manage Sprints</h2>
            <p className="text-xs text-gray-400 mt-0.5">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startCreate}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Sprint
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
            <p className="text-xs font-semibold text-gray-700 mb-3">{editId ? 'Edit Sprint' : 'New Sprint'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Sprint Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sprint 1"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Sprint Goal</label>
                <input
                  type="text"
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder="What is the goal of this sprint?"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || isPending}
                className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {editId ? 'Save Changes' : 'Create Sprint'}
              </button>
              <button
                onClick={cancelForm}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sprint list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading…</div>
          ) : sprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-sm text-gray-400">
              <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              No sprints yet. Click "New Sprint" to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sprints.map((s) => (
                <div key={s.id} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                      {s.isActive && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {s.goal && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.goal}</p>}
                    {(s.startDate || s.endDate) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.startDate ? new Date(s.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        {' → '}
                        {s.endDate ? new Date(s.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!s.isActive && (
                      <button
                        onClick={() => handleActivate(s.id)}
                        disabled={isPending}
                        title="Set as active sprint"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition text-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(s)}
                      title="Edit sprint"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {deleteConfirm === s.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={isPending}
                          className="text-[10px] font-medium text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(s.id)}
                        title="Delete sprint"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
