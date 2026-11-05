// ============================================================================
// TỆP CẤU HÌNH PHÂN QUYỀN TRUY CẬP DỰA TRÊN VAI TRÒ (RBAC - ROLE-BASED ACCESS CONTROL)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích: Định nghĩa ma trận phân quyền giữa các Vai trò người dùng (Role),
// các Phân hệ chức năng (ModuleType: admin, staff, owner) và từng Màn hình cụ thể (ScreenId).
// Cơ chế: Đảm bảo tách biệt hoàn toàn quyền hạn giữa Quản trị viên Tài chính (ADMIN),
// Nhân viên Vận hành & CSKH (STAFF) và Chủ Gara đối tác (GARAGE_OWNER).
// ============================================================================

// Nhập kiểu dữ liệu ModuleType ('admin' | 'staff' | 'owner') và ScreenId (mã định danh các màn hình)
import { ModuleType, ScreenId } from './types';
// Nhập kiểu dữ liệu Role đại diện cho vai trò tài khoản được giải mã từ JWT Token hoặc phiên đăng nhập
import { Role } from './types/auth';

/**
 * Bản đồ ánh xạ từng màn hình (ScreenId) về phân hệ chủ quản (ModuleType).
 * Cơ chế hoạt động:
 * - Khi người dùng truy cập một đường dẫn URL (ví dụ: /admin/payouts hoặc /staff/disputes),
 *   hệ thống tra cứu bảng screenModule để biết màn hình đó thuộc phân hệ nào ('admin', 'staff', hay 'owner').
 * - Sau đó hệ thống kiểm tra xem vai trò hiện tại của người dùng có quyền truy cập phân hệ đó hay không.
 */
export const screenModule: Record<ScreenId, ModuleType> = {
  // Quản lý tài khoản nhân viên điều phối (Staff) - Thuộc phân hệ Quản trị viên (Admin)
  'staff-accounts': 'admin',
  // Quản lý chi nhánh và đội ngũ thợ kỹ thuật - Thuộc phân hệ Chủ Gara (Owner)
  'garage-team': 'owner',
  // Quản lý doanh thu và số dư ví Gara - Thuộc phân hệ Chủ Gara (Owner)
  'garage-finance': 'owner',
  'garage-ratings': 'owner',
  // Quản lý điều phối chuyến chở xe vượt ngập của Gara - Thuộc phân hệ Chủ Gara (Owner)
  'garage-transport': 'owner',
  // Màn hình Tổng quan chỉ số GMV và dòng tiền toàn sàn - Thuộc phân hệ Admin
  overview: 'admin',
  // Màn hình Cấu hình tỷ lệ phí chiết khấu theo từng Gara đối tác (UC-24) - Thuộc phân hệ Admin
  'commission-settings': 'admin',
  // Màn hình Đối soát giao dịch thanh toán PayOS & VietQR (UC-25) - Thuộc phân hệ Admin
  'payos-reconciliation': 'admin',
  // Màn hình Phê duyệt yêu cầu rút tiền / giải ngân về ngân hàng cho Gara (UC-26) - Thuộc phân hệ Admin
  payouts: 'admin',
  // Màn hình Phán quyết và thực thi hoàn tiền khiếu nại cho khách hàng (UC-27) - Thuộc phân hệ Admin
  refunds: 'admin',
  // Màn hình Báo cáo kết quả kinh doanh (P&L) và thống kê doanh thu theo Gara - Thuộc phân hệ Admin
  reports: 'admin',
  // Bảng điều khiển điều phối cứu hộ trực tuyến thời gian thực - Thuộc phân hệ Staff
  dashboard: 'staff',
  // Màn hình thẩm định hồ sơ pháp lý eKYC và duyệt Gara mới - Thuộc phân hệ Staff
  verification: 'staff',
  // Màn hình kiểm duyệt điểm ngập úng trên bản đồ GIS - Thuộc phân hệ Staff
  moderation: 'staff',
  // Màn hình tiếp nhận, điều tra khiếu nại và lập biên bản đề xuất hoàn tiền (UC-23) - Thuộc phân hệ Staff
  disputes: 'staff',
  // Màn hình giám sát chất lượng dịch vụ SLA và đánh giá CSAT sau cứu hộ (UC-19) - Thuộc phân hệ Staff
  monitoring: 'staff',
  'owner-dashboard': 'owner',
  // Màn hình cấu hình danh mục dịch vụ và bảng giá niêm yết của Gara - Thuộc phân hệ Owner
  services: 'owner'
};

/**
 * Ma trận phân quyền ROLE_PERMISSIONS (và bí danh roleModules để tương thích toàn bộ ứng dụng):
 * Xác định danh sách các phân hệ (ModuleType[]) mà mỗi vai trò (Role) được phép truy cập.
 * Yêu cầu nghiệp vụ quan trọng (Yêu cầu #1):
 * - Tài khoản ADMIN chỉ được phép truy cập phân hệ ['admin'] (Quản trị & Tài chính).
 * - Tuyệt đối KHÔNG cấp quyền 'staff' cho ADMIN để ngăn Admin chuyển sang giao diện Staff trên Header
 *   hoặc truy cập trái phép vào các trang vận hành của Staff.
 */
