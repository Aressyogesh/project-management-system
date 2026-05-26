import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { taskListsApi } from '../../../api/taskLists.api';
import { CreateTaskListPayload, TaskList, TaskListType } from '../../../types/taskList.types';

interface Props {
  projectId: string;
  editTaskList?: TaskList | null;
  onClose: () => void;
}

const TYPES: { value: TaskListType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'PROJECT_MANAGEMENT', label: 'Project Management' },
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'QA', label: 'QA' },
  { value: 'SPRINT', label: 'Sprint' },
];

export function TaskListFormModal({ projectId, editTaskList, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editTaskList;

  const [name, setName] = useState('');
  const [type, setType] = useState<TaskListType>('GENERAL');
  const [sprintNumber, setSprintNumber] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editTaskList) {
      setName(editTaskList.name);
      setType(editTaskList.type);
      setSprintNumber(editTaskList.sprintNumber?.toString() ?? '');
      setDescription(editTaskList.description ?? '');
    }
  }, [editTaskList]);

  const mutation = useMutation({
    mutationFn: (payload: CreateTaskListPayload) =>
      isEdit
        ? taskListsApi.update(editTaskList!.id, payload)
        : taskListsApi.create(projectId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-lists', projectId] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (type === 'SPRINT' && !sprintNumber) {
      setError('Sprint number is required for Sprint type.');
      return;
    }

    const payload: CreateTaskListPayload = {
      name: name.trim(),
      type,
      ...(type === 'SPRINT' && { sprintNumber: Number(sprintNumber) }),
      ...(description.trim() && { description: description.trim() }),
    };
    mutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5">
          {isEdit ? 'Edit Task List' : 'Add Task List'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={type}
              onChange={(e) => {
                setType(e.target.value as TaskListType);
                if (e.target.value !== 'SPRINT') setSprintNumber('');
              }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {type === 'SPRINT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sprint Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sprintNumber}
                onChange={(e) => setSprintNumber(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Description
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {(error || mutation.isError) && (
            <p className="text-xs text-red-600">
              {error || 'Something went wrong. Please try again.'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
