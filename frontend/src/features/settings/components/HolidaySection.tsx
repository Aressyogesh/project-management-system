import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Holiday, settingsApi } from '../../../api/settings.api';
import { futureDateStr, pastDateStr } from '../../../utils/dateUtils';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getRecurringDateForYear(holiday: Holiday, year: number): string {
  const d = new Date(holiday.date);
  return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function HolidaySection() {
  const qc = useQueryClient();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: allHolidays = [], isLoading } = useQuery({
    queryKey: ['settings-holidays'],
    queryFn: () => settingsApi.getHolidays(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof settingsApi.createHoliday>[0]) => settingsApi.createHoliday(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-holidays'] });
      setName('');
      setDate('');
      setIsRecurring(false);
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Failed to add holiday');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteHoliday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-holidays'] });
      setDeleteId(null);
    },
  });

  // Build visible list: actual holidays for this year + recurring holidays projected into this year
  const visibleHolidays: (Holiday & { projected?: boolean })[] = [];
  const seenDates = new Set<string>();

  // Real holidays in selected year
  allHolidays.forEach((h) => {
    const d = new Date(h.date);
    if (d.getFullYear() === year) {
      visibleHolidays.push(h);
      seenDates.add(h.date.slice(0, 10));
    }
  });

  // Recurring holidays from other years projected into selected year
  if (year !== CURRENT_YEAR || allHolidays.some((h) => new Date(h.date).getFullYear() !== year)) {
    allHolidays.forEach((h) => {
      if (!h.isRecurring) return;
      const projected = getRecurringDateForYear(h, year);
      if (!seenDates.has(projected)) {
        visibleHolidays.push({ ...h, date: projected, projected: true });
        seenDates.add(projected);
      }
    });
  }

  visibleHolidays.sort((a, b) => a.date.localeCompare(b.date));

  function handleAdd() {
    if (!name.trim()) { setFormError('Holiday name is required'); return; }
    if (!date) { setFormError('Date is required'); return; }
    setFormError('');
    createMutation.mutate({ name: name.trim(), date, isRecurring });
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Holidays</p>
          <p className="text-xs text-gray-400">Manage public and company holidays by year</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Add form */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-xs font-medium text-gray-600 mb-3">Add Holiday</p>
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Holiday name (e.g. Republic Day)"
            className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
          <input
            type="date"
            value={date}
            min={pastDateStr(1)}
            max={futureDateStr(3)}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-600"
            />
            <span className="text-sm text-gray-700">Recurring yearly</span>
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition"
          >
            {createMutation.isPending ? 'Adding…' : 'Add Holiday'}
          </button>
        </div>
        {formError && <p className="mt-2 text-xs text-rose-500">{formError}</p>}
      </div>

      {/* Holiday list */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}
        </div>
      ) : visibleHolidays.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-6">
          No holidays for {year}. Add one above.
        </p>
      ) : (
        <div className="border border-[#cccccc] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-10">Sr.</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Holiday</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-28">Type</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleHolidays.map((holiday, i) => (
                <tr key={`${holiday.id}-${holiday.date}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{holiday.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(holiday.date)}</td>
                  <td className="px-4 py-3">
                    {holiday.isRecurring ? (
                      <span className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full">
                        Recurring
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        One-time
                      </span>
                    )}
                    {(holiday as any).projected && (
                      <span className="ml-1.5 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                        Projected
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!(holiday as any).projected && (
                      <button
                        type="button"
                        onClick={() => setDeleteId(holiday.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                        title="Delete holiday"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Delete Holiday?</h3>
            <p className="text-sm text-gray-400 mb-5">This will permanently remove the holiday.</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
