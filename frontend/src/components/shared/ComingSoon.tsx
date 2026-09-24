import { useLocation } from 'react-router-dom';

const pageLabels: Record<string, string> = {
  '/users':       'User Management',
  '/departments': 'Department Management',
  '/clients':     'Client Management',
  '/projects':    'Projects',
  '/timesheets':  'Timesheets',
  '/leave-logs':  'Leave & Overtime',
  '/bugs':        'Bug Management',
  '/kpi':         'KPI Store',
  '/reports':     'Reports',
};

export function ComingSoon() {
  const { pathname } = useLocation();
  const label = pageLabels[pathname] ?? 'This Page';

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-5 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-800">{label}</h2>
        <p className="text-sm text-gray-400 mt-1.5 max-w-xs">
          This feature is under active development and will be available soon.
        </p>
      </div>

      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Coming Soon
      </span>
    </div>
  );
}
