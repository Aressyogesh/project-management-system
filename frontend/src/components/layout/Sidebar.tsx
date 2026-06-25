import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { SystemRole } from '../../types/auth.types';
import { UserAvatar } from '../shared/UserAvatar';
import { useFeatureVisibility } from '../../hooks/useFeatureVisibility';

function IconOverview() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 9a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm9-9a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zm0 9a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 20h5v-2a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015-3.87M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconBusinessUnit() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconDepartments() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconClients() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function IconProjects() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}
function IconLeave() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconTimesheet() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconKpi() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconReports() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
function IconUpskill() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconActivity() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

interface NavItem {
  path: string;
  label: string;
  Icon: () => JSX.Element;
  roles?: SystemRole[];
}

const navItems: NavItem[] = [
  { path: '/dashboard',       label: 'Overview',        Icon: IconOverview },
  { path: '/business-units',  label: 'Business Units',  Icon: IconBusinessUnit,  roles: ['SUPER_USER', 'ADMIN'] },
  { path: '/departments',     label: 'Departments',     Icon: IconDepartments,   roles: ['SUPER_USER', 'ADMIN'] },
  { path: '/clients',         label: 'Clients',         Icon: IconClients,       roles: ['SUPER_USER', 'ADMIN'] },
  { path: '/users',           label: 'Users',           Icon: IconUsers,         roles: ['SUPER_USER', 'ADMIN'] },
  { path: '/projects',        label: 'Projects',        Icon: IconProjects },
  { path: '/timesheet',       label: 'Timesheet',       Icon: IconTimesheet },
  { path: '/leave-logs',      label: 'Leaves Management', Icon: IconLeave },
  { path: '/kpi',             label: 'KPI',             Icon: IconKpi },
  { path: '/reports',         label: 'Reports',         Icon: IconReports },
  { path: '/activity',        label: 'Activity Log',    Icon: IconActivity,      roles: ['SUPER_USER', 'ADMIN'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshToken, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canSee } = useFeatureVisibility();

  async function handleLogout() {
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore — token may already be expired */ }
    }
    queryClient.clear();
    clearAuth();
    navigate('/login');
  }

  const baseNav = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(user?.systemRole as SystemRole)) return false;
    if (item.path === '/kpi')        return canSee('KPI');
    if (item.path === '/reports')    return canSee('REPORTS');
    if (item.path === '/leave-logs') return user?.systemRole !== 'EMPLOYEE' || user?.hasManagementRole === true;
    return true;
  });

  const upskillItem: NavItem = { path: '/upskill', label: 'Upskill', Icon: IconUpskill };
  const kpiIdx = baseNav.findIndex((n) => n.path === '/kpi');
  const visibleNav = kpiIdx >= 0
    ? [...baseNav.slice(0, kpiIdx + 1), upskillItem, ...baseNav.slice(kpiIdx + 1)]
    : [...baseNav, upskillItem];

  const sidebarContent = (
    <aside
      className={`flex flex-col shrink-0 h-full bg-white border-r border-gray-100 transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center border-b border-gray-100 h-[65px] ${collapsed ? 'justify-center px-3' : 'px-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-gray-900 font-bold text-base tracking-tight">PMS</span>
          </div>
        )}
        {/* Desktop toggle button */}
        <button
          onClick={onToggle}
          className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition ${
            collapsed ? 'absolute left-[54px] top-[22px] bg-white border border-gray-200 shadow-sm z-10 rounded-full w-6 h-6' : 'ml-auto'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {visibleNav.map(({ path, label, Icon: NavIcon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <NavIcon />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className={`py-3 border-t border-gray-100 ${collapsed ? 'px-2' : 'px-3'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <UserAvatar name={user?.fullName ?? 'U'} photo={user?.profilePhoto} size="md" title={user?.fullName} />
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center justify-center w-full py-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              <IconLogout />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-2 mb-2">
              <UserAvatar name={user?.fullName ?? 'U'} photo={user?.profilePhoto} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-400 truncate capitalize">
                  {user?.systemRole.replace(/_/g, ' ').toLowerCase()}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              <IconLogout />
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-screen relative">{sidebarContent}</div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white shadow-md border border-gray-200"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile drawer (always expanded) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full">
            <aside className="flex flex-col w-60 shrink-0 h-full bg-white border-r border-gray-100">
              <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">P</span>
                </div>
                <span className="text-gray-900 font-bold text-base tracking-tight">PMS</span>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {visibleNav.map(({ path, label, Icon: NavIcon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`
                    }
                  >
                    <NavIcon />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="px-3 py-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-2 mb-2">
                  <UserAvatar name={user?.fullName ?? 'U'} photo={user?.profilePhoto} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName}</p>
                    <p className="text-xs text-gray-400 truncate capitalize">
                      {user?.systemRole.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <IconLogout />
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
