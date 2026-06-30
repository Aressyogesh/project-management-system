import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../../api/dashboard.api';
import { announcementsApi, AnnouncementRecord } from '../../../api/announcementsApi';
import { useAuthStore } from '../../../store/authStore';
import { Announcement } from '../../../types/dashboard.types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function SystemRow({ item }: { item: Announcement }) {
  const colorMap: Record<string, string> = {
    info: 'bg-blue-400',
    success: 'bg-green-400',
    warning: 'bg-amber-400',
  };
  return (
    <div className="flex gap-3 px-5 py-4 bg-slate-50 hover:bg-slate-100/60 transition-colors">
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${colorMap[item.type] ?? 'bg-gray-400'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-700 leading-snug">{item.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{item.body}</p>
        <span className="text-[10px] text-gray-400 mt-1 block">{timeAgo(item.date)}</span>
      </div>
    </div>
  );
}

function ManualRow({ item }: { item: AnnouncementRecord }) {
  return (
    <div className="flex gap-3 px-5 py-4 bg-blue-50 hover:bg-blue-100/60 transition-colors">
      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-blue-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-blue-700 leading-snug">{item.title}</p>
          {item.scope === 'PROJECT' && item.project && (
            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              {item.project.name}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2 [&_strong]:font-semibold [&_ul]:list-none [&_li]:inline" dangerouslySetInnerHTML={{ __html: item.content }} />
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-gray-400">{item.createdBy?.fullName ?? 'System'}</span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[10px] text-gray-400">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementsWidget({ projectId, month }: { projectId?: string; month?: string }) {
  const user = useAuthStore((s) => s.user);
  const isManagement = user?.systemRole === 'SUPER_USER' || user?.systemRole === 'ADMIN' || user?.hasPmRole;

  const { data: manualData, isLoading: manualLoading } = useQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: () => announcementsApi.list({ latest: true }),
    staleTime: 60_000,
  });

  const { data: systemItems = [], isLoading: systemLoading } = useQuery({
    queryKey: ['dashboard-announcements', projectId, month],
    queryFn: () => dashboardApi.getAnnouncements({ projectId, month }),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const manualItems = manualData?.data ?? [];
  const isLoading = manualLoading || (!!projectId && systemLoading);
  const hasAny = systemItems.length > 0 || manualItems.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Announcements</h3>
          <p className="text-xs text-gray-400 mt-0.5">Latest notices &amp; project activity</p>
        </div>
        {isManagement && (
          <Link
            to="/announcements"
            className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="divide-y divide-gray-50 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-5 py-4">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-gray-200 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-2 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasAny ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          No announcements yet.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {manualItems.map((item: AnnouncementRecord) => (
            <ManualRow key={item.id} item={item} />
          ))}
          {systemItems.map((item: Announcement) => (
            <SystemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
