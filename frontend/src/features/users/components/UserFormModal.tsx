import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { businessUnitsApi } from '../../../api/businessUnits.api';
import { departmentsApi } from '../../../api/departments.api';
import { settingsApi } from '../../../api/settings.api';
import { usersApi } from '../../../api/users.api';
import type { CreateUserPayload, UpdateUserPayload, User } from '../../../types/users.types';
import { SystemRole } from '../../../types/auth.types';
import { futureDateStr, pastDateStr } from '../../../utils/dateUtils';

type Mode = 'create' | 'edit';

interface Props {
  mode: Mode;
  user?: User;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const ROLES: { value: SystemRole; label: string }[] = [
  { value: 'SUPER_USER', label: 'Super User' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900';
const inputErrCls = 'w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white text-gray-900';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
const sel = (v: string, hasErr?: boolean) =>
  `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white ${
    hasErr ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
  } ${!v ? 'text-gray-400' : 'text-gray-900'}`;

export function UserFormModal({ mode, user, onClose, onSuccess }: Props) {
  const qc = useQueryClient();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [systemRole, setSystemRole] = useState<SystemRole>(user?.systemRole ?? 'EMPLOYEE');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [joinDate, setJoinDate] = useState(user?.joinDate ? user.joinDate.substring(0, 10) : '');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [departmentId, setDepartmentId] = useState(user?.department?.id ?? '');
  const [shiftId, setShiftId] = useState(user?.shift?.id ?? '');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['business-units-active'],
    queryFn: () => businessUnitsApi.list(false),
  });

  const { data: allDepartments = [] } = useQuery({
    queryKey: ['departments-active'],
    queryFn: () => departmentsApi.list(false),
  });

  const { data: shiftsResponse } = useQuery({
    queryKey: ['shifts'],
    queryFn: settingsApi.getShifts,
  });
  const shifts = shiftsResponse ?? [];

  // Resolve initial BU from user's existing department when departments load
  useEffect(() => {
    if (user?.department && allDepartments.length) {
      const dept = allDepartments.find((d) => d.id === user.department!.id);
      if (dept?.businessUnit) setBusinessUnitId(dept.businessUnit.id);
    }
  }, [allDepartments]);

  const filteredDepartments = businessUnitId
    ? allDepartments.filter((d) => d.businessUnit?.id === businessUnitId)
    : allDepartments;

  function handleBuChange(buId: string) {
    setBusinessUnitId(buId);
    setFieldErrors((prev) => ({ ...prev, businessUnitId: '' }));
    if (buId && departmentId) {
      const dept = allDepartments.find((d) => d.id === departmentId);
      if (dept?.businessUnit?.id !== buId) setDepartmentId('');
    }
  }

  function handleDeptChange(deptId: string) {
    setDepartmentId(deptId);
    setFieldErrors((prev) => ({ ...prev, departmentId: '' }));
    if (deptId) {
      const dept = allDepartments.find((d) => d.id === deptId);
      if (dept?.businessUnit) setBusinessUnitId(dept.businessUnit.id);
    }
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onSuccess?.('User created successfully');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersApi.update(user!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onSuccess?.('User updated successfully');
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to update user'),
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    if (!businessUnitId) errs.businessUnitId = 'Business unit is required';
    if (!departmentId) errs.departmentId = 'Department is required';
    if (!shiftId) errs.shiftId = 'Shift is required';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    if (mode === 'create') {
      createMutation.mutate({
        fullName: fullName.trim(),
        email: email.trim(),
        systemRole,
        phone: phone || undefined,
        joinDate: joinDate || undefined,
        departmentId,
        shiftId,
      });
    } else {
      updateMutation.mutate({
        fullName: fullName.trim(),
        email: email.trim(),
        systemRole,
        phone: phone || undefined,
        joinDate: joinDate || undefined,
        departmentId,
        shiftId,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'Add User' : 'Edit User'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* Full Name */}
          <div>
            <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: '' })); }}
              maxLength={100}
              placeholder="e.g. Jane Doe"
              autoFocus
              autoComplete="off"
              className={fieldErrors.fullName ? inputErrCls : inputCls}
            />
            {fieldErrors.fullName && <p className="mt-1 text-xs text-red-500">{fieldErrors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
              placeholder="jane@company.com"
              autoComplete="off"
              className={fieldErrors.email ? inputErrCls : inputCls}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
          </div>

          {mode === 'create' && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
              A system-generated temporary password will be emailed to the user upon account creation.
            </div>
          )}

          {/* System Role */}
          <div>
            <label className={labelCls}>System Role <span className="text-red-500">*</span></label>
            <select
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value as SystemRole)}
              className={`${inputCls} text-gray-900`}
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Business Unit + Department (row) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Business Unit <span className="text-red-500">*</span></label>
              <select
                value={businessUnitId}
                onChange={(e) => handleBuChange(e.target.value)}
                className={sel(businessUnitId, !!fieldErrors.businessUnitId)}
              >
                <option value="">Select Business Unit</option>
                {businessUnits.map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}
              </select>
              {fieldErrors.businessUnitId && <p className="mt-1 text-xs text-red-500">{fieldErrors.businessUnitId}</p>}
            </div>
            <div>
              <label className={labelCls}>Department <span className="text-red-500">*</span></label>
              <select
                value={departmentId}
                onChange={(e) => handleDeptChange(e.target.value)}
                className={sel(departmentId, !!fieldErrors.departmentId)}
              >
                <option value="">Select Department</option>
                {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {fieldErrors.departmentId && <p className="mt-1 text-xs text-red-500">{fieldErrors.departmentId}</p>}
            </div>
          </div>

          {/* Shift */}
          <div>
            <label className={labelCls}>Shift <span className="text-red-500">*</span></label>
            <select
              value={shiftId}
              onChange={(e) => { setShiftId(e.target.value); setFieldErrors((p) => ({ ...p, shiftId: '' })); }}
              className={sel(shiftId, !!fieldErrors.shiftId)}
            >
              <option value="">Select Shift</option>
              {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {fieldErrors.shiftId && <p className="mt-1 text-xs text-red-500">{fieldErrors.shiftId}</p>}
          </div>

          {/* Phone + Join Date (row) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                maxLength={20}
                autoComplete="off"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Join Date</label>
              <input
                type="date"
                value={joinDate}
                min={pastDateStr(30)}
                max={futureDateStr(2)}
                onChange={(e) => setJoinDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition">
              {isPending ? 'Saving…' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
