import { AuthResponse, LoginCredentials, TokenPair } from '../types/auth.types';
import { apiClient } from './client';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  refresh: async (refreshToken: string): Promise<TokenPair> => {
    const { data } = await apiClient.post<TokenPair>('/auth/refresh', { refreshToken });
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  validateResetToken: async (token: string): Promise<void> => {
    await apiClient.get(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },

  changePassword: async (newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { newPassword });
  },
};
