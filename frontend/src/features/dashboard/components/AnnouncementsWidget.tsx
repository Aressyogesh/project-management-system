import { ANNOUNCEMENTS } from '../../reports/data/reportsStaticData';

const typeStyles = {
  info:    { bg: 'bg-blue-50',    dot: 'bg-blue-400',    text: 'text-blue-700'    },
  success: { bg: 'bg-emerald-50', dot: 'bg-emerald-400', text: 'text-emerald-700' },
  warning: { bg: 'bg-amber-50',   dot: 'bg-amber-400',   text: 'text-amber-700'   },
};

export function AnnouncementsWidget() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Announcements</h3>
          <p className="text-xs text-gray-400 mt-0.5">What's New — May 2026</p>
        </div>
        <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full border border-primary-100">
          {ANNOUNCEMENTS.length} new
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {ANNOUNCEMENTS.map((item) => {
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
    </div>
  );
}
