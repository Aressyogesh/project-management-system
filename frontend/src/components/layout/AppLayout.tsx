import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalProgressBar } from './GlobalProgressBar';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { usersApi } from '../../api/users.api';
import { useAuthStore } from '../../store/authStore';

export function AppLayout() {
  const updateUser = useAuthStore((s) => s.updateUser);

  // Refresh user profile on mount so stored flags (hasPmRole, hasManagementRole)
  // stay current without requiring a re-login after role changes.
  useEffect(() => {
    usersApi.getProfile().then((profile) => {
      updateUser({
        fullName: profile.fullName,
        email: profile.email,
        profilePhoto: profile.profilePhoto,
        hasPmRole: (profile as any).hasPmRole,
        hasManagementRole: (profile as any).hasManagementRole,
      });
    }).catch(() => { /* ignore — stale data is acceptable */ });
  }, [updateUser]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <GlobalProgressBar />
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
