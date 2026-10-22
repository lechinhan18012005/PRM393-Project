import { ViewGuide } from '../ViewGuide';
import React, { useState, useEffect, useCallback } from 'react';
import { GarageApplicant } from '../../types';
import { garageApi, GarageBranchBackend, GarageMechanicBackend } from '../../services/garageApi';

interface GarageVerificationViewProps {
  applicants?: GarageApplicant[];
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Vừa xong';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  } catch {
    return 'Hôm nay';
  }
}

export const GarageVerificationView: React.FC<GarageVerificationViewProps> = ({ onShowToast }) => {
  const [applicantsList, setApplicantsList] = useState<GarageApplicant[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'suspended' | 'approved' | 'rejected'>('pending');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [auditorNote, setAuditorNote] = useState<string>('');
  const [docTab, setDocTab] = useState<'id_card' | 'business_license' | 'certificate'>('id_card');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  // Real branches & mechanics for currently inspected garage
  const [branches, setBranches] = useState<GarageBranchBackend[]>([]);
  const [mechanics, setMechanics] = useState<GarageMechanicBackend[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Load real garages from backend
  const fetchBackendGarages = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const liveGarages = await garageApi.getAllGarages();
      if (liveGarages && liveGarages.length > 0) {
        const mapped: GarageApplicant[] = liveGarages.map((item) => {
          let badgeText: string | undefined;
          if (item.status === 'PENDING') badgeText = 'MỚI NỘP';
          else if (item.status === 'APPROVED') badgeText = 'ĐÃ KÍCH HOẠT';
          else if (item.status === 'SUSPENDED') badgeText = 'ĐÃ ĐÌNH CHỈ';
          else if (item.status === 'REJECTED') badgeText = 'ĐÃ TỪ CHỐI';

          return {
            id: `GAR-${item.id}`,
            numericId: item.id,
            name: item.garageName,
            area: item.address
              ? item.address.includes(',')
                ? item.address.split(',').pop()!.trim()
                : item.address
              : 'TP. Hồ Chí Minh',
            ownerName: item.ownerName || 'Chưa cập nhật',
            ownerEmail: item.ownerEmail,
            phone: item.phone || 'Chưa cập nhật',
            branchesCount: item.branchCount || 0,
            mechanicsCount: item.mechanicCount || 0,
            timeAgo: formatTimeAgo(item.createdAt),
            status: item.status,
            badge: badgeText,
            taxCode: 'Chưa có dữ liệu',
            idCardNumber: 'Xem giấy tờ đính kèm',
            address: item.address || 'Chưa thiết lập địa chỉ trụ sở',
            ekycMatchRate: 0,
            idCardUrl: item.idCardUrl,
            businessLicenseUrl: item.businessLicenseUrl,
            rejectionReason: item.rejectionReason,
            createdAt: item.createdAt,
            branches: [],
            equipment: []
          };
        });

        setApplicantsList(mapped);
        setSelectedApplicantId((curr) => {
          if (curr && mapped.some((m) => m.id === curr)) return curr;
          return mapped[0]?.id || '';
        });
      } else {
        setApplicantsList([]);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Không tải được danh sách gara. Vui lòng thử lại.');
      setApplicantsList([]);
      setSelectedApplicantId('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendGarages();
  }, [fetchBackendGarages]);

  // Tab filtering
  const filteredApplicants = applicantsList.filter((a) => {
    if (activeTab === 'pending' && a.status !== 'PENDING') return false;
    if (activeTab === 'approved' && a.status !== 'APPROVED') return false;
    if (activeTab === 'rejected' && a.status !== 'REJECTED') return false;
    if (activeTab === 'suspended' && a.status !== 'SUSPENDED') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.ownerName.toLowerCase().includes(q) && !a.phone.includes(q)) {
        return false;
      }
    }
    if (areaFilter !== 'all' && !a.area.toLowerCase().includes(areaFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const selectedApplicant = filteredApplicants.find((a) => a.id === selectedApplicantId) || filteredApplicants[0];

  // Cancel obsolete responses when staff switches between garage dossiers.
  useEffect(() => {
    let cancelled = false;
    setBranches([]);
    setMechanics([]);
    setDetailError('');
    setDetailLoading(false);
    if (!selectedApplicant) return;
    setAuditorNote(selectedApplicant.rejectionReason || '');
    const id = selectedApplicant.numericId;
    if (id === undefined) return;
    setDetailLoading(true);
    Promise.all([garageApi.getGarageBranches(id), garageApi.getGarageMechanics(id)])
      .then(([bList, mList]) => {
        if (!cancelled) {
          setBranches(bList);
          setMechanics(mList);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setDetailError(err.message || 'Không tải được chi nhánh và đội thợ.');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedApplicant?.id, selectedApplicant?.numericId, selectedApplicant?.rejectionReason]);

  const handleApprove = async () => {
    if (!selectedApplicant || isActivating) return;
    setIsActivating(true);
    try {
      const rawId = selectedApplicant.numericId || parseInt(selectedApplicant.id.replace('GAR-', ''), 10);
      if (!isNaN(rawId)) {
        await garageApi.moderateGarage(rawId, 'APPROVED', auditorNote || 'Hồ sơ pháp lý hợp lệ');
        onShowToast(
          'Kích Hoạt Garage Thành Công!',
          `Đã kích hoạt ${selectedApplicant.name}. Hệ thống đã mở tiếp nhận đơn cứu hộ ngập lụt.`,
          'success'
        );
        await fetchBackendGarages();
      }
    } catch (err: any) {
      onShowToast('Lỗi Phê Duyệt', err.message || 'Lỗi kết nối API', 'error');
    } finally {
      setIsActivating(false);
      setShowConfirmModal(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplicant || isActivating) return;
    setIsActivating(true);
    try {
      const rawId = selectedApplicant.numericId || parseInt(selectedApplicant.id.replace('GAR-', ''), 10);
      if (!isNaN(rawId)) {
        await garageApi.moderateGarage(rawId, 'REJECTED', auditorNote || 'Hồ sơ chưa đạt tiêu chuẩn');
        onShowToast(
          'Đã Từ Chối Hồ Sơ',
          `Đã lưu quyết định từ chối hồ sơ của ${selectedApplicant.ownerName}.`,
          'warning'
        );
        await fetchBackendGarages();
      }
    } catch (err: any) {
      onShowToast('Lỗi Từ Chối', err.message || 'Lỗi kết nối API', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleRequestDocs = async () => {
    if (!selectedApplicant || isActivating) return;
    setIsActivating(true);
    try {
      const rawId = selectedApplicant.numericId || parseInt(selectedApplicant.id.replace('GAR-', ''), 10);
      if (!isNaN(rawId)) {
        await garageApi.moderateGarage(rawId, 'REJECTED', auditorNote.trim() || 'Vui lòng bổ sung giấy tờ hồ sơ gara');
        onShowToast(
          'Yêu Cầu Bổ Sung',
          `Đã trả hồ sơ ${selectedApplicant.name} để chủ gara bổ sung và nộp lại.`,
          'info'
        );
        await fetchBackendGarages();
      }
    } catch (err: any) {
      onShowToast('Lỗi Thao Tác', err.message || 'Lỗi kết nối API', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedApplicant || isActivating) return;
    setIsActivating(true);
    try {
      const rawId = selectedApplicant.numericId || parseInt(selectedApplicant.id.replace('GAR-', ''), 10);
      if (!isNaN(rawId)) {
        await garageApi.moderateGarage(rawId, 'SUSPENDED', auditorNote || 'Tạm dừng tiếp nhận đơn để rà soát');
        onShowToast(
          'Đã Tạm Dừng Hoạt Động',
          `Garage ${selectedApplicant.name} đã tạm dừng nhận đơn cứu hộ.`,
          'warning'
        );
        await fetchBackendGarages();
      }
    } catch (err: any) {
      onShowToast('Lỗi Thao Tác', err.message || 'Lỗi kết nối API', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedApplicant || isActivating) return;
    setIsActivating(true);
    try {
      const rawId = selectedApplicant.numericId || parseInt(selectedApplicant.id.replace('GAR-', ''), 10);
      if (!isNaN(rawId)) {
        await garageApi.moderateGarage(
          rawId,
          selectedApplicant.status === 'NEED_INFO' ? 'REJECTED' : selectedApplicant.status,
          auditorNote
        );
        onShowToast('Cập Nhật Thành Công', 'Đã lưu ghi chú thẩm định viên vào hệ thống.', 'success');
        await fetchBackendGarages();
      }
    } catch (err: any) {
      onShowToast('Lỗi Cập Nhật', err.message || 'Lỗi kết nối API', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleExportAudit = () => {
    if (applicantsList.length === 0) {
      onShowToast('Thông Báo', 'Không có dữ liệu garage để xuất báo cáo.', 'info');
      return;
    }
    const headers = 'Mã Garage,Tên Garage,Chủ Gara,SĐT,Trạng Thái,Chi Nhánh,Thợ Cơ Động,Ngày Nộp';
    const rows = applicantsList.map(
      (a) =>
        `"${a.id}","${a.name}","${a.ownerName}","${a.phone}","${a.status}","${a.branchesCount}","${a.mechanicsCount}","${a.timeAgo}"`
    );
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_danh_sach_gara_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Xuất Báo Cáo', 'Đã tải xuống file CSV danh sách garage thẩm định thành công.');
  };

  const availableAreas = Array.from(new Set(applicantsList.map((a) => a.area).filter(Boolean)));

  return (
    <div className="flex flex-col w-full">
      {loadError && (
        <div role="alert" className="border border-red-300 bg-red-50 p-4 mb-4 rounded">
          <p>{loadError}</p>
          <button onClick={() => void fetchBackendGarages()}>Thử lại</button>
        </div>
      )}
      {detailError && (
        <p role="alert" className="text-red-700 p-3">
          {detailError}
        </p>
      )}
      {/* Command Header & Operational Sub-navigation */}
      <section className="bg-surface-container-lowest p-space-md mb-space-md rounded shadow-sm border border-surface-container">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md pb-space-sm border-b border-surface-container">
          <div className="flex items-center gap-space-md">
            <div className="w-10 h-10 rounded bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-tight font-bold">
                  Duyệt hồ sơ gara
                </h1>
                <span className="px-space-sm py-0.5 rounded font-label-sm text-label-sm bg-error-container text-on-error-container font-bold">
                  Duyệt trong 30 phút
                </span>
              </div>
              <ViewGuide>
                <p className="font-body-sm text-body-sm text-secondary">
                  Kiểm tra giấy tờ chủ gara, chi nhánh và đội thợ từ dữ liệu hồ sơ đã nộp.
                </p>
              </ViewGuide>
            </div>
          </div>

          {/* Action Utilities */}
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center bg-surface-container-low px-space-md py-1.5 rounded">
              <span className="material-symbols-outlined text-secondary text-[18px] mr-1">monitoring</span>
              <span className="font-data-mono text-data-mono text-secondary">
                Tổng hồ sơ hệ thống: <strong className="text-on-surface">{applicantsList.length} gara</strong>
              </span>
            </div>
            <button
              onClick={handleExportAudit}
              className="bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Xuất Báo Cáo Audit</span>
            </button>
            <button
              onClick={fetchBackendGarages}
              disabled={isLoading}
              title="Làm mới dữ liệu từ API"
              className="p-2 rounded bg-surface-container-low hover:bg-surface-container-high text-secondary cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Status Tabs Segment */}
        <div className="flex flex-wrap items-center gap-space-xs pt-space-sm">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'pending'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>Chờ duyệt ({applicantsList.filter((a) => a.status === 'PENDING').length} hồ sơ)</span>
          </button>
          <button
            onClick={() => setActiveTab('suspended')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'suspended'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span>Đình chỉ ({applicantsList.filter((a) => a.status === 'SUSPENDED').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'approved'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>Đã kích hoạt ({applicantsList.filter((a) => a.status === 'APPROVED').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'rejected'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span>Đã từ chối ({applicantsList.filter((a) => a.status === 'REJECTED').length})</span>
          </button>
        </div>
      </section>

      {/* Two-Pane High Density Verification View */}
      <div className="grid grid-cols-12 gap-gutter-desktop items-start pb-28">
        {/* LEFT PANE: Application Backlog Queue */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-space-sm">
          {/* Search & Filters */}
          <div className="bg-surface-container-lowest p-space-sm rounded shadow-sm flex flex-col gap-space-xs border border-surface-container">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                search
              </span>
              <input
                className="w-full h-8 pl-8 pr-3 text-body-sm font-body-sm bg-surface-container-low rounded border-0 text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Tìm theo tên gara, SĐT, chủ hộ..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-secondary px-1 flex-wrap gap-1">
              <span className="font-label-sm text-label-sm">LỌC KHU VỰC:</span>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setAreaFilter('all')}
                  className={`px-1.5 py-0.5 rounded font-data-mono text-label-sm cursor-pointer ${
                    areaFilter === 'all'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container-high text-on-surface'
                  }`}
                >
                  Tất cả
                </button>
                {availableAreas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setAreaFilter(areaFilter === area ? 'all' : area)}
                    className={`px-1.5 py-0.5 rounded font-data-mono text-label-sm cursor-pointer ${
                      areaFilter === area
                        ? 'bg-primary text-on-primary font-bold'
                        : 'bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Applicant Cards Queue */}
          <div className="flex flex-col gap-space-sm max-h-[calc(100vh-290px)] overflow-y-auto pr-0.5">
            {isLoading ? (
              <div className="p-space-lg text-center text-secondary bg-surface-container-lowest rounded border border-surface-container">
                <span className="material-symbols-outlined text-[32px] animate-spin mb-1 text-primary">
                  progress_activity
                </span>
                <p className="font-body-sm">Đang tải danh sách hồ sơ từ hệ thống...</p>
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="p-space-lg text-center text-secondary bg-surface-container-lowest rounded border border-surface-container">
                <span className="material-symbols-outlined text-[32px] mb-1">folder_open</span>
                <p className="font-body-sm">Không có hồ sơ nào trong mục này.</p>
              </div>
            ) : (
              filteredApplicants.map((applicant) => {
                const isSelected = applicant.id === selectedApplicantId;
                let statusBadgeColor = 'bg-surface-container-high text-on-surface';
                let statusLabel = 'CHỜ THẨM ĐỊNH';

                if (applicant.status === 'APPROVED') {
                  statusBadgeColor = 'bg-tertiary/15 text-tertiary';
                  statusLabel = 'ĐÃ KÍCH HOẠT';
                } else if (applicant.status === 'REJECTED') {
                  statusBadgeColor = 'bg-error/15 text-error';
                  statusLabel = 'ĐÃ TỪ CHỐI';
                } else if (applicant.status === 'SUSPENDED') {
                  statusBadgeColor = 'bg-amber-100 text-amber-800';
                  statusLabel = 'ĐÃ ĐÌNH CHỈ';
                }

                return (
                  <div
                    key={applicant.id}
                    onClick={() => setSelectedApplicantId(applicant.id)}
                    className={`bg-surface-container-lowest p-space-md rounded shadow-sm relative overflow-hidden transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-primary shadow-md bg-gradient-to-r from-primary/5 via-surface-container-lowest to-surface-container-lowest'
                        : 'border-surface-container hover:shadow-md'
                    }`}
                  >
                    {applicant.badge && (
                      <div
                        className={`absolute top-0 right-0 px-2 py-0.5 font-label-sm text-label-sm uppercase rounded-bl font-bold flex items-center gap-1 ${
                          applicant.status === 'PENDING'
                            ? 'bg-primary-container text-on-primary-container'
                            : applicant.status === 'APPROVED'
                              ? 'bg-tertiary text-on-tertiary'
                              : applicant.status === 'SUSPENDED'
                                ? 'bg-amber-500 text-white'
                                : 'bg-error text-on-error'
                        }`}
                      >
                        {applicant.status === 'PENDING' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        )}
                        <span>{applicant.badge}</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mt-1">
                      <div>
                        <span className="font-data-mono text-data-mono text-secondary font-bold">{applicant.id}</span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface mt-0.5 leading-snug font-semibold">
                          {applicant.name}
                        </h3>
                        <p className="font-body-sm text-body-sm text-secondary">{applicant.area}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-space-xs mt-space-sm pt-space-xs bg-surface-container-low p-space-sm rounded">
                      <div>
                        <span className="font-label-sm text-label-sm text-secondary block">CHỦ HỘ KD</span>
                        <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate block">
                          {applicant.ownerName}
                        </span>
                      </div>
                      <div>
                        <span className="font-label-sm text-label-sm text-secondary block">LIÊN LẠC</span>
                        <span className="font-data-mono text-data-mono text-primary font-bold">{applicant.phone}</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-label-sm text-label-sm text-secondary block">QUY MÔ MẠNG LƯỚI</span>
                        <span className="font-label-md text-label-md text-on-surface">
                          {applicant.branchesCount} Chi nhánh trực chiến
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="font-label-sm text-label-sm text-secondary block">ĐỘI THỢ CƠ ĐỘNG</span>
                        <span className="font-label-md text-label-md text-tertiary font-bold">
                          {applicant.mechanicsCount} Thợ cơ động
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-space-sm pt-space-xs text-secondary font-label-sm text-label-sm">
                      <span className="flex items-center gap-1 text-primary">
                        <span className="material-symbols-outlined text-[14px]">bolt</span>
                        {applicant.timeAgo}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${statusBadgeColor}`}>{statusLabel}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Inspection Dossier (Detailed Candidate View) */}
        {selectedApplicant ? (
          <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-space-md">
            {/* Primary Business Identity Strip */}
            <div className="bg-surface-container-lowest p-space-md rounded shadow-sm border border-surface-container">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-space-sm gap-space-sm border-b border-surface-container">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                      HỒ SƠ THẨM ĐỊNH CHI TIẾT
                    </span>
                    <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-data-mono text-label-sm font-bold">
                      MÃ: {selectedApplicant.id}
                    </span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight mt-0.5">
                    {selectedApplicant.name}
                  </h2>
                </div>
                <div className="flex items-center gap-space-xs">
                  <span
                    className={`flex items-center gap-1 px-2.5 py-1 rounded font-label-md text-label-md font-bold ${
                      selectedApplicant.idCardUrl
                        ? 'bg-surface-container-low text-tertiary'
                        : 'bg-surface-container-low text-secondary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                    {selectedApplicant.idCardUrl ? 'Đã đính kèm CCCD · chờ kiểm tra' : 'Chưa tải lên CCCD'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm bg-surface-container-low p-space-md rounded mt-space-xs">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Đại diện pháp luật</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold block">
                    {selectedApplicant.ownerName}
                  </span>
                  {selectedApplicant.ownerEmail && (
                    <span className="font-body-sm text-body-sm text-secondary block mt-0.5">
                      Email: {selectedApplicant.ownerEmail}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Trạng thái hồ sơ</span>
                  <span className="font-data-mono text-headline-sm text-on-surface font-bold">
                    {selectedApplicant.status}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary block mt-0.5">
                    {selectedApplicant.status === 'APPROVED'
                      ? 'Đã duyệt & đang nhận điều phối'
                      : selectedApplicant.status === 'PENDING'
                        ? 'Đang chờ thẩm định viên duyệt'
                        : selectedApplicant.status === 'SUSPENDED'
                          ? 'Đã đình chỉ hoạt động'
                          : 'Hồ sơ đã bị từ chối'}
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">
                    Trụ sở chính quản lý
                  </span>
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold block">
                    {selectedApplicant.address}
                  </span>
                  <span className="font-body-sm text-body-sm text-primary block mt-0.5 font-bold">
                    Hotline: {selectedApplicant.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* High Density Document Viewer Module */}
            <div className="bg-surface-container-lowest p-space-md rounded shadow-sm border border-surface-container">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Văn Bản Pháp Lý & Chứng Chỉ Tay Nghề
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded">
                  <span className="font-data-mono text-data-mono text-on-surface px-2">Tệp tài liệu đối chiếu</span>
                </div>
              </div>

              {/* Document Selector Tabs */}
              <div className="flex items-center gap-1 py-space-sm flex-wrap">
                <button
                  onClick={() => setDocTab('id_card')}
                  className={`px-space-md py-1.5 rounded font-label-md text-label-md font-bold flex items-center gap-1 cursor-pointer ${
                    docTab === 'id_card'
                      ? 'bg-surface-container-high text-on-surface'
                      : 'bg-surface-container-low text-secondary'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      selectedApplicant.idCardUrl ? 'text-tertiary' : 'text-secondary'
                    }`}
                  >
                    {selectedApplicant.idCardUrl ? 'check_circle' : 'pending'}
                  </span>
                  <span>CCCD 2 Mặt ({selectedApplicant.ownerName})</span>
                </button>
                <button
                  onClick={() => setDocTab('business_license')}
                  className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-1 cursor-pointer ${
                    docTab === 'business_license'
                      ? 'bg-surface-container-high text-on-surface font-bold'
                      : 'bg-surface-container-low text-secondary'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      selectedApplicant.businessLicenseUrl ? 'text-tertiary' : 'text-secondary'
                    }`}
                  >
                    {selectedApplicant.businessLicenseUrl ? 'verified' : 'pending'}
                  </span>
                  <span>GPKD Sửa Xe ({selectedApplicant.name})</span>
                </button>
                <button
                  onClick={() => setDocTab('certificate')}
                  className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-1 cursor-pointer ${
                    docTab === 'certificate'
                      ? 'bg-surface-container-high text-on-surface font-bold'
                      : 'bg-surface-container-low text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-primary text-[16px]">engineering</span>
                  <span>Chứng Chỉ Thợ Cứu Hộ ({mechanics.length} Thợ)</span>
                </button>
              </div>

              {/* Embedded Document Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm bg-surface-container-low p-space-sm rounded">
                {/* CCCD Document Canvas */}
                <div className="relative bg-surface-container-lowest rounded p-space-xs shadow-sm flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-1 px-1">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                      Mặt trước CCCD gắn chip
                    </span>
                    <span
                      className={`font-data-mono text-label-sm px-1.5 py-0.5 rounded font-bold ${
                        selectedApplicant.idCardUrl
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : 'bg-surface-container-high text-secondary'
                      }`}
                    >
                      {selectedApplicant.idCardUrl ? 'HỢP LỆ QUA eKYC' : 'CHƯA TẢI LÊN'}
                    </span>
                  </div>
                  <div className="w-full h-48 overflow-hidden rounded relative bg-surface-container-high flex items-center justify-center">
                    {selectedApplicant.idCardUrl ? (
                      <img className="w-full h-full object-cover" alt="CCCD" src={selectedApplicant.idCardUrl} />
                    ) : (
                      <div className="flex flex-col items-center text-secondary">
                        <span className="material-symbols-outlined text-[44px] mb-1">id_card</span>
                        <span className="font-label-sm text-label-sm font-semibold">Chủ gara chưa nộp ảnh CCCD</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 bg-on-background/80 text-surface-bright backdrop-blur-sm p-1 rounded font-data-mono text-label-sm flex justify-between">
                      <span>ĐẠI DIỆN: {selectedApplicant.ownerName.toUpperCase()}</span>
                      <span>SĐT: {selectedApplicant.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Business License Document Canvas */}
                <div className="relative bg-surface-container-lowest rounded p-space-xs shadow-sm flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-1 px-1">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                      Giấy Phép Kinh Doanh & Con Dấu
                    </span>
                    <span
                      className={`font-data-mono text-label-sm px-1.5 py-0.5 rounded font-bold ${
                        selectedApplicant.businessLicenseUrl
                          ? 'bg-surface-container-high text-on-surface'
                          : 'bg-surface-container-high text-secondary'
                      }`}
                    >
                      {selectedApplicant.businessLicenseUrl ? 'ĐÃ ĐỐI CHIẾU' : 'CHƯA TẢI LÊN'}
                    </span>
                  </div>
                  <div className="w-full h-48 overflow-hidden rounded relative bg-surface-container-high flex items-center justify-center">
                    {selectedApplicant.businessLicenseUrl ? (
                      <img
                        className="w-full h-full object-cover"
                        alt="GPKD"
                        src={selectedApplicant.businessLicenseUrl}
                      />
                    ) : (
                      <div className="flex flex-col items-center text-secondary">
                        <span className="material-symbols-outlined text-[44px] mb-1">description</span>
                        <span className="font-label-sm text-label-sm font-semibold">
                          Chưa tải lên Giấy phép kinh doanh
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 bg-on-background/80 text-surface-bright backdrop-blur-sm p-1 rounded font-data-mono text-label-sm flex justify-between">
                      <span>GARA: {selectedApplicant.name.toUpperCase()}</span>
                      <span>TRẠNG THÁI: {selectedApplicant.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedApplicant.rejectionReason && (
                <div className="mt-space-sm p-space-sm bg-surface-container-low rounded border-l-4 border-primary">
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-bold block">
                    Ghi chú thẩm định gần nhất:
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface mt-0.5 font-medium">
                    {selectedApplicant.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Multi-Branch Verification Section (Real API) */}
            <div className="bg-surface-container-lowest p-space-md rounded shadow-sm border border-surface-container">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container mb-space-sm">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Chi nhánh trực chiến ({branches.length} Điểm)
                    </h3>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Kiểm định vị trí thực địa, bán kính bao phủ vùng ngập và số lượng thợ cơ động tại chi nhánh.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md font-bold">
                  {branches.length} CHI NHÁNH HOẠT ĐỘNG
                </span>
              </div>

              {detailLoading ? (
                <div className="p-4 text-center text-secondary">
                  <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                  <p className="font-body-sm mt-1">Đang tải danh sách chi nhánh...</p>
                </div>
              ) : branches.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-sm">
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      className="bg-surface-container-low p-space-sm rounded flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-label-md text-label-md font-bold text-on-surface">{b.branchName}</span>
                          <span
                            className={`font-data-mono text-label-sm px-1.5 py-0.5 rounded font-bold ${
                              b.operatingStatus === 'OPEN'
                                ? 'bg-tertiary text-on-tertiary'
                                : 'bg-surface-container-high text-secondary'
                            }`}
                          >
                            {b.operatingStatus === 'OPEN' ? 'ĐANG MỞ CỬA' : b.operatingStatus}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm font-semibold text-on-surface">{b.address}</p>
                        {b.phoneNumber && (
                          <p className="font-body-sm text-body-sm text-secondary mt-1">
                            Hotline chi nhánh: <strong className="text-primary">{b.phoneNumber}</strong>
                          </p>
                        )}
                        {b.rescueVehicles && (
                          <div className="mt-2 bg-primary/10 text-primary p-1.5 rounded font-label-sm text-label-sm font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                            <span>{b.rescueVehicles}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 text-secondary font-label-sm text-label-sm flex justify-between border-t border-surface-container">
                        <span>
                          Tọa độ: {b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}
                        </span>
                        <span className="text-tertiary font-bold">{b.mechanicsCount || 0} Thợ trực chiến</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-container-low p-space-lg rounded text-center text-secondary">
                  <span className="material-symbols-outlined text-[32px] mb-1 text-secondary block">storefront</span>
                  <p className="font-body-sm text-body-sm">Garage này chưa đăng ký chi nhánh nào trên hệ thống.</p>
                </div>
              )}
            </div>

            {/* Mechanics & Crew Section (Real API) */}
            <div className="bg-surface-container-lowest p-space-md rounded shadow-sm border border-surface-container">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container mb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">engineering</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Đội Thợ Cứu Hộ Cơ Động ({mechanics.length} Nhân sự)
                  </h3>
                </div>
                <span className="font-data-mono text-data-mono text-secondary">
                  {mechanics.filter((m) => m.workingStatus === 'ONLINE' || m.workingStatus === 'BUSY').length} Thợ đang
                  trực chiến
                </span>
              </div>

              {mechanics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                  {mechanics.map((m) => (
                    <div
                      key={m.id}
                      className="bg-surface-container-low p-space-sm rounded flex items-start gap-space-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-lg shrink-0">
                        {m.fullName?.charAt(0) || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                            {m.fullName}
                          </span>
                          <span
                            className={`font-data-mono text-label-sm px-1.5 py-0.5 rounded font-bold ${
                              m.workingStatus === 'ONLINE'
                                ? 'bg-tertiary text-on-tertiary'
                                : m.workingStatus === 'BUSY'
                                  ? 'bg-error text-on-error'
                                  : 'bg-surface-container-high text-secondary'
                            }`}
                          >
                            {m.workingStatus}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-secondary">
                          SĐT: {m.phone} • {m.branchName || 'Chưa gán chi nhánh'}
                        </p>
                        <p className="font-body-sm text-body-sm text-primary font-medium mt-0.5">
                          {m.speciality || 'Cứu hộ thủy kích & sấy bugi'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-container-low p-space-md rounded text-center text-secondary">
                  <p className="font-body-sm text-body-sm">Chưa có thông tin nhân viên thợ cứu hộ đăng ký.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* STICKY ACTION BOTTOM TOOLBAR FOR AUDITOR DISPATCH */}
      {selectedApplicant && (
        <aside className="fixed bottom-0 left-64 right-0 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-40 px-margin-desktop py-space-sm border-t border-surface-container">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md max-w-full">
            {/* Auditor Notes Field */}
            <div className="flex items-center gap-space-sm flex-1 min-w-0">
              <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-on-surface shrink-0">
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
              </div>
              <div className="flex-1 relative">
                <input
                  className="w-full h-9 pl-3 pr-3 text-body-sm font-body-sm bg-surface-container-low rounded border-0 text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Nhập ghi chú thẩm định viên (Ví dụ: Đã gọi điện xác minh trụ sở, trang thiết bị đủ điều kiện)..."
                  type="text"
                  value={auditorNote}
                  onChange={(e) => setAuditorNote(e.target.value)}
                />
              </div>
            </div>

            {/* Action Decision Button Cluster */}
            <div className="flex items-center gap-space-sm shrink-0 flex-wrap">
              {selectedApplicant.status === 'PENDING' && (
                <>
                  <button
                    disabled={isActivating}
                    onClick={handleReject}
                    className="bg-error text-on-error hover:bg-on-error-container px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    <span>Từ Chối Hồ Sơ</span>
                  </button>

                  <button
                    disabled={isActivating}
                    onClick={handleRequestDocs}
                    className="bg-surface-container-high text-on-surface hover:bg-surface-container px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                    <span>Yêu Cầu Bổ Sung Giấy Tờ</span>
                  </button>

                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="bg-primary-container text-on-primary-container hover:bg-primary px-space-xl py-2 rounded font-headline-sm text-headline-sm flex items-center gap-2 shadow-sm transition-all transform active:scale-95 cursor-pointer font-bold"
                  >
                    <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    <span>Phê Duyệt & Kích Hoạt Garage Ngay</span>
                  </button>
                </>
              )}

              {selectedApplicant.status === 'APPROVED' && (
                <>
                  <span className="px-3 py-1.5 rounded bg-tertiary/15 text-tertiary font-bold text-label-md flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Garage đã kích hoạt</span>
                  </span>
                  <button
                    disabled={isActivating}
                    onClick={handleSuspend}
                    className="bg-amber-600 text-white hover:bg-amber-700 px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                    <span>Tạm Dừng Hoạt Động (Suspend)</span>
                  </button>
                  <button
                    disabled={isActivating}
                    onClick={handleUpdateNote}
                    className="bg-surface-container-high text-on-surface hover:bg-surface-container px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Lưu Ghi Chú</span>
                  </button>
                </>
              )}

              {selectedApplicant.status === 'REJECTED' && (
                <>
                  <span className="px-3 py-1.5 rounded bg-error/15 text-error font-bold text-label-md flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    <span>Hồ sơ đã bị từ chối</span>
                  </span>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="bg-primary-container text-on-primary-container hover:bg-primary px-space-lg py-2 rounded font-label-lg text-label-lg flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    <span>Xem Xét & Phê Duyệt Lại</span>
                  </button>
                </>
              )}

              {selectedApplicant.status === 'SUSPENDED' && (
                <>
                  <span className="px-3 py-1.5 rounded bg-amber-100 text-amber-800 font-bold text-label-md flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    <span>Đã đình chỉ hoạt động</span>
                  </span>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="bg-primary-container text-on-primary-container hover:bg-primary px-space-lg py-2 rounded font-label-lg text-label-lg flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Kích Hoạt Lại</span>
                  </button>
                  <button
                    disabled={isActivating}
                    onClick={handleReject}
                    className="bg-error text-on-error hover:bg-on-error-container px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    <span>Từ Chối Hẳn</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedApplicant && (
        <div className="fixed inset-0 bg-on-background/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full p-space-xl rounded shadow-2xl mx-margin border border-surface-container animate-scale-in">
            <div className="flex items-center gap-space-md text-primary mb-space-md">
              <div className="w-12 h-12 rounded bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">verified</span>
              </div>
              <div>
                <h4 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Xác Nhận Kích Hoạt Garage?
                </h4>
                <span className="font-body-sm text-body-sm text-secondary">
                  {selectedApplicant.id} ({branches.length} Chi nhánh trực chiến)
                </span>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface mb-space-md leading-relaxed">
              Sau khi kích hoạt, <strong>{selectedApplicant.name}</strong> sẽ ngay lập tức được cấp quyền nhận đơn cứu
              hộ ngập lụt từ người dân trong khu vực.
            </p>
            <div className="flex items-center justify-end gap-space-sm">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-space-md py-2 rounded bg-surface-container-low text-on-surface font-label-lg text-label-lg cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleApprove}
                disabled={isActivating}
                className="px-space-lg py-2 rounded bg-primary-container text-on-primary-container font-headline-sm text-headline-sm flex items-center gap-1 cursor-pointer font-bold disabled:opacity-75"
              >
                <span className={`material-symbols-outlined text-[18px] ${isActivating ? 'animate-spin' : ''}`}>
                  {isActivating ? 'refresh' : 'bolt'}
                </span>
                <span>{isActivating ? 'Đang kích hoạt...' : 'Xác Nhận & Kích Hoạt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
