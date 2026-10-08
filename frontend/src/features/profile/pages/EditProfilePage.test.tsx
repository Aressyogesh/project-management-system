import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EditProfilePage } from './EditProfilePage';
import { useAuthStore } from '../../../store/authStore';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../../api/users.api', () => ({
  usersApi: {
    updateProfile: vi.fn(),
  },
}));

const mockUser = { id: 'u1', fullName: 'Alice Smith', email: 'alice@test.com', systemRole: 'EMPLOYEE' as const };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EditProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(useAuthStore).mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ user: mockUser, updateUser: vi.fn() }),
  );
});

describe('EditProfilePage', () => {
  it('renders form pre-filled with current user data', () => {
    renderPage();
    expect(screen.getByDisplayValue('Alice Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alice@test.com')).toBeInTheDocument();
  });

  it('shows password mismatch error inline when new passwords differ', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'abc123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'different' } });
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('does not show mismatch when passwords are equal', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'abc123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'abc123' } });
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  });

  it('submit button is enabled when form is ready', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  it('shows success message after successful update', async () => {
    const { usersApi } = await import('../../../api/users.api');
    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      ...mockUser,
      profilePhoto: null,
      phone: null,
      joinDate: null,
    } as never);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument();
    });
  });
});
