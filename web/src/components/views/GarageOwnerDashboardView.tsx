import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench
} from 'lucide-react';
import { ScreenId } from '../../types';
import { Branch, Mechanic, managementApi, request } from '../../services/managementApi';
import { GarageBackendResponse, ServiceItemBackend } from '../../services/garageApi';
import {
  GarageHeading,
  GarageStat,
  GaragePanel,
  GarageEmpty,
  GarageError,
  GarageBadge,
  GarageLink
} from '../garage/GarageUI';
interface Props {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}
export function GarageOwnerDashboardView({ onSelectScreen }: Props) {
  const [data, setData] = useState<{
    garage: GarageBackendResponse;
    branches: Branch[];
    mechanics: Mechanic[];
    services: ServiceItemBackend[];
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [garage, branches, mechanics, services] = await Promise.all([
        managementApi.garage(),
        managementApi.branches(),
        managementApi.mechanics(),
        request<ServiceItemBackend[]>('/garages/services')
      ]);
      setData({ garage, branches, mechanics, services });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const mechanics = data?.mechanics ?? [];
  const branches = data?.branches ?? [];
  const services = data?.services ?? [];
  const online = mechanics.filter((m) => m.active && m.workingStatus === 'AVAILABLE').length;
  return (
    <div className="garage-portal">
      <GarageHeading
        title="Tổng quan gara"
        description="Nguồn lực, đội thợ và dịch vụ trong cùng một không gian."
        action={
          <>
            <button className="garage-button" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'garage-spin' : ''} />
              Làm mới
            </button>
            <button className="garage-button primary" onClick={() => onSelectScreen('garage-team')}>
              <Plus size={16} />
              Quản lý nguồn lực
            </button>
          </>
        }
      />
      <GarageError message={error} retry={() => void load()} />
      <div className="garage-welcome">
        <div>
          <GarageBadge tone="green">Đối tác đã được duyệt</GarageBadge>
          <h2>{data?.garage.garageName ?? 'Không gian gara của bạn'}</h2>
          <p>
            <MapPin size={14} />
            {data?.garage.address || 'Thêm địa chỉ trong thông tin chi nhánh'}
            <span>·</span>
            <Phone size={14} />
            {data?.garage.phone || 'Chưa cập nhật hotline'}
          </p>
        </div>
        <ShieldCheck size={48} />
      </div>
      <div className="garage-stat-grid">
        <GarageStat
          label="Chi nhánh"
          value={loading ? '—' : branches.length}
          detail={`${branches.filter((b) => b.operatingStatus === 'OPEN').length} chi nhánh đang mở`}
          icon={<Building2 size={19} />}
        />
        <GarageStat
          label="Đội thợ"
          value={loading ? '—' : mechanics.length}
          detail={`${mechanics.filter((m) => m.active).length} tài khoản được kích hoạt`}
          icon={<Users size={19} />}
          accent="blue"
        />
        <GarageStat
          label="Sẵn sàng nhận đơn"
          value={loading ? '—' : online}
          detail="Trạng thái trực tuyến của đội thợ"
          icon={<Clock3 size={19} />}
          accent="teal"
        />
        <GarageStat
          label="Dịch vụ niêm yết"
          value={loading ? '—' : services.filter((s) => s.active).length}
          detail={`${services.length} dịch vụ trong danh mục`}
          icon={<Wrench size={19} />}
          accent="purple"
        />
      </div>
      <div className="garage-columns">
        <GaragePanel
          title="Mạng lưới chi nhánh"
          description="Điểm phục vụ và nguồn lực tại mỗi cơ sở"
          action={<GarageLink onClick={() => onSelectScreen('garage-team')}>Xem tất cả</GarageLink>}
        >
          {loading ? (
            <p className="garage-loading">Đang tải nguồn lực...</p>
          ) : branches.length === 0 ? (
            <GarageEmpty
              title="Bắt đầu từ chi nhánh đầu tiên"
              description="Thêm địa chỉ, hotline và phương tiện để tổ chức đội cứu hộ."
              action={
                <button className="garage-button primary" onClick={() => onSelectScreen('garage-team')}>
                  Thêm chi nhánh
                  <ArrowRight size={14} />
                </button>
              }
            />
          ) : (
            <div className="garage-table-wrap">
              <table className="garage-table">
                <thead>
                  <tr>
                    <th>Chi nhánh</th>
                    <th>Đội thợ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.slice(0, 5).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="garage-cell-main">
                          <span className="garage-icon orange">
                            <Building2 size={17} />
                          </span>
                          <div>
                            <strong>{b.branchName}</strong>
                            <small>{b.address}</small>
                          </div>
                        </div>
                      </td>
                      <td>{b.mechanicsCount} thợ</td>
                      <td>
                        <GarageBadge tone={b.operatingStatus === 'OPEN' ? 'green' : 'neutral'}>
                          {b.operatingStatus === 'OPEN' ? 'Đang mở' : 'Bảo trì'}
                        </GarageBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GaragePanel>
        <GaragePanel title="Thiết lập vận hành" description="Các bước chuẩn bị cho đội cứu hộ">
          <div className="garage-checklist">
            {[
              { title: 'Hồ sơ pháp lý', desc: 'Gara đã được phê duyệt', done: true, screen: 'owner-dashboard' },
              {
                title: 'Mạng lưới chi nhánh',
                desc: branches.length ? `${branches.length} cơ sở đã thiết lập` : 'Bổ sung chi nhánh phục vụ',
                done: branches.length > 0,
                screen: 'garage-team'
              },
              {
                title: 'Đội thợ cứu hộ',
                desc: mechanics.length ? `${mechanics.length} thợ đã kích hoạt` : 'Mời thợ và phân ca làm việc',
                done: mechanics.length > 0,
                screen: 'garage-team'
              },
              {
                title: 'Bảng giá dịch vụ',
                desc: services.length ? `${services.length} dịch vụ đã tạo` : 'Niêm yết dịch vụ và đơn giá',
                done: services.length > 0,
                screen: 'services'
              }
            ].map((item, i) => (
              <button key={item.title} onClick={() => onSelectScreen(item.screen as ScreenId)}>
                <span className={item.done ? 'garage-step done' : 'garage-step'}>
                  {item.done ? <CheckCircle2 size={17} /> : i + 1}
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </GaragePanel>
      </div>
      <GaragePanel
        title="Đội thợ của gara"
        description="Thông tin mới nhất từ hồ sơ và ca làm được phân"
        action={<GarageLink onClick={() => onSelectScreen('garage-team')}>Phân công đội thợ</GarageLink>}
      >
        {mechanics.length ? (
          <div className="garage-team-grid">
            {mechanics.slice(0, 4).map((m) => (
              <div className="garage-person-card" key={m.id}>
                <span className="garage-person-avatar">{m.fullName.charAt(0)}</span>
                <div>
                  <strong>{m.fullName}</strong>
                  <small>{m.branchName || 'Chưa phân chi nhánh'}</small>
                  <small>{m.shiftName || 'Chưa phân ca'}</small>
                </div>
                <GarageBadge tone={m.active && m.workingStatus === 'AVAILABLE' ? 'green' : 'neutral'}>
                  {!m.active
                    ? 'Đã khóa'
                    : m.workingStatus === 'AVAILABLE'
                      ? 'Online'
                      : m.workingStatus === 'BUSY'
                        ? 'Đang bận'
                        : 'Offline'}
                </GarageBadge>
              </div>
            ))}
          </div>
        ) : (
          <div className="garage-inline-empty">
            <Users size={24} />
            <p>Đội thợ của bạn sẽ xuất hiện tại đây sau khi kích hoạt lời mời.</p>
            <button className="garage-text-button" onClick={() => onSelectScreen('garage-team')}>
              Mời thợ đầu tiên
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </GaragePanel>
    </div>
  );
}
