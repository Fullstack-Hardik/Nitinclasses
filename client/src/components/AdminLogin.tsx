import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, GraduationCap } from 'lucide-react';
import api from '../services/api';

interface AdminLoginProps {
  onLoginSuccess: (admin: any) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both admin email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('nsc_token', res.data.token);
        localStorage.setItem('nsc_admin', JSON.stringify(res.data.admin));
        onLoginSuccess(res.data.admin);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Authentication failed. Please verify credentials.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#EEF2F6]">
      <div className="w-full max-w-md neu-card p-8 sm:p-10 transition-all">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg mb-4">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nitin Sir Classes</h1>
          <p className="text-sm text-slate-500 mt-1">Management Software Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <p className="leading-tight">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Admin Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nitinsirclasses.com"
                required
                className="w-full neu-input py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Admin Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full neu-input py-3 pl-11 pr-11 text-sm text-slate-800 placeholder-slate-400 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 neu-button-primary font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200/60 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Protected Administrator Session • 10-Attempt Lockout Active
          </p>
        </div>
      </div>
    </div>
  );
};
