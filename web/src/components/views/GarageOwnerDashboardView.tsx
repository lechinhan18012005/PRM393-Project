import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { managementApi } from '../../services/managementApi';
import { GarageBackendResponse } from '../../services/garageApi';
interface Props {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}
export function GarageOwnerDashboardView({ onSelectScreen }: Props) {
  const [garage, setGarage] = useState<GarageBackendResponse | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    managementApi
      .garage()
      .then(setGarage)
      .catch((e) => setError((e as Error).message));
  }, []);
  return (
    <section className="management-page p-6 space-y-6">
      <h1 className="text-2xl font-bold">{garage?.garageName ?? 'Quản lý gara'}</h1>
      {error && <p role="alert">{error}</p>}
      {garage && (
        <div className="grid md:grid-cols-3 gap-4">
          <article className="border p-4 rounded">Chi nhánh: {garage.branchCount}</article>
          <article className="border p-4 rounded">Thợ cứu hộ: {garage.mechanicCount}</article>
          <article className="border p-4 rounded">Điện thoại: {garage.phone}</article>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {(
          [
            ['garage-team', 'Chi nhánh, đội thợ & ca làm'],
            ['services', 'Dịch vụ & bảng giá'],
            ['garage-finance', 'Doanh thu & ví'],
            ['garage-transport', 'Chuyến chở xe']
          ] as [ScreenId, string][]
        ).map(([screen, label]) => (
          <button className="border rounded p-5 text-left" key={screen} onClick={() => onSelectScreen(screen)}>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
