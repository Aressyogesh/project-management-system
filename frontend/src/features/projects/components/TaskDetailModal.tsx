import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { taskAttachmentsApi } from '../../../api/taskAttachments.api';
import { taskCommentsApi } from '../../../api/taskComments.api';
import type { Task, TaskPriority, TaskStatus } from '../../../types/task.types';

type Tab = 'details' | 'attachments' | 'comments';

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-600',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  ON_REVIEW: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  task: Task;
  onClose: () => void;
  canEdit: boolean;
  currentUserId: string;
}

export function TaskDetailModal({ task, onClose, canEdit, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>('details');
  const [commentText, setCommentText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', task.id],
    queryFn: () => taskAttachmentsApi.list(task.id),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', task.id],
    queryFn: () => taskCommentsApi.list(task.id),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => taskAttachmentsApi.upload(task.id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', task.id] }),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (id: string) => taskAttachmentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', task.id] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => taskCommentsApi.create(task.id, { content: commentText }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['comments', task.id] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => taskCommentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', task.id] }),
  });

  const tabs: Tab[] = ['details', 'attachments', 'comments'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-gray-900 truncate">{task.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{task.taskList.name}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px transition ${
                tab === t
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
              {t === 'attachments' && attachments.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
                  {attachments.length}
                </span>
              )}
              {t === 'comments' && comments.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
                  {comments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-gray-400 mb-1">Status</dt>
                <dd>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[task.status]}`}>
                    {task.status.replace(/_/g, ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-1">Priority</dt>
                <dd>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>
                    {task.priority}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-1">Billing</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {task.billingStatus.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-1">Estimated Hours</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {task.estimatedHours != null ? `${task.estimatedHours}h` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-1">Assigned To</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {task.assignedTo?.fullName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-1">Milestone</dt>
                <dd className="text-sm font-medium text-gray-800">
                  {task.milestone?.description ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-1">Start Date</dt>
                <dd className="text-sm font-medium text-gray-800">{task.startDate ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-1">Due Date</dt>
                <dd className="text-sm font-medium text-gray-800">{task.dueDate ?? '—'}</dd>
              </div>
              {task.description && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400 mb-1">Description</dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</dd>
                </div>
              )}
            </dl>
          )}

          {tab === 'attachments' && (
            <div className="space-y-4">
              {canEdit && (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt,.mp4"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadMutation.mutate(file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
                  >
                    {uploadMutation.isPending ? 'Uploading…' : 'Upload File'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOCX, XLSX, PNG, JPG, TXT, MP4 &bull; Max 10 MB
                  </p>
                </div>
              )}

              {attachments.length === 0 ? (
                <p className="text-sm text-gray-400">No attachments yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {attachments.map((att) => (
                    <li key={att.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {att.originalName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatBytes(att.size)} &bull; {att.uploadedBy.fullName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => taskAttachmentsApi.download(att.id, att.originalName)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Download
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => deleteAttachmentMutation.mutate(att.id)}
                            disabled={deleteAttachmentMutation.isPending}
                            className="text-xs text-red-500 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {c.author.fullName}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {(c.author.id === currentUserId || canEdit) && (
                            <button
                              onClick={() => deleteCommentMutation.mutate(c.id)}
                              disabled={deleteCommentMutation.isPending}
                              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-gray-100 pt-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => addCommentMutation.mutate()}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
                  >
                    {addCommentMutation.isPending ? 'Posting…' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
