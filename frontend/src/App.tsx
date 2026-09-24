import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CelebrationsProvider } from './contexts/CelebrationsContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { ForceChangePasswordPage } from './features/auth/pages/ForceChangePasswordPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { CompanySettingsPage } from './features/settings/pages/CompanySettingsPage';
import { PortalConfigPage } from './features/settings/pages/PortalConfigPage';
import { SettingsLayout } from './features/settings/pages/SettingsLayout';
import { ShiftConfigPage } from './features/settings/pages/ShiftConfigPage';
import { UserSettingsPage } from './features/settings/pages/UserSettingsPage';
import { FeatureAccessPage } from './features/settings/pages/FeatureAccessPage';
import { ClientsPage } from './features/clients/pages/ClientsPage';
import { DepartmentsPage } from './features/departments/pages/DepartmentsPage';
import { BusinessUnitsPage } from './features/business-units/pages/BusinessUnitsPage';
import { ProjectDetailPage } from './features/projects/pages/ProjectDetailPage';
import { ProjectsPage } from './features/projects/pages/ProjectsPage';
import { BoardPage } from './features/board/pages/BoardPage';
import { UsersPage } from './features/users/pages/UsersPage';
import { ReportsPage } from './features/reports/pages/ReportsPage';
import { MyTimesheetPage } from './features/timesheet/pages/MyTimesheetPage';
import { LeavePage } from './features/leave/pages/LeavePage';
import { EditProfilePage } from './features/profile/pages/EditProfilePage';
import { ActivityLogPage } from './features/activity/ActivityLogPage';
import { UpskillPage } from './features/upskill/pages/UpskillPage';
import { AnnouncementsPage } from './features/announcements/pages/AnnouncementsPage';
import { OrgStructurePage } from './features/org-structure/pages/OrgStructurePage';
import { KpiPage } from './features/kpi/pages/KpiPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CelebrationsProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected — wrapped in AppLayout (Sidebar + Topbar) */}
          <Route element={<ProtectedRoute />}>
            {/* Force password reset — no layout */}
            <Route path="/change-password" element={<ForceChangePasswordPage />} />

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

              {/* Reports Dashboard */}
              <Route path="/reports" element={<ReportsPage />} />

              {/* Settings — nested under SettingsLayout */}
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/settings/company" replace />} />
                <Route path="company" element={<CompanySettingsPage />} />
                <Route path="portal"  element={<PortalConfigPage />} />
                <Route path="users"   element={<UserSettingsPage />} />
                <Route path="shifts"         element={<ShiftConfigPage />} />
                <Route path="feature-access" element={<FeatureAccessPage />} />
              </Route>

              {/* Edit Profile */}
              <Route path="/profile" element={<EditProfilePage />} />

              {/* Leave Management */}
              <Route path="/leave-logs" element={<LeavePage />} />

              {/* Activity Log */}
              <Route path="/activity" element={<ActivityLogPage />} />

              {/* Upskill */}
              <Route path="/upskill" element={<UpskillPage />} />

              {/* Announcements */}
              <Route path="/announcements" element={<AnnouncementsPage />} />

              {/* Org Structure */}
              <Route path="/org-structure" element={<OrgStructurePage />} />

              {/* KPI Appraisal */}
              <Route path="/kpi" element={<KpiPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </CelebrationsProvider>
    </QueryClientProvider>
  );
}
