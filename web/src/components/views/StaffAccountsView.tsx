// ============================================================================
// MÀN HÌNH QUẢN LÝ TÀI KHOẢN NHÂN VIÊN ĐIỀU PHỐI & CSKH (STAFF ACCOUNTS VIEW)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Hệ thống & Tài khoản Staff
// Mục đích:
// 1. Gộp ô nhập Email và nút Tạo lời mời thành biểu mẫu Tạo tài khoản trực tiếp (Cách A - Yêu cầu #3):
//    - Admin chỉ cần nhập `email` (bắt buộc) và `fullName` (họ tên - tùy chọn, nếu bỏ trống hệ thống
//      tự động trích xuất từ phần tiền tố của email).
//    - Nhấn nút "Tạo tài khoản" sẽ gọi API `managementApi.createStaff({ email, fullName })`.
//    - Backend khởi tạo ngay lập tức bản ghi User có `role = STAFF`, `active = true` cùng mật khẩu
//      mặc định chuẩn hóa `Password@123`.
//    - Giao diện hiển thị hộp thông báo thành công (Success Banner) nêu rõ Email, Username,
//      Mật khẩu mặc định `Password@123` kèm nút Sao chép nhanh (Copy) để bàn giao cho nhân viên.
//    - Loại bỏ hoàn toàn quy trình mã mời hết hạn sau 48 giờ và đường dẫn `/activate-invitation`.
// 2. Bổ sung Tìm kiếm (Search) thời gian thực qua `useMemo` theo Họ tên, Email, Username, SĐT.
// 3. Bổ sung Bộ lọc trạng thái (Status Filter): Tất cả (`ALL`), Đang hoạt động (`ACTIVE`), Đã khóa (`LOCKED`).
// 4. Bổ sung Phân trang đầy đủ (Pagination): Chọn số dòng/trang (`5`, `10`, `20`), nút điều hướng
//    Trang trước / Số trang / Trang sau và dòng tổng kết "Hiển thị X - Y trên tổng số Z tài khoản Staff".
// 5. Khóa / Mở khóa tài khoản tức thì qua `managementApi.updateStaffStatus(id, !active)` với cập nhật State trực tiếp.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { managementApi, UserProfileRecord } from '../../services/managementApi';

/**
 * Kiểu dữ liệu đại diện cho 3 chế độ lọc trạng thái tài khoản Staff trên giao diện.
 */
type StaffStatusFilter = 'ALL' | 'ACTIVE' | 'LOCKED';

/**
 * Mật khẩu mặc định được chuẩn hóa cho toàn bộ tài khoản Staff mới khởi tạo theo Cách A.
 */
const DEFAULT_STAFF_PASSWORD = 'Password@123';

