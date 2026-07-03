import { AxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
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
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_EMAIL_KEY));
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (!apiError) return;
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setApiError(null), 12000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [apiError]);

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
      navigate(response.user.mustResetPassword ? '/change-password' : '/dashboard');
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#f0f2f5' }}>

      {/* ── Centered card ───────────────────────────────────────────────── */}
      <div className="w-full flex rounded-2xl shadow-xl overflow-hidden" style={{ maxWidth: 860 }}>

        {/* ── Left: blue gradient ─────────────────────────────────────── */}
        <div
          className="flex flex-col items-center justify-between p-8 w-1/2 shrink-0"
          style={{ background: 'linear-gradient(160deg, #1a6ab1 0%, #1e88c8 40%, #29a8d8 100%)' }}
        >
          {/* White logo card */}
          <div className="w-full bg-white rounded-xl px-6 py-5 flex flex-col items-center">
            <img src="/pms-logo.svg" alt="Aress PMS" className="h-16 w-auto mb-5" />
            <p className="text-sm font-medium text-center" style={{ color: '#1a3c5e' }}>
              Plan. Track. Deliver.{' '}
              <span className="italic font-semibold" style={{ color: '#00A7E1', fontFamily: 'Georgia, serif' }}>
                Successfully..
              </span>
            </p>
          </div>

          {/* Illustration sitting on blue */}
          <div className="flex-1 flex items-end justify-center pt-4">
            <img
              src="/login-img.png"
              alt="Project management illustration"
              className="w-full max-w-[280px] object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* ── Right: sign-in form ─────────────────────────────────────── */}
        <div className="flex-1 bg-white flex flex-col justify-center px-10 py-10">

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-7">Welcome back — please enter your details.</p>

          {/* Error banner */}
          {apiError && (
            <div role="alert" className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition
                  focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                {...register('email', {
                  required: 'Email address is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address',
                  },
                })}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm outline-none transition
                    focus:ring-2 focus:ring-blue-400 focus:border-blue-400
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm font-medium transition-colors"
                style={{ color: '#1a6ab1' }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit: circular button + label */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                style={{ background: '#1a6ab1' }}
                aria-label="Sign in"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
              <span className="text-base font-semibold text-gray-800">
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </span>
            </div>

          </form>
        </div>
      </div>

      {/* ── Forgot Password Modal ────────────────────────────────────────── */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-sm">
            {forgotStatus !== 'sent' ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#1a6ab1' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Forgot your password?</h3>
                    <p className="text-xs text-gray-500">We'll send you a reset link</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                  Enter your registered email address and we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="you@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm outline-none transition focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
                      className="flex-1 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
                      style={{ background: '#1a6ab1' }}
                    >
                      {forgotStatus === 'loading' ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Check your email</h3>
                <p className="text-sm text-gray-500">
                  If <span className="font-medium text-gray-700">{forgotEmail}</span> is registered, you'll receive a reset link shortly.
                </p>
                <button
                  onClick={closeForgot}
                  className="mt-2 w-full py-2.5 rounded-lg text-white text-sm font-semibold transition"
                  style={{ background: '#1a6ab1' }}
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
