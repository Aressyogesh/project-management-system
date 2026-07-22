import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustResetPassword && pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
