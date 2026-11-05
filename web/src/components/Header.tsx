// ============================================================================
// COMPONENT THANH ĐIỀU HƯỚNG TRÊN CÙNG (APPLICATION HEADER)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích: Hiển thị thương hiệu ứng dụng RescueOps, thanh chuyển đổi phân hệ (nếu tài khoản
// có nhiều hơn 1 phân hệ), trạng thái kết nối thời gian thực, chuông thông báo khẩn cấp từ DB,
// và menu thông tin hồ sơ người dùng / đăng xuất.
// Cơ chế bảo mật (Yêu cầu #1):
// - Khi đăng nhập bằng tài khoản ADMIN, getAccessibleModules('ADMIN') chỉ trả về ['admin']
//   (độ dài mảng là 1, không lớn hơn 1), đồng thời có thêm chốt chặn tường minh (explicit guard)
//   loại bỏ hoàn toàn nút chuyển sang trang Staff ('staff') khỏi Header.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Waves } from 'lucide-react';
import { ModuleType, ScreenId } from '../types';
import { User } from '../types/auth';
import { getAccessibleModules } from '../permissions';
import { DEMO_MODE } from '../context/AuthContext';

/**
 * Giao diện Props truyền từ MainDashboard (App.tsx) xuống Header component.
 */
interface HeaderProps {
  // Phân hệ đang hoạt động hiện tại ('admin' | 'staff' | 'owner')
  currentModule: ModuleType;
  // Màn hình chi tiết đang mở hiện tại
  currentScreen: ScreenId;
  // Callback xử lý khi người dùng chuyển đổi phân hệ (chỉ hoạt động nếu có quyền)
  onSelectModule: (mod: ModuleType) => void;
  // Callback xử lý khi người dùng chọn một màn hình cụ thể
  onSelectScreen: (screen: ScreenId) => void;
  // Từ khóa tìm kiếm toàn cục
  searchQuery: string;
  // Hàm cập nhật từ khóa tìm kiếm toàn cục
  onSearchChange: (q: string) => void;
  // Số lượng thông báo / cảnh báo chưa đọc (được tính động từ dữ liệu Database đối với Admin)
  unreadAlertsCount: number;
  // Callback mở hộp thoại (Modal) danh sách thông báo khẩn
  onOpenAlerts: () => void;
  // Đối tượng thông tin người dùng đang đăng nhập hiện tại
  user?: User | null;
  // Callback thực hiện đăng xuất và xóa phiên JWT
  onLogout?: () => void;
}

/**
 * Nhãn hiển thị tiếng Việt cho từng phân hệ trên giao diện.
 */
