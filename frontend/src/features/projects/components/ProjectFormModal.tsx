import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { businessUnitsApi } from '../../../api/businessUnits.api';
import { clientsApi } from '../../../api/clients.api';
import { departmentsApi } from '../../../api/departments.api';
import { projectsApi } from '../../../api/projects.api';
import type { Project, ProjectType } from '../../../types/projects.types';
import { RichTextEditor } from '../../../components/shared/RichTextEditor';
import { futureDateStr, pastDateStr } from '../../../utils/dateUtils';

interface Props {
  project?: Project;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'DEDICATED', label: 'Dedicated' },
  { value: 'T_AND_M', label: 'T&M' },
  { value: 'FIXED', label: 'Fixed' },
];

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const sel = (v: string) => `${inputCls} bg-white ${!v ? 'text-gray-400' : 'text-gray-900'}`;

export function ProjectFormModal({ project, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(project?.name ?? '');
  const [projectType, setProjectType] = useState<ProjectType>(project?.projectType ?? 'DEDICATED');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [buInitialised, setBuInitialised] = useState(false);
  const [clientId, setClientId] = useState(project?.client?.id ?? '');
  const [departmentId, setDepartmentId] = useState(project?.department?.id ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [startDate, setStartDate] = useState(project?.startDate?.split('T')[0] ?? '');
  const [endDate, setEndDate] = useState(project?.endDate?.split('T')[0] ?? '');
  const [isOngoing, setIsOngoing] = useState(project ? (project.projectType === 'DEDICATED' && !project.endDate) : false);
  const [error, setError] = useState('');

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['business-units-active'],
    queryFn: () => businessUnitsApi.list(false),
  });
  const { data: clients = [] } = useQuery({ queryKey: ['clients-active'], queryFn: () => clientsApi.list(false) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments-active'], queryFn: () => departmentsApi.list(false) });

  // Pre-select business unit when editing an existing project
  useEffect(() => {
    if (!project || buInitialised) return;
    if (!clients.length && !departments.length) return;
    const buFromClient = clients.find((c) => c.id === project.client?.id)?.businessUnit?.id;
    const buFromDept = departments.find((d) => d.id === project.department?.id)?.businessUnit?.id;
    const resolvedBu = buFromClient ?? buFromDept ?? '';
    if (resolvedBu) setBusinessUnitId(resolvedBu);
    setBuInitialised(true);
  }, [clients, departments]);

  // Filter clients and departments to BU scope when a BU is selected
  const filteredClients = businessUnitId
    ? clients.filter((c) => c.businessUnit?.id === businessUnitId)
    : clients;
  const filteredDepartments = businessUnitId
    ? departments.filter((d) => d.businessUnit?.id === businessUnitId)
    : departments;

  function handleBusinessUnitChange(buId: string) {
    setBusinessUnitId(buId);
    // Reset client/department if they no longer belong to the new BU
    if (buId) {
      const buClients = clients.filter((c) => c.businessUnit?.id === buId);
      const buDepts = departments.filter((d) => d.businessUnit?.id === buId);
      if (!buClients.find((c) => c.id === clientId)) {
        setClientId(buClients.length === 1 ? buClients[0].id : '');
      }
      if (!buDepts.find((d) => d.id === departmentId)) {
        setDepartmentId(buDepts.length === 1 ? buDepts[0].id : '');
      }
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(), projectType,
        clientId: clientId || undefined,
        departmentId: departmentId || undefined,
        description: description || undefined,
        startDate: startDate || undefined,
        endDate: isOngoing ? null : (endDate || undefined),
      };
      return project ? projectsApi.update(project.id, payload) : projectsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects-summary'] });
      onSuccess?.(project ? 'Project updated successfully' : 'Project created successfully');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save project'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Project name is required'); return; }
    if (!isOngoing && startDate && endDate && endDate < startDate) { setError('End date must be on or after start date'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
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
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

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
                  onClick={() => {
                    setProjectType(opt.value);
                    if (opt.value !== 'DEDICATED') setIsOngoing(false);
                  }}
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

          {/* Business Unit — filters client & department on selection */}
          {businessUnits.length > 0 && (
            <div>
              <label className={labelCls}>Business Unit</label>
              <select
                value={businessUnitId}
                onChange={(e) => handleBusinessUnitChange(e.target.value)}
                className={sel(businessUnitId)}
              >
                <option value="">Select Business Unit</option>
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>{bu.name}</option>
                ))}
              </select>
              {businessUnitId && (
                <p className="text-[11px] text-primary-600 mt-1">
                  Client and department filtered to this business unit.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={sel(clientId)}>
                <option value="">Select Client</option>
                {filteredClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {businessUnitId && filteredClients.length === 0 && (
                <p className="text-[11px] text-amber-500 mt-1">No clients linked to this BU.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={sel(departmentId)}>
                <option value="">Select Department</option>
                {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {businessUnitId && filteredDepartments.length === 0 && (
                <p className="text-[11px] text-amber-500 mt-1">No departments linked to this BU.</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <RichTextEditor value={description} onChange={setDescription} placeholder="Brief project overview…" minHeight="100px" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={startDate} min={pastDateStr(10)} max={futureDateStr(10)} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">End Date</label>
                {projectType === 'DEDICATED' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={isOngoing}
                      onChange={(e) => { setIsOngoing(e.target.checked); if (e.target.checked) setEndDate(''); }}
                      className="w-3.5 h-3.5 rounded accent-primary-600" />
                    <span className="text-xs text-gray-500">Ongoing</span>
                  </label>
                )}
              </div>
              {isOngoing && projectType === 'DEDICATED' ? (
                <div className="w-full px-3 py-2 text-sm border border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-400">
                  No end date (ongoing)
                </div>
              ) : (
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || pastDateStr(10)} max={futureDateStr(10)} className={inputCls} />
              )}
            </div>
          </div>

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
