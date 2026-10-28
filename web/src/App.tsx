import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ModuleType, ScreenId } from './types';
import { Role } from './types/auth';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, DEMO_MODE, useAuth } from './context/AuthContext';
import { canAccessModule, canAccessScreen, roleModules, screenModule } from './permissions';
import { GarageAccessGate } from './components/views/GarageAccessGate';
import { GarageManagementView } from './components/views/GarageManagementView';
import { StaffAccountsView } from './components/views/StaffAccountsView';
import { InvitationActivationView } from './components/views/InvitationActivationView';
import { GarageOperationsView } from './components/views/GarageOperationsView';
import { LoginView } from './components/views/LoginView';
import { RegisterView } from './components/views/RegisterView';

// Module A Views
import { OverviewGMVView } from './components/views/OverviewGMVView';
import { CommissionSettingsView } from './components/views/CommissionSettingsView';
import { PayOSReconciliationView } from './components/views/PayOSReconciliationView';
import { PayoutsView } from './components/views/PayoutsView';
import { RefundsView } from './components/views/RefundsView';
import { FinancialReportsView } from './components/views/FinancialReportsView';

// Module B Views
import { LiveDispatchDashboardView } from './components/views/LiveDispatchDashboardView';
import { GarageVerificationView } from './components/views/GarageVerificationView';
import { GISFloodMapView } from './components/views/GISFloodMapView';
import { DisputeFraudView } from './components/views/DisputeFraudView';
import { SLAMonitoringView } from './components/views/SLAMonitoringView';

// Module C Views
import { GarageOwnerDashboardView } from './components/views/GarageOwnerDashboardView';
import { GarageServicesPricingView } from './components/views/GarageServicesPricingView';

// Mock Data
import {
  INITIAL_PAYOS_TRANSACTIONS,
  INITIAL_GARAGE_APPLICANTS,
  INITIAL_FLOOD_POINTS,
  INITIAL_DISPUTES,
  INITIAL_PAYOUTS
} from './data/mockData';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const getDefaultPath = (role: Role): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin/payos-reconciliation';
    case 'STAFF':
      return '/staff/dashboard';
    case 'GARAGE_OWNER':
      return '/owner/owner-dashboard';
    default:
      return '/login';
  }
};

function MainDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Core Datasets
  const [transactions] = useState(INITIAL_PAYOS_TRANSACTIONS);
  const [applicants] = useState(INITIAL_GARAGE_APPLICANTS);
  const [floodPoints] = useState(INITIAL_FLOOD_POINTS);
  const [disputes] = useState(INITIAL_DISPUTES);
  const [payouts] = useState(INITIAL_PAYOUTS);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'success') => {
    if (DEMO_MODE) {
      message = `Bản demo: ${message} Dữ liệu chưa được lưu hoặc gửi tới hệ thống thật.`;
      type = 'info';
    }
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Derive currentScreen and currentModule from URL pathname
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const urlModule = pathSegments[0] as ModuleType | undefined;
  const urlScreen = pathSegments[1] as ScreenId | undefined;

  let currentScreen: ScreenId = 'payos-reconciliation';
  if (urlScreen && urlScreen in screenModule) {
    currentScreen = urlScreen;
  } else if (urlModule && (urlModule as unknown as ScreenId) in screenModule) {
    currentScreen = urlModule as unknown as ScreenId;
  } else if (user?.role === 'STAFF') {
    currentScreen = 'dashboard';
  } else if (user?.role === 'GARAGE_OWNER') {
    currentScreen = 'owner-dashboard';
  }

  const currentModule: ModuleType =
    screenModule[currentScreen] ||
    urlModule ||
    (user?.role === 'STAFF' ? 'staff' : user?.role === 'GARAGE_OWNER' ? 'owner' : 'admin');

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

  const handleSelectScreen = (screen: ScreenId) => {
    if (!user || !canAccessScreen(user.role, screen)) return;
    const targetModule = screenModule[screen];
    navigate(`/${targetModule}/${screen}`);
  };

  // Loading state
  if (isLoading) {
    return <div className="min-h-screen p-8 bg-slate-950 text-white">Đang kiểm tra phiên đăng nhập...</div>;
  }

  // Unauthenticated routes
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginView onSwitchToRegister={() => navigate('/register')} onActivate={() => navigate('/activate')} />}
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

  // Check portal permissions & null user
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

  // Redirect if authenticated user lands on auth pages
  if (['/login', '/register', '/activate'].includes(location.pathname)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  if (!canAccessModule(user.role, currentModule)) {
    return <Navigate to={getDefaultPath(user.role)} replace />;
  }

  const urgentAlerts = [
    {
      id: 'ALT-01',
      title: 'Triều Cường Đạt Đỉnh 1.72m',
      desc: 'Bán đảo Mễ Cốc (Q.8) và đường Trần Xuân Soạn (Q.7) ngập sâu trên 45cm.',
      time: '10 phút trước',
      level: 'CRITICAL'
    },
    {
      id: 'ALT-02',
      title: 'Cần Duyệt Chi Khẩn Cấp PayOS',
      desc: '6 lệnh rút tiền của đối tác gara đang chờ xác thực OTP để nạp tiền cho thợ cơ động.',
      time: '25 phút trước',
      level: 'WARNING'
    },
    {
      id: 'ALT-03',
      title: 'Phát Hiện Vi Phạm Báo Giá Phụ Thu',
      desc: 'Hồ sơ #DISP-8921 bị khách hàng khiếu nại thu chênh lệch 350.000đ.',
      time: '42 phút trước',
      level: 'INFO'
    }
  ];

  const dashboard = (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Application Header */}
      <Header
        currentModule={currentModule}
        currentScreen={currentScreen}
        onSelectModule={handleSelectModule}
        onSelectScreen={handleSelectScreen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadAlertsCount={urgentAlerts.length}
        onOpenAlerts={() => setShowAlertsModal(true)}
        user={user}
        onLogout={logout}
      />

      {/* Main Layout Container */}
      <div className="app-layout">
        {/* Left Fixed Navigation Sidebar */}
        <Sidebar currentScreen={currentScreen} onSelectScreen={handleSelectScreen} allowedModule={currentModule} />

        {/* Primary Content View Area */}
        <main className="app-main">
          <Routes>
            {/* Module A (Admin) Views */}
            {user.role === 'ADMIN' && (
              <Route path="/admin/staff-accounts" element={<StaffAccountsView />} />
            )}
            <Route
              path="/admin/overview"
              element={<OverviewGMVView onSelectScreen={handleSelectScreen} onShowToast={showToast} />}
            />
            <Route
              path="/admin/commission-settings"
              element={<CommissionSettingsView onShowToast={showToast} />}
            />
            <Route
              path="/admin/payos-reconciliation"
              element={
                <PayOSReconciliationView
                  transactions={transactions}
                  onSelectScreen={handleSelectScreen}
                  onShowToast={showToast}
                />
              }
            />
            <Route
              path="/admin/payouts"
              element={<PayoutsView payouts={payouts} onShowToast={showToast} />}
            />
            <Route
              path="/admin/refunds"
              element={<RefundsView disputes={disputes} onShowToast={showToast} />}
            />
            <Route
              path="/admin/reports"
              element={<FinancialReportsView onSelectScreen={handleSelectScreen} onShowToast={showToast} />}
            />

            {/* Module B (Staff) Views */}
            <Route
              path="/staff/dashboard"
              element={<LiveDispatchDashboardView onSelectScreen={handleSelectScreen} onShowToast={showToast} />}
            />
            <Route
              path="/staff/verification"
              element={<GarageVerificationView applicants={applicants} onShowToast={showToast} />}
            />
            <Route
              path="/staff/moderation"
              element={<GISFloodMapView floodPoints={floodPoints} onShowToast={showToast} />}
            />
            <Route
              path="/staff/disputes"
              element={<DisputeFraudView disputes={disputes} onSelectScreen={handleSelectScreen} onShowToast={showToast} />}
            />
            <Route
              path="/staff/monitoring"
              element={<SLAMonitoringView onSelectScreen={handleSelectScreen} onShowToast={showToast} />}
            />

            {/* Module C (Garage Owner) Views */}
            <Route
              path="/owner/owner-dashboard"
              element={<GarageOwnerDashboardView onSelectScreen={handleSelectScreen} onShowToast={showToast} />}
            />
            {user.role === 'GARAGE_OWNER' && (
              <Route path="/owner/garage-team" element={<GarageManagementView />} />
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
              element={<GarageServicesPricingView onSelectScreen={handleSelectScreen} onShowToast={showToast} />}
            />

            {/* Module Entry Point Redirects */}
            <Route path="/admin" element={<Navigate to="/admin/payos-reconciliation" replace />} />
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/owner" element={<Navigate to="/owner/owner-dashboard" replace />} />

            {/* Screen ID Direct Aliases */}
            {Object.entries(screenModule).map(([screen, mod]) => (
              <Route
                key={screen}
                path={`/${screen}`}
                element={<Navigate to={`/${mod}/${screen}`} replace />}
              />
            ))}

            {/* Default and Wildcard Fallbacks */}
            <Route path="/" element={<Navigate to={getDefaultPath(user.role)} replace />} />
            <Route path="*" element={<Navigate to={getDefaultPath(user.role)} replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Alerts / Notifications Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-space-lg border-b border-surface-container bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">notifications_active</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Thông Báo & Cảnh Báo Khẩn ({urgentAlerts.length})
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
              {urgentAlerts.map((alt) => (
                <div key={alt.id} className="pt-space-md first:pt-0 space-y-1">
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
                  <div className="text-label-xs text-secondary font-data-mono pt-1">{alt.time}</div>
                </div>
              ))}
            </div>

            <div className="p-space-md bg-surface-container-low border-t border-surface-container flex items-center justify-between">
              <button
                onClick={() => {
                  showToast('Đã đánh dấu', 'Đã đọc toàn bộ thông báo khẩn', 'info');
                  setShowAlertsModal(false);
                }}
                className="px-space-md py-1.5 rounded font-label-md text-label-md text-secondary hover:text-on-surface"
              >
                Đánh dấu đã đọc tất cả
              </button>
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
