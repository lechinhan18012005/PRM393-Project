import React, { useEffect, useState } from 'react';
import { managementApi, request, Invitation } from '../../services/managementApi';
import { User } from '../../types/auth';
export function StaffAccountsView() {
  const [staff, setStaff] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setStaff(await managementApi.staff());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    setBusy(true);
    setError('');
    setInvitation(null);
    try {
      setInvitation(await managementApi.invite(true, email));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(user: User) {
    setBusy(true);
    setError('');
    try {
      await request(`/admin/staff/${user.id}/status`, 'PATCH', {
        active: !user.active
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="management-page p-6 space-y-5">
      <h1 className="text-2xl font-bold">Tài khoản Staff</h1>
      <p>Admin mời Staff, Staff tự đặt mật khẩu khi kích hoạt.</p>
      <form onSubmit={invite} className="flex gap-3">
        <input
          name="email"
          aria-label="Email Staff"
          required
          type="email"
          placeholder="Email Staff"
          className="border rounded p-2"
        />
        <button disabled={busy}>Tạo lời mời</button>
      </form>
      {invitation && (
        <div role="status" className="border p-4 space-y-2">
          <p>
            Gửi riêng mã này cho {invitation.email}. Hết hạn: {new Date(invitation.expiresAt).toLocaleString('vi-VN')}
          </p>
          <code className="break-all select-all">{invitation.code}</code>
          <p>Người nhận chọn “Kích hoạt tài khoản được mời” tại trang đăng nhập. Mã chỉ hiển thị ở lần tạo này.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <table className="w-full text-left">
        <thead>
          <tr>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((user) => (
            <tr key={user.id}>
              <td>{user.fullName}</td>
              <td>{user.email}</td>
              <td>{user.active ? 'Hoạt động' : 'Đã khóa'}</td>
              <td>
                <button disabled={busy} onClick={() => void toggle(user)}>
                  {user.active ? 'Khóa' : 'Mở khóa'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {staff.length === 0 && <p>Chưa có Staff đã kích hoạt.</p>}
    </section>
  );
}
