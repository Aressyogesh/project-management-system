import { useState } from 'react';
import { apiClient } from '../../../api/client';
import { ActionIntent } from '../../../api/ai.api';

interface Props {
  action: ActionIntent;
  onConfirm: (successMsg: string) => void;
  onCancel: () => void;
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDetails(action: ActionIntent): { title: string; description: string } {
  if (action.type === 'UPDATE_TASK_STATUS')
    return {
      title: `Move to ${formatStatus(action.newStatus)}`,
      description: `[${action.displayId}] ${action.title}`,
    };
  if (action.type === 'LOG_TIMESHEET')
    return {
      title: `Log ${action.hours} hour${action.hours !== 1 ? 's' : ''}`,
      description: `[${action.displayId}] ${action.title} · ${action.date}`,
    };
  return {
    title: 'Submit Leave Request',
    description: `${action.startDate} → ${action.endDate}${action.reason ? ` · ${action.reason}` : ''}`,
  };
}

export function ActionConfirmCard({ action, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let msg = '';
      if (action.type === 'UPDATE_TASK_STATUS') {
        await apiClient.patch(`/work-items/${action.workItemId}/move`, { status: action.newStatus });
        msg = `Done! ${action.displayId} is now ${formatStatus(action.newStatus)}.`;
      } else if (action.type === 'LOG_TIMESHEET') {
        await apiClient.post(`/work-items/${action.workItemId}/timesheet-entries`, {
          date: action.date,
          hours: action.hours,
          description: 'Logged via AI assistant',
        });
        msg = `Done! ${action.hours} hour${action.hours !== 1 ? 's' : ''} logged on ${action.displayId}.`;
      } else if (action.type === 'SUBMIT_LEAVE') {
        await apiClient.post('/leave-requests', {
          type: action.leaveType || 'OTHER',
          startDate: action.startDate,
          endDate: action.endDate,
          reason: action.reason,
        });
        msg = `Done! Leave request from ${action.startDate} to ${action.endDate} has been submitted.`;
      }
      onConfirm(msg);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      onConfirm(`Action failed: ${apiErr?.response?.data?.message ?? 'please try again'}.`);
    } finally {
      setLoading(false);
    }
  };

  const { title, description } = getDetails(action);

  return (
    <div className="mx-3 mb-2 p-3 bg-primary-50 border border-primary-200 rounded-xl text-sm">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-primary-800 text-xs leading-tight">{title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Processing…' : 'Confirm'}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-1.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
