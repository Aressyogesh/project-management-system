import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { taskAllocationsApi } from '../../../api/taskAllocations.api';
import type { TaskAllocation } from '../../../types/taskAllocation.types';
import type { Task } from '../../../types/task.types';
import type { ProjectMember } from '../../../types/projects.types';
import { futureDateStr, pastDateStr } from '../../../utils/dateUtils';

interface Props {
  projectId: string;
  tasks: Task[];
  members: ProjectMember[];
  allocation?: TaskAllocation;
  onClose: () => void;
}

export function AllocationFormModal({ projectId, tasks, members, allocation, onClose }: Props) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [taskId, setTaskId] = useState(allocation?.task.id ?? '');
  const [userId, setUserId] = useState(allocation?.user.id ?? '');
  const [date, setDate] = useState(allocation?.date?.split('T')[0] ?? today);
  const [allocatedHours, setAllocatedHours] = useState(
    allocation?.allocatedHours?.toString() ?? '1',
  );
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const hours = parseFloat(allocatedHours);
      if (allocation) {
        return taskAllocationsApi.update(allocation.id, { allocatedHours: hours });
      }
      return taskAllocationsApi.create(projectId, {
        taskId,
        userId,
        date,
        allocatedHours: hours,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-allocations', projectId] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save allocation'));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!allocation && !taskId) { setError('Please select a task'); return; }
    if (!allocation && !userId) { setError('Please select a team member'); return; }
    const hours = parseFloat(allocatedHours);
    if (isNaN(hours) || hours < 0.5 || hours > 8) {
      setError('Allocated hours must be between 0.5 and 8');
      return;
    }
    mutation.mutate();
  }

  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {allocation ? 'Edit Allocation' : 'Log Hours'}
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

          {!allocation && (
            <div>
              <label className={labelCls}>Task <span className="text-red-500">*</span></label>
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={inputCls}>
                <option value="">— Select task —</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {allocation && (
            <div>
              <label className={labelCls}>Task</label>
              <p className="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded-lg border border-[#cccccc]">
                {allocation.task.title}
              </p>
            </div>
          )}

          {!allocation && (
            <div>
              <label className={labelCls}>Team Member <span className="text-red-500">*</span></label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
                <option value="">— Select member —</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {allocation && (
            <div>
              <label className={labelCls}>Member</label>
              <p className="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded-lg border border-[#cccccc]">
                {allocation.user.fullName}
              </p>
            </div>
          )}

          {!allocation && (
            <div>
              <label className={labelCls}>Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={date}
                min={pastDateStr(5)}
                max={futureDateStr(5)}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Hours <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={allocatedHours}
              onChange={(e) => setAllocatedHours(e.target.value)}
              min="0.5"
              max="8"
              step="0.5"
              className={inputCls}
              autoFocus={!!allocation}
            />
            <p className="text-xs text-gray-400 mt-1">Daily cap: 8h per user across all tasks.</p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition"
            >
              {mutation.isPending ? 'Saving…' : allocation ? 'Save' : 'Log Hours'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
