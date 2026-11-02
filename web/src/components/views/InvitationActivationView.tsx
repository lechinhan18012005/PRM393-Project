import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { managementApi } from '../../services/managementApi';

export function InvitationActivationView({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setMessage('');

    const code = String(data.get('code') || '').trim();
    const username = String(data.get('username') || '').trim();
    const fullName = String(data.get('fullName') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const password = String(data.get('password') || '');
    const confirm = String(data.get('confirm') || '');

    if (password !== confirm) {
      setMessage('Mật khẩu xác nhận không khớp');
      setBusy(false);
      return;
    }

    if (password.length < 8 || password.length > 64) {
      setMessage('Mật khẩu phải từ 8 đến 64 ký tự');
      setBusy(false);
      return;
    }

    if (username.length < 3 || username.length > 50 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
      setMessage('Tên đăng nhập phải từ 3 đến 50 ký tự, chỉ gồm chữ, số, dấu gạch dưới, chấm hoặc gạch ngang');
      setBusy(false);
      return;
    }

    if (fullName.length < 2 || fullName.length > 100) {
      setMessage('Họ và tên phải từ 2 đến 100 ký tự');
      setBusy(false);
      return;
    }

    if (phone && !/^(0|\+84)[0-9]{9}$/.test(phone)) {
      setMessage('Số điện thoại không hợp lệ (Vui lòng nhập 10 chữ số, VD: 0909123456)');
      setBusy(false);
      return;
    }

    try {
      await managementApi.activate(code, {
        fullName,
        username,
        email,
        phone: phone || undefined,
        password
      });
      setDone(true);
      setMessage('Kích hoạt thành công. Staff đăng nhập trên Web; Thợ cứu hộ đăng nhập trên Mobile.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-lg bg-white p-6 rounded-xl space-y-4">
        <h1 className="text-2xl font-bold">Kích hoạt tài khoản được mời</h1>
        <p>Mã mời dùng một lần, có hiệu lực trong 48 giờ. Nhập email được mời và tự đặt mật khẩu.</p>
        <p role="status" className={message.includes('thành công') ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>{message}</p>
        {!done && (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              Mã mời <span className="text-red-500">*</span>
              <input
                name="code"
                type="text"
                required
                className="w-full border p-2 rounded"
              />
            </label>
            <label className="block">
              Họ tên <span className="text-red-500">*</span>
              <input
                name="fullName"
                type="text"
                required
                minLength={2}
                maxLength={100}
                className="w-full border p-2 rounded"
              />
            </label>
            <label className="block">
              Tên đăng nhập <span className="text-red-500">*</span>
              <input
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={50}
                pattern="^[a-zA-Z0-9._-]+$"
                title="Từ 3-50 ký tự, chỉ chứa chữ, số, dấu chấm, gạch dưới hoặc gạch ngang"
                className="w-full border p-2 rounded"
              />
            </label>
            <label className="block">
              Email được mời <span className="text-red-500">*</span>
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                className="w-full border p-2 rounded"
              />
            </label>
            <label className="block">
              Điện thoại (tùy chọn)
              <input
                name="phone"
                type="tel"
                pattern="^(0|\+84)[0-9]{9}$"
                title="Số điện thoại Việt Nam 10 chữ số (VD: 0909123456 hoặc +84909123456)"
                className="w-full border p-2 rounded"
              />
            </label>
            <label className="block">
              Mật khẩu <span className="text-red-500">*</span>
              <div className="relative flex items-center">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={64}
                  className="w-full border p-2 pr-10 rounded"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
            <label className="block">
              Xác nhận mật khẩu <span className="text-red-500">*</span>
              <div className="relative flex items-center">
                <input
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={64}
                  className="w-full border p-2 pr-10 rounded"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors focus:outline-none cursor-pointer"
                  title={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
            <button disabled={busy} className="border p-2 rounded w-full bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50">
              {busy ? 'Đang kích hoạt...' : 'Kích hoạt'}
            </button>
          </form>
        )}
        <button onClick={onBack} className="text-sm text-secondary hover:underline">Quay lại đăng nhập</button>
      </div>
    </div>
  );
}
