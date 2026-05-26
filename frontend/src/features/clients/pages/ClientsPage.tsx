import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { clientsApi } from '../../../api/clients.api';
import type { Client } from '../../../types/clients.types';

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

interface FormState {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

const emptyForm = (): FormState => ({ name: '', contactPerson: '', email: '', phone: '', address: '' });

interface FormModalProps {
  client?: Client;
  onClose: () => void;
}

function ClientFormModal({ client, onClose }: FormModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(
    client
      ? { name: client.name, contactPerson: client.contactPerson, email: client.email, phone: client.phone ?? '', address: client.address ?? '' }
      : emptyForm(),
  );
  const [error, setError] = useState('');

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      client
        ? clientsApi.update(client.id, { name: form.name.trim(), contactPerson: form.contactPerson.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, address: form.address.trim() || undefined })
        : clientsApi.create({ name: form.name.trim(), contactPerson: form.contactPerson.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, address: form.address.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients-all'] }); onClose(); },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save client'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Client name is required'); return; }
    if (!form.contactPerson.trim()) { setError('Contact person is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    mutation.mutate();
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {client ? 'Edit Client' : 'Add Client'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className={labelCls}>Client Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={set('name')} required maxLength={150}
              placeholder="e.g. Acme Corporation" autoFocus className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Person <span className="text-red-500">*</span></label>
            <input type="text" value={form.contactPerson} onChange={set('contactPerson')} required maxLength={100}
              placeholder="e.g. Jane Smith" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} required
              placeholder="e.g. jane@acme.com" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input type="text" value={form.phone} onChange={set('phone')} maxLength={20}
                placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input type="text" value={form.address} onChange={set('address')} maxLength={300}
                placeholder="City, Country" className={inputCls} />
            </div>
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

export function ClientsPage() {
  const qc = useQueryClient();
  const [modalTarget, setModalTarget] = useState<Client | null | 'create'>(null);

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      clientsApi.setStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients-all'] }),
  });

  const active = clients.filter((c) => c.isActive).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Client Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {active} active · {clients.length - active} inactive
            </p>
          </div>
          <button
            onClick={() => setModalTarget('create')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">Failed to load clients.</div>
        ) : !clients.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            No clients yet. Click "Add Client" to create one.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{client.name}</div>
                        {client.address && <div className="text-xs text-gray-400">{client.address}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{client.contactPerson}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{client.email}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{client.phone ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge isActive={client.isActive} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalTarget(client)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ id: client.id, isActive: !client.isActive })}
                        disabled={statusMutation.isPending}
                        title={client.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg transition ${
                          client.isActive
                            ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {client.isActive ? (
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
        )}
      </div>

      {modalTarget && (
        <ClientFormModal
          client={modalTarget === 'create' ? undefined : modalTarget}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