const labels: Record<ModuleType, string> = {
  admin: 'Quản trị & Tài chính',
  staff: 'Vận hành & CSKH',
  owner: 'Đối tác Gara'
};

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onSelectModule,
  unreadAlertsCount,
  onOpenAlerts,
  user,
  onLogout
}) => {
  // State quản lý trạng thái đóng/mở của menu thả xuống (dropdown) thông tin tài khoản
  const [open, setOpen] = useState(false);
  // Tham chiếu DOM (ref) tới vùng chứa menu tài khoản để phát hiện sự kiện click ra ngoài
  const menu = useRef<HTMLDivElement>(null);

  // Lấy danh sách các phân hệ mà vai trò của người dùng hiện tại được phép truy cập
  const userRole = user?.role;
  const accessibleModules = getAccessibleModules(userRole).filter((mod) => {
    // Chốt chặn tường minh (Explicit Guard): Nếu người dùng là ADMIN thì không bao giờ hiển thị nút 'staff'
    if (userRole === 'ADMIN' && mod === 'staff') {
      return false;
    }
    return true;
  });

  /**
   * Hook useEffect đăng ký sự kiện lắng nghe thao tác chuột (mousedown) và bàn phím (keydown)
   * trên toàn bộ tài liệu (document) để tự động đóng menu tài khoản khi người dùng click ra ngoài
   * hoặc nhấn phím Escape.
   */
  useEffect(() => {
    // Hàm đóng menu nếu vị trí click chuột không nằm bên trong phần tử ref `menu`
    const close = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    // Hàm đóng menu khi người dùng nhấn phím Escape trên bàn phím
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    // Gắn listener vào document khi component được mount
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    // Dọn dẹp (cleanup) listener khi component bị unmount để tránh rò rỉ bộ nhớ (memory leak)
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  // Trích xuất chữ cái đầu của tên người dùng để hiển thị làm Avatar mặc định
  const avatarInitial = user?.fullName?.trim()?.split(/\s+/).slice(-1)[0]?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="app-header">
      {/* Khu vực Logo & Tên thương hiệu ứng dụng RescueOps */}
      <a
        className="app-brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          // Khi nhấn vào logo, đưa người dùng về màn hình mặc định của phân hệ hiện tại
          onSelectModule(currentModule);
        }}
        aria-label="RescueOps — Trang chủ"
      >
        <span className="brand-mark">
          <Waves size={23} />
        </span>
        <span>
          rescue<span className="text-primary">ops</span>
          <small>CỨU HỘ XE MÁY</small>
        </span>
      </a>

      {/*
        Thanh chuyển đổi phân hệ (Module Switcher):
        - Chỉ hiển thị các nút chuyển phân hệ khi tài khoản có quyền truy cập nhiều hơn 1 phân hệ (accessibleModules.length > 1).
        - Đối với ADMIN, accessibleModules chỉ có ['admin'] (length === 1) và có thêm điều kiện chặn userRole !== 'ADMIN' cho nút 'staff',
          do đó Admin sẽ hoàn toàn không thấy và không thể bấm sang trang Staff.
      */}
      <nav className="module-nav" aria-label="Khu vực quản lý">
        {accessibleModules.length > 1 ? (
          accessibleModules.map((mod) => {
            // Chốt chặn bổ sung: Tuyệt đối không render nút Staff nếu vai trò là ADMIN
            if (userRole === 'ADMIN' && mod === 'staff') {
              return null;
            }
            return (
              <button
                key={mod}
                aria-current={currentModule === mod ? 'page' : undefined}
                onClick={() => onSelectModule(mod)}
              >
                {labels[mod]}
              </button>
            );
          })
        ) : (
          // Khi người dùng chỉ có 1 phân hệ duy nhất (ví dụ ADMIN chỉ ở 'admin'), hiển thị huy hiệu tên phân hệ tĩnh
          <span className="px-3 py-1 rounded bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold">
            {labels[currentModule]}
          </span>
        )}
      </nav>

      {/* Khu vực tiện ích bên phải Header: Nhãn chế độ, Trạng thái hệ thống, Chuông thông báo, Hồ sơ cá nhân */}
      <div className="header-utilities">
        {/* Chỉ hiển thị nhãn Bản demo nếu cờ DEMO_MODE đang bật */}
        {DEMO_MODE && (
          <span className="demo-label" title="Dữ liệu mẫu; thao tác nghiệp vụ chưa kết nối backend">
            Bản demo
          </span>
        )}

        {/* Chỉ báo trạng thái kết nối trực tuyến với máy chủ Backend */}
        <span className="system-status">
          <i />
          Trực tuyến
        </span>

        {/* Nút chuông thông báo khẩn cấp kèm số lượng cảnh báo chưa đọc lấy từ Database */}
        <button
          className="icon-button notification-button"
          aria-label={'Thông báo: ' + unreadAlertsCount + ' chưa đọc'}
          onClick={onOpenAlerts}
        >
          <Bell size={19} />
          {unreadAlertsCount > 0 && <span>{unreadAlertsCount}</span>}
        </button>

        {/* Menu thông tin tài khoản người dùng đang đăng nhập và nút Đăng xuất */}
        <div className="profile-menu" ref={menu}>
          <button
            className="profile-trigger"
            aria-expanded={open}
            aria-controls="account-menu"
            onClick={() => setOpen(!open)}
          >
            <span className="avatar">{avatarInitial}</span>
            <span className="profile-name">{user?.fullName}</span>
            <ChevronDown size={14} />
          </button>

          {/* Dropdown chi tiết tài khoản khi state `open` === true */}
          {open && (
            <div id="account-menu" className="account-dropdown">
              <strong>{user?.fullName}</strong>
              <p>{user?.email}</p>
              <p>{labels[currentModule]}</p>
              <button
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
