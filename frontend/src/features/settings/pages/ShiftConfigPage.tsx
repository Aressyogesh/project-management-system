import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Shift, ShiftType, settingsApi } from '../../../api/settings.api';

const DEFAULTS: Record<ShiftType, { name: string; startTime: string; endTime: string }> = {
  DAY:       { name: 'Day',       startTime: '10:00', endTime: '19:00' },
  AFTERNOON: { name: 'Afternoon', startTime: '15:00', endTime: '00:00' },
  NIGHT:     { name: 'Night',     startTime: '23:00', endTime: '08:00' },
};

const SHIFT_ORDER: ShiftType[] = ['DAY', 'AFTERNOON', 'NIGHT'];

const SHIFT_COLORS: Record<ShiftType, string> = {
  DAY:       'bg-amber-50 text-amber-700 border-amber-200',
  AFTERNOON: 'bg-blue-50 text-blue-700 border-blue-200',
  NIGHT:     'bg-indigo-50 text-indigo-700 border-indigo-200',
};

interface ShiftRowProps {
  shift: Shift;
  onSave: (id: string, data: { name: string; startTime: string; endTime: string; workHours: number }) => void;
  onReset: (shift: Shift) => void;
  isSaving: boolean;
}

function ShiftRow({ shift, onSave, onReset, isSaving }: ShiftRowProps) {
  const [name, setName] = useState(shift.name);
  const [startTime, setStartTime] = useState(shift.startTime);
  const [endTime, setEndTime] = useState(shift.endTime);
  const [workHours, setWorkHours] = useState(shift.workHours);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setWorkHours(shift.workHours);
  }, [shift]);

  function handleSave() {
    onSave(shift.id, { name, startTime, endTime, workHours });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isDirty =
    name !== shift.name ||
    startTime !== shift.startTime ||
    endTime !== shift.endTime ||
    workHours !== shift.workHours;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SHIFT_COLORS[shift.shiftType]}`}>
          {shift.shiftType}
        </span>
        <div className="flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
            placeholder="Shift name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Work Hours / Day</label>
          <input
            type="number"
            min={1}
            max={24}
            value={workHours}
            onChange={(e) => setWorkHours(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => onReset(shift)}
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
        >
          Reset Default
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

export function ShiftConfigPage() {
  const qc = useQueryClient();

  const { data: shifts = [], isLoading, error } = useQuery({
    queryKey: ['settings-shifts'],
    queryFn: settingsApi.getShifts,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof settingsApi.updateShift>[1] }) =>
      settingsApi.updateShift(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-shifts'] }),
  });

  function handleSave(id: string, data: { name: string; startTime: string; endTime: string; workHours: number }) {
    updateMutation.mutate({ id, data });
  }

  function handleReset(shift: Shift) {
    const def = DEFAULTS[shift.shiftType];
    updateMutation.mutate({ id: shift.id, data: { ...def, workHours: 8 } });
  }

  function handleResetAll() {
    shifts.forEach((shift) => {
      const def = DEFAULTS[shift.shiftType];
      updateMutation.mutate({ id: shift.id, data: { ...def, workHours: 8 } });
    });
  }

  const ordered = SHIFT_ORDER.map((type) => shifts.find((s) => s.shiftType === type)).filter(Boolean) as Shift[];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-white rounded-xl border border-gray-100" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-sm text-gray-400">
        Could not load shifts — start the backend to see live data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Configure shift timings. Changes save per shift individually.</p>
        </div>
        <button
          onClick={handleResetAll}
          className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
        >
          Reset All to Default
        </button>
      </div>

      {ordered.map((shift) => (
        <ShiftRow
          key={shift.id}
          shift={shift}
          onSave={handleSave}
          onReset={handleReset}
          isSaving={updateMutation.isPending}
        />
      ))}

      {updateMutation.isError && (
        <p className="text-sm text-rose-600">Failed to save. Is the backend running?</p>
      )}
    </div>
  );
}
