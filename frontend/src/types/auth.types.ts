export type SystemRole = 'SUPER_USER' | 'ADMIN' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  systemRole: SystemRole;
  profilePhoto?: string | null;
  dateOfBirth?: string | null;
  hasManagementRole?: boolean;
  hasPmRole?: boolean;
  mustResetPassword?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
