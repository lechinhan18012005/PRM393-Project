import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, ChevronDown, LogOut, Search, X } from 'lucide-react';
import { ModuleType, ScreenId } from '../types';
import { User } from '../types/auth';
import { roleModules } from '../permissions';
import { DEMO_MODE } from '../context/AuthContext';
import { API_BASE_URL } from '../services/apiConfig';
import logoImg from '../assets/logo.png';

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

export const MODULE_LABELS: Record<ModuleType, string> = {
  admin: 'Tài chính',
  staff: 'Điều phối',
  owner: 'Gara'
};

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
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online';
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Network and backend health monitoring
  const checkBackendHealth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setConnectionStatus('offline');
      return;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE_URL}/flood-reports/active`, {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timer);

      if (res && res.ok) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus(navigator.onLine ? 'online' : 'offline');
      }
    } catch {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      checkBackendHealth();
    };
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkBackendHealth();

    const interval = setInterval(checkBackendHealth, 45000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkBackendHealth]);

  // Click outside to close user menu
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSelectScreen) {
      onSelectScreen(DEFAULT_SCREENS[currentModule] || 'overview');
    } else {
      onSelectModule(currentModule);
    }
  };

  const userInitials = user?.fullName
    ? user.fullName.trim().split(/\s+/).slice(-1)[0]?.charAt(0)?.toUpperCase() || 'U'
    : 'U';

  const roleText = (user?.role && ROLE_LABELS[user.role]) || user?.role || 'Người dùng';

  return (
    <header className="app-header">
      {/* Brand logo */}
      <a
        className="app-brand"
        href="#"
        onClick={handleBrandClick}
        aria-label="HydroRescue — Về màn hình chính"
        title="Trang chủ HydroRescue"
      >
        <span className="brand-mark">
          <img src={logoImg} alt="HydroRescue" style={{ width: 28, height: 28, borderRadius: 6 }} />
        </span>
        <span>
          Hydro<span className="text-primary">Rescue</span>
          <small>CỨU HỘ XE MÁY</small>
        </span>
      </a>

      {/* Module Navigation */}
      <nav className="module-nav" aria-label="Khu vực quản lý">
        {user &&
          roleModules[user.role]?.map((mod) => (
            <button
              key={mod}
              type="button"
              aria-current={currentModule === mod ? 'page' : undefined}
              onClick={() => onSelectModule(mod)}
            >
              {MODULE_LABELS[mod] || mod}
            </button>
          ))}
      </nav>

      {/* Global Search Input */}
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

      {/* Header Utilities */}
      <div className="header-utilities">
        {DEMO_MODE && (
          <span className="demo-label" title="Dữ liệu mẫu phục vụ kiểm thử; kết nối backend theo môi trường">
            Bản demo
          </span>
        )}

        {/* Dynamic connection indicator */}
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

        {/* Alerts / Notifications button */}
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

        {/* Profile menu */}
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
