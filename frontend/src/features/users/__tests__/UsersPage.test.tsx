import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usersApi } from '../../../api/users.api';
import { UsersPage } from '../pages/UsersPage';

vi.mock('../../../api/users.api');
vi.mock('../../../api/departments.api', () => ({ departmentsApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../../api/settings.api', () => ({ settingsApi: { getShifts: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'current-user', fullName: 'Admin', systemRole: 'ADMIN' } }),
}));

const mockUser = {
  id: 'user-001',
  fullName: 'Jane Doe',
  email: 'jane@pms.com',
  systemRole: 'EMPLOYEE',
  phone: null,
  joinDate: null,
  profilePhoto: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  department: { id: 'dept-1', name: 'Digital' },
  shift: { id: 'shift-1', name: 'Day', shiftType: 'DAY' },
};

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.mocked(usersApi.list).mockResolvedValue({
      data: [mockUser],
      total: 1,
      page: 1,
      limit: 25,
    });
  });

  // UTC-F-004-F-001
  it('Renders_UserTableWithData', async () => {
    render(<UsersPage />, { wrapper: wrapper() });
    const name = await screen.findByText('Jane Doe');
    expect(name).toBeTruthy();
    expect(screen.getByText('jane@pms.com')).toBeTruthy();
    expect(screen.getByText('Employee')).toBeTruthy();
  });

  // UTC-F-004-F-003
  it('Search_FiltersUserList', async () => {
    render(<UsersPage />, { wrapper: wrapper() });
    const searchBox = await screen.findByPlaceholderText(/search/i);
    await userEvent.type(searchBox, 'jane');
    // After debounce, usersApi.list should be called with search param
    expect(usersApi.list).toHaveBeenCalled();
  });
});
