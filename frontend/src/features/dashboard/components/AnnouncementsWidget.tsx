import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { announcementsApi, AnnouncementRecord } from '../../../api/announcementsApi';

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

function AnnouncementRow({ item }: { item: AnnouncementRecord }) {
  return (
    <div className="flex gap-3 px-5 py-4 bg-blue-50 hover:bg-blue-100/60 transition-colors">
      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-blue-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-blue-700 leading-snug">{item.title}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">{item.content}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-gray-400">{item.createdBy.fullName}</span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[10px] text-gray-400">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: () => announcementsApi.list({ latest: true }),
    staleTime: 60_000,
  });

  const items = data?.data ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Announcements</h3>
          <p className="text-xs text-gray-400 mt-0.5">Latest notices from management</p>
        </div>
        <Link
          to="/announcements"
          className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
        >
          View all
        </Link>
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
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          No announcements yet.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((item: AnnouncementRecord) => <AnnouncementRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
