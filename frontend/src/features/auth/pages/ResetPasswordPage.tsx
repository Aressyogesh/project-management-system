import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../../api/auth.api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'checking' | 'idle' | 'loading' | 'done' | 'error' | 'expired'>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    authApi.validateResetToken(token)
      .then(() => setStatus('idle'))
      .catch(() => setStatus('expired'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setStatus('loading');
    try {
      await authApi.resetPassword(token, password);
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMsg('This reset link is invalid or has expired. Please request a new one.');
    }
  };

  if (!token || status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Link expired or invalid</h2>
          <p className="text-sm text-gray-500 mb-5">
            {!token
              ? 'This reset link is invalid.'
              : 'This password reset link has expired or already been used. Links are valid for 1 hour.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition"
            style={{ background: 'linear-gradient(135deg, #004D91, #0077CC)' }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 w-full max-w-sm text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Validating reset link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/pms-logo.svg" alt="Aress PMS" className="h-10 w-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reset your password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a strong new password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8">
          {status === 'done' ? (
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Password updated!</h2>
              <p className="text-sm text-gray-500">Your password has been reset successfully. You can now sign in with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold transition"
                style={{ background: 'linear-gradient(135deg, #004D91, #0077CC)' }}
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Set new password</h2>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

              {errorMsg && (
                <div role="alert" className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    New password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
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
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
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
                </div>

                <button
                  type="submit"
                  disabled={!password || !confirm || status === 'loading'}
                  className="w-full py-3 px-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition mt-1"
                  style={{ background: 'linear-gradient(135deg, #004D91, #0077CC)' }}
                >
                  {status === 'loading' ? 'Updating…' : 'Reset Password'}
                </button>

                <div className="text-center">
                  <button type="button" onClick={() => navigate('/login')} className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors">
                    Back to Sign In
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
