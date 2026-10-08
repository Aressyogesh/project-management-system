import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AuthUser } from '../types/auth.types';

const AUTH_STORE_KEY = 'pms-auth';
export const REMEMBER_ME_KEY = 'pms_remember_me';

// Writes to localStorage when "remember me" is on, sessionStorage otherwise.
// On read, checks localStorage first so an existing persisted session is always found.
const dynamicStorage = createJSONStorage(() => ({
  getItem: (name: string): string | null =>
    localStorage.getItem(name) ?? sessionStorage.getItem(name),

  setItem: (name: string, value: string): void => {
    if (localStorage.getItem(REMEMBER_ME_KEY) === 'true') {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },

  removeItem: (name: string): void => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
}));

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateUser: (partial) =>
        set((state) => ({ user: state.user ? { ...state.user, ...partial } : state.user })),

      clearAuth: () => {
        // Remove the remember-me flag and wipe persisted auth from localStorage
        // so a re-login always starts fresh regardless of prior preference.
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(AUTH_STORE_KEY);
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: AUTH_STORE_KEY,
      storage: dynamicStorage,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
