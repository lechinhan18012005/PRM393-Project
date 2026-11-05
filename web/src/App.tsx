// ============================================================================
// TỆP ĐIỀU HƯỚNG TRUNG TÂM & QUẢN LÝ BỐ CỤC ỨNG DỤNG WEB PORTAL (APP.TSX)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích:
// 1. Thiết lập hệ thống định tuyến (React Router v6) cho toàn bộ 3 phân hệ:
//    - Phân hệ A (Admin): Quản lý tài khoản Staff, Tổng quan GMV, Phí & Chiết khấu Gara,
//      Đối soát PayOS, Duyệt rút tiền Gara, Hoàn tiền khiếu nại, Báo cáo tài chính P&L.
//    - Phân hệ B (Staff): Điều phối cứu hộ trực tuyến, Duyệt Gara eKYC, Bản đồ ngập GIS,
//      Xử lý tranh chấp (UC-23), Giám sát chất lượng dịch vụ SLA/CSAT (UC-19), Chuyến gom xe.
//    - Phân hệ C (Garage Owner): Quản lý Gara, Chi nhánh & Đội thợ, Doanh thu & Ví, Dịch vụ.
// 2. Thực thi kiểm soát phân quyền nghiêm ngặt (RBAC):
//    - Tài khoản ADMIN chỉ được phép truy cập phân hệ 'admin' (`/admin/*`), tuyệt đối không
//      truy cập sang phân hệ 'staff'.
// 3. Loại bỏ hoàn toàn dữ liệu giả lập (mockData) khỏi các màn hình Admin; đồng thời tải động
//    số lượng yêu cầu rút tiền chờ duyệt và khiếu nại chờ xử lý từ Database qua `financeApi`
//    để hiển thị trên chuông thông báo Header.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ModuleType, ScreenId } from './types';
import { Role } from './types/auth';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, DEMO_MODE, useAuth } from './context/AuthContext';
import {
  canAccessModule,
  canAccessScreen,
  ROLE_DEFAULT_ROUTE,
  roleModules,
  screenModule
} from './permissions';
import { financeApi } from './services/financeApi';
import { GarageAccessGate } from './components/views/GarageAccessGate';
import { GarageManagementView } from './components/views/GarageManagementView';
import { StaffAccountsView } from './components/views/StaffAccountsView';
import { InvitationActivationView } from './components/views/InvitationActivationView';
import { GarageOperationsView } from './components/views/GarageOperationsView';
import { LoginView } from './components/views/LoginView';
import { RegisterView } from './components/views/RegisterView';

// Nhập các màn hình thuộc Phân hệ A (Quản trị viên & Tài chính - Module A Views)
import { OverviewGMVView } from './components/views/OverviewGMVView';
import { CommissionSettingsView } from './components/views/CommissionSettingsView';
import { PayOSReconciliationView } from './components/views/PayOSReconciliationView';
import { PayoutsView } from './components/views/PayoutsView';
import { RefundsView } from './components/views/RefundsView';
import { FinancialReportsView } from './components/views/FinancialReportsView';

// Nhập các màn hình thuộc Phân hệ B (Nhân viên Vận hành & CSKH - Module B Views)
import { LiveDispatchDashboardView } from './components/views/LiveDispatchDashboardView';
import GarageVerificationView from './components/views/GarageVerificationView';
import { GISFloodMapView } from './components/views/GISFloodMapView';
import { DisputeFraudView } from './components/views/DisputeFraudView';
import { SLAMonitoringView } from './components/views/SLAMonitoringView';
import { BatchTripMonitoringView } from './components/views/BatchTripMonitoringView';

// Nhập các màn hình thuộc Phân hệ C (Chủ Gara đối tác - Module C Views)
import { GarageOwnerDashboardView } from './components/views/GarageOwnerDashboardView';
import { GarageServicesPricingView } from './components/views/GarageServicesPricingView';

