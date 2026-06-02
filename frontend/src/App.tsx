import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { CompanySettingsPage } from './features/settings/pages/CompanySettingsPage';
import { PortalConfigPage } from './features/settings/pages/PortalConfigPage';
import { SettingsLayout } from './features/settings/pages/SettingsLayout';
import { ShiftConfigPage } from './features/settings/pages/ShiftConfigPage';
import { UserSettingsPage } from './features/settings/pages/UserSettingsPage';
import { ClientsPage } from './features/clients/pages/ClientsPage';
import { DepartmentsPage } from './features/departments/pages/DepartmentsPage';
import { BusinessUnitsPage } from './features/business-units/pages/BusinessUnitsPage';
import { ProjectDetailPage } from './features/projects/pages/ProjectDetailPage';
import { ProjectsPage } from './features/projects/pages/ProjectsPage';
import { BoardPage } from './features/board/pages/BoardPage';
import { UsersPage } from './features/users/pages/UsersPage';
import { KpiPage } from './features/kpi/pages/KpiPage';
import { ReportsPage } from './features/reports/pages/ReportsPage';
import { MyTimesheetPage } from './features/timesheet/pages/MyTimesheetPage';
import { LeavePage } from './features/leave/pages/LeavePage';
import { AIAssistantPage } from './features/ai/pages/AIAssistantPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

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

              {/* Business Unit Management */}
              <Route path="/business-units" element={<BusinessUnitsPage />} />

              {/* Department Management */}
              <Route path="/departments" element={<DepartmentsPage />} />

              {/* Client Management */}
              <Route path="/clients" element={<ClientsPage />} />

              {/* Project Management */}
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/projects/:id/board" element={<BoardPage />} />

              {/* Timesheet */}
              <Route path="/timesheet" element={<MyTimesheetPage />} />

              {/* KPI Store */}
              <Route path="/kpi" element={<KpiPage />} />

              {/* Reports Dashboard */}
              <Route path="/reports" element={<ReportsPage />} />

              {/* Settings — nested under SettingsLayout */}
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/settings/company" replace />} />
                <Route path="company" element={<CompanySettingsPage />} />
                <Route path="portal"  element={<PortalConfigPage />} />
                <Route path="users"   element={<UserSettingsPage />} />
                <Route path="shifts"  element={<ShiftConfigPage />} />
              </Route>

              {/* Leave Management */}
              <Route path="/leave-logs" element={<LeavePage />} />

              {/* AI Assistant */}
              <Route path="/ai" element={<AIAssistantPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
