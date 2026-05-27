import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { tasksApi } from '../../../api/tasks.api';
import type { BillingStatus, CreateTaskPayload, MilestoneRef, Task, TaskListRef, TaskPriority, TaskStatus, TaskUser } from '../../../types/task.types';

interface Props {
  projectId: string;
  taskLists: TaskListRef[];
  milestones: MilestoneRef[];
  members: TaskUser[];
  editTask?: Task | null;
  onClose: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_REVIEW', label: 'On Review' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function TaskFormModal({ projectId, taskLists, milestones, members, editTask, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editTask;

  const [title, setTitle] = useState('');
  const [taskListId, setTaskListId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [billingStatus, setBillingStatus] = useState<BillingStatus>('BILLABLE');
  const [status, setStatus] = useState<TaskStatus>('NOT_STARTED');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setTaskListId(editTask.taskList.id);
      setMilestoneId(editTask.milestone?.id ?? '');
      setDescription(editTask.description ?? '');
      setAssignedToId(editTask.assignedTo?.id ?? '');
      setEstimatedHours(editTask.estimatedHours ?? '');
      setPriority(editTask.priority);
      setBillingStatus(editTask.billingStatus);
      setStatus(editTask.status);
      setStartDate(editTask.startDate ?? '');
      setDueDate(editTask.dueDate ?? '');
    } else if (taskLists.length > 0) {
      setTaskListId(taskLists[0].id);
    }
  }, [editTask, taskLists]);

  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      isEdit
        ? tasksApi.update(editTask!.id, payload)
        : tasksApi.create(projectId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Something went wrong. Please try again.'));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: CreateTaskPayload = {
      title: title.trim(),
      taskListId,
      ...(milestoneId && { milestoneId }),
      ...(description.trim() && { description: description.trim() }),
      ...(assignedToId && { assignedToId }),
      ...(estimatedHours && { estimatedHours: parseFloat(estimatedHours) }),
      priority,
      billingStatus,
      status,
      ...(startDate && { startDate }),
      ...(dueDate && { dueDate }),
    };
    mutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5">
          {isEdit ? 'Edit Task' : 'Add Task'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Task List <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={taskListId}
                onChange={(e) => setTaskListId(e.target.value)}
                required
              >
                {taskLists.length === 0 && <option value="">— No task lists —</option>}
                {taskLists.map((tl) => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Milestone</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
              >
                <option value="">— None —</option>
                {milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>{ms.description}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assignee</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Est. Hours</label>
              <input
                type="number"
                min={0}
                max={9999}
                step={0.5}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Billing</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={billingStatus}
                onChange={(e) => setBillingStatus(e.target.value as BillingStatus)}
              >
                <option value="BILLABLE">Billable</option>
                <option value="NON_BILLABLE">Non-Billable</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                min={startDate || undefined}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {serverError && (
            <p className="text-xs text-red-600">{serverError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
