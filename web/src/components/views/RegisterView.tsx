import React, { useState } from 'react';
import { DocumentUpload } from '../DocumentUpload';
import { useAuth } from '../../context/AuthContext';
import { Shield, AlertCircle, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

interface FormErrors {
  garageName?: string;
  businessLicenseUrl?: string;
  idCardUrl?: string;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  nd13Consent?: string;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();

  const [garageName, setGarageName] = useState('');
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState('');
  const [businessLicenseStorageKey, setBusinessLicenseStorageKey] = useState('');
  const [idCardUrl, setIdCardUrl] = useState('');
  const [idCardStorageKey, setIdCardStorageKey] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nd13Consent, setNd13Consent] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validate a single field
  const validateField = (fieldName: keyof FormErrors, value: string, currentPassword?: string): string => {
    switch (fieldName) {
      case 'garageName':
        if (!value.trim()) return 'Vui lòng nhập tên gara';
        if (value.trim().length < 2) return 'Tên gara tối thiểu 2 ký tự';
        return '';

      case 'businessLicenseUrl':
        if (!value) return 'Vui lòng tải lên ảnh Giấy phép kinh doanh';
        return '';

      case 'idCardUrl':
        if (!value) return 'Vui lòng tải lên ảnh CCCD của chủ gara';
        return '';

      case 'fullName':
        if (!value.trim()) return 'Vui lòng nhập họ và tên';
        if (value.trim().length < 2) return 'Họ và tên tối thiểu 2 ký tự';
        return '';

      case 'username':
        if (!value.trim()) return 'Vui lòng nhập tên đăng nhập';
        if (value.trim().length < 3) return 'Tên đăng nhập tối thiểu 3 ký tự';
        if (!/^[a-zA-Z0-9_.-]+$/.test(value.trim())) {
          return 'Không chứa khoảng trắng hoặc ký tự đặc biệt';
        }
        return '';

      case 'email':
        if (!value.trim()) return 'Vui lòng nhập địa chỉ email';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Email không hợp lệ (VD: user@example.com)';
        }
        return '';

      case 'phone':
        if (!value.trim()) return '';
        if (!/^(0[35789])[0-9]{8}$/.test(value.trim())) {
          return 'Số ĐT cần 10 số (bắt đầu 03/05/07/08/09)';
        }
        return '';

      case 'password':
        if (!value) return 'Vui lòng nhập mật khẩu';
        if (value.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
        return '';

      case 'confirmPassword':
        if (!value) return 'Vui lòng xác nhận mật khẩu';
        if (currentPassword !== undefined && value !== currentPassword) {
          return 'Mật khẩu xác nhận không khớp';
        }
        return '';

      default:
        return '';
    }
  };

  // Validate all fields
  const validateAll = (): FormErrors => {
    const newErrors: FormErrors = {};

    const gNameErr = validateField('garageName', garageName);
    if (gNameErr) newErrors.garageName = gNameErr;

    const licenseErr = validateField('businessLicenseUrl', businessLicenseUrl);
    if (licenseErr) newErrors.businessLicenseUrl = licenseErr;

    const idCardErr = validateField('idCardUrl', idCardUrl);
    if (idCardErr) newErrors.idCardUrl = idCardErr;

    const nameErr = validateField('fullName', fullName);
    if (nameErr) newErrors.fullName = nameErr;

    const usernameErr = validateField('username', username);
    if (usernameErr) newErrors.username = usernameErr;

    const emailErr = validateField('email', email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validateField('phone', phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const passErr = validateField('password', password);
    if (passErr) newErrors.password = passErr;

    const confirmErr = validateField('confirmPassword', confirmPassword, password);
    if (confirmErr) newErrors.confirmPassword = confirmErr;

    if (!nd13Consent) {
      newErrors.nd13Consent = 'Cần đồng ý với Điều khoản xử lý dữ liệu theo NĐ 13/2023/NĐ-CP.';
    }

    return newErrors;
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let err = '';
    if (field === 'confirmPassword') {
      err = validateField(field, confirmPassword, password);
    } else if (field === 'password') {
      err = validateField(field, password);
      if (touched.confirmPassword && confirmPassword) {
        const confirmErr = validateField('confirmPassword', confirmPassword, password);
        setErrors((prev) => ({ ...prev, confirmPassword: confirmErr || undefined }));
      }
    } else {
      const val =
        field === 'garageName'
          ? garageName
          : field === 'businessLicenseUrl'
            ? businessLicenseUrl
            : field === 'idCardUrl'
              ? idCardUrl
              : field === 'fullName'
                ? fullName
                : field === 'username'
                  ? username
                  : field === 'email'
                    ? email
                    : phone;
      err = validateField(field, val);
    }
    setErrors((prev) => ({ ...prev, [field]: err || undefined }));
  };

  const handleChange = (field: keyof FormErrors, value: string) => {
    if (field === 'garageName') setGarageName(value);
    else if (field === 'fullName') setFullName(value);
    else if (field === 'username') setUsername(value);
    else if (field === 'email') setEmail(value);
    else if (field === 'phone') setPhone(value);
    else if (field === 'password') {
      setPassword(value);
      if (touched.confirmPassword && confirmPassword) {
        const confirmErr = validateField('confirmPassword', confirmPassword, value);
        setErrors((prev) => ({ ...prev, confirmPassword: confirmErr || undefined }));
      }
    } else if (field === 'confirmPassword') {
      setConfirmPassword(value);
    }

    if (touched[field]) {
      const err = validateField(field, value, field === 'confirmPassword' ? password : undefined);
      setErrors((prev) => ({ ...prev, [field]: err || undefined }));
    }
  };

  const handleLicenseChange = (url: string) => {
    setBusinessLicenseUrl(url);
    setTouched((prev) => ({ ...prev, businessLicenseUrl: true }));
    const err = validateField('businessLicenseUrl', url);
    setErrors((prev) => ({ ...prev, businessLicenseUrl: err || undefined }));
  };

  const handleIdCardChange = (url: string) => {
    setIdCardUrl(url);
    setTouched((prev) => ({ ...prev, idCardUrl: true }));
    const err = validateField('idCardUrl', url);
    setErrors((prev) => ({ ...prev, idCardUrl: err || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccess(null);

    // Mark all fields as touched
    setTouched({
      garageName: true,
      businessLicenseUrl: true,
      idCardUrl: true,
      fullName: true,
      username: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      nd13Consent: true
    });

    const formErrors = validateAll();
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      setGeneralError('Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ bên dưới.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        application: {
          garageName: garageName.trim(),
          businessLicenseUrl,
          idCardUrl,
          businessLicenseStorageKey: businessLicenseStorageKey || undefined,
          idCardStorageKey: idCardStorageKey || undefined,
          phone: phone.trim() || undefined,
          nd13Consent: true
        }
      });
      setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng...');
    } catch (err: any) {
      setGeneralError(err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-slate-50 flex flex-col justify-center items-center p-3 sm:p-4 relative overflow-hidden select-none">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container - 2 Column Card */}
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 relative z-10 flex flex-col justify-between max-h-[96vh] overflow-y-auto lg:overflow-visible">
        {/* Compact Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Đăng ký Đối tác Chủ gara
              </h1>
              <p className="text-[11px] text-slate-500">
                Nền tảng cứu hộ xe máy ngập lụt • Bảo mật dữ liệu theo NĐ 13/2023/NĐ-CP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Đã có tài khoản?
          </button>
        </div>

        {/* Global Alert Notification */}
        {generalError && (
          <div className="mb-2 py-1.5 px-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <div className="flex-1 font-medium">{generalError}</div>
          </div>
        )}

        {success && (
          <div className="mb-2 py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <div className="flex-1 font-medium">{success}</div>
          </div>
        )}

        {/* Form Grid - Two Column Split */}
        <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2.5">
            {/* COLUMN 1: Account & Garage Info */}
            <div className="space-y-2">
              {/* Tên gara */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                  Tên gara <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={garageName}
                  onChange={(e) => handleChange('garageName', e.target.value)}
                  onBlur={() => handleBlur('garageName')}
                  placeholder="VD: Gara Cứu Hộ Sài Gòn"
                  className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 ${
                    touched.garageName && errors.garageName
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-200 focus:ring-orange-500'
                  }`}
                />
                {touched.garageName && errors.garageName && (
                  <p className="text-red-500 text-[11px] mt-0.5 font-medium leading-tight">{errors.garageName}</p>
                )}
              </div>

              {/* Họ và tên chủ gara */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                  Họ và tên chủ gara <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  placeholder="VD: Nguyễn Văn An"
                  className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 ${
                    touched.fullName && errors.fullName
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-200 focus:ring-orange-500'
                  }`}
                />
                {touched.fullName && errors.fullName && (
                  <p className="text-red-500 text-[11px] mt-0.5 font-medium leading-tight">{errors.fullName}</p>
                )}
              </div>

              {/* Tên đăng nhập & Số điện thoại */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    onBlur={() => handleBlur('username')}
                    placeholder="VD: garasaigon"
                    className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 ${
                      touched.username && errors.username
                        ? 'border-red-500 focus:ring-red-500/30'
                        : 'border-slate-200 focus:ring-orange-500'
                    }`}
                  />
                  {touched.username && errors.username && (
                    <p className="text-red-500 text-[11px] mt-0.5 font-medium leading-tight break-words">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder="VD: 0987654321"
                    className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 ${
                      touched.phone && errors.phone
                        ? 'border-red-500 focus:ring-red-500/30'
                        : 'border-slate-200 focus:ring-orange-500'
                    }`}
                  />
                  {touched.phone && errors.phone && (
                    <p className="text-red-500 text-[11px] mt-0.5 font-medium leading-tight break-words">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Địa chỉ Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="VD: partner@floodrescue.vn"
                  className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 ${
                    touched.email && errors.email
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-200 focus:ring-orange-500'
                  }`}
                />
                {touched.email && errors.email && (
                  <p className="text-red-500 text-[11px] mt-0.5 font-medium leading-tight">{errors.email}</p>
                )}
              </div>

              {/* Mật khẩu & Xác nhận mật khẩu */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="Tối thiểu 6 ký tự"
                      className={`w-full pl-3 pr-8 py-1.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 ${
                        touched.password && errors.password
                          ? 'border-red-500 focus:ring-red-500/30'
                          : 'border-slate-200 focus:ring-orange-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/50 transition-colors focus:outline-none cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="text-red-500 text-[11px] mt-0.5 font-medium leading-tight break-words">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="Nhập lại mật khẩu"
                      className={`w-full pl-3 pr-8 py-1.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 ${
                        touched.confirmPassword && errors.confirmPassword
                          ? 'border-red-500 focus:ring-red-500/30'
                          : 'border-slate-200 focus:ring-orange-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/50 transition-colors focus:outline-none cursor-pointer"
                      title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="text-red-500 text-[11px] mt-0.5 font-medium leading-tight break-words">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: KYC Documents & Consent */}
            <div className="space-y-2 flex flex-col justify-between">
              {/* Giấy phép kinh doanh (File Upload) */}
              <DocumentUpload
                label="Giấy phép kinh doanh"
                value={businessLicenseUrl}
                onChange={handleLicenseChange}
                onStorageKeyChange={setBusinessLicenseStorageKey}
                docType="business-license"
                error={touched.businessLicenseUrl ? errors.businessLicenseUrl : undefined}
              />

              {/* CCCD của chủ gara (File Upload) */}
              <DocumentUpload
                label="CCCD của chủ gara"
                value={idCardUrl}
                onChange={handleIdCardChange}
                onStorageKeyChange={setIdCardStorageKey}
                docType="id-cards"
                error={touched.idCardUrl ? errors.idCardUrl : undefined}
              />

              {/* Decree 13/2023/ND-CP Consent Checkbox */}
              <div className="pt-1.5 border-t border-slate-100">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={nd13Consent}
                    onChange={(e) => {
                      setNd13Consent(e.target.checked);
                      setTouched((prev) => ({ ...prev, nd13Consent: true }));
                      if (e.target.checked) {
                        setErrors((prev) => ({ ...prev, nd13Consent: undefined }));
                      }
                    }}
                    className="mt-0.5 w-3.5 h-3.5 rounded text-orange-600 border-slate-300 focus:ring-orange-500 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-slate-600 leading-tight">
                    Tôi đã đọc & đồng ý với{' '}
                    <span className="font-semibold text-slate-800 underline decoration-slate-300">
                      Điều khoản xử lý dữ liệu cá nhân theo NĐ 13/2023/NĐ-CP
                    </span>
                    , đồng ý để hệ thống lưu trữ mã hóa hồ sơ phục vụ xét duyệt đối tác.
                  </span>
                </label>
                {touched.nd13Consent && errors.nd13Consent && (
                  <p className="text-red-500 text-[11px] mt-0.5 font-medium pl-5.5">{errors.nd13Consent}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-1 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo tài khoản...
                  </>
                ) : (
                  'Hoàn tất đăng ký đối tác'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