export const ROLE_PERMISSIONS: Record<Role, ModuleType[]> = {
  // Quản trị viên (ADMIN): Chỉ có quyền truy cập duy nhất phân hệ 'admin', không được vào trang 'staff'
  ADMIN: ['admin'],
  // Quản trị viên cấp cao (SUPER_ADMIN): Chỉ tập trung vào phân hệ quản trị 'admin'
  SUPER_ADMIN: ['admin'],
  // Chuyên viên thẩm định KYC (KYC_VERIFIER): Làm việc trên phân hệ vận hành 'staff'
  KYC_VERIFIER: ['staff'],
  // Nhân viên vận hành & CSKH (STAFF): Chỉ được truy cập phân hệ 'staff'
  STAFF: ['staff'],
  // Chủ Gara cứu hộ đối tác (GARAGE_OWNER): Chỉ được truy cập phân hệ 'owner'
  GARAGE_OWNER: ['owner'],
  // Thợ sửa chữa hiện trường (FIELD_MECHANIC): Sử dụng ứng dụng Mobile, không truy cập Web Portal
  FIELD_MECHANIC: [],
  // Khách hàng (CUSTOMER): Sử dụng ứng dụng Mobile đặt cứu hộ, không truy cập Web Portal
  CUSTOMER: []
};

// Xuất thêm hằng số roleModules trỏ tới ROLE_PERMISSIONS để duy trì tính tương thích ngược với các component hiện có
export const roleModules: Record<Role, ModuleType[]> = ROLE_PERMISSIONS;

/**
 * Cấu hình đường dẫn mặc định (Default Route) khi người dùng đăng nhập thành công
 * hoặc khi truy cập vào đường dẫn gốc '/' hay đường dẫn không hợp lệ.
 */
export const ROLE_DEFAULT_ROUTE: Record<Role, string> = {
  // Mặc định đưa Admin vào trang Tổng quan tài chính & GMV (/admin/overview)
  ADMIN: '/admin/overview',
  // Mặc định đưa Super Admin vào trang Tổng quan tài chính (/admin/overview)
  SUPER_ADMIN: '/admin/overview',
  // Mặc định đưa KYC Verifier vào trang Duyệt hồ sơ Gara (/staff/verification)
  KYC_VERIFIER: '/staff/verification',
  // Mặc định đưa Staff vào Bảng điều khiển điều phối (/staff/dashboard)
  STAFF: '/staff/dashboard',
  // Mặc định đưa Chủ Gara vào Bảng điều khiển Gara (/owner/owner-dashboard)
  GARAGE_OWNER: '/owner/owner-dashboard',
  // Các vai trò dùng Mobile sẽ quay về trang đăng nhập nếu mở trên trình duyệt Web
  FIELD_MECHANIC: '/login',
  CUSTOMER: '/login'
};

/**
 * Hàm lấy danh sách các phân hệ (ModuleType[]) mà một vai trò người dùng được phép truy cập.
 * @param role Vai trò của người dùng hiện tại (có thể undefined nếu chưa đăng nhập)
 * @returns Mảng các phân hệ được phép truy cập (ví dụ: ['admin'] đối với ADMIN)
 */
export const getAccessibleModules = (role?: Role | null): ModuleType[] => {
  // Nếu chưa có thông tin vai trò, trả về mảng rỗng để chặn mọi quyền truy cập
  if (!role) return [];
  // Tra cứu trong bảng ROLE_PERMISSIONS, nếu không tìm thấy thì trả về mảng rỗng
  return ROLE_PERMISSIONS[role] ?? [];
};

/**
 * Hàm kiểm tra xem một vai trò (Role) có quyền truy cập vào một phân hệ (ModuleType) cụ thể hay không.
 * @param role Vai trò của người dùng đang đăng nhập
 * @param module Phân hệ cần kiểm tra quyền ('admin' | 'staff' | 'owner')
 * @returns true nếu được phép truy cập, false nếu bị từ chối
 */
export const canAccessModule = (role: Role, module: ModuleType): boolean => {
  // Đặc biệt chặn cứng: Nếu vai trò là ADMIN và phân hệ đích là 'staff' thì luôn trả về false
  if (role === 'ADMIN' && module === 'staff') {
    return false;
  }
  // Kiểm tra xem mảng phân quyền của role có chứa module cần truy cập hay không
  return ROLE_PERMISSIONS[role]?.includes(module) ?? false;
};

/**
 * Hàm kiểm tra xem một vai trò (Role) có quyền truy cập vào một màn hình (ScreenId) cụ thể hay không.
 * @param role Vai trò của người dùng đang đăng nhập
 * @param screen Mã màn hình cần kiểm tra quyền truy cập
 * @returns true nếu vai trò của người dùng được phép mở màn hình đó, ngược lại false
 */
export const canAccessScreen = (role: Role, screen: ScreenId): boolean => {
  // Xác định phân hệ chủ quản của màn hình từ bảng ánh xạ screenModule
  const targetModule = screenModule[screen];
  // Nếu màn hình không tồn tại trong cấu hình, từ chối quyền truy cập
  if (!targetModule) return false;
  // Gọi hàm canAccessModule để kiểm tra quyền trên phân hệ tương ứng
  return canAccessModule(role, targetModule);
};
