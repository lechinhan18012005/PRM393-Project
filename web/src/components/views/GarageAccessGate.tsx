import { DocumentUpload } from '../DocumentUpload';
import React, { useEffect, useState } from 'react';
import { managementApi, request, ApiError } from '../../services/managementApi';
import { GarageBackendResponse } from '../../services/garageApi';
import { useAuth } from '../../context/AuthContext';
import { GarageHeading, GaragePanel } from '../garage/GarageUI';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Send,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';

export function GarageAccessGate({ children, screen }: { children: React.ReactNode; screen: string }) {
  const { logout } = useAuth();
  const [garage, setGarage] = useState<GarageBackendResponse | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState('');
  const [idCard, setIdCard] = useState('');
  const [licenseStorageKey, setLicenseStorageKey] = useState('');
  const [idCardStorageKey, setIdCardStorageKey] = useState('');
  const [nd13Consent, setNd13Consent] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setGarage(null);
    setMissing(false);
    setError('');
    setSuccessMessage('');
    try {
      const current = await managementApi.garage();
      setGarage(current);
      setLicense(current.businessLicenseUrl ?? '');
      setIdCard(current.idCardUrl ?? '');
      setMissing(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing(true);
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [screen]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');

    if (!nd13Consent) {
      setError('Vui lòng đồng ý với Điều khoản xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP trước khi nộp hồ sơ.');
      setSaving(false);
      return;
    }

    if (!license || !idCard) {
      setError('Vui lòng tải đầy đủ Giấy phép kinh doanh và CCCD của chủ gara.');
      setSaving(false);
      return;
    }

    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const updated = await request<GarageBackendResponse>(
        missing ? '/garages/register' : '/garages/me/application',
        missing ? 'POST' : 'PUT',
        {
          ...data,
          businessLicenseUrl: license,
          idCardUrl: idCard,
          businessLicenseStorageKey: licenseStorageKey || undefined,
          idCardStorageKey: idCardStorageKey || undefined
        }
      );
      setGarage(updated);
      setMissing(false);
      setSuccessMessage('Hồ sơ của bạn đã được gửi thành công! Ban quản trị sẽ thẩm định trong thời gian sớm nhất.');
    } catch (e) {
      setError((e as Error).message || 'Có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-slate-600 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="text-sm font-medium">Đang kiểm tra trạng thái hồ sơ gara...</span>
      </div>
    );
  }

  if (garage?.status === 'APPROVED') {
    return <>{children}</>;
  }

  return (
    <div className="garage-portal garage-onboarding">
      <GarageHeading
        title="Hồ sơ đối tác gara"
        description="Hoàn thiện thông tin và tài liệu pháp lý để bắt đầu quản lý gara trên hệ thống."
      />

      <div className="garage-columns">
        {/* Cột trái: Giới thiệu quy trình xét duyệt */}
        <aside>
          <span className="garage-eyebrow">ĐỒNG HÀNH CÙNG ĐỘI CỨU HỘ</span>
          <h2>
            Sẵn sàng phục vụ,
            <br />
            kết nối mọi hành trình.
          </h2>
          <p>
            Hồ sơ pháp lý được thẩm định chặt chẽ trước khi gara có thể thêm chi nhánh, mời thợ sửa xe và niêm yết bảng giá cứu hộ ngập nước.
          </p>
          <ol>
            <li>Điền thông tin pháp lý của gara</li>
            <li>Tải Giấy phép KD & CCCD (Bảo mật NĐ 13)</li>
            <li>Ban quản trị thẩm định & phê duyệt</li>
            <li>Kích hoạt tài khoản và vận hành gara</li>
          </ol>
        </aside>

        {/* Cột phải: Trạng thái & Biểu mẫu nộp lại hồ sơ */}
        <GaragePanel
          title="Thông tin & Giấy tờ thẩm định"
          description="Cung cấp thông tin chính xác và hình ảnh tài liệu rõ nét để được xét duyệt nhanh chóng"
        >
          {/* ================= HIGHLIGHT TRẠNG THÁI HỒ SƠ ================= */}
          <div className="space-y-3 mb-5">
            {/* 1. Trạng thái PENDING - Chờ duyệt */}
            {garage?.status === 'PENDING' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-2xs animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200/90 text-amber-900 border border-amber-300">
                        <Clock className="w-3.5 h-3.5" /> Chờ xét duyệt
                      </span>
                      <span className="text-xs text-amber-700 font-medium">Hồ sơ đã được tiếp nhận</span>
                    </div>
                    <h3 className="text-sm font-semibold text-amber-950 mb-1">
                      Hồ sơ đối tác gara đang được Ban quản trị thẩm định
                    </h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Thông tin gara và tài liệu xác minh (Giấy phép kinh doanh, CCCD chủ gara) đã được gửi đến bộ phận kiểm duyệt. Thời gian xét duyệt tiêu chuẩn từ <strong>24h - 48h làm việc</strong>. Bạn có thể kiểm tra lại trạng thái sau hoặc cập nhật thông tin bổ sung nếu cần thiết.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Trạng thái REJECTED - Bị từ chối */}
            {garage?.status === 'REJECTED' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-2xs animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 rounded-lg text-rose-700 shrink-0 mt-0.5">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200/90 text-rose-900 border border-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5" /> Hồ sơ bị từ chối
                      </span>
                      <span className="text-xs text-rose-700 font-medium">Cần chỉnh sửa & nộp lại</span>
                    </div>
                    <h3 className="text-sm font-semibold text-rose-950 mb-1">
                      Hồ sơ của bạn chưa đủ điều kiện phê duyệt
                    </h3>

                    {/* Lý do từ chối nổi bật */}
                    <div className="mt-2 p-3 bg-white/95 rounded-lg border border-rose-200 shadow-2xs">
                      <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Lý do từ chối từ Ban quản trị:
                      </p>
                      <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                        {garage.rejectionReason || 'Thông tin gara hoặc ảnh tài liệu KYC chưa rõ ràng, mờ nhòe hoặc không khớp. Vui lòng kiểm tra và gửi lại.'}
                      </p>
                    </div>

                    <p className="text-xs text-rose-800 mt-2 leading-relaxed">
                      Vui lòng xem kỹ lý do từ chối ở trên, cập nhật lại thông tin hoặc chụp lại ảnh tài liệu rõ nét hơn ở biểu mẫu bên dưới và nhấn nút <strong>"Cập nhật và nộp lại hồ sơ"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Trạng thái SUSPENDED - Đã đình chỉ */}
            {garage?.status === 'SUSPENDED' && (
              <div className="rounded-xl border border-slate-300 bg-slate-100/90 p-4 text-slate-900 shadow-2xs animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg text-slate-700 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300 mb-1">
                      Đã đình chỉ hoạt động
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">
                      Tài khoản đối tác gara tạm thời bị tạm dừng
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Tài khoản của bạn hiện đang trong trạng thái đình chỉ do vi phạm quy chế hoạt động hoặc có yêu cầu từ cơ quan quản lý. Vui lòng liên hệ bộ phận chăm sóc khách hàng để được hướng dẫn giải quyết.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Trạng thái Missing - Chưa có hồ sơ */}
            {missing && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-blue-900 shadow-2xs animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-700 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-200 text-blue-900 border border-blue-300 mb-1">
                      Chưa nộp hồ sơ đối tác
                    </span>
                    <h3 className="text-sm font-semibold text-blue-950 mb-1">
                      Hãy hoàn tất hồ sơ đăng ký để kích hoạt gara
                    </h3>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Vui lòng nhập tên gara, số điện thoại liên hệ và tải lên Giấy phép kinh doanh cùng CCCD của chủ gara để hoàn tất thủ tục đăng ký đối tác.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Thông báo lỗi & thành công nếu có */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================= BIỂU MẪU ĐIỀN / NỘP LẠI HỒ SƠ ================= */}
          {(missing || (garage && ['PENDING', 'REJECTED'].includes(garage.status))) && (
            <form onSubmit={submit} className="garage-form space-y-4">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Thông tin cơ bản của Gara
                </h4>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Gara đối tác <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                    name="garageName"
                    placeholder="VD: Gara Cứu Hộ & Sửa Xe Sài Gòn"
                    defaultValue={garage?.garageName}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại hotline gara <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                    name="phone"
                    required
                    placeholder="VD: 0987654321"
                    defaultValue={garage?.phone}
                  />
                </div>
              </div>

              {/* Tải lên Giấy phép kinh doanh & CCCD */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Tài liệu pháp lý & KYC
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Mã hóa NĐ 13/2023/NĐ-CP
                  </span>
                </div>

                {/* Giấy phép kinh doanh */}
                <DocumentUpload
                  label="Giấy phép kinh doanh"
                  value={license}
                  onChange={setLicense}
                  onStorageKeyChange={setLicenseStorageKey}
                  docType="business-license"
                />

                {/* CCCD của chủ gara */}
                <DocumentUpload
                  label="CCCD của chủ gara"
                  value={idCard}
                  onChange={setIdCard}
                  onStorageKeyChange={setIdCardStorageKey}
                  docType="id-cards"
                />

                {/* Cam kết tuân thủ Nghị định 13/2023/NĐ-CP */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={nd13Consent}
                      onChange={(e) => setNd13Consent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-slate-600 leading-snug">
                      Tôi đã đọc và đồng ý với{' '}
                      <span className="font-semibold text-slate-800 underline decoration-slate-300">
                        Điều khoản xử lý và bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP
                      </span>
                      , cho phép hệ thống lưu trữ mã hóa tài liệu phục vụ công tác thẩm định đối tác.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi hồ sơ...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Cập nhật và nộp lại hồ sơ
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= TOOLBAR HÀNH ĐỘNG PHỤ ================= */}
          <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Kiểm tra lại trạng thái
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng xuất
            </button>
          </div>
        </GaragePanel>
      </div>
    </div>
  );
}