// Chỉ giữ lại dữ liệu mẫu cho các màn hình thuộc phân hệ Staff (Duyệt Gara & Bản đồ ngập) của thành viên khác
import {
  INITIAL_GARAGE_APPLICANTS,
  INITIAL_FLOOD_POINTS
} from './data/mockData';

/**
 * Giao diện mô tả một thông báo nổi (Toast Notification) hiển thị ở góc dưới bên phải màn hình.
 */
interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Giao diện mô tả một mục cảnh báo hiển thị trong hộp thoại Chuông thông báo trên Header.
 */
interface UrgentAlertItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  targetScreen?: ScreenId;
}

/**
 * Hàm xác định đường dẫn mặc định (Default Path) dựa trên vai trò (Role) của người dùng.
 * Tuân thủ cấu hình ROLE_DEFAULT_ROUTE trong permissions.ts:
 * - ADMIN -> '/admin/overview'
 * - STAFF -> '/staff/dashboard'
 * - GARAGE_OWNER -> '/owner/owner-dashboard'
 */
const getDefaultPath = (role: Role): string => {
  return ROLE_DEFAULT_ROUTE[role] || '/login';
};

/**
 * Component chính điều phối bố cục (Header + Sidebar + Main Router) sau khi xác thực người dùng.
 */
