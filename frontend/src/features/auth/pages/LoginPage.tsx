import { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/auth.api';
import { REMEMBER_ME_KEY, useAuthStore } from '../../../store/authStore';
import { LoginCredentials } from '../../../types/auth.types';

const REMEMBER_EMAIL_KEY = 'pms_remember_email';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_EMAIL_KEY));
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginCredentials>({
    defaultValues: {
      email: localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '',
    },
  });

  const onSubmit = async (credentials: LoginCredentials) => {
    setApiError(null);
    try {
      const response = await authApi.login(credentials);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, credentials.email);
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
      // REMEMBER_ME_KEY must be set before setAuth so dynamicStorage writes to the correct store
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/dashboard');
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      const status = axiosError.response?.status;
      if (status === 403) {
        setApiError('Your account has been deactivated. Please contact your administrator.');
      } else {
        setApiError('Invalid email or password. Please try again.');
      }
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotStatus('loading');
    try {
      await authApi.forgotPassword(forgotEmail);
    } catch {
      // Always show success for security — don't reveal if email is registered
    } finally {
      setForgotStatus('sent');
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail('');
    setForgotStatus('idle');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white text-xl font-bold mb-4 shadow-md">
            PMS
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Project Management System</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue to your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Welcome back</h2>

          {apiError && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                {...register('email', {
                  required: 'Email address is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none transition
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    [&::-ms-reveal]:hidden [&::-ms-clear]:hidden
                    ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
              {/* Forgot password link — below the field */}
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-sm text-gray-600 cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-primary-600 hover:bg-primary-700
                disabled:opacity-60 disabled:cursor-not-allowed
                text-white font-semibold text-sm transition mt-1"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-sm">
            {forgotStatus !== 'sent' ? (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Forgot your password?</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Enter your registered email address and we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="you@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none transition focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeForgot}
                      disabled={forgotStatus === 'loading'}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!forgotEmail || forgotStatus === 'loading'}
                      className="flex-1 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
                    >
                      {forgotStatus === 'loading' ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Check your email</h3>
                <p className="text-sm text-gray-500">
                  If <span className="font-medium text-gray-700">{forgotEmail}</span> is registered, you'll receive a reset link shortly.
                </p>
                <button
                  onClick={closeForgot}
                  className="mt-2 w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
