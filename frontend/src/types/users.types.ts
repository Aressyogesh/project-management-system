import { SystemRole } from './auth.types';

export interface Department {
  id: string;
  name: string;
  isActive: boolean;
  businessUnit?: { id: string; name: string } | null;
}

export interface ShiftSummary {
  id: string;
  name: string;
  shiftType: 'DAY' | 'AFTERNOON' | 'NIGHT';
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  systemRole: SystemRole;
  phone: string | null;
  joinDate: string | null;
  profilePhoto: string | null;
  isActive: boolean;
  createdAt: string;
  department: Pick<Department, 'id' | 'name'> | null;
  shift: ShiftSummary | null;
}

export interface UsersPage {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  systemRole: SystemRole;
  phone?: string;
  joinDate?: string;
  departmentId?: string;
  shiftId?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  systemRole?: SystemRole;
  phone?: string;
  joinDate?: string;
  departmentId?: string | null;
  shiftId?: string | null;
}
