// ============================================================================
// DỊCH VỤ GỌI API QUẢN LÝ TÀI KHOẢN STAFF, CHI NHÁNH & ĐỘI NGŨ THỢ (MANAGEMENT API)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Hệ thống & Tài khoản Staff
// Mục đích: Cung cấp lớp giao tiếp HTTP chuẩn hóa (RESTful API Client) kết nối với
// Backend Spring Boot cho các tác vụ:
// 1. Admin tạo tài khoản nhân viên điều phối (Staff) trực tiếp với mật khẩu mặc định Password@123 (Cách A).
// 2. Admin truy vấn danh sách Staff có hỗ trợ lọc theo từ khóa (search) và trạng thái (active).
// 3. Admin khóa hoặc mở khóa tài khoản Staff tức thì (updateStaffStatus).
// 4. Quản lý chi nhánh và kỹ thuật viên hiện trường của Gara đối tác.
// ============================================================================

import { API_BASE_URL, getAuthHeaders } from './apiConfig';
import { BACKEND_CONNECTION_ERROR_MESSAGE } from './authApi';
import { GarageBackendResponse } from './garageApi';
import { RegisterPayload, User } from '../types/auth';

/**
 * Lớp ngoại lệ tùy chỉnh (Custom Exception) đại diện cho các lỗi trả về từ REST API Backend.
 * Lưu trữ mã trạng thái HTTP (status) và danh sách lỗi kiểm tra dữ liệu đầu vào (validationErrors).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public validationErrors?: Record<string, string>
  ) {
    // Gọi hàm khởi tạo của lớp cơ sở Error với thông điệp lỗi tiếng Việt từ máy chủ
    super(message);
  }
}

/**
 * Hàm dùng chung (Generic HTTP Request Helper) để gửi yêu cầu HTTP tới máy chủ Backend.
 * Cơ chế hoạt động:
 * - Tự động đính kèm JWT Bearer Token vào Header thông qua hàm `getAuthHeaders()`.
 * - Tự động tuần tự hóa (serialize) dữ liệu `body` sang chuỗi JSON nếu có truyền vào.
 * - Kiểm tra `Content-Type` của phản hồi để giải mã JSON an toàn.
 * - Nếu HTTP status không nằm trong dải 200-299 hoặc trường `json.success === false`,
 *   ném ra đối tượng `ApiError` để tầng giao diện (React Component) bắt và hiển thị thông báo.
 * - Trả về trực tiếp phần dữ liệu nghiệp vụ nằm trong `json.data` (chuẩn bọc ApiResponse của Backend).
 */
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  // Thực thi lời gọi mạng bất đồng bộ bằng Fetch API tới địa chỉ API_BASE_URL + path
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: getAuthHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(BACKEND_CONNECTION_ERROR_MESSAGE, 0);
  }

  // Biến tạm lưu trữ đối tượng JSON sau khi phân tích cú pháp từ phản hồi của Server
  let json: any = null;
  const contentType = response.headers.get('content-type');

  // Chỉ thực hiện parse JSON nếu header Content-Type xác nhận định dạng là application/json
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      // Nếu luồng dữ liệu JSON bị rỗng hoặc lỗi định dạng, gán về null để xử lý ở bước kiểm tra dưới
      json = null;
    }
  }

  // Kiểm tra trạng thái thành công của HTTP Response và cờ logic `success` trong cấu trúc ApiResponse
  if (!response.ok || (json && json.success === false)) {
    if (response.status >= 502 && response.status <= 504) {
      throw new ApiError(`Máy chủ backend tạm thời không phản hồi (Mã lỗi ${response.status}). Vui lòng thử lại sau.`, response.status);
    }
    const message = json?.message || `Lỗi hệ thống (${response.status})`;
    throw new ApiError(message, response.status, json?.validationErrors);
  }

  // Nếu Backend bọc kết quả trong thuộc tính `data` thì trả về `json.data`, ngược lại trả về nguyên mẫu `json`
  return json?.data !== undefined ? json.data : json;
}

