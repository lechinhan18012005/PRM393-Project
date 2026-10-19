import { DocumentUpload } from '../DocumentUpload';
import React, { useEffect, useState } from 'react';
import { managementApi, request, ApiError } from '../../services/managementApi';
import { GarageBackendResponse } from '../../services/garageApi';
import { useAuth } from '../../context/AuthContext';
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
    <div className="management-page p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Hồ sơ Chủ gara</h1>
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
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            Tên gara
            <input className="border rounded p-2 w-full" required name="garageName" defaultValue={garage?.garageName} />
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
      <div className="flex gap-4">
        <button onClick={() => void load()}>Kiểm tra lại trạng thái</button>
        <button onClick={logout}>Đăng xuất</button>
      </div>
    </div>
  );
}
