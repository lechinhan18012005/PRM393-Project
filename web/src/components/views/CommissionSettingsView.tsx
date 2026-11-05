// ============================================================================
// MÀN HÌNH CẤU HÌNH PHÍ CHIẾT KHẤU THEO TỪNG GARA ĐỐI TÁC (COMMISSION SETTINGS VIEW - UC-24)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích:
// 1. Phân quyền nghiêm ngặt (Yêu cầu #4):
//    - Chỉ duy nhất Quản trị viên (ROLE_ADMIN) mới có quyền xem và điều chỉnh tỷ lệ phí chiết khấu.
//    - Hiển thị huy hiệu (Badge) rõ ràng: "Quyền hạn: Chỉ Quản trị viên (ADMIN) mới được phép điều chỉnh tỷ lệ chiết khấu".
// 2. Dữ liệu 100% từ Cơ sở dữ liệu (Database):
//    - Tải danh sách chiết khấu và dịch vụ của từng Gara đối tác từ `financeApi.getGarageCommissions()`.
//    - Tải cấu hình tỷ lệ chiết khấu mặc định hệ thống từ `financeApi.getActiveCommission()` và
//      lịch sử thay đổi chiết khấu từ `financeApi.getCommissionHistory()`.
//    - Loại bỏ hoàn toàn mọi công thức giả lập cứng (`K_FLOOD`, giảm giá bậc thang `Batch Tier Discount`,
//      hay các dòng lịch sử giả lập năm 2023).
// 3. Giao diện trực quan, đơn giản, sát thực tế vận hành:
//    - 4 Thẻ chỉ số KPI tổng hợp tự động từ DB: Tổng số Gara đối tác, Tỷ lệ chiết khấu mặc định hệ thống,
//      Chiết khấu trung bình của các Gara, Tổng số dịch vụ cứu hộ đang cung cấp.
//    - Bảng cấu hình chiết khấu theo từng Gara có Tìm kiếm, Lọc trạng thái, hiển thị danh mục dịch vụ
//      thực tế (`services`) kèm giá gốc (`basePrice`), số dư ví hiện tại (`walletBalance`), và ô nhập
//      chỉnh sửa trực tiếp tỷ lệ chiết khấu (`0 - 100%`) + nút "Lưu chiết khấu" gọi `financeApi.updateGarageCommission`.
//    - Khu vực cấu hình tỷ lệ chiết khấu mặc định cho Gara mới đăng ký (`financeApi.updateCommission`)
//      và Bảng lịch sử thay đổi chiết khấu lấy 100% từ Database.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CommissionConfigBackend,
  financeApi,
  GarageCommissionDto
} from '../../services/financeApi';

/**
 * Giao diện Props truyền vào CommissionSettingsView.
 */
interface CommissionSettingsViewProps {
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const CommissionSettingsView: React.FC<CommissionSettingsViewProps> = ({ onShowToast }) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Danh sách các Gara đối tác kèm thông tin chiết khấu, số dư ví và dịch vụ lấy từ Database
  const [garages, setGarages] = useState<GarageCommissionDto[]>([]);

  // Bản đồ lưu giá trị chiết khấu đang chỉnh sửa tạm thời trên từng dòng Gara: { [garageId]: commissionRate }
  const [draftRates, setDraftRates] = useState<Record<number, string>>({});

