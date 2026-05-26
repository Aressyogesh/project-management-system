import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { clientsApi } from '../../../api/clients.api';
import { departmentsApi } from '../../../api/departments.api';
import { projectsApi } from '../../../api/projects.api';
import type { Project, ProjectType } from '../../../types/projects.types';

interface Props {
  project?: Project;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'DEDICATED', label: 'Dedicated' },
  { value: 'T_AND_M', label: 'T&M' },
  { value: 'FIXED', label: 'Fixed' },
];

export function ProjectFormModal({ project, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(project?.name ?? '');
  const [projectType, setProjectType] = useState<ProjectType>(project?.projectType ?? 'DEDICATED');
  const [clientId, setClientId] = useState(project?.client?.id ?? '');
  const [departmentId, setDepartmentId] = useState(project?.department?.id ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [startDate, setStartDate] = useState(project?.startDate?.split('T')[0] ?? '');
  const [endDate, setEndDate] = useState(project?.endDate?.split('T')[0] ?? '');
  const [budget, setBudget] = useState(project?.budget ?? '');
  const [error, setError] = useState('');

  const { data: clients = [] } = useQuery({ queryKey: ['clients-active'], queryFn: () => clientsApi.list(false) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments-active'], queryFn: () => departmentsApi.list(false) });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        projectType,
        clientId: clientId || undefined,
        departmentId: departmentId || undefined,
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budget: budget ? Number(budget) : undefined,
      };
      return project ? projectsApi.update(project.id, payload) : projectsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects-summary'] });
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save project'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Project name is required'); return; }
    if (startDate && endDate && endDate < startDate) { setError('End date must be on or after start date'); return; }
    mutation.mutate();
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const selectCls = inputCls + ' bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">
            {project ? 'Edit Project' : 'Create Project'}
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
            <label className={labelCls}>Project Name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              required maxLength={200} placeholder="e.g. Alpha Mobile App" autoFocus className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Project Type <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setProjectType(opt.value)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${
                    projectType === opt.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={1000} rows={3} placeholder="Brief project overview…"
              className={inputCls + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Budget (₹)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
              min={0} step={1000} placeholder="e.g. 500000" className={inputCls} />
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
