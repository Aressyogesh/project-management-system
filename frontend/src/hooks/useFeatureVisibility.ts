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

    // Super User and Admin always have full access
    if (user.systemRole === 'SUPER_USER' || user.systemRole === 'ADMIN') return true;

    // BU Head — check BU_HEAD row
    if (user.systemRole === 'BU_HEAD') {
      return data.find((e) => e.feature === feature && e.role === 'BU_HEAD')?.visible ?? false;
    }

    // Employee — determine effective role by project membership flags
    if (user.hasPmRole) {
      return data.find((e) => e.feature === feature && e.role === 'PROJECT_MANAGER')?.visible ?? false;
    }
    if (user.hasManagementRole) {
      return data.find((e) => e.feature === feature && e.role === 'TEAM_LEAD')?.visible ?? false;
    }

    // Developer, QA, Designer, DevOps, etc.
    return data.find((e) => e.feature === feature && e.role === 'EMPLOYEE')?.visible ?? false;
  }

  return { canSee };
}
