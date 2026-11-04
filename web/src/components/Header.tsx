// ============================================================================
// TẬP TIN: Header.tsx
// TÁC GIẢ / PHỤ TRÁCH: Nguyễn Hoàng Long - Quản trị Tài chính & Hệ thống Admin
// PHÂN HỆ: Thanh điều hướng cấp cao (Top Application Header)
// MÔ TẢ NGHIỆP VỤ & KỸ THUẬT:
//   - Cung cấp thanh Header toàn cục gắn trên đỉnh màn hình của toàn bộ 3 phân hệ.
//   - Tích hợp Logo thương hiệu RescueOps, Trạng thái kết nối trực tuyến (Healthcheck ping).
//   - Điều hướng nhanh giữa các phân hệ được cấp quyền (Admin / Staff / Gara) theo vai trò (RBAC).
//   - Ô tìm kiếm nhanh toàn hệ thống (mã đơn cứu hộ, tên gara, thợ).
//   - Nút Chuông thông báo hiển thị số lượng cảnh báo khẩn cấp chưa đọc.
//   - Menu hồ sơ cá nhân (Profile Dropdown) hiển thị thông tin tài khoản, vai trò và nút Đăng xuất.
// ============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, ChevronDown, LogOut, Search, X } from 'lucide-react';
import { ModuleType, ScreenId } from '../types';
import { User } from '../types/auth';
import { roleModules } from '../permissions';
import { DEMO_MODE } from '../context/AuthContext';
import { API_BASE_URL } from '../services/apiConfig';
import logoImg from '../assets/logo.png';

/**
 * Định nghĩa các thuộc tính đầu vào (Props) cho thành phần Header.
 */
export interface HeaderProps {
  currentModule: ModuleType;
  currentScreen?: ScreenId;
  onSelectModule: (mod: ModuleType) => void;
  onSelectScreen?: (screen: ScreenId) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  unreadAlertsCount?: number;
  onOpenAlerts?: () => void;
  user?: User | null;
  onLogout?: () => void;
}

/**
 * Bảng ánh xạ nhãn hiển thị cho 3 phân hệ chính.
 */
export const MODULE_LABELS: Record<ModuleType, string> = {
  admin: 'Tài chính',
  staff: 'Điều phối',
  owner: 'Gara'
};

/**
 * Bảng ánh xạ nhãn hiển thị cho các vai trò người dùng (Roles).
 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  SUPER_ADMIN: 'Quản trị cấp cao',
  STAFF: 'Nhân viên điều phối',
  KYC_VERIFIER: 'Kiểm duyệt viên KYC',
  GARAGE_OWNER: 'Chủ Gara',
  FIELD_MECHANIC: 'Thợ cứu hộ cơ động',
  CUSTOMER: 'Khách hàng'
};

const DEFAULT_SCREENS: Record<ModuleType, ScreenId> = {
  admin: 'overview',
  staff: 'dashboard',
  owner: 'owner-dashboard'
};

/**
 * Thành phần Header ứng dụng Web Portal.
 */
