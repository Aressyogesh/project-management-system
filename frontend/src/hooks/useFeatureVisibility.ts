import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings.api';
import { useAuthStore } from '../store/authStore';

export type VisibleFeature = 'KPI' | 'REPORTS';

export function useFeatureVisibility() {
  const user = useAuthStore((s) => s.user);

  const { data = [] } = useQuery({
    queryKey: ['feature-visibility'],
    queryFn: settingsApi.getFeatureVisibility,
    staleTime: 5 * 60 * 1000,
  });

  function canSee(feature: VisibleFeature): boolean {
    if (!user) return false;
    if (user.systemRole === 'SUPER_USER') return true;
    if (user.systemRole === 'BU_HEAD') return true;
    const entry = data.find((e) => e.feature === feature && e.role === user.systemRole);
    // If no row found yet (first load), default ADMIN=true, EMPLOYEE=false
    if (!entry) return user.systemRole === 'ADMIN';
    return entry.visible;
  }

  return { canSee };
}