  // Bản đồ lưu ghi chú chỉnh sửa chiết khấu cho từng Gara: { [garageId]: notes }
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});

  // ID của Gara đang trong quá trình gửi API lưu chiết khấu (để khóa nút bấm tương ứng)
  const [savingGarageId, setSavingGarageId] = useState<number | null>(null);

  // Cấu hình tỷ lệ chiết khấu mặc định hệ thống (áp dụng cho Gara mới được phê duyệt)
  const [globalRate, setGlobalRate] = useState<number>(12.5);
  const [versionCode, setVersionCode] = useState<string>('v1.0');
  const [changeReason, setChangeReason] = useState<string>('');
  const [isSavingGlobal, setIsSavingGlobal] = useState<boolean>(false);

  // Danh sách lịch sử thay đổi cấu hình chiết khấu lấy từ Database
  const [auditLogs, setAuditLogs] = useState<CommissionConfigBackend[]>([]);

  // Trạng thái tải dữ liệu và thông báo lỗi
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // State phục vụ Tìm kiếm (Search) và Lọc trạng thái Gara (Filter)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU TỪ DATABASE
  // ==========================================================================

  /**
   * Hàm gọi song song 3 API từ Backend để nạp toàn bộ dữ liệu chiết khấu thực tế từ Database:
   * 1. `financeApi.getGarageCommissions()`: Danh sách Gara + Dịch vụ + Tỷ lệ chiết khấu từng Gara.
   * 2. `financeApi.getActiveCommission()`: Tỷ lệ chiết khấu mặc định toàn hệ thống.
   * 3. `financeApi.getCommissionHistory()`: Lịch sử kiểm toán các lần thay đổi chiết khấu.
   */
  const loadAllCommissionData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [garageListRes, activeCfgRes, historyRes] = await Promise.allSettled([
        financeApi.getGarageCommissions(),
        financeApi.getActiveCommission(),
        financeApi.getCommissionHistory()
      ]);

      // Xử lý danh sách Gara đối tác trả về từ DB
      if (garageListRes.status === 'fulfilled' && Array.isArray(garageListRes.value)) {
        const list = garageListRes.value;
        setGarages(list);

        // Khởi tạo giá trị nháp (draft) cho ô input chiết khấu của từng Gara bằng đúng tỷ lệ trong DB
        const initialDrafts: Record<number, string> = {};
        list.forEach((g) => {
          initialDrafts[g.garageId] = String(Number(g.commissionRate ?? 10));
        });
        setDraftRates(initialDrafts);
      } else if (garageListRes.status === 'rejected') {
        setErrorMsg(
          garageListRes.reason?.message || 'Không thể tải danh sách chiết khấu Gara từ Database.'
        );
      }

      // Xử lý cấu hình chiết khấu mặc định hệ thống
      if (activeCfgRes.status === 'fulfilled' && activeCfgRes.value) {
        setGlobalRate(Number(activeCfgRes.value.globalRate ?? 12.5));
        if (activeCfgRes.value.versionCode) {
          setVersionCode(activeCfgRes.value.versionCode);
        }
      }

      // Xử lý danh sách lịch sử thay đổi chiết khấu
      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value)) {
        setAuditLogs(historyRes.value);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Lỗi kết nối máy chủ khi tải dữ liệu chiết khấu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Hook `useEffect` tự động tải dữ liệu khi mở màn hình.
   */
  useEffect(() => {
    void loadAllCommissionData();
  }, [loadAllCommissionData]);

  // ==========================================================================
  // TÍNH TOÁN 4 CHỈ SỐ KPI VÀ BỘ LỌC BẢNG GARA BẰNG useMemo
  // ==========================================================================

  /**
   * Tính toán 4 chỉ số KPI tổng hợp trực tiếp từ danh sách Gara trong Database:
   * 1. Tổng số Gara đối tác (`totalGarages`)
   * 2. Tỷ lệ chiết khấu mặc định hệ thống (`globalRate`%)
   * 3. Chiết khấu trung bình của các Gara (`avgCommissionRate`%)
   * 4. Tổng số dịch vụ cứu hộ các Gara đang cung cấp (`totalServices`)
   */
  const kpiMetrics = useMemo(() => {
    const totalGarages = garages.length;
    const avgCommissionRate =
      totalGarages > 0
        ? (
            garages.reduce((sum, g) => sum + Number(g.commissionRate ?? 0), 0) / totalGarages
          ).toFixed(1)
        : globalRate.toFixed(1);

    const totalServices = garages.reduce(
      (sum, g) => sum + Number(g.serviceCount ?? (g.services ? g.services.length : 0)),
      0
    );

    return {
      totalGarages,
      avgCommissionRate,
      totalServices
    };
  }, [garages, globalRate]);

  /**
   * Lọc danh sách Gara theo từ khóa tìm kiếm (Tên Gara, Số điện thoại, Địa chỉ)
   * và theo trạng thái hoạt động của Gara.
   */
  const filteredGarages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return garages.filter((g) => {
      // Lọc theo trạng thái Gara nếu Admin chọn khác 'ALL'
      if (statusFilter !== 'ALL' && g.status !== statusFilter) {
        return false;
      }

      // Nếu không có từ khóa tìm kiếm thì hiển thị
      if (!q) return true;

      const matchName = (g.garageName || '').toLowerCase().includes(q);
      const matchPhone = (g.phone || '').toLowerCase().includes(q);
      const matchAddress = (g.address || '').toLowerCase().includes(q);
      const matchId = String(g.garageId).includes(q);

      return matchName || matchPhone || matchAddress || matchId;
    });
  }, [garages, searchTerm, statusFilter]);

  // ==========================================================================
  // XỬ LÝ LƯU TỶ LỆ CHIẾT KHẤU CHO TỪNG GARA CỤ THỂ (UC-24)
  // ==========================================================================

  /**
   * Hàm lưu tỷ lệ phí chiết khấu mới cho một Gara cụ thể xuống Database
   * thông qua API `PATCH /api/v1/finance/garages/{garageId}/commission`.
   */
  const handleSaveGarageCommission = async (garage: GarageCommissionDto) => {
    const rawValue = draftRates[garage.garageId] ?? String(garage.commissionRate);
    const parsedRate = Number(rawValue);

    // Kiểm tra tính hợp lệ của tỷ lệ phần trăm chiết khấu (0% - 100%)
    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      onShowToast(
        'Tỷ lệ không hợp lệ',
        'Vui lòng nhập tỷ lệ chiết khấu hợp lệ trong khoảng từ 0% đến 100%.',
        'error'
      );
      return;
    }

    setSavingGarageId(garage.garageId);
    try {
      const notes =
        draftNotes[garage.garageId]?.trim() ||
        `Admin cập nhật chiết khấu Gara ${garage.garageName} thành ${parsedRate}%`;

      // Gọi API cập nhật chiết khấu riêng cho Gara trong Database
      const updatedGarage = await financeApi.updateGarageCommission(garage.garageId, {
        commissionRate: parsedRate,
        notes
      });

      // Cập nhật lại dòng Gara tương ứng trong state `garages`
      setGarages((prev) =>
        prev.map((item) =>
          item.garageId === garage.garageId ? { ...item, ...updatedGarage } : item
        )
      );

      // Tải lại lịch sử thay đổi chiết khấu để hiển thị bản ghi kiểm toán mới nhất
      const updatedHistory = await financeApi.getCommissionHistory();
      setAuditLogs(updatedHistory);

      onShowToast(
        'Đã lưu chiết khấu Gara',
        `Đã cập nhật tỷ lệ chiết khấu của "${garage.garageName}" thành ${parsedRate}% trong Database.`,
        'success'
      );
    } catch (err) {
      onShowToast(
        'Lỗi cập nhật chiết khấu',
        (err as Error).message || 'Không thể lưu tỷ lệ chiết khấu cho Gara này.',
        'error'
      );
    } finally {
      setSavingGarageId(null);
    }
  };

  // ==========================================================================
  // XỬ LÝ LƯU TỶ LỆ CHIẾT KHẤU MẶC ĐỊNH HỆ THỐNG CHO GARA MỚI
  // ==========================================================================

  /**
   * Hàm lưu tỷ lệ chiết khấu mặc định của hệ thống (`PUT /api/v1/finance/commission`).
   */
  const handleSaveGlobalCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(globalRate) || globalRate < 0 || globalRate > 100) {
      onShowToast('Dữ liệu không hợp lệ', 'Tỷ lệ chiết khấu mặc định phải từ 0% đến 100%.', 'error');
      return;
    }

    setIsSavingGlobal(true);
    try {
      const updated = await financeApi.updateCommission({
        globalRate,
        changeSummary: `Cập nhật tỷ lệ chiết khấu mặc định hệ thống: ${globalRate}%`,
        approvalReason:
          changeReason.trim() || 'Admin điều chỉnh mức chiết khấu mặc định áp dụng cho Gara mới'
      });

      if (updated.versionCode) {
        setVersionCode(updated.versionCode);
      }
      setChangeReason('');

      const historyList = await financeApi.getCommissionHistory();
      setAuditLogs(historyList);

      onShowToast(
        'Đã lưu cấu hình mặc định',
        `Tỷ lệ chiết khấu mặc định hệ thống (${globalRate}%) đã được lưu vào Database.`,
        'success'
      );
    } catch (err) {
      onShowToast(
        'Lỗi lưu cấu hình',
        (err as Error).message || 'Không thể lưu tỷ lệ chiết khấu mặc định.',
        'error'
      );
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // ==========================================================================
  // HIỂN THỊ GIAO DIỆN NGƯỜI DÙNG (JSX RENDERING)
  // ==========================================================================

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header & Huy hiệu khẳng định quyền hạn duy nhất của ADMIN */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">
              Quản lý Phí Chiết Khấu Gara Đối Tác
            </h1>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              Quyền hạn: Chỉ Quản trị viên (ADMIN) mới được phép điều chỉnh tỷ lệ chiết khấu
            </span>
          </div>
          <p className="text-sm text-secondary">
            Toàn bộ thông tin Gara, danh mục dịch vụ niêm yết và tỷ lệ phần trăm chiết khấu dưới đây được truy xuất trực tiếp từ Cơ sở dữ liệu (Database). Khi giao dịch cứu hộ hoàn tất, hệ thống tự động khấu trừ theo đúng tỷ lệ chiết khấu của từng Gara.
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void loadAllCommissionData()}
          className="self-start lg:self-auto px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-sm font-semibold text-on-surface transition-colors cursor-pointer"
        >
          {isLoading ? 'Đang đồng bộ DB...' : 'Làm mới dữ liệu từ DB'}
        </button>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* 4 Thẻ KPI tổng hợp trực tiếp từ Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">Tổng số Gara đối tác (DB)</div>
          <div className="text-2xl font-bold font-mono text-on-surface mt-1">
            {kpiMetrics.totalGarages} Gara
          </div>
          <div className="text-xs text-secondary mt-1">
            Đang trực tuyến: {garages.filter((g) => g.isOnline).length} Gara
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            Chiết khấu mặc định hệ thống
          </div>
          <div className="text-2xl font-bold font-mono text-primary mt-1">
            {globalRate.toFixed(1)}%
          </div>
          <div className="text-xs text-secondary mt-1">
            Áp dụng mặc định cho Gara mới ({versionCode})
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            Chiết khấu trung bình các Gara
          </div>
          <div className="text-2xl font-bold font-mono text-tertiary mt-1">
            {kpiMetrics.avgCommissionRate}%
          </div>
          <div className="text-xs text-secondary mt-1">
            Tính trung bình cộng từ {kpiMetrics.totalGarages} Gara trong DB
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            Tổng số dịch vụ đang cung cấp
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface mt-1">
            {kpiMetrics.totalServices} dịch vụ
          </div>
          <div className="text-xs text-secondary mt-1">
            Tổng hợp từ bảng dịch vụ của các Gara
          </div>
        </div>
      </div>

      {/* Bảng chính: Cấu hình tỷ lệ phí chiết khấu theo từng Gara đối tác */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-container flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              Bảng Cấu Hình Chiết Khấu &amp; Danh Mục Dịch Vụ Theo Từng Gara
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Admin điều chỉnh trực tiếp tỷ lệ phần trăm chiết khấu của từng Gara và nhấn <strong>Lưu chiết khấu</strong> để cập nhật vào Database.
            </p>
          </div>

          {/* Thanh tìm kiếm & lọc trạng thái Gara */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên Gara, SĐT, địa chỉ..."
              className="h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary w-64"
            />
            <select
              aria-label="Lọc trạng thái Gara"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface font-semibold"
            >
              <option value="ALL">Tất cả trạng thái ({garages.length})</option>
              <option value="APPROVED">Đã duyệt (APPROVED)</option>
              <option value="PENDING">Chờ duyệt (PENDING)</option>
              <option value="SUSPENDED">Đình chỉ (SUSPENDED)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Mã &amp; Tên Gara</th>
                <th className="py-3 px-4">Địa chỉ &amp; Điện thoại</th>
                <th className="py-3 px-4">Danh mục dịch vụ của Gara (Từ DB)</th>
                <th className="py-3 px-4 text-right">Số dư ví hiện tại</th>
                <th className="py-3 px-4 text-center">Chiết khấu hiện hành</th>
                <th className="py-3 px-4 text-right">Điều chỉnh chiết khấu (Chỉ Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {filteredGarages.map((garage) => {
                const currentDraft =
                  draftRates[garage.garageId] !== undefined
                    ? draftRates[garage.garageId]
                    : String(garage.commissionRate ?? 10);
                const isSavingThisRow = savingGarageId === garage.garageId;

                return (
                  <tr
                    key={garage.garageId}
                    className="hover:bg-surface-container-low/40 transition-colors align-top"
                  >
                    {/* Cột 1: Mã & Tên Gara + Trạng thái */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-primary">
                        #GAR-{garage.garageId}
                      </div>
                      <div className="font-bold text-on-surface mt-0.5">{garage.garageName}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            garage.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : garage.status === 'SUSPENDED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {garage.status}
                        </span>
                        {garage.isOnline && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                            Trực tuyến
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 2: Địa chỉ & Số điện thoại */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-mono text-xs font-semibold text-on-surface">
                        SĐT: {garage.phone || '—'}
                      </div>
                      <div className="text-xs text-secondary mt-1 leading-relaxed">
                        {garage.address || 'Chưa cập nhật địa chỉ'}
                      </div>
                    </td>

                    {/* Cột 3: Danh mục dịch vụ thực tế của Gara lấy từ DB kèm đơn giá gốc */}
                    <td className="py-3.5 px-4 max-w-md">
                      {garage.services && garage.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {garage.services.map((srv) => (
                            <span
                              key={srv.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container text-xs text-on-surface border border-surface-container-high"
                            >
                              <span className="font-medium">{srv.serviceName}:</span>
                              <strong className="font-mono text-primary">
                                {Number(srv.basePrice ?? 0).toLocaleString('vi-VN')} ₫
                              </strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-secondary italic">
                          Chưa đăng ký dịch vụ trong DB
                        </span>
                      )}
                    </td>

                    {/* Cột 4: Số dư ví hiện tại của Gara */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                      {Number(garage.walletBalance ?? 0).toLocaleString('vi-VN')} ₫
                    </td>

                    {/* Cột 5: Tỷ lệ chiết khấu hiện hành trong DB */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-mono font-bold text-sm">
                        {Number(garage.commissionRate ?? 0).toFixed(1)}%
                      </span>
                      <div className="text-[11px] text-secondary mt-1">
                        Gara nhận {(100 - Number(garage.commissionRate ?? 0)).toFixed(1)}%
                      </div>
                    </td>

                    {/* Cột 6: Ô nhập chỉnh sửa trực tiếp & nút Lưu chiết khấu */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <div className="relative w-24">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              aria-label={`Tỷ lệ chiết khấu của ${garage.garageName}`}
                              value={currentDraft}
                              onChange={(e) =>
                                setDraftRates((prev) => ({
                                  ...prev,
                                  [garage.garageId]: e.target.value
                                }))
                              }
                              className="w-full h-9 pl-2.5 pr-6 rounded-lg border border-surface-container bg-surface-container-low font-mono font-bold text-sm text-right text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-secondary">
                              %
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isSavingThisRow}
                            onClick={() => void handleSaveGarageCommission(garage)}
                            className="h-9 px-3.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {isSavingThisRow ? 'Đang lưu...' : 'Lưu chiết khấu'}
                          </button>
                        </div>

                        <input
                          type="text"
                          value={draftNotes[garage.garageId] || ''}
                          onChange={(e) =>
                            setDraftNotes((prev) => ({
                              ...prev,
                              [garage.garageId]: e.target.value
                            }))
                          }
                          placeholder="Ghi chú lý do điều chỉnh (tùy chọn)..."
                          className="w-60 h-7 px-2 rounded border border-surface-container bg-surface text-xs text-on-surface"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredGarages.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-sm text-secondary">
                    {isLoading
                      ? 'Đang tải danh sách chiết khấu Gara từ cơ sở dữ liệu...'
                      : 'Không có Gara đối tác nào khớp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Khu vực 2 cột bên dưới: Cấu hình chiết khấu mặc định cho Gara mới & Bảng lịch sử thay đổi từ DB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái (5 cột): Cấu hình tỷ lệ mặc định cho Gara mới */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-xs space-y-4">
          <div className="border-b border-surface-container pb-3">
            <h3 className="text-base font-bold text-on-surface">
              Cấu Hình Tỷ Lệ Mặc Định Cho Gara Mới
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Mức chiết khấu mặc định sẽ được tự động gán cho các Gara đối tác mới khi được duyệt hồ sơ.
            </p>
          </div>

          <form onSubmit={handleSaveGlobalCommission} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-secondary mb-1">
                Tỷ lệ chiết khấu mặc định hệ thống (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={globalRate}
                onChange={(e) => setGlobalRate( parseFloat(e.target.value) || 0 )}
                className="w-full h-10 px-3 rounded-lg border border-surface-container bg-surface-container-low font-mono font-bold text-base text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-secondary mb-1">
                Lý do cập nhật cấu hình mặc định
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Nhập lý do lưu vào nhật ký kiểm toán..."
                className="w-full h-10 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingGlobal}
              className="w-full h-10 px-4 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSavingGlobal
                ? 'Đang lưu cấu hình...'
                : 'Lưu Tỷ Lệ Mặc Định Hệ Thống'}
            </button>
          </form>
        </div>

        {/* Cột phải (7 cột): Lịch sử thay đổi chiết khấu lấy 100% từ Database */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Lịch Sử Thay Đổi Chiết Khấu (Audit Log từ DB)
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Ghi nhận toàn bộ lịch sử điều chỉnh tỷ lệ chiết khấu bởi Quản trị viên trong cơ sở dữ liệu.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-surface-container text-secondary font-semibold">
              {auditLogs.length} bản ghi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Quản trị viên</th>
                  <th className="py-2.5 px-3">Nội dung thay đổi</th>
                  <th className="py-2.5 px-3">Lý do duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low/50">
                    <td className="py-2.5 px-3 font-mono text-secondary whitespace-nowrap">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString('vi-VN')
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-on-surface whitespace-nowrap">
                      {log.updatedByName || 'Quản trị viên'}
                      <span className="block text-[10px] font-mono text-primary">
                        {log.updatedByRole || 'ADMIN'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-on-surface">
                      <div className="font-semibold">
                        {log.changeSummary || `Chiết khấu mặc định: ${log.globalRate}%`}
                      </div>
                      <div className="text-secondary font-mono text-[11px]">
                        Phiên bản: {log.versionCode || 'v1.0'} • Tỷ lệ: {log.globalRate}%
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-secondary">
                      {log.approvalReason || 'Cập nhật từ bảng điều khiển Admin'}
                    </td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-secondary">
                      Chưa có bản ghi lịch sử thay đổi chiết khấu nào trong Database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