/**
 * Giao diện mô tả thông tin một Chi nhánh Gara cứu hộ (Branch).
 */
export interface Branch {
  id: number;
  branchName: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  rescueVehicles: string;
  operatingStatus: 'OPEN' | 'CLOSED_MAINTENANCE';
  mechanicsCount: number;
}

/**
 * Giao diện mô tả thông tin một Kỹ thuật viên / Thợ cứu hộ (Mechanic).
 */
export interface Mechanic {
  id: number;
  userId?: number;
  username?: string;
  fullName: string;
  email: string;
  phone?: string;
  speciality?: string;
  ratingAvg?: number;
  hasCrossingCapability?: boolean;
  avatarUrl?: string;
  branchId: number | null;
  branchName: string;
  branchAddress?: string;
  shiftName: string;
  workingStatus: string;
  active: boolean;
}

/**
 * Payload gửi lên khi Chủ Gara khởi tạo tài khoản Kỹ thuật viên mới.
 */
export interface CreateMechanicPayload {
  username: string;
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  branchId?: number;
  shiftName?: string;
  speciality?: string;
  hasCrossingCapability?: boolean;
}

/**
 * Payload gửi lên khi Chủ Gara cập nhật thông tin Kỹ thuật viên.
 */
export interface UpdateMechanicPayload {
  fullName?: string;
  phone?: string;
  branchId?: number;
  shiftName?: string;
  speciality?: string;
  hasCrossingCapability?: boolean;
}

/**
 * Giao diện mô tả bản ghi lời mời kích hoạt (giữ lại để tương thích với các màn hình cũ).
 */
export interface Invitation {
  code: string;
  email: string;
  expiresAt: string;
}

/**
 * Giao diện mô tả bản ghi hồ sơ người dùng / nhân viên Staff trả về từ Backend (UserProfileRecord).
 * Kế thừa toàn bộ các trường của `User` và bổ sung các thuộc tính mở rộng phục vụ hiển thị quản trị.
 */
export interface UserProfileRecord extends User {
  // Số điện thoại liên hệ (tương thích cả tên trường phone và phoneNumber từ DTO Backend)
  phoneNumber?: string;
  // Mật khẩu mặc định được trả về ngay sau khi Admin khởi tạo tài khoản (Password@123)
  defaultPassword?: string;
}

/**
 * Payload đầu vào khi Admin tạo trực tiếp một tài khoản Staff mới (Cách A - Yêu cầu #2 & #3).
 */
export interface CreateStaffPayload {
  // Địa chỉ email công vụ của nhân viên Staff (bắt buộc)
  email: string;
  // Họ và tên đầy đủ của nhân viên (nếu để trống, Backend sẽ tự động suy diễn từ phần trước dấu @ của email)
  fullName?: string;
  // Số điện thoại liên hệ của nhân viên (tùy chọn)
  phoneNumber?: string;
  // Mật khẩu khởi tạo (nếu không truyền, Backend mặc định gán Password@123)
  password?: string;
}

/**
 * Tham số truy vấn (Query Parameters) khi Admin lấy danh sách tài khoản Staff.
 */
export interface GetStaffParams {
  // Từ khóa tìm kiếm theo tên, email, username hoặc số điện thoại
  search?: string;
  // Lọc theo trạng thái hoạt động: true (Đang hoạt động), false (Đã khóa), undefined (Tất cả)
  active?: boolean;
}

/**
 * Đối tượng tập hợp các phương thức gọi API quản lý nhân sự và tổ chức.
 */
