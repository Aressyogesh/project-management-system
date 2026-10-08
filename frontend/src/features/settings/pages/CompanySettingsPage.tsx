import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CompanySettings, settingsApi } from '../../../api/settings.api';
import { DomainList } from '../components/DomainList';

const COUNTRIES = [
  'India','United States','United Kingdom','Canada','Australia',
  'Germany','France','Singapore','UAE','Netherlands','Other',
];

const TIMEZONES = [
  { label: '(UTC+05:30) India Standard Time',     value: 'Asia/Kolkata' },
  { label: '(UTC-05:00) Eastern Time',             value: 'America/New_York' },
  { label: '(UTC-08:00) Pacific Time',             value: 'America/Los_Angeles' },
  { label: '(UTC+00:00) UTC / GMT',                value: 'UTC' },
  { label: '(UTC+01:00) Central European Time',    value: 'Europe/Berlin' },
  { label: '(UTC+08:00) Singapore Time',           value: 'Asia/Singapore' },
  { label: '(UTC+04:00) Gulf Standard Time',       value: 'Asia/Dubai' },
  { label: '(UTC-12:00) International Date Line',  value: 'Etc/GMT+12' },
];

type FormData = Omit<CompanySettings, 'emailDomains'>;

function inputCls(err: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white transition ${err ? 'border-rose-400' : 'border-gray-200'}`;
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}

export function CompanySettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-company'],
    queryFn: settingsApi.getCompany,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updateCompany,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-company'] }),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>();
  const [domains, setDomains] = [
    watch('emailDomains' as any) as string[] | undefined ?? [],
    (v: string[]) => setValue('emailDomains' as any, v),
  ];

  useEffect(() => {
    if (data) reset({ ...data });
  }, [data, reset]);

  function onSubmit(form: FormData) {
    mutation.mutate({ ...form, emailDomains: domains });
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Company Info */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Company Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Company Name" required error={errors.companyName?.message}>
            <input {...register('companyName', { required: 'Company name is required' })}
              className={inputCls(!!errors.companyName)} placeholder="Aress Software Pvt. Ltd." />
          </Field>
          <Field label="Web Address">
            <input {...register('webAddress')} className={inputCls(false)} placeholder="https://company.com" />
          </Field>
          <Field label="Street">
            <input {...register('street')} className={inputCls(false)} placeholder="123 Main Road" />
          </Field>
          <Field label="City">
            <input {...register('city')} className={inputCls(false)} placeholder="Nashik" />
          </Field>
          <Field label="State">
            <input {...register('state')} className={inputCls(false)} placeholder="Maharashtra" />
          </Field>
          <Field label="Country">
            <select {...register('country')} className={inputCls(false)}>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Zip Code" required error={errors.zipCode?.message}>
            <input {...register('zipCode', { required: 'Zip code is required' })}
              className={inputCls(!!errors.zipCode)} placeholder="422010" />
          </Field>
          <Field label="Select Timezone">
            <select {...register('timezone')} className={inputCls(false)}>
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Back Date Log */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-3">Allow Back Date Log</p>
          <div className="flex items-center gap-3">
            <input type="number" min={0}
              {...register('backDateLogValue', { valueAsNumber: true })}
              className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <select {...register('backDateLogUnit')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              <option>Days</option>
              <option>Weeks</option>
              <option>Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Email Domains */}
      <div className="bg-white rounded-2xl border border-[#cccccc] shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Email Domain</h2>
        <p className="text-xs text-gray-400 mb-4">Allowed domains for user registration</p>
        <DomainList domains={domains} onChange={setDomains} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={mutation.isPending}
          className="px-6 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 transition">
          {mutation.isPending ? 'Saving…' : 'Update'}
        </button>
        <button type="button" onClick={() => data && reset({ ...data })}
          className="px-6 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition">
          Cancel
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

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl border border-[#cccccc] h-64" />
      <div className="bg-white rounded-2xl border border-[#cccccc] h-36" />
    </div>
  );
}
