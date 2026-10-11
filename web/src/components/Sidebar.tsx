import React from 'react';
import { ModuleType, ScreenId } from '../types';

interface SidebarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  allowedModule: ModuleType;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onSelectScreen, allowedModule }) => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex flex-col justify-between overflow-y-auto border-r border-surface-container">
      <div className="py-space-md">
        {allowedModule === 'admin' && <>
        {/* GROUP 1: ADMIN TÀI CHÍNH */}
        <div className="px-space-md pb-space-xs font-label-sm text-label-sm uppercase text-secondary font-bold tracking-wider">
          NHÓM ADMIN TÀI CHÍNH
        </div>
        <nav className="flex flex-col px-space-xs mb-space-md space-y-0.5">
          <button
            onClick={() => onSelectScreen('overview')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'overview'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Dòng tiền & GMV</span>
          </button>

          <button
            onClick={() => onSelectScreen('commission-settings')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'commission-settings'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">percent</span>
            <span>Phí & Chiết khấu</span>
          </button>

          <button
            onClick={() => onSelectScreen('payos-reconciliation')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'payos-reconciliation'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            <span>Đối soát PayOS</span>
          </button>

          <button
            onClick={() => onSelectScreen('payouts')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'payouts'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Duyệt Rút tiền Gara</span>
          </button>

          <button
            onClick={() => onSelectScreen('refunds')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'refunds'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment_return</span>
            <span>Xử lý Hoàn tiền</span>
          </button>

          <button
            onClick={() => onSelectScreen('reports')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'reports'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            <span>Báo cáo Tài chính</span>
          </button>
        </nav>

        </>}
        {allowedModule === 'staff' && <>
        {/* GROUP 2: STAFF VẬN HÀNH */}
        <div className="px-space-md pt-space-xs pb-space-xs font-label-sm text-label-sm uppercase text-secondary font-bold tracking-wider">
          NHÓM STAFF VẬN HÀNH
        </div>
        <nav className="flex flex-col px-space-xs mb-space-md space-y-0.5">
          <button
            onClick={() => onSelectScreen('dashboard')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'dashboard'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">speed</span>
            <span>Trung tâm Giám sát</span>
          </button>

          <button
            onClick={() => onSelectScreen('verification')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'verification'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Duyệt Hồ sơ Gara</span>
          </button>

          <button
            onClick={() => onSelectScreen('moderation')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'moderation'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">flood</span>
            <span>Điểm ngập & GIS Map</span>
          </button>

          <button
            onClick={() => onSelectScreen('disputes')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'disputes'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            <span>Xử lý Tranh chấp</span>
          </button>

          <button
            onClick={() => onSelectScreen('monitoring')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'monitoring'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">browse_activity</span>
            <span>Giám sát SLA Gara</span>
          </button>
        </nav>

        </>}
        {allowedModule === 'owner' && <>
        {/* GROUP 3: CHỦ GARA */}
        <div className="px-space-md pt-space-xs pb-space-xs font-label-sm text-label-sm uppercase text-secondary font-bold tracking-wider">
          NHÓM CHỦ GARA
        </div>
        <nav className="flex flex-col px-space-xs space-y-0.5">
          <button
            onClick={() => onSelectScreen('owner-dashboard')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'owner-dashboard'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">store</span>
            <span>Chi nhánh & Kỹ thuật viên</span>
          </button>

          <button
            onClick={() => onSelectScreen('services')}
            className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded font-body-md text-body-md transition-colors text-left ${
              currentScreen === 'services'
                ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">build_circle</span>
            <span>Bảng giá & Dịch vụ</span>
          </button>
        </nav>
        </>}
      </div>

      {/* Sidebar Footer */}
      <div className="p-space-md bg-surface-container-low border-t border-surface-container">
        <div className="flex items-center justify-between font-label-sm text-label-sm text-secondary">
          <span className="font-data-mono text-data-mono">v2.8.4-PROD</span>
          <span className="font-label-sm text-label-sm text-tertiary font-semibold">DISPATCH ENGINE</span>
        </div>
      </div>
    </aside>
  );
};
