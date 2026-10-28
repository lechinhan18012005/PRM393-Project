import React, { useState } from 'react';
import { API_BASE_URL } from '../services/apiConfig';
import { authStorage } from '../services/authApi';

export function DocumentUpload({
  label,
  value,
  onChange,
  name,
  error: externalError
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [internalError, setInternalError] = useState('');
  const unavailableMessage = 'Hiện chưa thể tải ảnh lên hệ thống. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.';

  const displayError = internalError || externalError;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setInternalError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
      input.value = '';
      return;
    }
    setBusy(true);
    setInternalError('');
    onChange('');
    const data = new FormData();
    data.append('file', file);
    data.append('folder', 'garage_documents');
    const token = authStorage.getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/upload/image`, {
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
          setInternalError('Không thể tải ảnh này. Vui lòng chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
        else setInternalError(unavailableMessage);
        return;
      }
      const url = json.data?.url;
      if (typeof url !== 'string' || !url.startsWith('https://') || url.includes('res.cloudinary.com/demo/')) {
        setInternalError(unavailableMessage);
        return;
      }
      setInternalError('');
      onChange(url);
    } catch {
      setInternalError('Không thể kết nối để tải ảnh. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      input.value = '';
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label} <span className="text-red-500">*</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => void upload(e)}
          className={`block w-full border rounded-xl p-2 mt-1 text-sm bg-slate-50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer ${
            displayError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
          }`}
        />
      </label>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Ảnh JPG, PNG hoặc WebP, tối đa 5 MB.</span>
        {value && (
          <a
            href={value}
            className="underline text-orange-600 hover:text-orange-700 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Xem ảnh đã tải
          </a>
        )}
      </div>
      {busy && <p role="status" className="text-xs text-orange-500 font-medium">Đang tải ảnh lên...</p>}
      {displayError && (
        <p role="alert" className="text-red-500 text-xs font-medium mt-1">
          {displayError}
        </p>
      )}
    </div>
  );
}
