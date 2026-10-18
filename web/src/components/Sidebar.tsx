import React from 'react';
import { ModuleType, ScreenId } from '../types';
import { LayoutDashboard, Percent, ArrowLeftRight, Wallet, Undo2, ChartNoAxesCombined, Radio, BadgeCheck, Map, Scale, Activity, Store, Wrench, LifeBuoy } from 'lucide-react';
const navigation = {
 admin: [
 { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
 { id: 'commission-settings', label: 'Phí & chiết khấu', icon: Percent },
 { id: 'payos-reconciliation', label: 'Đối soát', icon: ArrowLeftRight },
 { id: 'payouts', label: 'Rút tiền', icon: Wallet },
 { id: 'refunds', label: 'Hoàn tiền', icon: Undo2 },
 { id: 'reports', label: 'Báo cáo', icon: ChartNoAxesCombined }],
 staff: [
 { id: 'dashboard', label: 'Điều phối cứu hộ', icon: Radio },
 { id: 'verification', label: 'Duyệt gara', icon: BadgeCheck },
 { id: 'moderation', label: 'Bản đồ ngập', icon: Map },
 { id: 'disputes', label: 'Tranh chấp', icon: Scale },
 { id: 'monitoring', label: 'Chất lượng dịch vụ', icon: Activity }],
 owner: [
 { id: 'owner-dashboard', label: 'Quản lý gara', icon: Store },
 { id: 'services', label: 'Dịch vụ & bảng giá', icon: Wrench }]
};
export const Sidebar: React.FC<{ currentScreen: ScreenId; onSelectScreen: (screen: ScreenId) => void; allowedModule: ModuleType }> = ({ currentScreen, onSelectScreen, allowedModule }) => <aside className="app-sidebar">
 <div><div className="nav-caption">{allowedModule === 'admin' ? 'QUẢN LÝ TÀI CHÍNH' : allowedModule === 'staff' ? 'VẬN HÀNH' : 'ĐỐI TÁC GARA'}</div>
 <nav aria-label="Điều hướng chính">{navigation[allowedModule].map(({ id, label, icon: Icon }) => <button key={id} title={label} aria-current={currentScreen === id ? 'page' : undefined} onClick={() => onSelectScreen(id as ScreenId)}><Icon size={19} /><span>{label}</span></button>)}</nav></div>
 <div className="sidebar-footer"><LifeBuoy size={18} /><span>RescueOps<small>Nền tảng quản lý cứu hộ</small></span></div>
</aside>;
