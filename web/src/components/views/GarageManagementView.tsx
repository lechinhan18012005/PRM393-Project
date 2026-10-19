import React, { useEffect, useState } from 'react';
import { Branch, Mechanic, Invitation, managementApi, request } from '../../services/managementApi';
export function GarageManagementView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);
  async function load() {
    try {
      const [b, m] = await Promise.all([managementApi.branches(), managementApi.mechanics()]);
      setBranches(b);
      setMechanics(m);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function mutate(path: string, method: string, body: unknown) {
    setBusy(true);
    setError('');
    try {
      await request(path, method, body);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveBranch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const ok = await mutate(
      editing ? `/garages/branches/${editing.id}` : '/garages/branches',
      editing ? 'PUT' : 'POST',
      {
        ...data,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude)
      }
    );
    if (ok) {
      setEditing(null);
      form.reset();
    }
  }
  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    setInvitation(null);
    try {
      setInvitation(await managementApi.invite(false, String(data.get('email')), Number(data.get('branchId'))));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="management-page p-6 space-y-6">
      <h1 className="text-2xl font-bold">Chi nhánh và đội thợ</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <h2 className="text-xl font-semibold">Chi nhánh</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {branches.map((branch) => (
          <article key={branch.id} className="border rounded p-4 space-y-2">
            <h3 className="font-bold">{branch.branchName}</h3>
            <p>{branch.address}</p>
            <p>
              {branch.phoneNumber} · {branch.rescueVehicles}
            </p>
            <p>
              {branch.mechanicsCount} thợ · {branch.operatingStatus === 'OPEN' ? 'Đang mở' : 'Đóng/bảo trì'}
            </p>
            <div className="flex gap-4">
              <button disabled={busy} onClick={() => setEditing(branch)}>
                Sửa
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void mutate(
                    `/garages/branches/${branch.id}/status?status=${branch.operatingStatus === 'OPEN' ? 'CLOSED_MAINTENANCE' : 'OPEN'}`,
                    'PATCH',
                    undefined
                  )
                }
              >
                Đổi trạng thái
              </button>
            </div>
          </article>
        ))}
      </div>
      {branches.length === 0 && <p>Chưa có chi nhánh. Thêm chi nhánh trước khi mời thợ.</p>}
      <form key={editing?.id ?? 'new'} onSubmit={saveBranch} className="border rounded p-4 grid gap-3 md:grid-cols-2">
        <h3 className="md:col-span-2 font-bold">{editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}</h3>
        {(['branchName', 'address', 'latitude', 'longitude', 'phoneNumber', 'rescueVehicles'] as const).map(
          (name, i) => (
            <label key={name}>
              {['Tên chi nhánh', 'Địa chỉ', 'Vĩ độ', 'Kinh độ', 'Điện thoại', 'Phương tiện cứu hộ'][i]}
              <input
                name={name}
                required={i < 4}
                type={i === 2 || i === 3 ? 'number' : 'text'}
                step="any"
                min={i === 2 ? -90 : i === 3 ? -180 : undefined}
                max={i === 2 ? 90 : i === 3 ? 180 : undefined}
                defaultValue={editing?.[name]}
                className="w-full border rounded p-2"
              />
            </label>
          )
        )}
        <button disabled={busy}>Lưu chi nhánh</button>
        {editing && (
          <button type="button" onClick={() => setEditing(null)}>
            Hủy
          </button>
        )}
      </form>
      <h2 className="text-xl font-semibold">Mời Thợ cứu hộ</h2>
      <form onSubmit={invite} className="flex flex-wrap gap-3">
        <input
          name="email"
          aria-label="Email thợ"
          type="email"
          required
          placeholder="Email thợ"
          className="border rounded p-2"
        />
        <select required name="branchId" aria-label="Chi nhánh" className="border rounded p-2">
          <option value="">Chọn chi nhánh</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.branchName}
            </option>
          ))}
        </select>
        <button disabled={busy || !branches.length}>Tạo lời mời</button>
      </form>
      {invitation && (
        <div role="status" className="border rounded p-4">
          <p>
            Gửi riêng mã cho {invitation.email}; hết hạn {new Date(invitation.expiresAt).toLocaleString('vi-VN')}.
          </p>
          <code className="break-all select-all">{invitation.code}</code>
          <p>Thợ kích hoạt bằng mã tại Mobile hoặc trang kích hoạt Web, sau đó đăng nhập Mobile.</p>
        </div>
      )}
      <h2 className="text-xl font-semibold">Phân chi nhánh và ca làm</h2>
      {mechanics.length === 0 && <p>Chưa có thợ đã kích hoạt.</p>}
      {mechanics.map((mechanic) => (
        <form
          key={`${mechanic.id}-${mechanic.branchId}-${mechanic.shiftName}`}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void mutate(`/garages/mechanics/${mechanic.id}/allocate`, 'PATCH', {
              branchId: Number(data.get('branchId')),
              shiftName: String(data.get('shiftName'))
            });
          }}
          className="border p-4 rounded flex flex-wrap items-center gap-3"
        >
          <span>
            {mechanic.fullName} · {mechanic.workingStatus}
          </span>
          <select
            name="branchId"
            required
            aria-label={`Chi nhánh của ${mechanic.fullName}`}
            defaultValue={mechanic.branchId ?? ''}
          >
            <option value="">Chọn chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branchName}
              </option>
            ))}
          </select>
          <input
            name="shiftName"
            aria-label={`Ca làm của ${mechanic.fullName}`}
            placeholder="Ca làm"
            defaultValue={mechanic.shiftName ?? ''}
          />
          <button disabled={busy}>Lưu phân công</button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void mutate(`/garages/mechanics/${mechanic.id}/status`, 'PATCH', {
                active: !mechanic.active
              })
            }
          >
            {mechanic.active ? 'Ngừng quyền làm việc' : 'Mở lại quyền làm việc'}
          </button>
        </form>
      ))}
    </section>
  );
}
