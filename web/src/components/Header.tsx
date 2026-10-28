import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Waves } from 'lucide-react';
import { ModuleType, ScreenId } from '../types';
import { User } from '../types/auth';
import { roleModules } from '../permissions';
import { DEMO_MODE } from '../context/AuthContext';
interface HeaderProps {
 currentModule: ModuleType; currentScreen: ScreenId; onSelectModule: (mod: ModuleType) => void;
 onSelectScreen: (screen: ScreenId) => void; searchQuery: string; onSearchChange: (q: string) => void;
 unreadAlertsCount: number; onOpenAlerts: () => void; user?: User | null; onLogout?: () => void;
}
const labels: Record<ModuleType, string> = { admin: 'Tài chính', staff: 'Điều phối', owner: 'Gara' };
export const Header: React.FC<HeaderProps> = ({ currentModule, onSelectModule, unreadAlertsCount, onOpenAlerts, user, onLogout }) => {
 const [open, setOpen] = useState(false);
 const menu = useRef<HTMLDivElement>(null);
 useEffect(() => {
  const close = (event: MouseEvent) => { if (!menu.current?.contains(event.target as Node)) setOpen(false); };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
  document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
  return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
 }, []);
 return <header className="app-header">
  <a className="app-brand" href="#" onClick={e => { e.preventDefault(); onSelectModule(currentModule); }} aria-label="RescueOps — Trang chủ"><span className="brand-mark"><Waves size={23} /></span><span>rescue<span className="text-primary">ops</span><small>CỨU HỘ XE MÁY</small></span></a>
  <nav className="module-nav" aria-label="Khu vực quản lý">{user && roleModules[user.role].map(mod => <button key={mod} aria-current={currentModule === mod ? 'page' : undefined} onClick={() => onSelectModule(mod)}>{labels[mod]}</button>)}</nav>
  <div className="header-utilities">
   {DEMO_MODE && <span className="demo-label" title="Dữ liệu mẫu; thao tác nghiệp vụ chưa kết nối backend">Bản demo</span>}
   <span className="system-status"><i />Trực tuyến</span>
   <button className="icon-button notification-button" aria-label={'Thông báo: ' + unreadAlertsCount + ' chưa đọc'} onClick={onOpenAlerts}><Bell size={19} />{unreadAlertsCount > 0 && <span>{unreadAlertsCount}</span>}</button>
   <div className="profile-menu" ref={menu}><button className="profile-trigger" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen(!open)}><span className="avatar">{user?.fullName?.split(' ').slice(-1)[0]?.charAt(0) || 'U'}</span><span className="profile-name">{user?.fullName}</span><ChevronDown size={14} /></button>
    {open && <div id="account-menu" className="account-dropdown"><strong>{user?.fullName}</strong><p>{user?.email}</p><p>{labels[currentModule]}</p><button onClick={() => { setOpen(false); onLogout?.(); }}><LogOut size={16} />Đăng xuất</button></div>}
   </div>
  </div>
 </header>;
};
