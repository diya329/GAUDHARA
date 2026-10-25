import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

type AuthMode = 'login' | 'signup' | 'forgot_password' | 'update_password';

interface AuthViewProps {
  initialMode?: AuthMode;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onSuccess,
  onCancel,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false);

  const { signIn, signUp, requestPasswordReset, updatePassword, loginAsDemoUser, isConfigured } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailUnconfirmed(false);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error, unconfirmed } = await signIn(email, password);
        if (error) {
          if (unconfirmed) {
            setEmailUnconfirmed(true);
            setErrorMessage('Your email address has not been confirmed yet. Please click the confirmation link sent to your inbox.');
          } else {
            setErrorMessage(error.message || 'Invalid email or password.');
          }
        } else {
          onSuccess();
        }
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }

        const { error, requiresEmailConfirmation } = await signUp(email, password, fullName);
        if (error) {
          setErrorMessage(error.message || 'Registration failed.');
        } else if (requiresEmailConfirmation) {
          setSuccessMessage(
            'Account created! A confirmation email has been sent. Please check your inbox to activate your account before logging in.'
          );
          setMode('login');
        } else {
          onSuccess();
        }
      } else if (mode === 'forgot_password') {
        const { error } = await requestPasswordReset(email);
        if (error) {
          setErrorMessage(error.message || 'Could not send recovery email.');
        } else {
          setSuccessMessage('Password reset link sent to your email address. Follow the link to choose a new password.');
        }
      } else if (mode === 'update_password') {
        const { error } = await updatePassword(password);
        if (error) {
          setErrorMessage(error.message || 'Failed to update password.');
        } else {
          setSuccessMessage('Your password has been updated successfully. Please log in.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (role: 'veterinarian' | 'dairy_manager') => {
    loginAsDemoUser(role);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#F8F9F8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center items-center gap-2.5">
          <div className="w-10 h-10 rounded-md bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            GD
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#143D2B]">
            GauDhara
          </span>
        </div>

        <h2 className="mt-4 text-center text-xl font-bold text-[#0F172A]">
          {mode === 'login' && t.login}
          {mode === 'signup' && t.signUp}
          {mode === 'forgot_password' && t.saveSettings}
          {mode === 'update_password' && t.saveSettings}
        </h2>

        <p className="mt-1 text-center text-xs text-[#64748B]">
          {t.tagline}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#E2E8F0] sm:rounded-lg sm:px-10">
          {/* Supabase status notice if not configured */}
          {!isConfigured && (
            <div className="mb-5 p-3 rounded-md bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E]">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <strong>{t.demoAccount}</strong>
                  <p className="mt-0.5">
                    {t.viewDemo}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#991B1B] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-md bg-[#DCFCE7] border border-[#86EFAC] text-xs text-[#166534] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.cowName}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Sunita Sharma"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1B4332] focus:border-[#1B4332]"
                  />
                </div>
              </div>
            )}

            {mode !== 'update_password' && (
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vet@gaudhara.local"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1B4332] focus:border-[#1B4332]"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#334155]">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot_password')}
                      className="text-[11px] text-[#1B4332] hover:underline"
                    >
                      {t.saveSettings}?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1B4332] focus:border-[#1B4332]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143427] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1B4332] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t.loading}</span>
              ) : (
                <>
                  <span>
                    {mode === 'login' && t.login}
                    {mode === 'signup' && t.signUp}
                    {mode === 'forgot_password' && t.saveSettings}
                    {mode === 'update_password' && t.saveSettings}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-4 pt-4 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
            {mode === 'login' ? (
              <p>
                {t.signUp}?{' '}
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('signup');
                  }}
                  className="font-semibold text-[#1B4332] hover:underline"
                >
                  {t.registerAnimal}
                </button>
              </p>
            ) : (
              <p>
                {t.login}?{' '}
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="font-semibold text-[#1B4332] hover:underline"
                >
                  {t.login}
                </button>
              </p>
            )}
          </div>

          {/* Demo Login Options */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-center mb-2.5">
              {t.demoAccount}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('veterinarian')}
                className="px-3 py-2 border border-[#CBD5E1] rounded text-xs font-medium text-[#334155] hover:bg-[#F8FAF9] text-center"
              >
                {t.veterinarianInCharge}
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('dairy_manager')}
                className="px-3 py-2 border border-[#CBD5E1] rounded text-xs font-medium text-[#334155] hover:bg-[#F8FAF9] text-center"
              >
                {t.roleLabel}
              </button>
            </div>
          </div>

          {onCancel && (
            <div className="mt-4 text-center">
              <button
                onClick={onCancel}
                className="text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                ← {t.appName}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
