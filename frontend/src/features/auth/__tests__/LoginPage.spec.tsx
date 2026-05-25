import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApiModule from '../../../api/auth.api';
import { LoginPage } from '../pages/LoginPage';

const { mockNavigate, mockSetAuth } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../api/auth.api');

vi.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

const mockAuthApi = vi.mocked(authApiModule.authApi);

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UTC-F001-F-001: Render_ShowsEmailPasswordAndSubmitButton', () => {
    renderLogin();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('UTC-F001-F-002: EmptySubmit_ShowsValidationErrors', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockAuthApi.login).not.toHaveBeenCalled();
  });

  it('UTC-F001-F-003: ValidSubmit_CallsApiAndRedirects', async () => {
    mockAuthApi.login.mockResolvedValue({
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      user: { id: '1', fullName: 'Super Admin', email: 'superadmin@pms.com', systemRole: 'SUPER_USER' },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), 'superadmin@pms.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password@123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: 'superadmin@pms.com',
        password: 'Password@123',
      });
      expect(mockSetAuth).toHaveBeenCalledWith(
        { id: '1', fullName: 'Super Admin', email: 'superadmin@pms.com', systemRole: 'SUPER_USER' },
        'fake-access-token',
        'fake-refresh-token',
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('UTC-F001-F-004: ApiError_ShowsErrorMessage', async () => {
    mockAuthApi.login.mockRejectedValue({
      response: { status: 401 },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email address/i), 'wrong@pms.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
