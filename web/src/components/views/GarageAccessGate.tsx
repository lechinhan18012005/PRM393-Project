import { DocumentUpload } from '../DocumentUpload';
import React, { useEffect, useState } from 'react';
import { managementApi, request, ApiError } from '../../services/managementApi';
import { GarageBackendResponse } from '../../services/garageApi';
import { useAuth } from '../../context/AuthContext';
import { GarageHeading, GaragePanel } from '../garage/GarageUI';
export function GarageAccessGate({ children, screen }: { children: React.ReactNode; screen: string }) {
  const { logout } = useAuth();
  const [garage, setGarage] = useState<GarageBackendResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState('');
  const [idCard, setIdCard] = useState('');
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  async function load() {
    setLoading(true);
    setGarage(null);
    setMissing(false);
    setError('');
    try {
      const current = await managementApi.garage();
      setGarage(current);
      setLicense(current.businessLicenseUrl ?? '');
      setIdCard(current.idCardUrl ?? '');
      setMissing(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing(true);
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [screen]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!license || !idCard) {
      setError('Vui lòng tải đầy đủ giấy phép kinh doanh và CCCD');
      setSaving(false);
      return;
    }
    try {
      setGarage(
        await request<GarageBackendResponse>(
          missing ? '/garages/register' : '/garages/me/application',
          missing ? 'POST' : 'PUT',
          { ...data, businessLicenseUrl: license, idCardUrl: idCard }
        )
      );
      setMissing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <div className="p-8">Đang kiểm tra hồ sơ gara...</div>;
  if (garage?.status === 'APPROVED') return <>{children}</>;
  return (
    <div className="garage-portal garage-onboarding">
      <GarageHeading
        title="Hồ sơ đối tác gara"
        description="Hoàn thiện thông tin để bắt đầu quản lý gara trên hệ thống."
      />
      <div className="garage-columns">
        <aside>
          <span className="garage-eyebrow">ĐỒNG HÀNH CÙNG ĐỘI CỨU HỘ</span>
          <h2>
            Sẵn sàng phục vụ,
            <br />
            kết nối mọi hành trình.
          </h2>
          <p>Hồ sơ được xét duyệt trước khi gara có thể thêm chi nhánh, mời thợ và niêm yết dịch vụ.</p>
          <ol>
            <li>Điền thông tin gara</li>
            <li>Tải giấy tờ xác minh</li>
            <li>Chờ xét duyệt hồ sơ</li>
            <li>Bắt đầu quản lý vận hành</li>
          </ol>
        </aside>
        <GaragePanel title="Thông tin & giấy tờ" description="Cung cấp thông tin chính xác để được xét duyệt">
          <p>
            Trạng thái:{' '}
            {garage
              ? {
                  PENDING: 'Chờ duyệt',
                  REJECTED: 'Bị từ chối',
                  SUSPENDED: 'Đã đình chỉ',
                  APPROVED: 'Đã duyệt'
                }[garage.status]
              : missing
                ? 'Chưa nộp hồ sơ'
                : 'Chưa tải được hồ sơ'}
          </p>
          {garage?.rejectionReason && <p>{garage.rejectionReason}</p>}
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          {(missing || (garage && ['PENDING', 'REJECTED'].includes(garage.status))) && (
            <form onSubmit={submit} className="garage-form">
              <label className="block">
                Tên gara
                <input
                  className="border rounded p-2 w-full"
                  required
                  name="garageName"
                  defaultValue={garage?.garageName}
                />
              </label>
              <label className="block">
                Điện thoại
                <input className="border rounded p-2 w-full" name="phone" defaultValue={garage?.phone} />
              </label>
              <DocumentUpload label="Giấy phép kinh doanh" value={license} onChange={setLicense} />
              <DocumentUpload label="CCCD của chủ gara" value={idCard} onChange={setIdCard} />
              <button disabled={saving} className="border rounded p-2">
                {saving ? 'Đang nộp...' : 'Cập nhật và nộp lại hồ sơ'}
              </button>
            </form>
          )}
          <div className="garage-toolbar" style={{ padding: 20 }}>
            <button onClick={() => void load()}>Kiểm tra lại trạng thái</button>
            <button onClick={logout}>Đăng xuất</button>
          </div>
        </GaragePanel>
      </div>
    </div>
  );
}
