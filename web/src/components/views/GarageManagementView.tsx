import React, { useEffect, useState } from 'react';
import { Branch, Mechanic, Invitation, managementApi, request } from '../../services/managementApi';
import { Building2, Users, UserCheck, Plus, Search } from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel, GarageDrawer, GarageError } from '../garage/GarageUI';
export function GarageManagementView() {
  const [drawer, setDrawer] = useState<'branch' | 'invite' | null>(null);
  const [tab, setTab] = useState<'branches' | 'team'>('branches');
  const [query, setQuery] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);
  async function load() {
    setError('');
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
      setDrawer(null);
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
    <section className="garage-portal">
      <GarageHeading
        title="Chi nhánh & đội thợ"
        description="Quản lý điểm phục vụ, lời mời và phân ca cho đội cứu hộ."
        action={
          <>
            <button
              className="garage-button"
              onClick={() => {
                setInvitation(null);
                setDrawer('invite');
              }}
              disabled={!branches.length}
            >
              <Users size={16} />
              Mời thợ cứu hộ
            </button>
            <button
              className="garage-button primary"
              onClick={() => {
                setEditing(null);
                setDrawer('branch');
              }}
            >
              <Plus size={16} />
              Thêm chi nhánh
            </button>
          </>
        }
      />
      <GarageError message={error} retry={() => void load()} />
      <div className="garage-stat-grid three">
        <GarageStat
          label="Chi nhánh hoạt động"
          value={branches.filter((b) => b.operatingStatus === 'OPEN').length}
          detail={`${branches.length} cơ sở trong mạng lưới`}
          icon={<Building2 size={18} />}
        />
        <GarageStat
          label="Thành viên đội thợ"
          value={mechanics.length}
          detail="Tài khoản đã kích hoạt lời mời"
          icon={<Users size={18} />}
          accent="blue"
        />
        <GarageStat
          label="Sẵn sàng nhận đơn"
          value={mechanics.filter((m) => m.active && m.workingStatus === 'AVAILABLE').length}
          detail={`${mechanics.filter((m) => m.active).length} tài khoản được phép làm việc`}
          icon={<UserCheck size={18} />}
          accent="teal"
        />
      </div>
      <div className="garage-toolbar">
        <div className="garage-tabs">
          <button className={tab === 'branches' ? 'active' : ''} onClick={() => setTab('branches')}>
            Chi nhánh <span>{branches.length}</span>
          </button>
          <button className={tab === 'team' ? 'active' : ''} onClick={() => setTab('team')}>
            Đội thợ <span>{mechanics.length}</span>
          </button>
        </div>
        <label className="garage-search">
          <Search size={16} />
          <input
            aria-label="Tìm chi nhánh hoặc thợ"
            placeholder="Tìm tên, địa chỉ hoặc email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {tab === 'branches' && (
        <GaragePanel title="Mạng lưới chi nhánh" description="Thông tin liên hệ, phương tiện và trạng thái phục vụ">
          <div className="garage-branch-grid">
            {branches
              .filter((b) =>
                `${b.branchName} ${b.address}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
              )
              .map((branch) => (
                <article key={branch.id} className="garage-branch-card">
                  <h3 className="font-bold">{branch.branchName}</h3>
                  <p>{branch.address}</p>
                  <p>
                    {branch.phoneNumber} · {branch.rescueVehicles}
                  </p>
                  <p>
                    {branch.mechanicsCount} thợ · {branch.operatingStatus === 'OPEN' ? 'Đang mở' : 'Đóng/bảo trì'}
                  </p>
                  <div className="flex gap-4">
                    <button
                      disabled={busy}
                      onClick={() => {
                        setEditing(branch);
                        setDrawer('branch');
                      }}
                    >
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
          {branches.length > 0 &&
            !branches.some((b) =>
              `${b.branchName} ${b.address}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
            ) && <p>Không tìm thấy chi nhánh phù hợp.</p>}
        </GaragePanel>
      )}
      {drawer === 'branch' && (
        <GarageDrawer
          title={editing ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh'}
          description="Thông tin điểm phục vụ của gara"
          onClose={() => {
            if (!busy) setDrawer(null);
          }}
        >
          <GarageError message={error} />
          <form key={editing?.id ?? 'new'} onSubmit={saveBranch} className="garage-form">
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
              <button type="button" onClick={() => setDrawer(null)}>
                Hủy
              </button>
            )}
          </form>
        </GarageDrawer>
      )}
      {drawer === 'invite' && (
        <GarageDrawer
          title="Mời thợ cứu hộ"
          description="Gửi mã riêng cho thợ để kích hoạt tài khoản Mobile."
          onClose={() => {
            if (!busy) setDrawer(null);
          }}
        >
          <GarageError message={error} />
          <form onSubmit={invite} className="garage-form">
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
        </GarageDrawer>
      )}
      {tab === 'team' && (
        <GaragePanel
          title="Phân công đội thợ"
          description="Phân chi nhánh, ca trực và quyền làm việc cho từng thành viên"
        >
          {mechanics.length === 0 && <p>Chưa có thợ đã kích hoạt.</p>}
          {mechanics.length > 0 &&
            !mechanics.some((m) =>
              `${m.fullName} ${m.email}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
            ) && <p>Không tìm thấy thợ phù hợp.</p>}
          {mechanics
            .filter((m) => `${m.fullName} ${m.email}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))
            .map((mechanic) => (
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
                className="garage-allocation"
              >
                <span>
                  {mechanic.fullName}
                  <small className="garage-mechanic-detail">
                    {mechanic.email} ·{' '}
                    {!mechanic.active
                      ? 'Đã khóa'
                      : mechanic.workingStatus === 'AVAILABLE'
                        ? 'Sẵn sàng'
                        : mechanic.workingStatus === 'BUSY'
                          ? 'Đang bận'
                          : 'Nghỉ trực'}
                  </small>
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
        </GaragePanel>
      )}
    </section>
  );
}
