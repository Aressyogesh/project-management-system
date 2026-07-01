import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PortalConfig, settingsApi } from '../../../api/settings.api';
import { HolidaySection } from '../components/HolidaySection';

const DATE_FORMATS = ['DD-MM-YYYY','MM-DD-YYYY','YYYY-MM-DD','DD/MM/YYYY','MM/DD/YYYY'];

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = String(i + 1).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

export function PortalConfigPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-portal'],
    queryFn: settingsApi.getPortal,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updatePortal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-portal'] }),
  });

  const { register, handleSubmit, reset, control, watch } = useForm<PortalConfig>();

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const workingDays = watch('workingDays') ?? {};

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="bg-white rounded-2xl border border-gray-100 h-64" /><div className="bg-white rounded-2xl border border-gray-100 h-64" /></div>;
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      {/* Formats Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-xs text-gray-400 mb-5">Set date format and business hours based on your work culture</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Format</label>
            <select {...register('dateFormat')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Time Format</label>
            <div className="flex items-center gap-6">
              {(['12','24'] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={val} {...register('timeFormat')} className="w-4 h-4 accent-primary-600" />
                  <span className="text-sm text-gray-700">{val === '12' ? '12 hour (Ex: 3:00 pm)' : '24 hour (Ex: 15:00)'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Task Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Task Duration in</label>
            <div className="flex items-center gap-6">
              {(['days','hours'] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={val} {...register('taskDurationIn')} className="w-4 h-4 accent-primary-600" />
                  <span className="text-sm text-gray-700 capitalize">{val}</span>
                </label>
              ))}
            </div>
          </div>

          {/* First Day of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First day of the week</label>
            <p className="text-xs text-gray-400 mb-3">Set the first day of your workweek here</p>
            <div className="flex items-center gap-6">
              {(['Sunday','Monday'] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={val} {...register('firstDayOfWeek')} className="w-4 h-4 accent-primary-600" />
                  <span className="text-sm text-gray-700">{val}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Business hours</h2>
        <p className="text-xs text-gray-400 mb-5">Work duration calculated based on business hours.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start at</label>
              <div className="flex gap-2">
                <select {...register('businessHoursStart')}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                  {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
                <select {...register('businessHoursStartPeriod')}
                  className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                  <option>AM</option><option>PM</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End at</label>
              <div className="flex gap-2">
                <select {...register('businessHoursEnd')}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                  {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
                <select {...register('businessHoursEndPeriod')}
                  className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                  <option>AM</option><option>PM</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Working days</p>
            <p className="text-xs text-gray-400 mb-3">Choose the working days of the week</p>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {DAY_KEYS.map((day) => (
                <Controller key={day} control={control} name={`workingDays.${day}`}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary-600" />
                      <span className="text-sm text-gray-700 capitalize">{day}</span>
                    </label>
                  )} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DAY_KEYS.filter((d) => workingDays?.[d]).map((d) => (
                <span key={d} className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full capitalize">{d}</span>
              ))}
            </div>
          </div>
        </div>

        <HolidaySection />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-6 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 transition">
          {mutation.isPending ? 'Saving…' : 'Update'}
        </button>
        {mutation.isSuccess && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved to database
          </span>
        )}
        {mutation.isError && (
          <span className="text-sm text-rose-600">Failed to save. Is the backend running?</span>
        )}
      </div>
    </form>
  );
}
