import React, { useState } from 'react';
import { DocumentUpload } from '../DocumentUpload';
import { useAuth } from '../../context/AuthContext';
import { Shield, AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

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
  const [idCardUrl, setIdCardUrl] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        if (value.trim().length < 2) return 'Tên gara phải có ít nhất 2 ký tự';
        return '';

      case 'businessLicenseUrl':
        if (!value) return 'Vui lòng tải lên ảnh Giấy phép kinh doanh';
        return '';

      case 'idCardUrl':
        if (!value) return 'Vui lòng tải lên ảnh CCCD của chủ gara';
        return '';

      case 'fullName':
        if (!value.trim()) return 'Vui lòng nhập họ và tên';
        if (value.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự';
        return '';

      case 'username':
        if (!value.trim()) return 'Vui lòng nhập tên đăng nhập';
        if (value.trim().length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự';
        if (!/^[a-zA-Z0-9_.-]+$/.test(value.trim())) {
          return 'Tên đăng nhập không được chứa khoảng trắng hoặc ký tự đặc biệt';
        }
        return '';

      case 'email':
        if (!value.trim()) return 'Vui lòng nhập địa chỉ email';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Địa chỉ email không hợp lệ (VD: user@example.com)';
        }
        return '';

      case 'phone':
        if (!value.trim()) return '';
        if (!/^(0[35789])[0-9]{8}$/.test(value.trim())) {
          return 'Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09)';
        }
        return '';

      case 'password':
        if (!value) return 'Vui lòng nhập mật khẩu';
        if (value.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
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
      newErrors.nd13Consent = 'Bạn bắt buộc phải đồng ý với Điều khoản xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP để tiếp tục.';
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
      setGeneralError('Vui lòng kiểm tra và hoàn thiện các trường thông tin có lỗi bên dưới.');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-3 shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng ký Chủ gara</h1>
          <p className="text-sm text-slate-500 mt-1">Gia nhập mạng lưới cứu hộ xe máy ngập lụt</p>
        </div>

        {/* Global Feedback notices */}
        {generalError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1 font-medium">{generalError}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
            <div className="flex-1 font-medium">{success}</div>
          </div>
        )}

        <p className="mb-5 text-sm text-slate-600">
          Nộp hồ sơ gara để Staff/Admin duyệt. Trong thời gian chờ, bạn chỉ được xem và bổ sung hồ sơ. Dữ liệu CCCD và
          giấy phép kinh doanh được bảo vệ theo Nghị định 13/2023/NĐ-CP.
        </p>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Tên gara */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tên gara <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={garageName}
              onChange={(e) => handleChange('garageName', e.target.value)}
              onBlur={() => handleBlur('garageName')}
              placeholder="VD: Gara Cứu Hộ Sài Gòn"
              className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 ${
                touched.garageName && errors.garageName
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-slate-200 focus:ring-orange-500'
              }`}
            />
            {touched.garageName && errors.garageName && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.garageName}</p>
            )}
          </div>

          {/* Giấy phép kinh doanh (File Upload) */}
          <DocumentUpload
            label="Giấy phép kinh doanh"
            value={businessLicenseUrl}
            onChange={handleLicenseChange}
            error={touched.businessLicenseUrl ? errors.businessLicenseUrl : undefined}
          />

          {/* CCCD của chủ gara (File Upload) */}
          <DocumentUpload
            label="CCCD của chủ gara"
            value={idCardUrl}
            onChange={handleIdCardChange}
            error={touched.idCardUrl ? errors.idCardUrl : undefined}
          />

          {/* Họ và tên */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              onBlur={() => handleBlur('fullName')}
              placeholder="VD: Nguyễn Văn An"
              className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 ${
                touched.fullName && errors.fullName
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-slate-200 focus:ring-orange-500'
              }`}
            />
            {touched.fullName && errors.fullName && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.fullName}</p>
            )}
          </div>

          {/* Tên đăng nhập & Số điện thoại */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tên đăng nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleChange('username', e.target.value)}
                onBlur={() => handleBlur('username')}
                placeholder="VD: garasaigon"
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 ${
                  touched.username && errors.username
                    ? 'border-red-500 focus:ring-red-500/30'
                    : 'border-slate-200 focus:ring-orange-500'
                }`}
              />
              {touched.username && errors.username && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="VD: 0987654321"
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 ${
                  touched.phone && errors.phone
                    ? 'border-red-500 focus:ring-red-500/30'
                    : 'border-slate-200 focus:ring-orange-500'
                }`}
              />
              {touched.phone && errors.phone && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Địa chỉ Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="VD: partner@floodrescue.vn"
              className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 ${
                touched.email && errors.email
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-slate-200 focus:ring-orange-500'
              }`}
            />
            {touched.email && errors.email && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Tối thiểu 6 ký tự"
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 ${
                  touched.password && errors.password
                    ? 'border-red-500 focus:ring-red-500/30'
                    : 'border-slate-200 focus:ring-orange-500'
                }`}
              />
              {touched.password && errors.password && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Nhập lại mật khẩu"
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 ${
                  touched.confirmPassword && errors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500/30'
                    : 'border-slate-200 focus:ring-orange-500'
                }`}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Decree 13/2023/ND-CP Consent Checkbox */}
          <div className="pt-2 pb-1 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
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
                className="mt-0.5 w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                Tôi đã đọc và đồng ý với{' '}
                <span className="font-semibold text-slate-900 underline decoration-slate-400">
                  Điều khoản xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP
                </span>
                , cam kết thông tin CCCD và giấy phép cung cấp là chính chủ và đồng ý để hệ thống lưu trữ mã hóa phục vụ xác thực hồ sơ đối tác.
              </span>
            </label>
            {touched.nd13Consent && errors.nd13Consent && (
              <p className="text-red-500 text-xs mt-1.5 font-medium pl-6">{errors.nd13Consent}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-3"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo tài khoản...
              </>
            ) : (
              'Hoàn tất đăng ký'
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-5 text-center text-xs text-slate-500">
          Đã có tài khoản?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-orange-600 font-semibold hover:text-orange-700 hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};
