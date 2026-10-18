import React, { useState } from 'react';
import { FloodPoint } from '../../types';

interface GISFloodMapViewProps {
  floodPoints: FloodPoint[];
  onShowToast: (title: string, msg: string) => void;
}

export const GISFloodMapView: React.FC<GISFloodMapViewProps> = ({ floodPoints, onShowToast }) => {
  const [selectedPointId, setSelectedPointId] = useState<string>('FL-402');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [autoPushAlert, setAutoPushAlert] = useState<boolean>(true);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const selectedPoint = floodPoints.find((p) => p.id === selectedPointId) || floodPoints[0];

  const handleBroadcastAlert = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      onShowToast(
        'Đã Phát Cảnh Báo Đỏ!',
        `Phát lệnh cảnh báo ngập sâu (>60cm) tới 1,842 tài xế và cư dân trong bán kính 1km quanh ${selectedPoint.name}.`
      );
    }, 1200);
  };

  const handleClearWater = () => {
    onShowToast('Hạ Cảnh Báo', `Đã ghi nhận nước rút tại ${selectedPoint.name}. Bản đồ dân cư đã chuyển sang mức lưu thông an toàn.`);
  };

  const handleReportSpam = () => {
    onShowToast('Báo Cáo Spam', `Đã đánh dấu rác và loại trừ các tin báo giả mạo tại điểm ${selectedPoint.id}.`);
  };

  const handleDispatchChot = () => {
    onShowToast('Lập Chốt Vượt Ngập', `Đã điều động 3 Gara liên minh thiết lập trạm xe tải sàn nâng hỗ trợ phương tiện qua đoạn ${selectedPoint.name}.`);
  };

  return (
    <div className="flex flex-col w-full space-y-space-md">
      <div><h1>Bản đồ ngập</h1><p className="text-secondary text-body-sm mt-1">Theo dõi điểm ngập và xác minh tin báo.</p></div>
      {/* TOP STATS & CRITICAL METRICS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">Điểm Ngập Hoạt Động</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold">14</span>
              <span className="font-label-md text-label-md text-tertiary">Toàn thành phố</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">flood</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-error font-semibold">Báo Động Cấp 3 (Đỏ)</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-error font-bold">06</span>
              <span className="font-label-md text-label-md text-error">Ngập lút yên xe</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-error-container/60 flex items-center justify-center text-error animate-pulse">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-primary-container font-semibold">Báo Động Vàng / Cam</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-primary-container font-bold">08</span>
              <span className="font-label-md text-label-md text-secondary">Ngập nửa bánh</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-fixed/40 flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[22px]">crisis_alert</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">Tin báo chờ duyệt</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-tertiary font-bold">23</span>
              <span className="font-label-md text-label-md text-tertiary-container">Từ cộng đồng</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[22px]">mark_chat_unread</span>
          </div>
        </div>
      </div>

      {/* CONTROL TOOLBAR: Filters & GIS Automation Switch */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-wrap items-center justify-between gap-space-md border border-surface-container">
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="font-label-sm text-label-sm uppercase text-secondary mr-space-xs font-bold">Khu vực:</span>
          <button
            onClick={() => setDistrictFilter('all')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer ${
              districtFilter === 'all' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Tất cả quận
          </button>
          <button
            onClick={() => setDistrictFilter('Quận 8')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer ${
              districtFilter === 'Quận 8' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Quận 8 (4 điểm)
          </button>
          <button
            onClick={() => setDistrictFilter('Bình Thạnh')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer ${
              districtFilter === 'Bình Thạnh' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Bình Thạnh (5 điểm)
          </button>
          <button
            onClick={() => setDistrictFilter('Thủ Đức')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer ${
              districtFilter === 'Thủ Đức' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Thủ Đức (3 điểm)
          </button>
          <button
            onClick={() => setDistrictFilter('Nhà Bè')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer ${
              districtFilter === 'Nhà Bè' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Nhà Bè (2 điểm)
          </button>

          <div className="h-5 w-px bg-surface-container-high mx-space-xs hidden lg:block"></div>
          <button
            onClick={() => onShowToast('Lọc Mực Nước', 'Đang lọc các điểm ngập >35cm')}
            className="flex items-center gap-1 px-space-md py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>Ngập từ nửa bánh xe</span>
          </button>
        </div>

        {/* Smart Auto Clustering Toggle */}
        <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-1.5 rounded-xl">
          <div className="flex flex-col text-right">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Cảnh báo tự động</span>
            <span className="font-label-sm text-label-sm text-secondary">Độ tin cậy trên 90%</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              checked={autoPushAlert}
              onChange={(e) => setAutoPushAlert(e.target.checked)}
              className="sr-only peer"
              type="checkbox"
            />
            <div className="w-9 h-5 bg-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* MAIN OPERATIONAL VIEWPORT (GIS Tactical Split Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT PANE: Large Tactical Interactive GIS Map */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="relative bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden h-[740px] flex flex-col border border-surface-container">
            {/* Map Canvas Background */}
            <div
              className="w-full h-full absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAU2eDidbIFPm9-EnM0iyEMJ231k77WkQIoARfZgMJzwMVQyyWxmKr4ZzIQDamdtjPdCDidYnQbRUDyrwrS5w82LyH4sRmZNAVLVs4vTNMwLFFO62YY3YaEreihVscp_cVid--ZfzcTjpPkIAGiUudZkqGhrkTd54HBvwVS8V-tu-b6FaU4rEj0eNFGBMuX-CG2ulhnJ9HmSfohfkGewK6HWZYfKqAR_ZAwDlIjQ66HUlCcePegy6wT')"
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 pointer-events-none"></div>

            {/* Upper Map HUD Info Bar */}
            <div className="relative z-10 flex items-center justify-between p-space-md bg-surface-container-lowest/90 backdrop-blur m-space-md rounded-xl shadow-sm border border-surface-container">
              <div className="flex items-center gap-space-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-error animate-ping"></span>
                <div>
                  <span className="font-headline-sm text-headline-sm text-on-surface leading-none block font-bold">
                    Bản đồ TP. Hồ Chí Minh
                  </span>
                  <span className="font-data-mono text-data-mono text-secondary text-[10px]">
                    Phạm vi theo dõi: 12 km
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="px-2 py-0.5 bg-error-container text-on-error-container rounded font-data-mono text-data-mono text-[11px] font-bold">
                  Đang cập nhật
                </span>
              </div>
            </div>

            {/* Tactical Vector Hotspots */}
            <div className="relative z-10 flex-1 p-space-md pointer-events-auto">
              {/* HOTSPOT 1: Bến Bình Đông */}
              <div
                onClick={() => setSelectedPointId('FL-402')}
                className="absolute top-[38%] left-[44%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-8 bg-error/30 rounded-full animate-ping pointer-events-none"></div>
                  <div className="absolute -inset-4 bg-error/40 rounded-full animate-pulse pointer-events-none"></div>
                  <div className="relative z-20 px-space-md py-1 rounded-full bg-error text-on-error shadow-xl flex items-center gap-1.5 transition-transform group-hover:scale-105 ring-2 ring-white">
                    <span className="material-symbols-outlined text-[16px]">flood</span>
                    <span className="font-label-sm text-label-sm font-bold uppercase">#FL-402 • Bến Bình Đông</span>
                    <span className="bg-black/30 text-white font-data-mono text-[10px] px-1.5 py-0.2 rounded-full">+9 tin</span>
                  </div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 p-2.5 bg-surface-container-lowest/95 backdrop-blur rounded-xl shadow-lg pointer-events-none text-left border border-surface-container">
                  <div className="flex items-center justify-between text-error font-label-sm text-label-sm font-bold mb-1">
                    <span>CẢNH BÁO ĐỎ CẤP 3</span>
                    <span className="font-data-mono">96% CONF</span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface line-clamp-2">
                    Ngập lút yên xe (&gt;60cm), giao thông tê liệt hoàn toàn.
                  </div>
                </div>
              </div>

              {/* HOTSPOT 2: Nguyễn Hữu Cảnh */}
              <div
                onClick={() => setSelectedPointId('FL-398')}
                className="absolute top-[22%] left-[68%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-3 bg-primary-container/30 rounded-full animate-ping pointer-events-none"></div>
                  <div className="py-1 px-3 rounded-full bg-primary-container text-on-primary-container shadow-md flex items-center gap-1 group-hover:scale-105 transition-transform ring-2 ring-white">
                    <span className="material-symbols-outlined text-[14px]">waves</span>
                    <span className="font-label-sm text-label-sm font-bold uppercase">Nguyễn Hữu Cảnh</span>
                    <span className="bg-white/20 font-data-mono text-[10px] px-1 rounded-full">+15 tin</span>
                  </div>
                </div>
              </div>

              {/* HOTSPOT 3: Kha Vạn Cân */}
              <div
                onClick={() => setSelectedPointId('FL-391')}
                className="absolute top-[18%] left-[82%] -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <div className="py-1 px-2.5 rounded-full bg-surface-container-high text-on-surface shadow-md flex items-center gap-1 group-hover:scale-105 transition-transform ring-1 ring-white">
                    <span className="material-symbols-outlined text-[14px] text-primary">priority_high</span>
                    <span className="font-label-sm text-label-sm font-bold">Kha Vạn Cân (+6)</span>
                  </div>
                </div>
              </div>

              {/* Active Units */}
              <div className="absolute top-[48%] left-[40%] flex items-center gap-1 bg-tertiary text-on-tertiary px-2 py-1 rounded shadow-md cursor-pointer hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[14px]">two_wheeler</span>
                <span className="font-data-mono text-[10px] font-bold">RESCUE-04</span>
              </div>
              <div className="absolute top-[34%] left-[52%] flex items-center gap-1 bg-surface-container-lowest text-on-surface px-2 py-1 rounded shadow-md ring-1 ring-primary-container cursor-pointer hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[14px] text-primary">garage</span>
                <span className="font-label-sm text-label-sm font-bold">Gara Phúc Sang</span>
              </div>
              <div className="absolute top-[45%] left-[32%] flex items-center gap-1 bg-surface-container-lowest text-on-surface px-2 py-1 rounded shadow-md ring-1 ring-primary-container cursor-pointer hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[14px] text-primary">garage</span>
                <span className="font-label-sm text-label-sm font-bold">Gara Minh Quân</span>
              </div>
            </div>

            {/* Lower Map Legends */}
            <div className="relative z-10 p-space-md bg-surface-container-lowest/95 backdrop-blur flex flex-wrap items-center justify-between gap-space-md border-t border-surface-container">
              <div className="flex items-center gap-space-md text-body-sm font-body-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-error inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">Cấm đi qua (&gt;60cm)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-primary-container inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">Nguy hiểm (30-50cm)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-tertiary-container inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">Tuyến cứu hộ mở</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">garage</span>
                  <span className="font-label-sm text-label-sm text-on-surface">Trạm ứng cứu</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs font-data-mono text-data-mono text-secondary">
                <span className="material-symbols-outlined text-[16px] text-tertiary">autorenew</span>
                <span>CẬP NHẬT: 10 GIÂY TRƯỚC</span>
              </div>
            </div>
          </div>

          {/* Quick Route Advisory */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-surface-container">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">alt_route</span>
              </div>
              <div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Khuyến Nghị Phân Luồng: Cầu Chà Và → Cầu Nguyễn Tri Phương
                </div>
                <p className="font-body-sm text-body-sm text-secondary">
                  Tuyến Bến Bình Đông ngập sâu đã kích hoạt cảnh báo chặn đường tự động trên bản đồ dân cư.
                </p>
              </div>
            </div>
            <button
              onClick={() => onShowToast('Xuất Dữ Liệu GPS', 'Đã tải xuống tọa độ phân luồng GIS dạng GeoJSON.')}
              className="px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md shrink-0 transition-colors cursor-pointer"
            >
              Xuất dữ liệu GPS
            </button>
          </div>
        </div>

        {/* RIGHT PANE: Cluster Detail & Verification Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* MAIN INSPECTOR CARD */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col border border-surface-container">
            {/* Header & Point Identity */}
            <div className="flex items-start justify-between pb-space-md border-b border-surface-container">
              <div>
                <div className="flex items-center gap-space-xs mb-1">
                  <span className="px-2 py-0.5 rounded font-data-mono text-data-mono bg-error-container text-error font-bold">
                    ID: #{selectedPoint.id}
                  </span>
                  <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">
                    {selectedPoint.district.toUpperCase()} • TỌA ĐỘ NƯỚC DÂNG
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  {selectedPoint.name}
                </h2>
                <p className="font-body-sm text-body-sm text-secondary">{selectedPoint.address}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label-sm text-label-sm text-secondary">ĐỘ TIN CẬY GIS</span>
                <span className="font-headline-md text-headline-md text-tertiary-container font-data-mono font-bold">
                  {selectedPoint.confidenceScore}%
                </span>
                <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold">RẤT CAO</span>
              </div>
            </div>

            {/* Severity Gauge Indicator */}
            <div className="p-space-md rounded-xl bg-surface-container-low my-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-bold uppercase text-on-surface">Mức Độ Ngập Đo Được:</span>
                <span className="font-label-md text-label-md font-bold text-error bg-error-container px-2 py-0.5 rounded">
                  {selectedPoint.waterLevel}
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-surface-variant w-1/4 h-full" title="Mức 1: <20cm"></div>
                <div className="bg-primary-fixed-dim w-1/4 h-full" title="Mức 2: 20-40cm"></div>
                <div className="bg-primary w-1/4 h-full" title="Mức 3: 40-60cm"></div>
                <div className="bg-error w-1/4 h-full animate-pulse" title="Mức 4: >60cm (Ngập lút yên)"></div>
              </div>
              <div className="flex justify-between font-data-mono text-[10px] text-secondary">
                <span>Dưới bô xe</span>
                <span>Nửa bánh</span>
                <span>Bằng yên</span>
                <span className="text-error font-bold">&gt; 60cm Chết máy 100%</span>
              </div>
            </div>

            {/* Crowdsourced Photo Proof Gallery */}
            {selectedPoint.photos && selectedPoint.photos.length > 0 && (
              <div className="mb-space-md">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-md text-label-md uppercase text-secondary font-bold">
                    Ảnh Hiện Trường Người Dân Gửi Lên ({selectedPoint.photos.length} Ảnh)
                  </span>
                  <button
                    onClick={() => setPreviewPhoto(selectedPoint.photos[0].url)}
                    className="font-label-sm text-label-sm text-tertiary cursor-pointer hover:underline"
                  >
                    Phóng to toàn bộ
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-space-xs">
                  {selectedPoint.photos.map((photo, i) => (
                    <div
                      key={i}
                      onClick={() => setPreviewPhoto(photo.url)}
                      className="relative rounded-lg overflow-hidden group aspect-square shadow-sm bg-surface-container cursor-pointer"
                    >
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        alt={photo.caption}
                        src={photo.url}
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1 text-center">
                        <span className="font-data-mono text-[9px] text-white block truncate">{photo.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citizen Reports Real-time Feed */}
            {selectedPoint.recentReports && selectedPoint.recentReports.length > 0 && (
              <div className="mb-space-lg flex-1">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-md text-label-md uppercase text-secondary font-bold">
                    Luồng Ý Kiến & Báo Cáo Trực Tiếp
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-data-mono">
                    {selectedPoint.reportsCount} báo cáo / 15 phút
                  </span>
                </div>
                <div className="space-y-space-xs max-h-48 overflow-y-auto pr-1">
                  {selectedPoint.recentReports.map((rep, idx) => (
                    <div key={idx} className="p-space-sm bg-surface-container-low rounded-lg flex items-start gap-space-sm">
                      <div className="w-7 h-7 rounded-full bg-error-container text-error flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">two_wheeler</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-label-md font-bold text-on-surface truncate">{rep.author}</span>
                          <span className="font-data-mono text-[10px] text-secondary">{rep.time}</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface mt-0.5">{rep.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OPERATOR MODERATION ACTION BOX */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm border border-surface-container">
              <div className="font-label-md text-label-md uppercase text-secondary font-bold mb-1">
                Bảng Điều Khiển Can Thiệp Khẩn Cấp
              </div>

              {/* Primary CTA: Broadcast Push Alert */}
              <button
                onClick={handleBroadcastAlert}
                disabled={isBroadcasting}
                className="w-full py-2.5 px-space-md rounded-lg bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs shadow-md hover:bg-primary-container transition-all cursor-pointer font-bold disabled:opacity-75"
              >
                <span className={`material-symbols-outlined text-[20px] ${isBroadcasting ? 'animate-spin' : ''}`}>
                  {isBroadcasting ? 'sync' : 'notification_important'}
                </span>
                <span>{isBroadcasting ? 'ĐANG PHÁT LỆNH TOÀN MẠNG...' : 'KÍCH HOẠT CẢNH BÁO ĐỎ (PUSH 1KM)'}</span>
              </button>

              <div className="grid grid-cols-2 gap-space-xs mt-1">
                <button
                  onClick={handleClearWater}
                  className="py-2 px-space-sm rounded-lg bg-surface-container-lowest text-tertiary hover:bg-surface-container hover:text-on-surface font-label-md text-label-md flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">water_drop</span>
                  <span>Hạ Cảnh Báo / Nước Đã Rút</span>
                </button>
                <button
                  onClick={handleReportSpam}
                  className="py-2 px-space-sm rounded-lg bg-surface-container-lowest text-error hover:bg-error-container hover:text-on-error-container font-label-md text-label-md flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  <span>Báo Cáo Rác / Giả Mạo</span>
                </button>
              </div>

              {/* Emergency Multi-Garage Dispatch */}
              <div className="pt-space-xs">
                <button
                  onClick={handleDispatchChot}
                  className="w-full py-2 px-space-md rounded-lg bg-secondary text-on-secondary hover:bg-on-surface font-label-md text-label-md flex items-center justify-between shadow-sm transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">hub</span>
                    <span>Điều động 3 Gara Lập Chốt Vượt Ngập</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* AUDIT LEDGER */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container">
            <div className="flex items-center justify-between pb-space-xs mb-space-xs border-b border-surface-container">
              <span className="font-label-sm text-label-sm uppercase text-secondary font-bold">
                Lịch Sử Phê Duyệt Của Điều Phối Viên
              </span>
              <span className="font-data-mono text-data-mono text-secondary">CA TRỰC #02</span>
            </div>
            <div className="space-y-space-xs font-body-sm text-body-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-on-surface">Đã duyệt #FL-398 (Nguyễn Hữu Cảnh) → Cam</span>
                <span className="font-data-mono text-[11px] text-secondary">10:14:22</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-on-surface">Đã hạ cảnh báo #FL-391 (Ung Văn Khiêm) → Xanh</span>
                <span className="font-data-mono text-[11px] text-secondary">09:58:05</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-error font-medium">Đánh dấu spam 4 báo cáo khu vực Q.7</span>
                <span className="font-data-mono text-[11px] text-secondary">09:42:19</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full bg-surface-container-lowest p-2 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img className="w-full h-auto rounded-lg object-contain max-h-[80vh]" alt="Full Preview" src={previewPhoto} />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2 cursor-pointer hover:bg-black"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
