import { GarageRatingsView } from './components/views/GarageRatingsView';
// ============================================================================
// TỆP ĐIỀU HƯỚNG TRUNG TÂM & QUẢN LÝ BỐ CỤC ỨNG DỤNG WEB PORTAL (APP.TSX)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích:
// 1. Thiết lập hệ thống định tuyến (React Router v6) cho toàn bộ 3 phân hệ:
//    - Phân hệ A (Admin): Quản lý tài khoản Staff, Tổng quan GMV, Phí & Chiết khấu Gara,
//      Đối soát PayOS, Duyệt rút tiền Gara, Hoàn tiền khiếu nại, Báo cáo tài chính P&L.
//    - Phân hệ B (Staff): Điều phối cứu hộ trực tuyến, Duyệt Gara eKYC, Bản đồ ngập GIS,
//      Xử lý tranh chấp, Giám sát chất lượng dịch vụ SLA/CSAT.
//    - Phân hệ C (Garage Owner): Quản lý Gara, Chi nhánh & Đội thợ, Doanh thu & Ví, Dịch vụ.
// 2. Thực thi kiểm soát phân quyền nghiêm ngặt (RBAC):
//    - Tài khoản ADMIN chỉ được phép truy cập phân hệ 'admin' (`/admin/*`), tuyệt đối không
//      truy cập sang phân hệ 'staff'.
//    - Tài khoản STAFF không được phép truy cập trang quản lý tài khoản Staff (`/admin/staff-accounts`).
// 3. Đồng bộ cảnh báo trực tiếp từ Backend API (Đơn cứu hộ khẩn cấp, Rút tiền ví Gara, Khiếu nại hoàn tiền)
//    lên chuông thông báo Header.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  ModuleType,
  ScreenId,
  PayOSTransaction,
  GarageApplicant,
  DisputeCase,
  PayoutItem
} from './types';
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
import { rescueApi } from './services/rescueApi';
import { notificationApi, NotificationItem } from './services/notificationApi';
import { connectNotificationSocket } from './services/notificationSocket';
import { GarageAccessGate } from './components/views/GarageAccessGate';
import { GarageManagementView } from './components/views/GarageManagementView';
import { GarageAttendanceView } from './components/views/GarageAttendanceView';
import { StaffAccountsView } from './components/views/StaffAccountsView';
import { InvitationActivationView } from './components/views/InvitationActivationView';
import { GarageOperationsView } from './components/views/GarageOperationsView';
import { LoginView } from './components/views/LoginView';
import { RegisterView } from './components/views/RegisterView';
import { INITIAL_DISPUTES, INITIAL_GARAGE_APPLICANTS } from './data/mockData';

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

// Nhập các màn hình thuộc Phân hệ C (Chủ Gara đối tác - Module C Views)
import { GarageOwnerDashboardView } from './components/views/GarageOwnerDashboardView';
import { GarageServicesPricingView } from './components/views/GarageServicesPricingView';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface SystemAlert {
  id: string;
  dbId?: number;
  title: string;
  desc: string;
  time: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  isRead?: boolean;
  targetScreen?: ScreenId;
  type?: string;
  targetId?: number | null;
}

const mapNotificationToAlert = (item: NotificationItem, userRole?: string): SystemAlert => {
  let targetScreen: ScreenId = 'dashboard';
  if (item.targetScreen) {
    targetScreen = item.targetScreen as ScreenId;
  } else {
    switch (item.type) {
      case 'SOS_NEW_ORDER':
      case 'DISPATCH_FAILED':
      case 'MECHANIC_DISTANCE_WARNING':
        targetScreen = 'dashboard';
        break;
      case 'ORDER_ASSIGNED':
      case 'ORDER_COMPLETED':
        targetScreen = 'owner-dashboard';
        break;
      case 'DISPUTE_NEW':
        targetScreen = userRole === 'STAFF' ? 'disputes' : 'refunds';
        break;
      case 'DISPUTE_REFUND_APPROVED':
        targetScreen = userRole === 'ADMIN' ? 'refunds' : 'garage-finance';
        break;
      case 'PAYOUT_REQUEST_NEW':
        targetScreen = 'payouts';
        break;
      case 'PAYOUT_STATUS_CHANGED':
        targetScreen = 'garage-finance';
        break;
      case 'WALLET_BALANCE_CHANGED':
        targetScreen = 'garage-finance';
        break;
      case 'KYC_SUBMITTED':
        targetScreen = 'verification';
        break;
      case 'KYC_STATUS_CHANGED':
        targetScreen = 'owner-dashboard';
        break;
      case 'PRICE_CEILING_EXCEEDED':
        targetScreen = userRole === 'STAFF' ? 'verification' : 'services';
        break;
      case 'PAYMENT_WEBHOOK_FRAUD':
        targetScreen = 'payos-reconciliation';
        break;
      default:
        targetScreen =
          userRole === 'GARAGE_OWNER'
            ? 'owner-dashboard'
            : userRole === 'STAFF'
              ? 'dashboard'
              : 'overview';
    }
  }

  const timeStr = item.createdAt
    ? new Date(item.createdAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      }) +
      ' - ' +
      new Date(item.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit'
      })
    : 'Vừa xong';

  return {
    id: `DB-${item.id}`,
    dbId: item.id,
    title: item.title,
    desc: item.message,
    time: timeStr,
    level: item.level,
    isRead: item.isRead,
    targetScreen,
    type: item.type,
    targetId: item.targetId
  };
};

