import React, { useState } from 'react';
import { API_BASE_URL } from '../services/apiConfig';
import { authStorage } from '../services/authApi';
export function DocumentUpload({
  label,
  value,
  onChange,
  name
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unavailableMessage = 'Hiện chưa thể tải ảnh lên hệ thống. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.';
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
      input.value = '';
      return;
    }
    setBusy(true);
    setError('');
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
        if (response.status === 413) setError('Ảnh vượt quá dung lượng cho phép. Vui lòng chọn ảnh tối đa 5 MB.');
        else if (response.status === 401 || response.status === 403)
          setError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        else if (response.status === 400)
          setError('Không thể tải ảnh này. Vui lòng chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.');
        else setError(unavailableMessage);
        return;
      }
      const url = json.data?.url;
      if (typeof url !== 'string' || !url.startsWith('https://') || url.includes('res.cloudinary.com/demo/')) {
        setError(unavailableMessage);
        return;
      }
      onChange(url);
    } catch {
      setError('Không thể kết nối để tải ảnh. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      input.value = '';
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">
        {label} *
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => void upload(e)}
          className="block w-full border rounded p-2 mt-1"
        />
      </label>
      {name && <input type="hidden" name={name} value={value} />}
      <p className="text-xs text-slate-500">Ảnh JPG, PNG hoặc WebP, tối đa 5 MB.</p>
      {busy && <p role="status">Đang tải ảnh...</p>}
      {value && (
        <a href={value} className="underline text-orange-700" target="_blank" rel="noopener noreferrer">
          Xem ảnh đã tải
        </a>
      )}
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