export const Header: React.FC<HeaderProps> = ({
  currentModule,
  currentScreen,
  onSelectModule,
  onSelectScreen,
  searchQuery = '',
  onSearchChange,
  unreadAlertsCount = 0,
  onOpenAlerts,
  user,
  onLogout
}) => {
  // Trạng thái đóng/mở menu thả xuống của tài khoản (Account Dropdown)
  const [open, setOpen] = useState(false);
  // Trạng thái lỗi tải ảnh avatar
  const [avatarError, setAvatarError] = useState(false);
  // Trạng thái kết nối máy chủ: 'online' | 'checking' | 'offline'
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'checking' | 'offline'>('online');

  // Tham chiếu (Ref) tới phần tử DOM của profile menu để phát hiện click bên ngoài
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Kiểm tra kết nối mạng và máy chủ backend định kỳ
   */
  const checkHealth = useCallback(async () => {
    try {
      if (!navigator.onLine) {
        setConnectionStatus('offline');
        return;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus(DEMO_MODE ? 'online' : 'offline');
      }
    } catch {
      setConnectionStatus(DEMO_MODE ? 'online' : 'offline');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 45000);
    const handleOnline = () => {
      setConnectionStatus('checking');
      checkHealth();
    };
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkHealth]);

  /**
   * Đăng ký sự kiện lắng nghe click chuột và nhấn phím Escape để tự động đóng dropdown.
   */
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Chữ cái viết tắt cho avatar đại diện
  const userInitials =
    user?.fullName
      ?.split(' ')
      .filter(Boolean)
      .slice(-1)[0]
      ?.charAt(0)
      .toUpperCase() || 'U';

  const roleText = (user && ROLE_LABELS[user.role]) || user?.role || 'Khách';

  return (
    <header className="app-header">
      {/* Logo thương hiệu RescueOps & Nhận diện ứng dụng */}
      <a
        className="app-brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSelectModule(currentModule);
        }}
        aria-label="RescueOps — Về bảng điều khiển chính"
      >
        <span className="brand-mark">
          <img src={logoImg} alt="RescueOps Logo" className="w-8 h-8 rounded-lg object-contain" />
        </span>
        <span className="brand-text">
          rescue<span className="text-primary font-bold">ops</span>
          <small>ĐIỀU HÀNH CỨU HỘ</small>
        </span>
      </a>

      {/* Menu chuyển đổi nhanh giữa các phân hệ được cấp quyền (RBAC) */}
      <nav className="module-nav" aria-label="Khu vực quản lý">
        {user &&
          roleModules[user.role]?.map((mod) => (
            <button
              key={mod}
              type="button"
              className={currentModule === mod ? 'active' : ''}
              aria-current={currentModule === mod ? 'page' : undefined}
              onClick={() => onSelectModule(mod)}
            >
              {MODULE_LABELS[mod]}
            </button>
          ))}
      </nav>

      {/* Ô tìm kiếm nhanh toàn hệ thống */}
      {onSearchChange && (
        <div className="header-search" role="search">
          <Search size={15} className="header-search-icon" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm mã đơn, đối tác, thợ..."
            aria-label="Tìm kiếm toàn hệ thống"
          />
          {searchQuery && (
            <button
              type="button"
              className="header-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Xóa tìm kiếm"
              title="Xóa nội dung tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Khu vực tiện ích hệ thống bên phải (Status, Thông báo, Hồ sơ người dùng) */}
      <div className="header-utilities">
        {DEMO_MODE && (
          <span
            className="demo-label"
            title="Dữ liệu mẫu phục vụ kiểm thử; kết nối backend theo môi trường"
          >
            Bản demo
          </span>
        )}

        {/* Trạng thái kết nối máy chủ */}
        <span
          className={`system-status ${connectionStatus}`}
          title={
            connectionStatus === 'online'
              ? 'Hệ thống đang kết nối trực tuyến'
              : connectionStatus === 'checking'
                ? 'Đang kiểm tra kết nối máy chủ'
                : 'Mất kết nối mạng hoặc máy chủ'
          }
        >
          <i aria-hidden="true" />
          {connectionStatus === 'online'
            ? 'Trực tuyến'
            : connectionStatus === 'checking'
              ? 'Đang kết nối'
              : 'Ngoại tuyến'}
        </span>

        {/* Nút Chuông thông báo hiển thị số lượng cảnh báo khẩn */}
        <button
          type="button"
          className="icon-button notification-button"
          aria-label={`Thông báo: ${unreadAlertsCount} chưa đọc`}
          title={`Thông báo hệ thống (${unreadAlertsCount} chưa đọc)`}
          onClick={onOpenAlerts}
        >
          <Bell size={19} />
          {unreadAlertsCount > 0 && (
            <span aria-hidden="true">
              {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Menu tài khoản người dùng và Đăng xuất */}
        <div className="profile-menu" ref={menuRef}>
          <button
            type="button"
            className="profile-trigger"
            aria-expanded={open}
            aria-controls="account-menu"
            onClick={() => setOpen(!open)}
          >
            <span className="avatar" aria-hidden="true">
              {user?.avatarUrl && !avatarError ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || 'Avatar'}
                  className="avatar-img"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                userInitials
              )}
            </span>
            <span className="profile-name">{user?.fullName || 'Người dùng'}</span>
            <ChevronDown size={14} />
          </button>

          {/* Menu thả xuống thông tin tài khoản */}
          {open && (
            <div id="account-menu" className="account-dropdown" role="menu">
              <div className="account-info">
                <strong className="block truncate">{user?.fullName || 'Tài khoản'}</strong>
                <p className="truncate text-secondary">{user?.email || 'Chưa thiết lập email'}</p>
                <div className="mt-2 flex flex-wrap gap-1 items-center">
                  <span className="user-role-badge">{roleText}</span>
                  <span className="text-[11px] text-secondary font-medium px-1.5 py-0.5 rounded bg-surface-container">
                    {MODULE_LABELS[currentModule] || currentModule}
                  </span>
                </div>
              </div>

              {onSelectScreen && (
                <button
                  type="button"
                  className="dropdown-item-btn mt-3 pt-2 border-t border-slate-100"
                  onClick={() => {
                    setOpen(false);
                    onSelectScreen(DEFAULT_SCREENS[currentModule] || 'overview');
                  }}
                >
                  Bảng điều khiển chính
                </button>
              )}

              <button
                type="button"
                className="logout-btn"
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
