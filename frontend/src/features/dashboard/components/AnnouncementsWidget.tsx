import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboard.api';

interface AnnouncementsWidgetProps {
  projectId?: string;
  month?: string;
}

const typeStyles = {
  info:    { bg: 'bg-blue-50',    dot: 'bg-blue-400',    text: 'text-blue-700'    },
  success: { bg: 'bg-emerald-50', dot: 'bg-emerald-400', text: 'text-emerald-700' },
  warning: { bg: 'bg-amber-50',   dot: 'bg-amber-400',   text: 'text-amber-700'   },
};

export function AnnouncementsWidget({ projectId, month }: AnnouncementsWidgetProps) {
  const params = projectId || month ? { projectId, month } : undefined;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['dashboard-announcements', projectId ?? '', month ?? ''],
    queryFn:  () => dashboardApi.getAnnouncements(params),
    staleTime: 60_000,
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Announcements</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {projectId ? 'Project activity & highlights' : "What's New"}
          </p>
        </div>
        {!isLoading && (
          <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full border border-primary-100">
            {items.length} new
          </span>
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
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-gray-400">
          No announcements for the selected period.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((item) => {
            const s = typeStyles[item.type];
            return (
              <div key={item.id} className={`flex gap-3 px-5 py-4 ${s.bg}`}>
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${s.text}`}>{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.body}</p>
                  <p className="text-xs text-gray-300 mt-1">{item.date}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
