import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ComingSoon } from './components/shared/ComingSoon';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { CompanySettingsPage } from './features/settings/pages/CompanySettingsPage';
import { PortalConfigPage } from './features/settings/pages/PortalConfigPage';
import { SettingsLayout } from './features/settings/pages/SettingsLayout';
import { ShiftConfigPage } from './features/settings/pages/ShiftConfigPage';
import { UserSettingsPage } from './features/settings/pages/UserSettingsPage';
import { UsersPage } from './features/users/pages/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const comingSoonPaths = [
  '/departments',
  '/clients',
  '/projects',
  '/timesheets',
  '/leave-logs',
  '/bugs',
  '/kpi',
  '/reports',
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — wrapped in AppLayout (Sidebar + Topbar) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* User Management */}
              <Route path="/users" element={<UsersPage />} />

              {/* Settings — nested under SettingsLayout */}
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/settings/company" replace />} />
                <Route path="company" element={<CompanySettingsPage />} />
                <Route path="portal"  element={<PortalConfigPage />} />
                <Route path="users"   element={<UserSettingsPage />} />
                <Route path="shifts"  element={<ShiftConfigPage />} />
              </Route>

              {comingSoonPaths.map((path) => (
                <Route key={path} path={path} element={<ComingSoon />} />
              ))}
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
