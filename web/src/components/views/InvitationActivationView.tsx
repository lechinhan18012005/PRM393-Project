import React, { useState } from 'react';
import { managementApi } from '../../services/managementApi';
export function InvitationActivationView({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setMessage('');
    if (data.get('password') !== data.get('confirm')) {
      setMessage('Mật khẩu xác nhận không khớp');
      setBusy(false);
      return;
    }
    try {
      await managementApi.activate(String(data.get('code')), {
        fullName: String(data.get('fullName')),
        username: String(data.get('username')),
        email: String(data.get('email')),
        phone: String(data.get('phone')) || undefined,
        password: String(data.get('password'))
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
        <p role="status">{message}</p>
        {!done && (
          <form onSubmit={submit} className="space-y-3">
            {[
              ['code', 'Mã mời', 'text'],
              ['fullName', 'Họ tên', 'text'],
              ['username', 'Tên đăng nhập', 'text'],
              ['email', 'Email được mời', 'email'],
              ['phone', 'Điện thoại', 'tel'],
              ['password', 'Mật khẩu', 'password'],
              ['confirm', 'Xác nhận mật khẩu', 'password']
            ].map(([name, label, type]) => (
              <label key={name} className="block">
                {label}
                <input
                  name={name}
                  type={type}
                  required={name !== 'phone'}
                  minLength={type === 'password' ? 6 : undefined}
                  className="w-full border p-2 rounded"
                />
              </label>
            ))}
            <button disabled={busy} className="border p-2 rounded">
              {busy ? 'Đang kích hoạt...' : 'Kích hoạt'}
            </button>
          </form>
        )}
        <button onClick={onBack}>Quay lại đăng nhập</button>
      </div>
    </div>
  );
}