export function StaffAccountsView() {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Danh sách toàn bộ tài khoản Staff tải trực tiếp từ cơ sở dữ liệu qua REST API
  const [staffList, setStaffList] = useState<UserProfileRecord[]>([]);

  // Cờ báo hiệu đang tải danh sách từ máy chủ (dùng để hiển thị trạng thái Loading)
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Cờ báo hiệu đang thực thi thao tác gửi biểu mẫu tạo mới hoặc đổi trạng thái khóa/mở khóa
  const [busy, setBusy] = useState<boolean>(false);

  // Chuỗi lưu thông báo lỗi nếu quá trình gọi API gặp sự cố
  const [error, setError] = useState<string>('');

  // State quản lý dữ liệu nhập trong biểu mẫu Tạo tài khoản trực tiếp (Cách A)
  const [emailInput, setEmailInput] = useState<string>('');
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');

  // State lưu trữ thông tin tài khoản Staff vừa được tạo thành công để hiển thị Banner bàn giao mật khẩu
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    username: string;
    fullName: string;
    defaultPassword: string;
  } | null>(null);

  // Cờ hiển thị phản hồi "Đã sao chép!" khi Admin nhấn nút Copy thông tin đăng nhập
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // State phục vụ Tìm kiếm (Search) và Bộ lọc trạng thái (Filter)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('ALL');

  // State phục vụ Phân trang (Pagination): Trang hiện tại (bắt đầu từ 1) và số dòng mỗi trang (5, 10, 20)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU TÀI KHOẢN STAFF TỪ DATABASE
  // ==========================================================================

  /**
   * Hàm bất đồng bộ gọi `managementApi.getStaff()` để lấy danh sách nhân viên điều phối từ DB.
   * Sử dụng `useCallback` để tránh khởi tạo lại hàm không cần thiết giữa các lần render.
   */
  const loadStaffAccounts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Gọi API GET /api/v1/admin/staff lấy toàn bộ danh sách tài khoản có role = STAFF
      const data = await managementApi.getStaff();
      // Đảm bảo dữ liệu gán vào state luôn là mảng hợp lệ
      setStaffList(Array.isArray(data) ? data : []);
    } catch (e) {
      // Bắt lỗi từ ApiError và hiển thị thông điệp tiếng Việt rõ ràng
      setError((e as Error).message || 'Không thể tải danh sách tài khoản Staff từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Hook `useEffect` tự động kích hoạt tải danh sách tài khoản Staff ngay khi mở màn hình.
   */
  useEffect(() => {
    void loadStaffAccounts();
  }, [loadStaffAccounts]);

  // ==========================================================================
  // XỬ LÝ TẠO TÀI KHOẢN STAFF TRỰC TIẾP (CÁCH A - MẬT KHẨU MẶC ĐỊNH Password@123)
  // ==========================================================================

  /**
   * Hàm xử lý sự kiện khi Admin nhấn nút "Tạo tài khoản".
   * Luồng hoạt động:
   * 1. Ngăn hành vi tải lại trang mặc định của thẻ `<form>`.
   * 2. Chuẩn hóa email (xóa khoảng trắng thừa) và nếu `fullName` để trống thì tự động tạo tên
   *    hiển thị từ phần trước ký tự `@` của email.
   * 3. Gọi `managementApi.createStaff({ email, fullName, phoneNumber, password: 'Password@123' })`.
   * 4. Cập nhật ngay tài khoản mới vào đầu danh sách `staffList` và hiển thị Banner bàn giao mật khẩu.
   */
  async function handleCreateStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setError('Vui lòng nhập địa chỉ Email của nhân viên Staff.');
      return;
    }

    // Nếu Admin không nhập Họ tên, tự động suy diễn từ tiền tố email (ví dụ: staff.binhthanh@... -> Staff Binhthanh)
    const derivedFullName =
      fullNameInput.trim() ||
      trimmedEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

    setBusy(true);
    setError('');
    setCreatedAccount(null);
    setCopiedSuccess(false);

    try {
      // Gọi API POST /api/v1/admin/staff để tạo trực tiếp tài khoản Staff trong Database
      const created = await managementApi.createStaff({
        email: trimmedEmail,
        fullName: derivedFullName,
        phoneNumber: phoneInput.trim() || undefined,
        password: DEFAULT_STAFF_PASSWORD
      });

      // Lưu thông tin tài khoản vừa tạo để hiển thị trên hộp thông báo thành công
      setCreatedAccount({
        email: created.email || trimmedEmail,
        username: created.username || trimmedEmail.split('@')[0],
        fullName: created.fullName || derivedFullName,
        defaultPassword: created.defaultPassword || DEFAULT_STAFF_PASSWORD
      });

      // Xóa trắng các ô nhập trên form sau khi tạo thành công
      setEmailInput('');
      setFullNameInput('');
      setPhoneInput('');

      // Tải lại danh sách từ Database để đồng bộ ID và thời gian tạo chính xác
      await loadStaffAccounts();
      // Đưa phân trang về trang 1 để Admin nhìn thấy ngay tài khoản mới
      setCurrentPage(1);
    } catch (e) {
      setError((e as Error).message || 'Không thể tạo tài khoản Staff. Vui lòng kiểm tra lại Email.');
    } finally {
      setBusy(false);
    }
  }

  // ==========================================================================
  // XỬ LÝ KHÓA / MỞ KHÓA TÀI KHOẢN STAFF TỨC THÌ
  // ==========================================================================

  /**
   * Hàm đảo trạng thái hoạt động (`active`) của một tài khoản Staff:
   * - Đang hoạt động (`active = true`) -> Khóa tài khoản (`active = false`).
   * - Đã khóa (`active = false`) -> Mở khóa tài khoản (`active = true`).
   * Sau khi API phản hồi thành công, cập nhật trực tiếp phần tử trong mảng `staffList`
   * để giao diện phản hồi tức thì mà không làm nháy bảng.
   */
  async function handleToggleStatus(user: UserProfileRecord) {
    setBusy(true);
    setError('');
    const nextActiveState = !user.active;

    try {
      // Gọi API PATCH /api/v1/admin/staff/{id}/status với trạng thái mới
      const updatedUser = await managementApi.updateStaffStatus(user.id, nextActiveState);

      // Cập nhật trực tiếp bản ghi tương ứng trong state `staffList`
      setStaffList((prevList) =>
        prevList.map((item) =>
          item.id === user.id
            ? {
                ...item,
                ...updatedUser,
                active: updatedUser?.active !== undefined ? updatedUser.active : nextActiveState
              }
            : item
        )
      );
    } catch (e) {
      setError((e as Error).message || 'Không thể cập nhật trạng thái tài khoản Staff.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Hàm sao chép nhanh thông tin đăng nhập (Email, Username, Mật khẩu mặc định Password@123)
   * vào bộ nhớ tạm (Clipboard) để Admin gửi cho nhân viên qua kênh nội bộ.
   */
  function handleCopyCredentials() {
    if (!createdAccount) return;
    const textToCopy = [
      `Thông tin đăng nhập hệ thống HydroRescue:`,
      `- Họ tên: ${createdAccount.fullName}`,
      `- Email đăng nhập: ${createdAccount.email}`,
      `- Tên đăng nhập: ${createdAccount.username}`,
      `- Mật khẩu mặc định: ${createdAccount.defaultPassword}`
    ].join('\n');

    void navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  }

  // ==========================================================================
  // TÍNH TOÁN THỐNG KÊ, LỌC DỮ LIỆU & PHÂN TRANG BẰNG HOOK useMemo
  // ==========================================================================

  /**
   * Thống kê nhanh số lượng tài khoản theo trạng thái để hiển thị trên các thẻ KPI và nút Filter.
   */
  const summaryCounts = useMemo(() => {
    const total = staffList.length;
    const activeCount = staffList.filter((u) => u.active).length;
    const lockedCount = total - activeCount;
    return { total, activeCount, lockedCount };
  }, [staffList]);

  /**
   * Lọc danh sách tài khoản Staff theo thời gian thực (`useMemo`) kết hợp cả:
   * 1. Bộ lọc trạng thái (`statusFilter`: ALL | ACTIVE | LOCKED)
   * 2. Từ khóa tìm kiếm (`searchTerm`: so khớp không phân biệt hoa thường trên `fullName`, `email`, `username`, `phone` / `phoneNumber`)
   */
  const filteredStaff = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return staffList.filter((user) => {
      // Kiểm tra điều kiện lọc theo trạng thái hoạt động
      if (statusFilter === 'ACTIVE' && !user.active) return false;
      if (statusFilter === 'LOCKED' && user.active) return false;

      // Nếu không có từ khóa tìm kiếm thì giữ lại bản ghi
      if (!normalizedQuery) return true;

      // Chuẩn hóa các trường văn bản của bản ghi để so khớp với từ khóa tìm kiếm
      const fullName = (user.fullName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const phone = (user.phoneNumber || user.phone || '').toLowerCase();

      return (
        fullName.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        username.includes(normalizedQuery) ||
        phone.includes(normalizedQuery)
      );
    });
  }, [staffList, statusFilter, searchTerm]);

  /**
   * Tự động đưa `currentPage` về trang 1 mỗi khi người dùng thay đổi từ khóa tìm kiếm,
   * bộ lọc trạng thái hoặc kích thước trang (`pageSize`).
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Tính tổng số trang dựa trên tổng số bản ghi sau khi lọc và kích thước trang (`pageSize`)
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));

  // Đảm bảo trang hiện tại không vượt quá tổng số trang khi dữ liệu thay đổi
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Tính chỉ số bắt đầu (startIndex) và kết thúc (endIndex) để cắt lát mảng cho trang hiện tại
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStaff.length);

  /**
   * Danh sách các bản ghi Staff hiển thị trên trang hiện tại sau khi đã lọc và phân trang.
   */
  const paginatedStaff = useMemo(() => {
    return filteredStaff.slice(startIndex, endIndex);
  }, [filteredStaff, startIndex, endIndex]);

  // Tạo mảng danh sách các số trang [1, 2, ..., totalPages] để render các nút bấm chuyển trang
  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  // ==========================================================================
  // HIỂN THỊ GIAO DIỆN NGƯỜI DÙNG (JSX RENDERING)
  // ==========================================================================

  return (
    <section className="flex flex-col w-full space-y-6">
      {/* Tiêu đề trang & Thẻ tổng quan số lượng tài khoản Staff */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">
              Quản lý Tài khoản Nhân viên Điều phối
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
              Chỉ dành cho Admin
            </span>
          </div>
          <p className="text-sm text-secondary mt-1">
            Khởi tạo trực tiếp tài khoản nhân viên điều phối &amp; CSKH với mật khẩu mặc định{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono font-bold text-on-surface">
              {DEFAULT_STAFF_PASSWORD}
            </code>{' '}
            (nhân viên đăng nhập ngay không cần mã mời) và quản lý quyền truy cập.
          </p>
        </div>

        {/* 3 Thẻ chỉ số nhanh (Tổng số, Đang hoạt động, Đã khóa) */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-lg bg-surface-container-low border border-surface-container text-center">
            <div className="text-xs font-semibold text-secondary uppercase">Tổng số Staff</div>
            <div className="text-xl font-bold font-mono text-on-surface">{summaryCounts.total}</div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-center">
            <div className="text-xs font-semibold text-emerald-800 uppercase">Đang hoạt động</div>
            <div className="text-xl font-bold font-mono text-emerald-700">{summaryCounts.activeCount}</div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-red-50/70 border border-red-200 text-center">
            <div className="text-xs font-semibold text-red-800 uppercase">Đã khóa</div>
            <div className="text-xl font-bold font-mono text-red-700">{summaryCounts.lockedCount}</div>
          </div>
        </div>
      </div>

      {/* Khu vực 1: Biểu mẫu Tạo tài khoản Staff trực tiếp (Cách A - Gộp Email & Tạo tài khoản) */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div>
            <h2 className="text-base font-bold text-on-surface">
              Tạo tài khoản Staff mới (Kích hoạt ngay)
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Nhập Email nhân viên (bắt buộc) và Họ tên (nếu để trống hệ thống tự động tạo từ Email). Tài khoản sẽ được tạo ngay với mật khẩu mặc định{' '}
              <strong>{DEFAULT_STAFF_PASSWORD}</strong>.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-surface-container text-secondary font-semibold">
            Mật khẩu mặc định: {DEFAULT_STAFF_PASSWORD}
          </span>
        </div>

        <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Ô nhập Email Staff (bắt buộc) */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-secondary uppercase mb-1">
              Email nhân viên Staff <span className="text-red-600">*</span>
            </label>
            <input
              name="email"
              aria-label="Email Staff"
              required
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Ví dụ: staff.cskh@hydrorescue.vn"
              className="w-full h-10 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Ô nhập Họ và tên Staff (tùy chọn) */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-secondary uppercase mb-1">
              Họ và tên nhân viên (Tùy chọn)
            </label>
            <input
              name="fullName"
              aria-label="Họ và tên Staff"
              type="text"
              value={fullNameInput}
              onChange={(e) => setFullNameInput(e.target.value)}
              placeholder="Bỏ trống để tự lấy theo Email"
              className="w-full h-10 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Ô nhập Số điện thoại (tùy chọn) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-secondary uppercase mb-1">
              Số điện thoại
            </label>
            <input
              name="phoneNumber"
              aria-label="Số điện thoại Staff"
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="0909xxxxxx"
              className="w-full h-10 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Nút bấm Tạo tài khoản */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 px-4 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-container transition-all cursor-pointer disabled:opacity-60"
            >
              {busy ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>

        {/* Banner hiển thị thông tin tài khoản Staff vừa được tạo thành công */}
        {createdAccount && (
          <div
            role="status"
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                <span>Đã tạo tài khoản Staff thành công (Trạng thái: Đang hoạt động)</span>
              </div>
              <div className="text-xs space-x-4 flex flex-wrap gap-y-1">
                <span>
                  Họ tên: <strong>{createdAccount.fullName}</strong>
                </span>
                <span>
                  Email: <strong className="font-mono">{createdAccount.email}</strong>
                </span>
                <span>
                  Username: <strong className="font-mono">{createdAccount.username}</strong>
                </span>
                <span>
                  Mật khẩu mặc định:{' '}
                  <code className="px-2 py-0.5 rounded bg-white border border-emerald-300 font-mono font-bold text-emerald-900">
                    {createdAccount.defaultPassword}
                  </code>
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                Nhân viên Staff có thể dùng Email/Username và mật khẩu mặc định này để đăng nhập ngay vào hệ thống và tự đổi mật khẩu sau.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                {copiedSuccess ? 'Đã sao chép!' : 'Sao chép thông tin'}
              </button>
              <button
                type="button"
                onClick={() => setCreatedAccount(null)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Hiển thị thông báo lỗi nếu có */}
        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
          >
            {error}
          </div>
        )}
      </div>

      {/* Khu vực 2: Thanh công cụ Tìm kiếm (Search), Bộ lọc trạng thái (Filter) & Làm mới */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-surface-container flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Ô tìm kiếm theo Họ tên, Email, Username hoặc Số điện thoại */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo Họ tên, Email, Username hoặc SĐT..."
            aria-label="Tìm kiếm tài khoản Staff"
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Các nút lọc trạng thái (Tất cả / Đang hoạt động / Đã khóa) & Nút làm mới */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-surface-container">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Tất cả ({summaryCounts.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Đang hoạt động ({summaryCounts.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('LOCKED')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'LOCKED'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Đã khóa ({summaryCounts.lockedCount})
            </button>
          </div>

          {/* Chọn số dòng hiển thị trên mỗi trang */}
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            <span>Hiển thị:</span>
            <select
              aria-label="Số dòng mỗi trang"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 px-2 rounded-lg border border-surface-container bg-surface-container-low text-on-surface font-semibold"
            >
              <option value={5}>5 dòng/trang</option>
              <option value={10}>10 dòng/trang</option>
              <option value={20}>20 dòng/trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Khu vực 3: Bảng danh sách tài khoản Staff & Thanh điều khiển Phân trang */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">ID / Username</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Email đăng nhập</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {paginatedStaff.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs">
                    <div className="font-bold text-primary">#{user.id}</div>
                    <div className="text-secondary">{user.username || '—'}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-on-surface">
                    {user.fullName || 'Chưa cập nhật'}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-on-surface">{user.email}</td>
                  <td className="py-3 px-4 font-mono text-xs text-secondary">
                    {user.phoneNumber || user.phone || '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-secondary">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {user.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                        Đã khóa
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleStatus(user)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                        user.active
                          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {user.active ? 'Khóa tài khoản' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}

              {/* Khi không có bản ghi nào khớp với bộ lọc */}
              {paginatedStaff.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-sm text-secondary">
                    {isLoading
                      ? 'Đang tải danh sách tài khoản Staff từ cơ sở dữ liệu...'
                      : 'Không tìm thấy tài khoản Staff nào phù hợp với điều kiện lọc.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh điều hướng Phân trang (Pagination Footer) */}
        <div className="px-4 py-3 bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
          <div>
            Hiển thị{' '}
            <strong className="text-on-surface">
              {filteredStaff.length === 0 ? 0 : startIndex + 1}
            </strong>{' '}
            - <strong className="text-on-surface">{endIndex}</strong> trên tổng số{' '}
            <strong className="text-on-surface">{filteredStaff.length}</strong> tài khoản Staff
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-surface-container-lowest border border-surface-container text-on-surface font-semibold hover:bg-surface-container disabled:opacity-40 cursor-pointer"
            >
              Trang trước
            </button>

            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`px-2.5 py-1 rounded font-mono font-bold transition-colors cursor-pointer ${
                  pageNum === safeCurrentPage
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-lowest border border-surface-container text-on-surface hover:bg-surface-container'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-surface-container-lowest border border-surface-container text-on-surface font-semibold hover:bg-surface-container disabled:opacity-40 cursor-pointer"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
