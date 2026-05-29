import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type CapacityCell } from '../../../api/analyticsApi';

const DAY_ABBR: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const STATUS_STYLE: Record<string, { bg: string; title: string }> = {
  holiday:    { bg: 'bg-orange-200',     title: 'Holiday' },
  weekly_off: { bg: 'bg-gray-100',       title: 'Weekly Off' },
  leave:      { bg: 'bg-pink-200',       title: 'On Leave' },
  occupied:   { bg: 'bg-blue-700',       title: 'Fully Occupied (≥8h)' },
  partial:    { bg: 'bg-amber-300',      title: 'Partially Occupied' },
  available:  { bg: 'bg-green-200',      title: 'Available' },
};

const LEGEND = [
  { status: 'holiday',    label: 'Public Holiday',        color: 'bg-orange-200'  },
  { status: 'weekly_off', label: 'Weekly Off',            color: 'bg-gray-100 border border-gray-200' },
  { status: 'leave',      label: 'On Leave',              color: 'bg-pink-200'    },
  { status: 'occupied',   label: 'Fully Occupied (≥8h)',  color: 'bg-blue-700'    },
  { status: 'partial',    label: 'Partially Occupied',    color: 'bg-amber-300'   },
  { status: 'available',  label: 'Available',             color: 'bg-green-200'   },
];

function toPeriod(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parsePeriod(period: string): { year: number; month: number } {
  const [y, m] = period.split('-').map(Number);
  return { year: y, month: m };
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CellTooltip {
  employeeName: string;
  day: number;
  month: number;
  year: number;
  cell: CapacityCell;
}

export function CapacityReportTab() {
  const today = new Date();
  const [period, setPeriod] = useState(() =>
    toPeriod(today.getFullYear(), today.getMonth() + 1),
  );
  const [tooltip, setTooltip] = useState<CellTooltip | null>(null);

  const { year, month } = parsePeriod(period);

  const { data, isLoading } = useQuery({
    queryKey: ['capacity', period],
    queryFn: () => analyticsApi.getCapacity(period),
  });

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    setPeriod(toPeriod(d.getFullYear(), d.getMonth() + 1));
  }

  function nextMonth() {
    const d = new Date(year, month, 1);
    setPeriod(toPeriod(d.getFullYear(), d.getMonth() + 1));
  }

  const todayDay = today.getFullYear() === year && today.getMonth() + 1 === month
    ? today.getDate()
    : -1;

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Monthly Capacity Report</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Employee availability matrix — {MONTH_NAMES[month]} {year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              title="Previous month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800 w-32 text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              title="Next month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setPeriod(toPeriod(today.getFullYear(), today.getMonth() + 1))}
              className="text-xs text-primary-600 hover:text-primary-800 px-2 py-1 rounded-lg hover:bg-primary-50 transition"
            >
              Today
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {LEGEND.map((item) => (
            <div key={item.status} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded ${item.color}`} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            Loading capacity data…
          </div>
        ) : !data || data.employees.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            No employee data for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: `${180 + data.daysInMonth * 32}px` }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-white px-3 py-2 text-left font-semibold text-gray-700 w-44 min-w-[11rem] border-r border-gray-100">
                    Employee
                  </th>
                  {data.days.map((d) => (
                    <th
                      key={d.day}
                      className={`px-1 py-1.5 text-center font-medium w-7 border-l border-gray-50 ${
                        d.day === todayDay ? 'ring-1 ring-blue-400 ring-inset rounded' : ''
                      } ${d.isWeeklyOff ? 'text-gray-300' : d.isHoliday ? 'text-orange-500' : 'text-gray-500'}`}
                      title={d.holidayName ?? d.dayOfWeek}
                    >
                      <div>{DAY_ABBR[d.dayOfWeek]?.[0] ?? ''}</div>
                      <div className="font-bold">{d.day}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-l border-gray-100 whitespace-nowrap">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp) => (
                  <tr key={emp.userId} className="hover:bg-gray-50/30">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-gray-100 border-t border-gray-50">
                      <p className="font-semibold text-gray-800 truncate max-w-[160px]">{emp.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{emp.role}</p>
                    </td>
                    {emp.cells.map((cell) => {
                      const style = STATUS_STYLE[cell.status];
                      const isToday = cell.day === todayDay;
                      return (
                        <td
                          key={cell.day}
                          className={`px-0.5 py-1 border-l border-gray-50 border-t border-gray-50 text-center cursor-default`}
                          onMouseEnter={() =>
                            setTooltip({ employeeName: emp.name, day: cell.day, month, year, cell })
                          }
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <div
                            className={`w-6 h-6 rounded mx-auto ${style.bg} ${
                              isToday ? 'ring-1 ring-blue-500' : ''
                            } ${cell.status === 'occupied' ? 'text-white' : ''} flex items-center justify-center text-[9px] font-medium`}
                            title={
                              cell.status === 'holiday'
                                ? cell.holidayName ?? 'Holiday'
                                : cell.hours > 0
                                ? `${cell.hours}h`
                                : style.title
                            }
                          >
                            {cell.hours > 0 && cell.status !== 'holiday' && cell.status !== 'weekly_off'
                              ? cell.hours >= 8
                                ? `${cell.hours}h`
                                : cell.hours >= 1
                                ? `${cell.hours}h`
                                : ''
                              : ''}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 border-l border-gray-100 border-t border-gray-50 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-blue-600 font-medium">{emp.summary.occupiedDays}d occ</span>
                        <span className="text-[10px] text-pink-500">{emp.summary.leaveDays}d leave</span>
                        <span className="text-[10px] text-green-600">{emp.summary.availableDays}d avail</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <p className="font-semibold text-gray-800">{tooltip.employeeName}</p>
          <p className="text-gray-500">
            {MONTH_NAMES[tooltip.month]} {tooltip.day}, {tooltip.year}
          </p>
          <p className="text-gray-600 mt-1">
            Status: <span className="font-medium capitalize">{tooltip.cell.status.replace('_', ' ')}</span>
          </p>
          {tooltip.cell.hours > 0 && (
            <p className="text-gray-600">Hours logged: <span className="font-medium">{tooltip.cell.hours}h</span></p>
          )}
          {tooltip.cell.holidayName && (
            <p className="text-orange-600">{tooltip.cell.holidayName}</p>
          )}
        </div>
      )}
    </div>
  );
}
