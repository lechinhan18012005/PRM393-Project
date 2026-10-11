import React, { useState } from 'react';
import { ModuleType, ScreenId } from '../types';
import { User } from '../types/auth';

interface HeaderProps {
  currentModule: ModuleType;
  currentScreen: ScreenId;
  onSelectModule: (mod: ModuleType) => void;
  onSelectScreen: (screen: ScreenId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onSelectModule,
  searchQuery,
  onSearchChange,
  unreadAlertsCount,
  onOpenAlerts,
  user,
  onLogout
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex items-center justify-between px-margin-desktop border-b border-surface-container">
      {/* Brand & Logo */}
      <div className="flex items-center gap-space-lg">
        <img
          alt="Motorbike Flood Rescue Logo"
          className="h-8 w-auto object-contain cursor-pointer"
          src="https://lh3.googleusercontent.com/aida/AEtjO1XM05rk8945tiyXah27Fl5ow2UJ1uH321U-a-BoBjzC5nhdeMuRMsT1jDi2cS_C1TNfVxh7kBHFVrx2RJGpNYytTg9Ndm-c9xeijPQgxmdHR7hLVtIkCeX18KY1qlWMNmxAPVsf8m8BZe5M15BLl7UhDtdEFlR4zQVJN6wlh1r58nz0ThhHorE6xaVo95DMCjXvM3mlTiyjHxQCl3a0ZkRBeqGyDNSl8vrWeJyEgbJcpGtwxiLjBd61GyQ"
          onClick={() => user?.role && onSelectModule(user.role === 'ADMIN' ? 'admin' : user.role === 'STAFF' ? 'staff' : 'owner')}
        />
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight uppercase font-bold">
            RESCUEOPS • CỨU HỘ NGẬP LỤT
          </span>
          <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
            {currentModule === 'owner'
              ? 'Cổng Quản Trị Hệ Thống Gara & Điều Phối'
              : 'Hệ Thống Điều Phối & Quản Trị Khẩn Cấp'}
          </span>
        </div>
        <div className="h-6 w-[1px] bg-outline-variant hidden xl:block"></div>
        <div className="hidden xl:flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container-low text-on-surface font-label-md text-label-md">
          <span className="h-2 w-2 rounded-full bg-tertiary-container animate-pulse"></span>
          <span>Hệ thống trực tuyến • 14 Điểm ngập hoạt động</span>
        </div>
      </div>

      {/* Module Segment Control */}
      <div className="hidden lg:flex items-center bg-surface-container-low p-1 rounded-lg">
        <nav className="flex items-center gap-1">
          {user?.role === 'ADMIN' && <button
            onClick={() => onSelectModule('admin')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all ${
              currentModule === 'admin'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            MODULE A: Admin Tài Chính
          </button>}
          {user?.role === 'STAFF' && <button
            onClick={() => onSelectModule('staff')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all ${
              currentModule === 'staff'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            MODULE B: Staff Vận Hành
          </button>}
          {user?.role === 'GARAGE_OWNER' && <button
            onClick={() => onSelectModule('owner')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md transition-all ${
              currentModule === 'owner'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            MODULE C: Chủ Gara
          </button>}
        </nav>
      </div>

      {/* Global Utilities */}
      <div className="flex items-center gap-space-md">
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px]">
            search
          </span>
          <input
            className="h-8 pl-8 pr-3 text-body-sm font-body-sm bg-surface-container-low rounded border-0 text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary w-56"
            placeholder="Mã đơn / PayOS / Garage..."
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Notifications Button */}
        <button
          className="relative p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          title="Thông báo khẩn"
          onClick={onOpenAlerts}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* User Profile Switcher */}
        <div className="relative">
          <div
            className="flex items-center gap-space-sm pl-space-xs cursor-pointer hover:opacity-90"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-on-primary ${
              currentModule === 'owner' ? 'bg-tertiary-container' : 'bg-primary'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {currentModule === 'owner' ? 'store' : 'person'}
              </span>
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="font-label-lg text-label-lg text-on-surface leading-tight font-semibold">
                {user?.fullName || (currentModule === 'owner' ? 'Gara Toàn Thắng (Chủ Gara)' : 'Trần Minh Trí')}
              </span>
              <span className="font-label-sm text-label-sm text-primary leading-tight font-medium">
                {user?.role ? `Vai trò: ${user.role}` : (currentModule === 'owner' ? 'Đối Tác Cứu Hộ L1' : 'Quản Trị Cấp Cao')}
              </span>
            </div>
            <span className="material-symbols-outlined text-secondary text-[16px] hidden xl:block">
              expand_more
            </span>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-lg shadow-xl border border-surface-container p-2 z-50">
              <div className="px-3 py-2 border-b border-surface-container-low mb-1">
                <span className="font-label-sm text-label-sm uppercase text-secondary block font-bold">Tài khoản & Phân quyền</span>
                <span className="font-body-sm text-body-sm text-on-surface font-semibold">{user?.fullName || 'Đang hoạt động'}</span>
                {user?.email && <span className="text-xs text-secondary block">{user.email}</span>}
              </div>
              {user?.role === 'ADMIN' && <button
                className="w-full text-left px-3 py-1.5 rounded hover:bg-surface-container-low font-body-sm text-body-sm flex items-center gap-2 text-on-surface"
                onClick={() => {
                  onSelectModule('admin');
                  setShowProfileMenu(false);
                }}
              >
                <span className="material-symbols-outlined text-primary text-[18px]">admin_panel_settings</span>
                <span>Admin Tài Chính</span>
              </button>}
              {user?.role === 'STAFF' && <button
                className="w-full text-left px-3 py-1.5 rounded hover:bg-surface-container-low font-body-sm text-body-sm flex items-center gap-2 text-on-surface"
                onClick={() => {
                  onSelectModule('staff');
                  setShowProfileMenu(false);
                }}
              >
                <span className="material-symbols-outlined text-tertiary text-[18px]">support_agent</span>
                <span>Staff Vận Hành</span>
              </button>}
              {user?.role === 'GARAGE_OWNER' && <button
                className="w-full text-left px-3 py-1.5 rounded hover:bg-surface-container-low font-body-sm text-body-sm flex items-center gap-2 text-on-surface"
                onClick={() => {
                  onSelectModule('owner');
                  setShowProfileMenu(false);
                }}
              >
                <span className="material-symbols-outlined text-tertiary-container text-[18px]">store</span>
                <span>Chủ Gara Đối Tác</span>
              </button>}

              {onLogout && (
                <button
                  className="w-full text-left px-3 py-2 mt-1 rounded hover:bg-red-50 text-red-600 font-body-sm text-body-sm flex items-center gap-2 border-t border-surface-container-low transition-colors"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                >
                  <span className="material-symbols-outlined text-red-600 text-[18px]">logout</span>
                  <span className="font-semibold">Đăng xuất (JWT)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
