import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { milestonesApi } from '../../../api/milestones.api';
import { projectsApi } from '../../../api/projects.api';
import type { Milestone, MilestoneStatus } from '../../../types/milestones.types';
import { futureDateStr, pastDateStr } from '../../../utils/dateUtils';
import { RichTextEditor } from '../../../components/shared/RichTextEditor';

interface Props {
  projectId: string;
  milestone?: Milestone;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DELAYED', label: 'Delayed' },
];

export function MilestoneFormModal({ projectId, milestone, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(milestone?.name ?? '');
  const [description, setDescription] = useState(milestone?.description ?? '');
  const deliveryNote = milestone?.deliveryNote ?? undefined;
  const [startDate, setStartDate] = useState(milestone?.startDate?.split('T')[0] ?? '');
  const [dueDate, setDueDate] = useState(milestone?.dueDate?.split('T')[0] ?? '');
  const [responsibleUserId, setResponsibleUserId] = useState(milestone?.responsibleUser?.id ?? '');
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? 'NOT_STARTED');
  const [error, setError] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.listMembers(projectId),
  });
  const activeUsers = members.map((m) => ({ id: m.user.id, fullName: m.user.fullName }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim() || undefined,
        description: description.trim(),
        deliveryNote: deliveryNote || undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        responsibleUserId: responsibleUserId || undefined,
        status,
      };
      return milestone
        ? milestonesApi.update(milestone.id, payload)
        : milestonesApi.create(projectId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', projectId] });
      onSuccess?.(milestone ? 'Milestone updated successfully' : 'Milestone added successfully');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save milestone'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!description.trim() || description === '<p></p>') { setError('Description is required'); return; }
    if (startDate && dueDate && dueDate < startDate) { setError('Due date must be on or after start date'); return; }
    mutation.mutate();
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {milestone ? 'Edit Milestone' : 'Add Milestone'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
            )}

            <div>
              <label className={labelCls}>Name <span className="text-red-500">*</span></label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                maxLength={200} placeholder="e.g. Phase-1 Admin Module" autoFocus
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Description <span className="text-red-500">*</span></label>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-primary-500">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe what will be delivered at this milestone…"
                  minHeight="120px"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" value={startDate} min={pastDateStr(5)} max={futureDateStr(10)} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  min={startDate || pastDateStr(5)} max={futureDateStr(10)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Responsible User</label>
              <select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as MilestoneStatus)} className={inputCls}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
              {mutation.isPending ? 'Saving…' : milestone ? 'Save Changes' : 'Add Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
