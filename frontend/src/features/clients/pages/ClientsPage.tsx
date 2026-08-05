import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { businessUnitsApi } from '../../../api/businessUnits.api';
import { clientsApi } from '../../../api/clients.api';
import type { AdditionalContact, Client } from '../../../types/clients.types';
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

interface FormState {
  name: string; contactPerson: string; designation: string; email: string;
  phone: string; address: string; businessUnitId: string;
}
const emptyForm = (): FormState => ({ name: '', contactPerson: '', designation: '', email: '', phone: '', address: '', businessUnitId: '' });
const emptyContact = (): AdditionalContact => ({ contactPerson: '', designation: '', email: '', phone: '', address: '' });

interface FormModalProps {
  client?: Client;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function ClientFormModal({ client, onClose, onSuccess }: FormModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(
    client
      ? { name: client.name, contactPerson: client.contactPerson, designation: client.designation ?? '', email: client.email, phone: client.phone ?? '', address: client.address ?? '', businessUnitId: client.businessUnit?.id ?? '' }
      : emptyForm(),
  );
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>(
    client?.additionalContacts ?? [],
  );
  const [error, setError] = useState('');

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['business-units-active'],
    queryFn: () => businessUnitsApi.list(false),
  });

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function addContact() {
    setAdditionalContacts((prev) => [...prev, emptyContact()]);
  }

  function removeContact(idx: number) {
    setAdditionalContacts((prev) => prev.filter((_, i) => i !== idx));
  }

  function setContact(idx: number, field: keyof AdditionalContact, value: string) {
    setAdditionalContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  }

  const mutation = useMutation({
    mutationFn: () => {
      const cleaned = additionalContacts
        .filter((c) => c.contactPerson.trim())
        .map((c) => ({
          contactPerson: c.contactPerson.trim(),
          designation: c.designation?.trim() || undefined,
          email: c.email?.trim() || undefined,
          phone: c.phone?.trim() || undefined,
          address: c.address?.trim() || undefined,
        }));
      return client
        ? clientsApi.update(client.id, {
            name: form.name.trim(), contactPerson: form.contactPerson.trim(),
            designation: form.designation.trim() || null,
            email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(),
            businessUnitId: form.businessUnitId || null,
            additionalContacts: cleaned,
          })
        : clientsApi.create({
            name: form.name.trim(), contactPerson: form.contactPerson.trim(),
            designation: form.designation.trim() || undefined,
            email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(),
            businessUnitId: form.businessUnitId || undefined,
            additionalContacts: cleaned,
          });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients-all'] });
      onSuccess(client ? 'Client updated successfully' : 'Client created successfully');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save client'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Client name is required'); return; }
    if (!form.contactPerson.trim()) { setError('Contact person is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (form.phone.trim() && !/^[+\d\s\-().]{7,20}$/.test(form.phone.trim())) {
      setError('Phone number may only contain digits, spaces, +, -, (, ) and must be 7–20 characters.'); return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{client ? 'Edit Client' : 'Add Client'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className={labelCls}>Business Unit</label>
            <select value={form.businessUnitId} onChange={set('businessUnitId')} className={sel(form.businessUnitId)}>
              <option value="">Select Business Unit</option>
              {businessUnits.map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Client Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={set('name')} required maxLength={150}
              placeholder="e.g. Acme Corporation" autoFocus className={inputCls} />
          </div>

          {/* Primary contact */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Contact Person <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={addContact}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition"
                title="Add another contact person"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Contact
              </button>
            </div>
            <input type="text" value={form.contactPerson} onChange={set('contactPerson')} required maxLength={100}
              placeholder="e.g. Jane Smith" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Designation</label>
            <input type="text" value={form.designation} onChange={set('designation')} maxLength={100}
              placeholder="e.g. CTO, Project Lead" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} required
              placeholder="e.g. jane@acme.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="text" value={form.phone} onChange={set('phone')} maxLength={20}
              placeholder="+91 98765 43210" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <textarea
              value={form.address}
              onChange={set('address')}
              rows={3}
              placeholder="Full address"
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Additional contacts */}
          {additionalContacts.map((contact, idx) => (
            <div key={idx} className="border border-[#cccccc] rounded-xl p-4 space-y-3 bg-gray-50/50 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact {idx + 2}</span>
                <button
                  type="button"
                  onClick={() => removeContact(idx)}
                  className="flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Remove contact"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input
                  type="text"
                  value={contact.contactPerson}
                  onChange={(e) => setContact(idx, 'contactPerson', e.target.value)}
                  maxLength={100}
                  placeholder="e.g. John Doe"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Designation</label>
                <input
                  type="text"
                  value={contact.designation ?? ''}
                  onChange={(e) => setContact(idx, 'designation', e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Manager"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={contact.email ?? ''}
                  onChange={(e) => setContact(idx, 'email', e.target.value)}
                  placeholder="e.g. john@acme.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="text"
                  value={contact.phone ?? ''}
                  onChange={(e) => setContact(idx, 'phone', e.target.value)}
                  maxLength={20}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <textarea
                  value={contact.address ?? ''}
                  onChange={(e) => setContact(idx, 'address', e.target.value)}
                  rows={2}
                  placeholder="Full address"
                  className={inputCls + ' resize-none'}
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</button>
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

export function ClientsPage() {
  const qc = useQueryClient();
  const [modalTarget, setModalTarget] = useState<Client | null | 'create'>(null);
  const [filterBuId, setFilterBuId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('clients');
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

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.list(true),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => clientsApi.setStatus(id, isActive),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['clients-all'] });
      setToast(variables.isActive ? 'Client activated' : 'Client deactivated');
    },
    onError: (err: any) => setToast(err?.response?.data?.message ?? 'Failed to update client status'),
  });

  const filtered = filterBuId
    ? clients.filter((c) => c.businessUnit?.id === filterBuId)
    : clients;

  const active = clients.filter((c) => c.isActive).length;
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
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Client Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {active} active · {clients.length - active} inactive
              {filterBuId && filtered.length !== clients.length && ` · ${filtered.length} shown`}
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
            <button onClick={() => setModalTarget('create')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm overflow-hidden">
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
          <>
            <table className="min-w-full divide-y divide-gray-50">
              <thead style={{ backgroundColor: '#d9dce1' }}>
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Business Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {paged.map((client) => (
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
                          <Link
                            to={`/projects?clientId=${client.id}`}
                            className="text-sm font-medium text-gray-800 hover:text-primary-600 hover:underline transition"
                          >
                            {client.name}
                          </Link>
                          {client.address && <div className="text-xs text-gray-400">{client.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {client.businessUnit ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {client.businessUnit.name}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{client.contactPerson}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{client.email}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{client.phone ?? '—'}</td>
                    <td className="px-5 py-3.5"><StatusBadge isActive={client.isActive} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModalTarget(client)} title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: client.id, isActive: !client.isActive })}
                          disabled={statusMutation.isPending}
                          title={client.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition ${client.isActive ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
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
        <ClientFormModal
          client={modalTarget === 'create' ? undefined : modalTarget}
          onClose={() => setModalTarget(null)}
          onSuccess={setToast}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
