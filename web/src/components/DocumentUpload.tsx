import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../services/apiConfig';
import { authStorage } from '../services/authApi';
import { Upload, Trash2, Eye, CheckCircle2, ShieldCheck, RefreshCw, Loader2, FileText } from 'lucide-react';

export function DocumentUpload({
  label,
  value,
  onChange,
  name,
  error: externalError,
  docType = 'id-cards',
  onStorageKeyChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  error?: string;
  docType?: 'id-cards' | 'business-license' | 'general';
  onStorageKeyChange?: (key: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const unavailableMessage = 'Hiện chưa thể tải ảnh lên hệ thống. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.';

  const displayError = internalError || externalError;
  const isSecureKyc = docType === 'id-cards' || docType === 'business-license';

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setInternalError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
      input.value = '';
      return;
    }

    // Set immediate local thumbnail preview for instant feedback
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setFileName(file.name);
    setFileSize(file.size);

    setBusy(true);
    setInternalError('');

    const uploadUrl = isSecureKyc ? `${API_BASE_URL}/kyc/upload` : `${API_BASE_URL}/upload/image`;

    const data = new FormData();
    data.append('file', file);
    if (isSecureKyc) {
      data.append('docType', docType);
    } else {
      data.append('folder', 'garage_documents');
    }

    const token = authStorage.getToken();
    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: data
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        if (response.status === 413) setInternalError('Ảnh vượt quá dung lượng cho phép. Vui lòng chọn ảnh tối đa 5 MB.');
        else if (response.status === 401 || response.status === 403)
          setInternalError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        else if (response.status === 400)
          setInternalError(json?.message || 'Không thể tải ảnh này. Vui lòng chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
        else setInternalError(unavailableMessage);
        return;
      }

      if (isSecureKyc) {
        const serverPreviewUrl = json.data?.previewUrl;
        const storageKey = json.data?.storageKey;
        if (!serverPreviewUrl || !storageKey) {
          setInternalError(unavailableMessage);
          return;
        }
        setInternalError('');
        onChange(serverPreviewUrl);
        onStorageKeyChange?.(storageKey);
      } else {
        const url = json.data?.url;
        if (typeof url !== 'string' || !url.startsWith('https://')) {
          setInternalError(unavailableMessage);
          return;
        }
        setInternalError('');
        onChange(url);
      }
    } catch {
      setInternalError('Không thể kết nối để tải ảnh. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      if (input) input.value = '';
      setBusy(false);
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setFileName('');
    setFileSize(null);
    setInternalError('');
    onChange('');
    onStorageKeyChange?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentDisplayImage = localPreview || value;

  return (
    <div className="space-y-1">
      {/* Label and Badge */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} <span className="text-red-500">*</span>
        </label>
        {isSecureKyc && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200/60">
            <ShieldCheck size={11} className="text-emerald-600" />
            AES-256
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => void upload(e)}
        style={{ display: 'none' }}
        className="hidden !hidden"
      />
      {name && <input type="hidden" name={name} value={value} />}

      {/* State 1: Uploading state */}
      {busy && (
        <div className="border border-orange-200 bg-orange-50/60 rounded-lg p-2.5 flex items-center justify-center gap-2 animate-pulse">
          <Loader2 size={15} className="animate-spin text-orange-600" />
          <span className="text-xs font-semibold text-orange-800">
            Đang mã hóa & tải lên bảo mật...
          </span>
        </div>
      )}

      {/* State 2: Image Added - Compact Preview & Delete Button */}
      {!busy && currentDisplayImage && (
        <div
          className={`relative border rounded-lg overflow-hidden p-1.5 transition-all bg-white ${
            displayError ? 'border-red-400 bg-red-50/20' : 'border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {/* Thumbnail Preview Container */}
            <div className="relative w-16 h-12 rounded overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs group flex items-center justify-center">
              <img
                src={currentDisplayImage}
                alt={label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-placeholder');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
              <div
                className="fallback-placeholder hidden flex-col items-center justify-center text-slate-400 text-[10px] w-full h-full bg-slate-50"
                style={{ display: 'none' }}
              >
                <FileText size={16} className="text-orange-500 mb-0.5" />
                <span>Xem tệp</span>
              </div>
              {value && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Xem ảnh kích thước lớn"
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                >
                  <Eye size={14} />
                </a>
              )}
            </div>

            {/* File Info & Action Buttons */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 truncate">
                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{fileName || `Ảnh ${label.toLowerCase()}`}</span>
                </div>
                <span className="text-[10px] text-slate-400 ml-1 shrink-0">
                  {fileSize ? `${(fileSize / (1024 * 1024)).toFixed(1)}MB` : 'Đã tải'}
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-1.5 mt-1">
                {value && (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-700 hover:text-orange-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-colors"
                  >
                    <Eye size={10} />
                    Xem
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-700 hover:text-orange-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                >
                  <RefreshCw size={10} />
                  Đổi
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-1.5 py-0.5 rounded transition-colors ml-auto cursor-pointer"
                >
                  <Trash2 size={10} />
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Empty State - Compact Horizontal Dropzone */}
      {!busy && !currentDisplayImage && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`group relative border border-dashed rounded-lg p-2 flex items-center gap-2.5 text-left cursor-pointer transition-all duration-150 ${
            displayError
              ? 'border-red-400 bg-red-50/30 hover:bg-red-50/50'
              : 'border-slate-300 bg-slate-50/70 hover:bg-orange-50/40 hover:border-orange-400'
          }`}
        >
          <div className="w-7 h-7 rounded bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 group-hover:text-orange-500 group-hover:border-orange-200 shrink-0 transition-all">
            <Upload size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 group-hover:text-orange-600 transition-colors truncate">
              Bấm để chọn ảnh {label.toLowerCase()}
            </p>
            <p className="text-[10px] text-slate-400">
              JPG, PNG, WebP (tối đa 5 MB)
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <p role="alert" className="text-red-500 text-[11px] font-medium leading-tight">
          {displayError}
        </p>
      )}
    </div>
  );
}
