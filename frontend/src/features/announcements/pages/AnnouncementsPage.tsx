import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { announcementsApi, AnnouncementRecord, AnnouncementScope } from '../../../api/announcementsApi';
import { dashboardApi } from '../../../api/dashboard.api';
import { projectsApi } from '../../../api/projects.api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ProjectOption { id: string; name: string; }

function AddAnnouncementModal({
  isAdmin,
  projects,
  onClose,
  onSuccess,
}: {
  isAdmin: boolean;
  projects: ProjectOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<AnnouncementScope>(isAdmin ? 'GLOBAL' : 'PROJECT');
  const [projectId, setProjectId] = useState('');
  const [errors, setErrors] = useState<{ title?: string; content?: string; projectId?: string }>({});

  const { mutate, isPending } = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => { onSuccess(); onClose(); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!content.trim()) errs.content = 'Content is required';
    if (scope === 'PROJECT' && !projectId) errs.projectId = 'Please select a project';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutate({
      title: title.trim(),
      content: content.trim(),
      scope,
      projectId: scope === 'PROJECT' ? projectId : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">New Announcement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Scope selector — Admin/SuperAdmin only */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Audience</label>
              <div className="flex gap-3">
                {(['GLOBAL', 'PROJECT'] as AnnouncementScope[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={s}
                      checked={scope === s}
                      onChange={() => { setScope(s); setProjectId(''); setErrors((p) => ({ ...p, projectId: undefined })); }}
                      className="accent-gray-900"
                    />
                    <span className="text-sm text-gray-700">{s === 'GLOBAL' ? 'All users (Global)' : 'Project team only'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Project selector */}
          {scope === 'PROJECT' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Project *</label>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setErrors((p) => ({ ...p, projectId: undefined })); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400"
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.projectId && <p className="text-xs text-red-500 mt-1">{errors.projectId}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
              maxLength={200}
              placeholder="e.g. Sprint Planning Rescheduled"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setErrors((p) => ({ ...p, content: undefined })); }}
              maxLength={2000}
              rows={5}
              placeholder="Type your announcement message here…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400"
            />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{content.length}/2000</p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? 'Posting…' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnnouncementCard({
  item,
  canDelete,
  onDelete,
}: {
  item: AnnouncementRecord;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</h3>
              {item.scope === 'GLOBAL' ? (
                <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full font-medium">Global</span>
              ) : (
                <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full font-medium">
                  {item.project?.name ?? 'Project'}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: item.content }} />
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <span className="font-medium text-gray-500">{item.createdBy?.fullName ?? 'System'}</span>
              <span>·</span>
              <span title={new Date(item.createdAt).toLocaleString()}>{timeAgo(item.createdAt)}</span>
            </div>
          </div>
        </div>

        {canDelete && (
          <div className="shrink-0">
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Delete?</span>
                <button onClick={() => onDelete(item.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Yes</button>
                <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:text-gray-700">No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                title="Delete announcement"
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  const isAdmin = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';
  const isPm = user?.hasPmRole === true;

  useEffect(() => {
    if (user && !isAdmin && !isPm) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAdmin, isPm, navigate]);

  // Projects for the modal
  const { data: adminProjects = [] } = useQuery({
    queryKey: ['projects-list', 'active'],
    queryFn: () => projectsApi.list({ status: 'ACTIVE' }),
    enabled: isAdmin,
    staleTime: 120_000,
  });

  const { data: pmProjects = [] } = useQuery({
    queryKey: ['dashboard-projects-progress'],
    queryFn: dashboardApi.getProjectsProgress,
    enabled: isPm && !isAdmin,
    staleTime: 120_000,
  });

  const projects: ProjectOption[] = isAdmin
    ? adminProjects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
    : pmProjects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', page],
    queryFn: () => announcementsApi.list({ page, limit: 20 }),
    staleTime: 30_000,
    enabled: isAdmin || isPm,
  });

  const { mutate: deleteAnn } = useMutation({
    mutationFn: announcementsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  if (!user || (!isAdmin && !isPm)) return null;

  const items = data?.data ?? [];
  const lastPage = data?.lastPage ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isAdmin ? 'Manage all announcements for the organisation' : 'Post and manage announcements for your project team'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Announcement
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl py-16 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No announcements yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Announcement" to post the first one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item: AnnouncementRecord) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              canDelete={isAdmin || item.createdBy?.id === user?.id}
              onDelete={(id) => deleteAnn(id)}
            />
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {lastPage}</span>
          <button
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <AddAnnouncementModal
          isAdmin={isAdmin}
          projects={projects}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['announcements'] });
            qc.invalidateQueries({ queryKey: ['announcements', 'latest'] });
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
