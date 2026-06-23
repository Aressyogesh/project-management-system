import { apiClient } from './client';

export type ShiftType = 'DAY' | 'AFTERNOON' | 'NIGHT';

export interface Shift {
  id: string;
  name: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  workHours: number;
  isActive: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
}

export interface CompanySettings {
  companyName: string;
  webAddress?: string;
  street?: string;
  city?: string;
  state?: string;
  country: string;
  zipCode?: string;
  timezone: string;
  backDateLogValue: number;
  backDateLogUnit: 'Days' | 'Weeks' | 'Months';
  emailDomains: string[];
}

export interface WorkingDays {
  monday: boolean; tuesday: boolean; wednesday: boolean;
  thursday: boolean; friday: boolean; saturday: boolean; sunday: boolean;
}

export interface PortalConfig {
  dateFormat: string;
  timeFormat: '12' | '24';
  taskDurationIn: 'days' | 'hours';
  firstDayOfWeek: 'Sunday' | 'Monday';
  businessHoursStart: string;
  businessHoursStartPeriod: 'AM' | 'PM';
  businessHoursEnd: string;
  businessHoursEndPeriod: 'AM' | 'PM';
  workingDays: WorkingDays;
}

export interface SettingsUser {
  id: string;
  fullName: string;
  email: string;
  systemRole: 'SUPER_USER' | 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  profilePhoto: string | null;
}

export const settingsApi = {
  getCompany: () =>
    apiClient.get<CompanySettings>('/settings/company').then((r) => r.data),

  updateCompany: (data: Partial<CompanySettings>) =>
    apiClient.put<CompanySettings>('/settings/company', data).then((r) => r.data),

  getPortal: () =>
    apiClient.get<PortalConfig>('/settings/portal').then((r) => r.data),

  updatePortal: (data: Partial<PortalConfig>) =>
    apiClient.put<PortalConfig>('/settings/portal', data).then((r) => r.data),

  getUsers: () =>
    apiClient.get<SettingsUser[]>('/settings/users').then((r) => r.data),

  updateUserRole: (id: string, systemRole: string) =>
    apiClient.put<SettingsUser>(`/settings/users/${id}/role`, { systemRole }).then((r) => r.data),

  deleteUser: (id: string) =>
    apiClient.delete(`/settings/users/${id}`).then((r) => r.data),

  getShifts: () =>
    apiClient.get<Shift[]>('/settings/shifts').then((r) => r.data),

  updateShift: (id: string, data: Partial<Omit<Shift, 'id' | 'shiftType'>>) =>
    apiClient.put<Shift>(`/settings/shifts/${id}`, data).then((r) => r.data),

  getHolidays: (year?: number) =>
    apiClient.get<Holiday[]>('/settings/holidays', { params: year ? { year } : {} }).then((r) => r.data),

  createHoliday: (data: { name: string; date: string; isRecurring: boolean }) =>
    apiClient.post<Holiday>('/settings/holidays', data).then((r) => r.data),

  deleteHoliday: (id: string) =>
    apiClient.delete(`/settings/holidays/${id}`).then((r) => r.data),
};