function MainDashboard() {
  // Truy xuất thông tin người dùng, trạng thái đăng nhập và hàm đăng xuất từ AuthContext
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  // Hook lấy thông tin đường dẫn URL hiện tại
  const location = useLocation();
  // Hook điều hướng trang bằng code (Programmatic Navigation)
  const navigate = useNavigate();

  // State lưu từ khóa tìm kiếm trên Header
  const [searchQuery, setSearchQuery] = useState('');
  // State lưu danh sách các thông báo Toast đang hiển thị
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // State đóng/mở hộp thoại (Modal) danh sách cảnh báo khi nhấn vào biểu tượng Chuông
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // State lưu trữ dữ liệu động từ Database để tính toán cảnh báo thực tế cho Admin (Yêu cầu #1)
  const [adminPendingPayoutsCount, setAdminPendingPayoutsCount] = useState<number>(0);
  const [adminPendingPayoutsAmount, setAdminPendingPayoutsAmount] = useState<number>(0);
  const [adminEscalatedDisputesCount, setAdminEscalatedDisputesCount] = useState<number>(0);

  // Dữ liệu cho các màn hình duyệt hồ sơ Gara và điểm ngập của phân hệ Staff
  const [applicants] = useState(INITIAL_GARAGE_APPLICANTS);
  const [floodPoints] = useState(INITIAL_FLOOD_POINTS);

  /**
   * Hàm hiển thị thông báo nổi (Toast) tự động biến mất sau 4.5 giây.
   */
  const showToast = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'success'
  ) => {
    if (DEMO_MODE) {
      message = `Bản demo: ${message} Dữ liệu chưa được lưu hoặc gửi tới hệ thống thật.`;
      type = 'info';
    }
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  /**
   * Hook useEffect tự động tải số lượng yêu cầu rút tiền đang chờ duyệt (`getPayouts`)
   * và số lượng hồ sơ khiếu nại chờ phán quyết hoàn tiền (`getRefunds`) từ Database
   * khi người dùng đăng nhập có vai trò là ADMIN (Yêu cầu #1).
   */
  useEffect(() => {
    // Chỉ gọi API thống kê cảnh báo tài chính khi đã đăng nhập với quyền ADMIN
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      return;
    }

    let isMounted = true;

    const fetchAdminAlertsFromDb = async () => {
      try {
        // Gọi song song 2 API lấy danh sách rút tiền và danh sách hoàn tiền/khiếu nại từ Database
        const [payoutsData, refundsData] = await Promise.all([
          financeApi.getPayouts(),
          financeApi.getRefunds()
        ]);

        if (!isMounted) return;

        // Lọc các yêu cầu rút tiền đang ở trạng thái chờ Admin phê duyệt (PENDING hoặc PROCESSING)
        const pendingPayouts = (payoutsData || []).filter(
          (p) => p.status === 'PENDING' || p.status === 'PROCESSING'
        );
        // Tính tổng số tiền các Gara đang yêu cầu rút chờ duyệt
        const totalPendingAmount = pendingPayouts.reduce(
          (sum, p) => sum + Number(p.amount ?? p.requestedAmount ?? 0),
          0
        );

        // Lọc các hồ sơ khiếu nại đang chờ xử lý / chờ Admin ra phán quyết hoàn tiền
        const pendingDisputes = (refundsData || []).filter(
          (d) =>
            d.status === 'ESCALATED_TO_ADMIN' ||
            d.status === 'ADMIN_APPROVAL' ||
            d.status === 'OPEN' ||
            d.status === 'UNDER_REVIEW' ||
            d.status === 'STAFF_REVIEW'
        );

        // Cập nhật vào React state để hiển thị số đếm thực tế trên chuông thông báo Header
        setAdminPendingPayoutsCount(pendingPayouts.length);
        setAdminPendingPayoutsAmount(totalPendingAmount);
        setAdminEscalatedDisputesCount(pendingDisputes.length);
      } catch {
        // Nếu kết nối mạng tạm thời gián đoạn, giữ nguyên giá trị 0 thay vì dùng dữ liệu giả
      }
    };

    void fetchAdminAlertsFromDb();
    // Làm mới tự động mỗi 30 giây hoặc khi Admin chuyển màn hình
    const timer = setInterval(fetchAdminAlertsFromDb, 30000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isAuthenticated, user?.role, location.pathname]);

  /**
   * Phân tích đường dẫn URL hiện tại (`location.pathname`) để suy ra `currentModule` và `currentScreen`.
   */
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const urlModule = pathSegments[0] as ModuleType | undefined;
  const urlScreen = pathSegments[1] as ScreenId | undefined;

  // Xác định màn hình hiện tại (currentScreen) dựa trên URL và vai trò của người dùng
  let currentScreen: ScreenId = 'overview';
  if (urlScreen && urlScreen in screenModule) {
    currentScreen = urlScreen;
  } else if (urlModule && (urlModule as unknown as ScreenId) in screenModule) {
    currentScreen = urlModule as unknown as ScreenId;
  } else if (user?.role === 'STAFF') {
    currentScreen = 'dashboard';
  } else if (user?.role === 'GARAGE_OWNER') {
    currentScreen = 'owner-dashboard';
  }

  // Xác định phân hệ hiện tại (currentModule) từ màn hình hoặc URL
  const currentModule: ModuleType =
    screenModule[currentScreen] ||
    urlModule ||
    (user?.role === 'STAFF' ? 'staff' : user?.role === 'GARAGE_OWNER' ? 'owner' : 'admin');

  /**
   * Hàm xử lý khi người dùng chọn một phân hệ trên Header.
   * Có kiểm tra phân quyền `canAccessModule`: ADMIN không thể chuyển sang 'staff'.
   */
  const handleSelectModule = (mod: ModuleType) => {
    if (!user || !canAccessModule(user.role, mod)) return;
    if (mod === 'admin') {
      navigate('/admin/overview');
    } else if (mod === 'staff') {
      navigate('/staff/dashboard');
    } else if (mod === 'owner') {
      navigate('/owner/owner-dashboard');
    }
  };

  /**
   * Hàm xử lý khi người dùng chọn một màn hình trên thanh Sidebar hoặc từ các nút điều hướng.
   */
  const handleSelectScreen = (screen: ScreenId) => {
    if (!user || !canAccessScreen(user.role, screen)) return;
    const targetModule = screenModule[screen];
    navigate(`/${targetModule}/${screen}`);
  };

  /**
   * Xây dựng danh sách thông báo khẩn cấp hiển thị trong Modal Chuông thông báo:
   * - Nếu người dùng là ADMIN: Tạo danh sách cảnh báo động 100% từ dữ liệu thực trong Database
   *   (số lệnh rút tiền chờ duyệt và số hồ sơ khiếu nại chờ phán quyết hoàn tiền).
   */
  const urgentAlerts = useMemo<UrgentAlertItem[]>(() => {
    if (user?.role === 'ADMIN') {
      const dynamicAlerts: UrgentAlertItem[] = [];
      if (adminPendingPayoutsCount > 0) {
        dynamicAlerts.push({
          id: 'ADMIN-ALERT-PAYOUT',
          title: `${adminPendingPayoutsCount} yêu cầu rút tiền Gara đang chờ duyệt`,
          desc: `Tổng số tiền đề nghị giải ngân: ${adminPendingPayoutsAmount.toLocaleString('vi-VN')} ₫. Nhấn để chuyển tới màn hình Rút tiền.`,
          time: 'Dữ liệu thời gian thực từ Database',
          level: 'WARNING',
          targetScreen: 'payouts'
        });
      }
      if (adminEscalatedDisputesCount > 0) {
        dynamicAlerts.push({
          id: 'ADMIN-ALERT-REFUND',
          title: `${adminEscalatedDisputesCount} hồ sơ khiếu nại chờ quyết định hoàn tiền`,
          desc: 'Cần Admin thẩm định biên bản của Staff và phê duyệt hoàn tiền cho khách hàng.',
          time: 'Dữ liệu thời gian thực từ Database',
          level: 'CRITICAL',
          targetScreen: 'refunds'
        });
      }
      return dynamicAlerts;
    }

    // Đối với các vai trò khác (Staff / Owner)
    return [];
  }, [user?.role, adminPendingPayoutsCount, adminPendingPayoutsAmount, adminEscalatedDisputesCount]);

  // Tổng số thông báo chưa đọc hiển thị trên huy hiệu quả chuông Header
  const unreadAlertsCount =
    user?.role === 'ADMIN'
      ? adminPendingPayoutsCount + adminEscalatedDisputesCount
      : urgentAlerts.length;

  // Hiển thị màn hình chờ trong lúc kiểm tra JWT Token từ LocalStorage
  if (isLoading) {
    return (
      <div className="min-h-screen p-8 bg-slate-950 text-white">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  // Nếu người dùng chưa đăng nhập, chỉ cho phép truy cập các route xác thực (/login, /register, /activate)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginView
              onSwitchToRegister={() => navigate('/register')}
              onActivate={() => navigate('/activate')}
            />
          }
        />
        <Route
          path="/register"
          element={<RegisterView onSwitchToLogin={() => navigate('/login')} />}
        />
        <Route
          path="/activate"
          element={<InvitationActivationView onBack={() => navigate('/login')} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Kiểm tra quyền truy cập Web Portal: Chặn các tài khoản chỉ dành cho Mobile (CUSTOMER, FIELD_MECHANIC)
  if (!user || !roleModules[user.role] || roleModules[user.role].length === 0) {
    return (
      <div className="min-h-screen p-8 bg-slate-950 text-white">
        Tài khoản này chưa có quyền truy cập web portal. Vui lòng dùng ứng dụng mobile hoặc liên hệ quản trị viên.{' '}
        <button className="underline ml-2" onClick={logout}>
          Đăng xuất
        </button>
      </div>
    );
  }

  // Nếu người dùng đã đăng nhập mà truy cập lại trang /login, /register, /activate thì điều hướng về trang mặc định của vai trò đó
  if (['/login', '/register', '/activate'].includes(location.pathname)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  // Chốt chặn bảo mật đường dẫn: Nếu người dùng cố tình gõ URL của phân hệ không được phép (VD: Admin gõ /staff/dashboard)
  // thì lập tức chuyển hướng về đường dẫn mặc định của vai trò đó (/admin/overview)
  if (!canAccessModule(user.role, currentModule)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  // Giao diện chính của bảng điều khiển (Header + Sidebar + Nội dung màn hình)
  const dashboard = (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Thanh Header trên cùng của ứng dụng */}
      <Header
        currentModule={currentModule}
        currentScreen={currentScreen}
        onSelectModule={handleSelectModule}
        onSelectScreen={handleSelectScreen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadAlertsCount={unreadAlertsCount}
        onOpenAlerts={() => setShowAlertsModal(true)}
        user={user}
        onLogout={logout}
      />

      {/* Khung bố cục 2 cột: Sidebar bên trái + Nội dung chính bên phải */}
      <div className="app-layout">
        {/* Thanh điều hướng cố định bên trái (Sidebar) chỉ hiển thị menu của phân hệ được phép */}
        <Sidebar
          currentScreen={currentScreen}
          onSelectScreen={handleSelectScreen}
          allowedModule={currentModule}
        />

        {/* Vùng hiển thị nội dung màn hình chính theo Route */}
        <main className="app-main">
          <Routes>
            {/* ==============================================================
                PHÂN HỆ A: QUẢN TRỊ VIÊN & TÀI CHÍNH (MODULE A - ADMIN VIEWS)
                Toàn bộ dữ liệu đều lấy trực tiếp từ Database qua API, không truyền mockData
               ============================================================== */}
            {user.role === 'ADMIN' && (
              <Route path="/admin/staff-accounts" element={<StaffAccountsView />} />
            )}
            <Route
              path="/admin/overview"
              element={
                <OverviewGMVView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="/admin/commission-settings"
              element={<CommissionSettingsView onShowToast={showToast} />}
            />
            <Route
              path="/admin/payos-reconciliation"
              element={
                <PayOSReconciliationView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="/admin/payouts"
              element={<PayoutsView onShowToast={showToast} />}
            />
            <Route
              path="/admin/refunds"
              element={<RefundsView onShowToast={showToast} />}
            />
            <Route
              path="/admin/reports"
              element={
                <FinancialReportsView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />

            {/* ==============================================================
                PHÂN HỆ B: VẬN HÀNH & CHĂM SÓC KHÁCH HÀNG (MODULE B - STAFF VIEWS)
               ============================================================== */}
            <Route
              path="/staff/dashboard"
              element={
                <LiveDispatchDashboardView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="/staff/verification"
              element={
                <GarageVerificationView
                  applicants={applicants}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="/staff/moderation"
              element={
                <GISFloodMapView
                  floodPoints={floodPoints}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="/staff/disputes"
              element={
                <DisputeFraudView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="/staff/monitoring"
              element={
                <SLAMonitoringView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            <Route path="/staff/batch-trips" element={<BatchTripMonitoringView />} />

            {/* ==============================================================
                PHÂN HỆ C: ĐỐI TÁC GARA CỨU HỘ (MODULE C - GARAGE OWNER VIEWS)
               ============================================================== */}
            <Route
              path="/owner/owner-dashboard"
              element={
                <GarageOwnerDashboardView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            {user.role === 'GARAGE_OWNER' && (
              <Route
                path="/owner/garage-team"
                element={<GarageManagementView onShowToast={showToast} />}
              />
            )}
            <Route
              path="/owner/garage-finance"
              element={<GarageOperationsView mode="finance" />}
            />
            <Route
              path="/owner/garage-transport"
              element={<GarageOperationsView mode="transport" />}
            />
            <Route
              path="/owner/services"
              element={
                <GarageServicesPricingView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />

            {/* Điều hướng mặc định khi chỉ gõ tên phân hệ trên URL */}
            <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/owner" element={<Navigate to="/owner/owner-dashboard" replace />} />

            {/* Ánh xạ các đường dẫn tắt (/overview -> /admin/overview, v.v.) */}
            {Object.entries(screenModule).map(([screen, mod]) => (
              <Route
                key={screen}
                path={`/${screen}`}
                element={<Navigate to={`/${mod}/${screen}`} replace />}
              />
            ))}

            {/* Điều hướng mặc định cho đường dẫn gốc '/' và các đường dẫn không khớp '*' */}
            <Route path="/" element={<Navigate to={getDefaultPath(user.role)} replace />} />
            <Route path="*" element={<Navigate to={getDefaultPath(user.role)} replace />} />
          </Routes>
        </main>
      </div>

      {/* Hộp thoại (Modal) hiển thị danh sách thông báo khẩn cấp lấy từ Database */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-space-lg border-b border-surface-container bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">notifications_active</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Thông Báo Hệ Thống ({unreadAlertsCount})
                </h3>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-lg space-y-space-md max-h-[70vh] overflow-y-auto divide-y divide-surface-container">
              {urgentAlerts.length > 0 ? (
                urgentAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    onClick={() => {
                      if (alt.targetScreen) {
                        handleSelectScreen(alt.targetScreen);
                        setShowAlertsModal(false);
                      }
                    }}
                    className={`pt-space-md first:pt-0 space-y-1 ${
                      alt.targetScreen ? 'cursor-pointer hover: opacity-90' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-body-md text-on-surface">{alt.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-label-xs font-bold ${
                          alt.level === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : alt.level === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {alt.level}
                      </span>
                    </div>
                    <p className="text-body-sm text-secondary">{alt.desc}</p>
                    <div className="text-label-xs text-secondary font-data-mono pt-1">
                      {alt.time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-secondary text-body-sm">
                  Hiện không có yêu cầu rút tiền hay khiếu nại hoàn tiền nào đang tồn đọng.
                </div>
              )}
            </div>

            <div className="p-space-md bg-surface-container-low border-t border-surface-container flex items-center justify-end">
              <button
                onClick={() => setShowAlertsModal(false)}
                className="px-space-md py-1.5 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vùng hiển thị danh sách thông báo nổi (Floating Toast Notifications) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-space-md rounded-xl shadow-xl border flex items-start gap-space-sm transform transition-all duration-200 animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-surface-container-lowest border-emerald-500/30 text-on-surface'
                : toast.type === 'error'
                ? 'bg-surface-container-lowest border-red-500/30 text-on-surface'
                : toast.type === 'warning'
                ? 'bg-surface-container-lowest border-amber-500/30 text-on-surface'
                : 'bg-surface-container-lowest border-blue-500/30 text-on-surface'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                toast.type === 'success'
                  ? 'text-emerald-600'
                  : toast.type === 'error'
                  ? 'text-red-600'
                  : toast.type === 'warning'
                  ? 'text-amber-600'
                  : 'text-blue-600'
              }`}
            >
              {toast.type === 'success'
                ? 'check_circle'
                : toast.type === 'error'
                ? 'error'
                : toast.type === 'warning'
                ? 'warning'
                : 'info'}
            </span>
            <div className="flex-1">
              <h5 className="font-label-lg text-label-lg font-bold leading-snug">{toast.title}</h5>
              <p className="font-body-sm text-body-sm text-secondary leading-snug mt-0.5">
                {toast.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Nếu là Chủ Gara (GARAGE_OWNER), bọc qua cổng kiểm tra trạng thái phê duyệt Gara (GarageAccessGate)
  return user.role === 'GARAGE_OWNER' ? (
    <GarageAccessGate screen={currentScreen}>{dashboard}</GarageAccessGate>
  ) : (
    dashboard
  );
}

/**
 * Component gốc (Root Component) của ứng dụng React.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainDashboard />
      </AuthProvider>
    </BrowserRouter>
  );
}
