import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Flame,
  ArrowRight,
  Shield,
  Building2,
  RefreshCw,
  X
} from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel } from '../garage/GarageUI';
import {
  attendanceApi,
  MechanicAttendanceSummary,
  MechanicAttendanceItem,
  MechanicStatusLogDto
} from '../../services/attendanceApi';
import { Branch, managementApi } from '../../services/managementApi';

interface GarageAttendanceViewProps {
  onShowToast?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export function GarageAttendanceView({ onShowToast }: GarageAttendanceViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [summary, setSummary] = useState<MechanicAttendanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [selectedTimeCard, setSelectedTimeCard] = useState<MechanicAttendanceItem | null>(null);

  const notify = (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (onShowToast) onShowToast(title, msg, type);
  };

  async function loadBranches() {
    try {
      const b = await managementApi.branches();
      setBranches(b || []);
    } catch (_) {}
  }

  async function loadSummary() {
    setLoading(true);
    try {
      const res = await attendanceApi.getSummary(selectedDate, selectedBranchId);
      setSummary(res);
    } catch (e) {
      notify('Lỗi tải dữ liệu', (e as Error).message || 'Không thể tải báo cáo chấm công', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    void loadSummary();
    const interval = setInterval(() => {
      void loadSummary();
    }, 15000); // Polling mỗi 15s để cập nhật giờ công
    return () => clearInterval(interval);
  }, [selectedDate, selectedBranchId]);

  async function handleExportCsv() {
    setExporting(true);
    try {
      await attendanceApi.downloadCsv(selectedDate, selectedBranchId);
      notify('Thành công', 'Đã tải xuống file báo cáo chấm công CSV (UTF-8)', 'success');
    } catch (e) {
      notify('Lỗi xuất file', (e as Error).message || 'Không thể xuất file CSV', 'error');
    } finally {
      setExporting(false);
    }
  }

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}p`;
    return `${h}h ${m > 0 ? `${m}p` : ''}`.trim();
  };

  const formatTimeStr = (isoStr?: string | null) => {
    if (!isoStr) return '--:--';
    try {
      return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '--:--';
    }
  };

  const getEventBadge = (event: string) => {
    switch (event.toUpperCase()) {
      case 'ONLINE':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><PlayCircle size={12} /> Bật nhận việc</span>;
      case 'RESUME':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><PlayCircle size={12} /> Tiếp tục nhận việc</span>;
      case 'PAUSE':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1"><PauseCircle size={12} /> Tạm nghỉ</span>;
      case 'OFFLINE':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 flex items-center gap-1"><Clock size={12} /> Tắt nhận việc</span>;
      case 'AUTO_REAPED':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1"><AlertCircle size={12} /> Mất sóng (Reaped)</span>;
      case 'BUSY_START':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1"><Shield size={12} /> Bắt đầu đơn</span>;
      case 'BUSY_END':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800 flex items-center gap-1"><CheckCircle2 size={12} /> Xong đơn</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">{event}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tiêu đề & Nút xuất báo cáo */}
      <GarageHeading
        title="Bảng chấm công & Hoạt động thợ"
        description="Theo dõi thời gian sẵn sàng, lịch trình tạm nghỉ, giờ tăng ca đêm và nhật ký vào/ra của đội thợ cứu hộ."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadSummary()}
              disabled={loading}
              className="px-3 py-2 text-xs font-medium bg-surface-container-low border border-surface-container rounded-lg text-on-surface hover:bg-surface-container transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={exporting || !summary?.items.length}
              style={{ backgroundColor: '#d65322', color: '#ffffff' }}
              className="px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs hover:opacity-90 disabled:opacity-50"
            >
              <Download size={14} />
              <span>{exporting ? 'Đang xuất file...' : 'Xuất file CSV'}</span>
            </button>
          </div>
        }
      />

      {/* Thanh bộ lọc ngày & Chi nhánh */}
      <div className="p-4 bg-surface-container-lowest border border-surface-container rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-secondary" />
            <label className="text-xs font-bold text-on-surface">Ngày xem:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 text-xs bg-surface-container-low border border-surface-container rounded-lg text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            />
          </div>

          {/* Branch Picker */}
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-secondary" />
            <label className="text-xs font-bold text-on-surface">Chi nhánh:</label>
            <select
              value={selectedBranchId ?? ''}
              onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 px-3 text-xs bg-surface-container-low border border-surface-container rounded-lg text-on-surface font-medium focus:outline-none cursor-pointer"
            >
              <option value="">-- Tất cả chi nhánh ({branches.length}) --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-secondary">
          Tự động đồng bộ: <strong className="text-emerald-700">15s/lần</strong>
        </div>
      </div>

      {/* 4 Thẻ chỉ số tổng quan (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GarageStat
          label="Tổng giờ trực tuyến"
          value={`${summary?.totalOnlineHours.toFixed(1) || '0.0'}h`}
          detail="Tổng thời gian sẵn sàng nhận việc trong ngày"
          icon={<Clock size={18} />}
          accent="teal"
        />
        <GarageStat
          label="Thợ có mặt hôm nay"
          value={`${summary?.activeTodayCount || 0} / ${summary?.totalMechanicsCount || 0}`}
          detail="Thợ có phát sinh trực tuyến ít nhất 1 lần"
          icon={<Users size={18} />}
          accent="blue"
        />
        <GarageStat
          label="Giờ tăng ca (Overtime)"
          value={`${summary?.totalOvertimeHours.toFixed(1) || '0.0'}h`}
          detail="Thời gian trực ngoài khung giờ ca phân công"
          icon={<Flame size={18} />}
          accent="orange"
        />
        <GarageStat
          label="Cuốc cứu hộ hoàn thành"
          value={`${summary?.totalCompletedOrders || 0}`}
          detail="Số ca đã xử lý và nghiệm thu thành công"
          icon={<CheckCircle2 size={18} />}
          accent="emerald"
        />
      </div>

      {/* Bảng tổng hợp chấm công chi tiết */}
      <GaragePanel
        title={`Bảng chấm công ngày ${new Date(selectedDate).toLocaleDateString('vi-VN')}`}
        description="Ghi nhận chi tiết giờ vào ca, giờ tan ca, tổng giờ online, thời lượng tạm nghỉ và năng suất cứu hộ của từng thợ."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-container bg-surface-container-low/50 font-bold text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Thợ cứu hộ</th>
                <th className="py-3 px-3">Chi nhánh & Ca trực</th>
                <th className="py-3 px-3 text-center">Giờ vào</th>
                <th className="py-3 px-3 text-center">Giờ ra</th>
                <th className="py-3 px-3 text-right">Giờ Online</th>
                <th className="py-3 px-3 text-right">Tạm nghỉ</th>
                <th className="py-3 px-3 text-right">Tăng ca</th>
                <th className="py-3 px-3 text-center">Cuốc xong</th>
                <th className="py-3 px-3">Trạng thái hiện tại</th>
                <th className="py-3 px-4 text-center">Nhật ký</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/60">
              {summary?.items && summary.items.length > 0 ? (
                summary.items.map((item) => {
                  const isAvailable = item.currentStatus === 'AVAILABLE';
                  const isBusy = item.currentStatus === 'BUSY';
                  const isPaused = item.isPaused;

                  return (
                    <tr key={item.mechanicStaffId} className="hover:bg-surface-container-lowest/70 transition">
                      {/* Thợ Info */}
                      <td className="py-3.5 px-4 font-medium text-on-surface">
                        <div className="font-bold text-sm text-on-surface">{item.mechanicFullName}</div>
                        <div className="text-[11px] text-secondary font-mono">{item.phone || '--'}</div>
                      </td>

                      {/* Chi nhánh & Ca */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-on-surface">{item.branchName || 'Chưa phân chi nhánh'}</div>
                        <div className="text-[11px] text-secondary">{item.shiftName || 'Chưa phân ca'}</div>
                      </td>

                      {/* Giờ vào ca */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-emerald-800">
                        {formatTimeStr(item.firstOnlineAt)}
                      </td>

                      {/* Giờ ra ca */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-700">
                        {formatTimeStr(item.lastOfflineAt)}
                      </td>

                      {/* Giờ Online */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatMinutes(item.totalOnlineMinutes)}
                      </td>

                      {/* Tạm nghỉ */}
                      <td className="py-3.5 px-3 text-right font-mono text-amber-700">
                        {formatMinutes(item.totalBreakMinutes)}
                      </td>

                      {/* Tăng ca */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-orange-700">
                        {item.totalOvertimeMinutes > 0 ? (
                          <span className="flex items-center justify-end gap-1 text-orange-700">
                            <Flame size={12} className="text-orange-500 fill-orange-500" />
                            {formatMinutes(item.totalOvertimeMinutes)}
                          </span>
                        ) : (
                          '0p'
                        )}
                      </td>

                      {/* Cuốc xong */}
                      <td className="py-3.5 px-3 text-center font-bold text-primary">
                        {item.completedOrdersCount}
                      </td>

                      {/* Trạng thái hiện tại */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold font-data-mono flex items-center gap-1 w-fit ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isBusy
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isPaused
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable
                                ? 'bg-emerald-600 animate-pulse'
                                : isBusy
                                  ? 'bg-rose-600 animate-ping'
                                  : isPaused
                                    ? 'bg-amber-600'
                                    : 'bg-slate-500'
                            }`}
                          ></span>
                          {isAvailable
                            ? 'SẴN SÀNG'
                            : isBusy
                              ? 'ĐANG ĐI CA'
                              : isPaused
                                ? 'TẠM NGHỈ'
                                : 'NGHỈ TRỰC'}
                        </span>
                        {isPaused && item.currentPauseReason && (
                          <div className="text-[11px] text-amber-800 mt-0.5 truncate max-w-[160px]" title={item.currentPauseReason}>
                            Lý do: {item.currentPauseReason}
                          </div>
                        )}
                      </td>