export const managementApi = {
  // Lấy thông tin hồ sơ Gara của Chủ Gara đang đăng nhập
  garage: () => request<GarageBackendResponse>('/garages/me'),

  // Lấy danh sách các chi nhánh thuộc Gara
  branches: () => request<Branch[]>('/garages/branches'),

  // Lấy danh sách đội ngũ thợ máy thuộc Gara
  mechanics: () => request<Mechanic[]>('/garages/mechanics'),

  // Thêm mới một thợ máy vào Gara
  createMechanic: (payload: CreateMechanicPayload) =>
    request<Mechanic>('/garages/mechanics', 'POST', payload),

  // Cập nhật thông tin thợ máy theo ID
  updateMechanic: (id: number, payload: UpdateMechanicPayload) =>
    request<Mechanic>(`/garages/mechanics/${id}`, 'PUT', payload),

  // Đặt lại mật khẩu mặc định cho thợ máy
  resetMechanicPassword: (id: number) =>
    request<string>(`/garages/mechanics/${id}/reset-password`, 'POST'),

  // Xóa hồ sơ thợ máy khỏi Gara
  removeMechanic: (id: number) =>
    request<void>(`/garages/mechanics/${id}`, 'DELETE'),

  // Điều chuyển thợ máy sang chi nhánh hoặc ca trực khác
  allocateMechanic: (id: number, branchId: number, shiftName?: string) =>
    request<Mechanic>(`/garages/mechanics/${id}/allocate`, 'PATCH', { branchId, shiftName }),

  // Bật / tắt trạng thái hoạt động của thợ máy
  toggleMechanicStatus: (id: number, active: boolean) =>
    request<Mechanic>(`/garages/mechanics/${id}/status`, 'PATCH', { active }),

  /**
   * Lấy danh sách tài khoản nhân viên điều phối (STAFF) dành cho Admin (Yêu cầu #2 & #3).
   * Hỗ trợ truyền query params `search` và `active` lên endpoint `GET /api/v1/admin/staff`.
   */
  getStaff: (params?: GetStaffParams): Promise<UserProfileRecord[]> => {
    // Khởi tạo đối tượng URLSearchParams để đóng gói tham số truy vấn an toàn
    const query = new URLSearchParams();
    // Nếu có từ khóa tìm kiếm khác rỗng thì gắn vào query string
    if (params?.search && params.search.trim() !== '') {
      query.append('search', params.search.trim());
    }
    // Nếu có lọc theo trạng thái active (boolean) thì gắn vào query string
    if (params?.active !== undefined) {
      query.append('active', String(params.active));
    }
    // Ghép chuỗi query string vào sau đường dẫn /admin/staff
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<UserProfileRecord[]>(`/admin/staff${qs}`, 'GET');
  },

  // Giữ lại phương thức `staff()` trỏ tới `getStaff()` để đảm bảo tính tương thích ngược
  staff: () => managementApi.getStaff(),

  /**
   * Tạo trực tiếp tài khoản nhân viên điều phối (STAFF) mới từ giao diện Admin (Cách A - Yêu cầu #2 & #3).
   * Gọi `POST /api/v1/admin/staff` để tạo tài khoản với trạng thái `active = true` và mật khẩu mặc định `Password@123`.
   */
  createStaff: (payload: CreateStaffPayload): Promise<UserProfileRecord> =>
    request<UserProfileRecord>('/admin/staff', 'POST', payload),

  /**
   * Khóa hoặc Mở khóa tài khoản nhân viên Staff theo ID (`PATCH /api/v1/admin/staff/{id}/status`).
   */
  updateStaffStatus: (id: number, active: boolean): Promise<UserProfileRecord> =>
    request<UserProfileRecord>(`/admin/staff/${id}/status`, 'PATCH', { active }),

  // Giữ lại phương thức mời qua email cho luồng cũ nếu có component tham chiếu
  invite: (staff: boolean, email: string, branchId?: number) =>
    request<Invitation>(staff ? '/admin/staff/invitations' : '/garages/mechanics/invitations', 'POST', {
      email,
      branchId
    }),

  // Kích hoạt tài khoản bằng mã mời
  activate: (code: string, account: Omit<RegisterPayload, 'application'>) =>
    request('/onboarding/activate', 'POST', { code, account })
};
