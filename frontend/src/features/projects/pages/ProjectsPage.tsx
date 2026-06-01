import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectsApi } from '../../../api/projects.api';
import { clientsApi } from '../../../api/clients.api';
import { useAuthStore } from '../../../store/authStore';
import type { Project, ProjectStatus, ProjectType } from '../../../types/projects.types';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { usePageSize } from '../../../hooks/usePageSize';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TYPE_LABEL: Record<ProjectType, string> = { DEDICATED: 'Dedicated', T_AND_M: 'T&M', FIXED: 'Fixed' };
const TYPE_COLOR: Record<ProjectType, string> = {
  DEDICATED: 'bg-blue-100 text-blue-700',
  T_AND_M: 'bg-purple-100 text-purple-700',
  FIXED: 'bg-orange-100 text-orange-700',
};
const STATUS_COLOR: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVE: 'bg-gray-100 text-gray-500',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
};
const STATUS_LABEL: Record<ProjectStatus, string> = { ACTIVE: 'Active', ARCHIVE: 'Archive', ON_HOLD: 'On Hold' };

type QuickFilter = 'ACTIVE' | 'ARCHIVE' | 'ON_HOLD' | 'DEDICATED' | 'T_AND_M' | 'FIXED' | 'OVERDUE' | '';

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

// ── Page ───────────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');
  const [clientFilter, setClientFilter] = useState(searchParams.get('clientId') ?? '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('projects');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: allProjects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['projects-summary'],
    queryFn: () => projectsApi.summary(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.list(true),
  });

  const isOverdue = (p: Project) =>
    p.status === 'ACTIVE' && p.endDate !== null && new Date(p.endDate) < new Date();

  const filtered = allProjects.filter((p) => {
    if (clientFilter && p.client?.id !== clientFilter) return false;
    if (!quickFilter) return p.status !== 'ARCHIVE';
    if (quickFilter === 'ACTIVE') return p.status === 'ACTIVE';
    if (quickFilter === 'ARCHIVE') return p.status === 'ARCHIVE';
    if (quickFilter === 'ON_HOLD') return p.status === 'ON_HOLD';
    if (quickFilter === 'DEDICATED') return p.projectType === 'DEDICATED';
    if (quickFilter === 'T_AND_M') return p.projectType === 'T_AND_M';
    if (quickFilter === 'FIXED') return p.projectType === 'FIXED';
    if (quickFilter === 'OVERDUE') return isOverdue(p);
    return true;
  });

  const archivedCount = allProjects.filter((p) => p.status === 'ARCHIVE').length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleFilterChange(f: QuickFilter) { setQuickFilter(quickFilter === f ? '' : f); setPage(1); }
  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setPage(1); }
  function handleClientFilter(id: string) {
    setClientFilter(id);
    setPage(1);
    if (id) setSearchParams({ clientId: id });
    else setSearchParams({});
  }

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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) => projectsApi.setStatus(id, status),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects-summary'] });
      const label = variables.status === 'ARCHIVE' ? 'archived' : variables.status === 'ACTIVE' ? 'restored to active' : 'put on hold';
      setToast(`Project ${label}`);
    },
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Projects</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {filtered.length} project{filtered.length !== 1 ? 's' : ''}
              {(quickFilter || clientFilter) && (
                <button onClick={() => { setQuickFilter(''); handleClientFilter(''); }} className="ml-2 text-primary-600 hover:underline">
                  Clear filters
                </button>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Client filter */}
            <select
              value={clientFilter}
              onChange={(e) => handleClientFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!quickFilter && archivedCount > 0 && (
              <button onClick={() => handleFilterChange('ARCHIVE')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Show Archived ({archivedCount})
              </button>
            )}
            {canEdit && (
              <button onClick={() => { setEditTarget(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Panel */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {([
            { label: 'Active',    value: summary.active,    color: 'text-green-600',  ring: 'ring-green-400',  filter: 'ACTIVE'    },
            { label: 'Archive',   value: summary.archive,   color: 'text-gray-500',   ring: 'ring-gray-400',   filter: 'ARCHIVE'   },
            { label: 'On Hold',   value: summary.onHold,    color: 'text-yellow-600', ring: 'ring-yellow-400', filter: 'ON_HOLD'   },
            { label: 'Dedicated', value: summary.dedicated, color: 'text-blue-600',   ring: 'ring-blue-400',   filter: 'DEDICATED' },
            { label: 'T&M',       value: summary.tAndM,     color: 'text-purple-600', ring: 'ring-purple-400', filter: 'T_AND_M'   },
            { label: 'Fixed',     value: summary.fixed,     color: 'text-orange-600', ring: 'ring-orange-400', filter: 'FIXED'     },
            { label: 'Overdue',   value: summary.overdue,   color: 'text-red-600',    ring: 'ring-red-400',    filter: 'OVERDUE'   },
          ] as { label: string; value: number; color: string; ring: string; filter: QuickFilter }[]).map((card) => (
            <button key={card.filter} onClick={() => handleFilterChange(card.filter)}
              className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1 text-left transition hover:shadow-md ${
                quickFilter === card.filter ? `border-transparent ring-2 ${card.ring}` : 'border-gray-100'
              }`}>
              <span className="text-2xl font-bold text-gray-800">{card.value}</span>
              <span className={`text-xs font-medium ${card.color}`}>{card.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Project Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading…</div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-sm text-red-500">Failed to load projects.</div>
      ) : !filtered.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3 text-sm text-gray-400">
          <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          No projects yet.{canEdit && ' Click "New Project" to create one.'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((project) => (
              <div key={project.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}/board`)}>
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{project.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {project.client && <span className="text-xs text-gray-400">{project.client.name}</span>}
                        {project.client && project.department && <span className="text-xs text-gray-300">·</span>}
                        {project.department && <span className="text-xs text-gray-400">{project.department.name}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[project.status]}`}>
                        {STATUS_LABEL[project.status]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[project.projectType]}`}>
                        {TYPE_LABEL[project.projectType]}
                      </span>
                      {!project.endDate && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-600">Ongoing</span>
                      )}
                    </div>
                  </div>
                  {project.description && (
                    <div className="mt-2 line-clamp-3 prose prose-sm max-w-none text-gray-500 prose-p:my-0 prose-headings:text-sm prose-headings:font-semibold prose-headings:my-0 prose-headings:text-gray-600"
                      dangerouslySetInnerHTML={{ __html: project.description }} />
                  )}
                </div>
                <div className="px-5 pb-4 pt-2 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      {' → '}
                      {project.endDate
                        ? new Date(project.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-teal-600 font-medium">Ongoing</span>}
                      {isOverdue(project) && <span className="text-red-500 ml-1 font-medium">Overdue</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button title="Edit" onClick={() => { setEditTarget(project); setShowForm(true); }}
                        className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition">
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {project.status === 'ACTIVE' ? (
                        <button title="Archive" onClick={() => statusMutation.mutate({ id: project.id, status: 'ARCHIVE' })}
                          disabled={statusMutation.isPending}
                          className="p-2 rounded-lg text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 transition">
                          <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      ) : (
                        <button title="Restore to Active" onClick={() => statusMutation.mutate({ id: project.id, status: 'ACTIVE' })}
                          disabled={statusMutation.isPending}
                          className="p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition">
                          <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination footer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between px-5 py-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Per page:</span>
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
        </div>
      )}

      {showForm && (
        <ProjectFormModal
          project={editTarget ?? undefined}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSuccess={setToast}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