                      {/* Nút Xem Time Card */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTimeCard(item)}
                          className="px-2.5 py-1 text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <span>Time Card</span>
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-secondary">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Chưa có dữ liệu chấm công trong ngày {selectedDate}</p>
                    <p className="text-[11px] mt-1">Các sự kiện thợ bật/tắt trực tuyến sẽ xuất hiện tại đây.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GaragePanel>

      {/* MODAL CHI TIẾT TIME CARD CỦA THỢ */}
      {selectedTimeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-surface-container">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-surface-container flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-on-surface">
                  Nhật ký Time Card: {selectedTimeCard.mechanicFullName}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Ngày {new Date(selectedDate).toLocaleDateString('vi-VN')} • Ca: {selectedTimeCard.shiftName || 'Chưa phân ca'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTimeCard(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Thống kê nhanh trong Modal */}
            <div className="p-4 bg-surface-container-low/40 grid grid-cols-3 gap-3 border-b border-surface-container text-center">
              <div>
                <div className="text-[11px] text-secondary">Tổng giờ Online</div>
                <div className="font-mono font-bold text-emerald-800 text-sm mt-0.5">
                  {formatMinutes(selectedTimeCard.totalOnlineMinutes)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-secondary">Thời gian Nghỉ</div>
                <div className="font-mono font-bold text-amber-800 text-sm mt-0.5">
                  {formatMinutes(selectedTimeCard.totalBreakMinutes)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-secondary">Giờ Tăng ca</div>
                <div className="font-mono font-bold text-orange-800 text-sm mt-0.5">
                  {formatMinutes(selectedTimeCard.totalOvertimeMinutes)}
                </div>
              </div>
            </div>

            {/* Dòng thời gian Timeline sự kiện */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {selectedTimeCard.timelineLogs && selectedTimeCard.timelineLogs.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
                  {selectedTimeCard.timelineLogs.map((log, idx) => (
                    <div key={log.id || idx} className="relative">
                      {/* Dấu chấm timeline */}
                      <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-surface-container-lowest"></span>

                      <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-primary">
                            {formatTimeStr(log.createdAt)}
                          </span>
                          {getEventBadge(log.eventType)}
                        </div>

                        {log.pauseReason && (
                          <div className="text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                            Lý do: <strong>{log.pauseReason}</strong>
                          </div>
                        )}

                        <div className="text-[11px] text-secondary flex items-center justify-between pt-1">
                          <span>
                            {log.statusFrom ? `${log.statusFrom} → ` : ''}<strong>{log.statusTo}</strong>
                            {log.isOvertime && <span className="ml-1 text-orange-700 font-bold">(Tăng ca)</span>}
                          </span>
                          {log.deviceBatteryPct != null && (
                            <span>Pin: {log.deviceBatteryPct}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-secondary">
                  <Clock size={28} className="mx-auto mb-1.5 opacity-40" />
                  <p>Không có sự kiện ghi nhận trong ngày này.</p>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-surface-container flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTimeCard(null)}
                className="px-4 py-2 text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
