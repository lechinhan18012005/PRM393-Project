import React, { useState } from 'react';
import { DEMO_MODE, useAuth } from '../../context/AuthContext';
import { Role } from '../../types/auth';
import { Shield, Building2, User, KeyRound, AlertCircle, ArrowRight, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';

interface LoginViewProps {
  onSwitchToRegister: () => void;
  onActivate: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister, onActivate }) => {
  const { login, demoLogin, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password });
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSelect = async (role: Role) => {
    setError(null);
    setSubmitting(true);
    try {
      await demoLogin(role);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đăng nhập tài khoản mẫu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-4 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HydroRescue Vietnam</h1>
          <p className="text-sm text-slate-500 mt-1">Nền tảng cứu hộ xe máy ngập lụt đô thị</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 border border-orange-500/20">
            <Sparkles className="w-3 h-3" /> Cổng quản lý cứu hộ
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Email hoặc số điện thoại
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Nhập email hoặc số điện thoại"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Mật khẩu</label>
              <span className="text-xs text-orange-600 hover:text-orange-300 cursor-pointer">Quên mật khẩu?</span>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors focus:outline-none cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang đăng nhập...
              </>
            ) : (
              <>
                Đăng nhập <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins */}
        {DEMO_MODE && (
          <div className="mt-8 pt-6 border-t border-slate-200/80">
            <p className="text-xs font-medium text-slate-500 text-center mb-3">
              Đăng nhập nhanh với các tài khoản mẫu (Demo Roles):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleDemoSelect('ADMIN')}
                className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-800 border border-slate-200 hover:border-orange-500/40 text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-all text-left"
              >
                <Shield className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-900">Administrator</div>
                  <div className="text-[10px] text-slate-500">Quản lý Tài chính</div>
                </div>
              </button>

              <button
                onClick={() => handleDemoSelect('STAFF')}
                className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-800 border border-slate-200 hover:border-blue-500/40 text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-all text-left"
              >
                <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-900">Staff Vận hành</div>
                  <div className="text-[10px] text-slate-500">Duyệt gara & ngập</div>
                </div>
              </button>

              <button
                onClick={() => handleDemoSelect('GARAGE_OWNER')}
                className="p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-800 border border-slate-200 hover:border-emerald-500/40 text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-all text-left"
              >
                <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-900">Chủ Gara</div>
                  <div className="text-[10px] text-slate-500">Bảng giá & Chi nhánh</div>
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 text-center">
          <button className="text-orange-600 underline" onClick={onActivate}>
            Kích hoạt tài khoản được mời
          </button>
        </div>
        {/* Footer switch to Register */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Bạn là Chủ gara mới?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-orange-600 font-semibold hover:text-orange-300 hover:underline inline-flex items-center gap-1"
          >
            Đăng ký gara
          </button>
        </div>
      </div>
    </div>
  );
};