const getDefaultPath = (role: Role): string => {
  return ROLE_DEFAULT_ROUTE[role] || '/login';
};

/**
 * Component chính điều phối bố cục (Header + Sidebar + Main Router) sau khi xác thực người dùng.
 */
function MainDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  // Dữ liệu cho các màn hình duyệt hồ sơ Gara của phân hệ Staff
  const [applicants] = useState(INITIAL_GARAGE_APPLICANTS);

  // Đồng bộ cảnh báo thời gian thực từ Database Notification API & WebSocket STOMP
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let isMounted = true;

    const loadLiveAlerts = async () => {
      try {
        // 1. Tải danh sách thông báo chính thức được lưu trong Database
        const dbNotifs = await notificationApi.getNotifications(false, 0, 30).catch(() => []);
        if (!isMounted) return;

        const dbAlerts: SystemAlert[] = dbNotifs.map((item) => mapNotificationToAlert(item, user.role));

        // 2. Dự phòng (Fallback): Đồng bộ thêm dữ liệu trạng thái đơn trực tiếp khi cần
        const liveFallbackAlerts: SystemAlert[] = [];

        if (user.role === 'STAFF' || user.role === 'ADMIN') {
          const orders = await rescueApi.getStaffOrders().catch(() => []);
          if (!isMounted) return;
          const pending = orders.filter(
            (o) => o.status === 'REQUESTED' || o.status === 'DISPATCH_PENDING'
          );
          if (pending.length > 0) {
            liveFallbackAlerts.push({
              id: `LIVE-ORD-${pending[0].id}`,
              title: `Có ${pending.length} đơn cứu hộ mới cần điều phối`,
              desc: `Đơn gần nhất #${pending[0].orderCode} tại ${pending[0].pickupAddress || 'chưa rõ vị trí'}.`,
              time: 'Vừa xong',
              level: 'CRITICAL',
              isRead: false,
              targetScreen: 'dashboard'
            });
          }

          // Cảnh báo tài chính cho Admin (Yêu cầu rút tiền chờ duyệt & Khiếu nại chờ hoàn tiền)
          if (user.role === 'ADMIN') {
            try {
              const [payouts, disputes] = await Promise.all([
                financeApi.getAllPayouts('PENDING').catch(() => []),
                financeApi.getAllDisputes('ADMIN_APPROVAL').catch(() => [])
              ]);
              if (!isMounted) return;
              if (payouts.length > 0) {
                liveFallbackAlerts.push({
                  id: `LIVE-PAYOUT-${payouts[0].id}`,
                  title: `Có ${payouts.length} yêu cầu rút tiền ví Gara đang chờ duyệt`,
                  desc: `Gara đề nghị giải ngân gần nhất: ${payouts[0].garageName || 'Đối tác'}.`,
                  time: 'Vừa xong',
                  level: 'WARNING',
                  isRead: false,
                  targetScreen: 'payouts'
                });
              }
              if (disputes.length > 0) {
                liveFallbackAlerts.push({
                  id: `LIVE-DISPUTE-${disputes[0].id}`,
                  title: `Có ${disputes.length} hồ sơ khiếu nại chờ Admin hoàn tiền`,
                  desc: `Đã có biên bản xác minh từ nhân viên CSKH.`,
                  time: 'Vừa xong',
                  level: 'CRITICAL',
                  isRead: false,
                  targetScreen: 'refunds'
                });
              }
            } catch {
              // Ignore auxiliary finance alert errors
            }
          }
        } else if (user.role === 'GARAGE_OWNER') {
          const orders = await rescueApi.getGarageOrders().catch(() => []);
          if (!isMounted) return;
          // Sửa lỗi: Lọc đúng các trạng thái đơn cứu hộ của Gara trên hệ thống Backend
          const pending = orders.filter((o) =>
            ['REQUESTED', 'DISPATCHED', 'IN_PROGRESS', 'CONFIRMED'].includes(o.status)
          );
          if (pending.length > 0) {
            liveFallbackAlerts.push({
              id: `LIVE-GARAGE-${pending[0].id}`,
              title: `Gara có ${pending.length} đơn cứu hộ đang xử lý`,
              desc: `Đơn #${pending[0].orderCode} đang chờ thợ cơ động tiếp nhận và xử lý.`,
              time: 'Vừa xong',
              level: 'WARNING',
              isRead: false,
              targetScreen: 'owner-dashboard'
            });
          }
        }

        // Hợp nhất: ưu tiên DB Alerts, bổ sung Fallback alerts nếu chưa có
        setAlerts((prev) => {
          const merged = [...dbAlerts];
          for (const fallback of liveFallbackAlerts) {
            if (!merged.some((a) => a.id === fallback.id)) {
              const existingInPrev = prev.find((p) => p.id === fallback.id);
              merged.push(existingInPrev ? { ...fallback, isRead: existingInPrev.isRead } : fallback);
            }
          }
          return merged;
        });
      } catch {
        // Ignored when offline
      }
    };

    loadLiveAlerts();
    const timer = setInterval(loadLiveAlerts, 30000);

    // Kết nối WebSocket STOMP nhận thông báo thời gian thực tức thì
    const numericUserId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10) || 0;
    const disconnectSocket = connectNotificationSocket(numericUserId, user.role, (incomingNotif) => {
      const incomingAlert = mapNotificationToAlert(incomingNotif, user.role);
      setAlerts((prev) => [incomingAlert, ...prev.filter((a) => a.id !== incomingAlert.id)]);

      // Hiển thị toast popup trực quan
      if (incomingNotif.level === 'CRITICAL') {
        showToast(incomingNotif.title, incomingNotif.message, 'error');
      } else if (incomingNotif.level === 'WARNING') {
        showToast(incomingNotif.title, incomingNotif.message, 'warning');
      } else {
        showToast(incomingNotif.title, incomingNotif.message, 'info');
      }
    });

    return () => {
      isMounted = false;
      clearInterval(timer);
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

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
    }
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  /**
   * Tính toán phân hệ hiện tại (currentModule) và màn hình hiện tại (currentScreen) từ URL pathname.
   */
  const { currentModule, currentScreen } = React.useMemo(() => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const mod = parts[0] as ModuleType;
      const scr = parts[1] as ScreenId;
      return { currentModule: mod, currentScreen: scr };
    }
    return {
      currentModule: 'admin' as ModuleType,
      currentScreen: 'overview' as ScreenId
    };
  }, [location.pathname]);

  const handleSelectModule = (mod: ModuleType) => {
    if (!user) return;
    if (canAccessModule(user.role, mod)) {
      const defaultScreen = mod === 'admin' ? 'overview' : mod === 'staff' ? 'dashboard' : 'owner-dashboard';
      navigate(`/${mod}/${defaultScreen}`);
    } else {
      showToast('Từ chối truy cập', 'Bạn không có quyền truy cập vào phân hệ này.', 'warning');
    }
  };

  const handleSelectScreen = (scr: ScreenId) => {
    if (!user) return;
    if (canAccessScreen(user.role, scr)) {
      const mod = screenModule[scr];
      if (mod) {
        navigate(`/${mod}/${scr}`);
      }
    } else {
      showToast('Từ chối truy cập', 'Bạn không có quyền truy cập vào chức năng này.', 'warning');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary font-medium">Đang tải hệ thống điều hành...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginView
              onSwitchToRegister={() => navigate('/register')}
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

  if (['/login', '/register', '/activate'].includes(location.pathname)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  if (!canAccessModule(user.role, currentModule)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

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
        <Sidebar
          currentScreen={currentScreen}
          onSelectScreen={handleSelectScreen}
          allowedModule={currentModule}
        />

        <main className="app-main">
          <Routes>
            {/* PHÂN HỆ A: QUẢN TRỊ VIÊN & TÀI CHÍNH (MODULE A - ADMIN VIEWS) */}
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

            {/* PHÂN HỆ B: VẬN HÀNH & CHĂM SÓC KHÁCH HÀNG (MODULE B - STAFF VIEWS) */}
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
              element={<GISFloodMapView onShowToast={showToast} />}
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
              element={<SLAMonitoringView onShowToast={showToast} />}
            />

            {/* PHÂN HỆ C: CHỦ GARA ĐỐI TÁC (MODULE C - GARAGE OWNER VIEWS) */}
            <Route
              path="/owner/owner-dashboard"
              element={
                <GarageOwnerDashboardView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            {/* Chi nhánh & Đội ngũ thợ kỹ thuật */}
            <Route
              path="/owner/garage-team"
              element={<GarageManagementView onShowToast={showToast} />}
            />
            {/* Chấm công & Hoạt động thợ cứu hộ */}
            <Route
              path="/owner/garage-attendance"
              element={<GarageAttendanceView onShowToast={showToast} />}
            />
            {/* Doanh thu & Ví Gara */}
            <Route
              path="/owner/garage-ratings"
              element={<GarageRatingsView />}
            />
            <Route
              path="/owner/garage-finance"
              element={<GarageOperationsView mode="finance" />}
            />
            {/* Chuyến chở xe vượt ngập */}
            <Route
              path="/owner/garage-transport"
              element={<GarageOperationsView mode="transport" />}
            />
            {/* Danh mục dịch vụ & Bảng giá cứu hộ */}
            <Route
              path="/owner/services"
              element={
                <GarageServicesPricingView
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            {/* Alias tương thích ngược */}
            <Route path="/owner/garage-management" element={<Navigate to="/owner/garage-team" replace />} />
            <Route path="/owner/garage-operations" element={<Navigate to="/owner/garage-transport" replace />} />
            <Route path="/owner/services-pricing" element={<Navigate to="/owner/services" replace />} />

            {/* Điều hướng mặc định khi chỉ gõ tên phân hệ trên URL */}
            <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/owner" element={<Navigate to="/owner/owner-dashboard" replace />} />

            {/* Điều hướng mặc định nếu URL không khớp */}
            <Route path="*" element={<Navigate to={getDefaultPath(user.role)} replace />} />
          </Routes>
        </main>
      </div>

      {/* Hộp thoại (Modal) hiển thị danh sách thông báo & cảnh báo */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-space-lg border-b border-surface-container bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Thông Báo & Cảnh Báo ({alerts.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertsModal(false)}
                className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-lg space-y-space-md max-h-[70vh] overflow-y-auto divide-y divide-surface-container">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-secondary text-body-sm">
                  <span className="material-symbols-outlined text-[36px] text-secondary/40 block mb-2">notifications_none</span>
                  <p>Hiện không có thông báo hoặc cảnh báo khẩn cấp nào.</p>
                </div>
              ) : (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    onClick={async () => {
                      // Tự động xóa thông báo khỏi danh sách ngay sau khi user xem
                      setAlerts((prev) => prev.filter((a) => a.id !== alt.id));
                      if (alt.dbId) {
                        notificationApi.markAsRead(alt.dbId).catch(() => {});
                      }
                      if (alt.targetScreen) {
                        handleSelectScreen(alt.targetScreen);
                        setShowAlertsModal(false);
                      }
                    }}
                    className={`pt-space-md first:pt-0 space-y-1 cursor-pointer transition-opacity ${
                      alt.isRead ? 'opacity-60' : 'opacity-100 font-medium'
                    }`}
                    title="Nhấn để xem và đánh dấu đã đọc"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-body-md text-on-surface flex items-center gap-2">
                        {!alt.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary inline-block flex-shrink-0" />
                        )}
                        {alt.title}
                      </span>
                      <div className="flex items-center gap-1.5">
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAlerts((prev) => prev.filter((a) => a.id !== alt.id));
                            if (alt.dbId) {
                              notificationApi.deleteNotification(alt.dbId).catch(() => {});
                            }
                            showToast('Đã xóa', 'Đã xóa thông báo', 'info');
                          }}
                          className="p-1 rounded text-secondary/60 hover:text-error hover:bg-error-container/20 transition-colors"
                          title="Xóa thông báo này"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-body-sm text-secondary">{alt.desc}</p>
                    <div className="text-label-xs text-secondary font-data-mono pt-1">{alt.time}</div>
                  </div>
                ))
              )}
            </div>

            <div className="p-space-md bg-surface-container-low border-t border-surface-container flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  setAlerts([]);
                  notificationApi.markAllAsRead().catch(() => {});
                  showToast('Đã dọn dẹp', 'Đã xóa toàn bộ thông báo đã xem', 'info');
                  setShowAlertsModal(false);
                }}
                disabled={alerts.length === 0}
                className="px-space-md py-1.5 rounded font-label-md text-label-md text-secondary hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Đã xem tất cả & Xóa
              </button>
              <button
                type="button"
                onClick={() => setShowAlertsModal(false)}
                className="px-space-md py-1.5 rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
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
              <p className="font-body-sm text-body-sm text-secondary leading-snug mt-0.5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return user.role === 'GARAGE_OWNER' ? (
    <GarageAccessGate screen={currentScreen}>{dashboard}</GarageAccessGate>
  ) : (
    dashboard
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainDashboard />
      </AuthProvider>
    </BrowserRouter>
  );
}
