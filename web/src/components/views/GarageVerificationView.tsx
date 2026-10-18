import { ViewGuide } from '../ViewGuide';
import React, { useState } from 'react';
import { GarageApplicant } from '../../types';

interface GarageVerificationViewProps {
  applicants: GarageApplicant[];
  onShowToast: (title: string, msg: string) => void;
}

export const GarageVerificationView: React.FC<GarageVerificationViewProps> = ({
  applicants,
  onShowToast
}) => {
  const [selectedApplicantId, setSelectedApplicantId] = useState<string>(applicants[0]?.id || 'GAR-2024-0891');
  const [activeTab, setActiveTab] = useState<'pending' | 'need_info' | 'approved' | 'rejected'>('pending');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [auditorNote, setAuditorNote] = useState<string>('');
  const [docTab, setDocTab] = useState<'id_card' | 'business_license' | 'certificate'>('id_card');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId) || applicants[0];

  const filteredApplicants = applicants.filter((a) => {
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

  const handleApprove = () => {
    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      setShowConfirmModal(false);
      onShowToast(
        'Kích Hoạt Garage Thành Công!',
        `Đã kích hoạt ${selectedApplicant.name} cùng 3 chi nhánh trực chiến. Hệ thống đã mở tiếp nhận đơn cứu hộ ngập lụt.`
      );
    }, 1000);
  };

  const handleReject = () => {
    onShowToast('Đã Từ Chối Hồ Sơ', `Đã gửi thông báo từ chối tới chủ gara ${selectedApplicant.ownerName}.`);
  };

  const handleRequestDocs = () => {
    onShowToast('Yêu Cầu Bổ Sung', `Đã gửi email và SMS yêu cầu bổ sung giấy phép nghề thủy kích cho ${selectedApplicant.name}.`);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Command Header & Operational Sub-navigation */}
      <section className="bg-surface-container-lowest p-space-md mb-space-md rounded shadow-sm border border-surface-container">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md pb-space-sm border-b border-surface-container">
          <div className="flex items-center gap-space-md">
            <div className="w-10 h-10 rounded bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-tight font-bold">Duyệt hồ sơ gara</h1>
                <span className="px-space-sm py-0.5 rounded font-label-sm text-label-sm bg-error-container text-on-error-container font-bold animate-pulse">
                  Duyệt trong 30 phút
                </span>
              </div>
              <ViewGuide><p className="font-body-sm text-body-sm text-secondary">
                Thẩm định danh tính eKYC, chứng chỉ chuyên môn thủy kích, phạm vi chi nhánh và năng lực kéo xe ngập lụt đô thị.
              </p></ViewGuide>
            </div>
          </div>

          {/* Action Utilities */}
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center bg-surface-container-low px-space-md py-1.5 rounded">
              <span className="material-symbols-outlined text-secondary text-[18px] mr-1">history</span>
              <span className="font-data-mono text-data-mono text-secondary">
                Tốc độ duyệt hôm nay: <strong className="text-on-surface">11.4 phút/hồ sơ</strong>
              </span>
            </div>
            <button
              onClick={() => onShowToast('Xuất Báo Cáo', 'Đang tải file audit_compliance_garages.pdf')}
              className="bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Xuất Báo Cáo Audit</span>
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
            <span className="w-2 h-2 rounded-full bg-surface-container-lowest animate-ping"></span>
            <span>Chờ duyệt (8 hồ sơ)</span>
          </button>
          <button
            onClick={() => setActiveTab('need_info')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'need_info'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span>Cần bổ sung thông tin (3)</span>
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
            <span>Đã kích hoạt (42)</span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'rejected'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span>Đã từ chối (5)</span>
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
                placeholder="Tìm theo tên gara, mã ĐKKD, SĐT..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-secondary px-1">
              <span className="font-label-sm text-label-sm">LỌC: ĐIỂM NGẬP TRỌNG YẾU</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setAreaFilter(areaFilter === 'Q.8' ? 'all' : 'Q.8')}
                  className={`px-1.5 py-0.5 rounded font-data-mono text-label-sm cursor-pointer ${
                    areaFilter === 'Q.8' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface'
                  }`}
                >
                  Q.8
                </button>
                <button
                  onClick={() => setAreaFilter(areaFilter === 'Bình Thạnh' ? 'all' : 'Bình Thạnh')}
                  className={`px-1.5 py-0.5 rounded font-data-mono text-label-sm cursor-pointer ${
                    areaFilter === 'Bình Thạnh' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface'
                  }`}
                >
                  Bình Thạnh
                </button>
                <button
                  onClick={() => setAreaFilter(areaFilter === 'Nhà Bè' ? 'all' : 'Nhà Bè')}
                  className={`px-1.5 py-0.5 rounded font-data-mono text-label-sm cursor-pointer ${
                    areaFilter === 'Nhà Bè' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface'
                  }`}
                >
                  Nhà Bè
                </button>
              </div>
            </div>
          </div>

          {/* Applicant Cards Queue */}
          <div className="flex flex-col gap-space-sm max-h-[calc(100vh-290px)] overflow-y-auto pr-0.5">
            {filteredApplicants.map((applicant) => {
              const isSelected = applicant.id === selectedApplicantId;
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
                    <div className="absolute top-0 right-0 bg-primary-container text-on-primary-container px-2 py-0.5 font-label-sm text-label-sm uppercase rounded-bl font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
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
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold">{applicant.ownerName}</span>
                    </div>
                    <div>
                      <span className="font-label-sm text-label-sm text-secondary block">LIÊN LẠC</span>
                      <span className="font-data-mono text-data-mono text-primary font-bold">{applicant.phone}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-label-sm text-label-sm text-secondary block">QUY MÔ MẠNG LƯỚI</span>
                      <span className="font-label-md text-label-md text-on-surface">{applicant.branchesCount} Chi nhánh trực chiến</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-label-sm text-label-sm text-secondary block">ĐỘI THỢ CƠ ĐỘNG</span>
                      <span className="font-label-md text-label-md text-tertiary-container font-bold">{applicant.mechanicsCount} Thợ cơ động thủy kích</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-space-sm pt-space-xs text-secondary font-label-sm text-label-sm">
                    <span className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      {applicant.timeAgo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-bold">
                      {isSelected ? 'ĐANG THẨM ĐỊNH' : 'Chờ đối chiếu GPKD'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Inspection Dossier (Detailed Candidate View) */}
        {selectedApplicant && (
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
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-low text-tertiary font-label-md text-label-md font-bold">
                    <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                    eKYC Chủ Gara Khớp {selectedApplicant.ekycMatchRate}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm bg-surface-container-low p-space-md rounded mt-space-xs">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Đại diện pháp luật</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{selectedApplicant.ownerName}</span>
                  <span className="font-data-mono text-data-mono text-secondary block mt-0.5">CCCD: {selectedApplicant.idCardNumber}</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Mã số thuế hộ kinh doanh</span>
                  <span className="font-data-mono text-headline-sm text-on-surface font-bold">{selectedApplicant.taxCode}</span>
                  <span className="font-body-sm text-body-sm text-secondary block mt-0.5">Cục Thuế TP.HCM xác thực</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Trụ sở chính quản lý</span>
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold block">{selectedApplicant.address}</span>
                  <span className="font-body-sm text-body-sm text-primary block mt-0.5 font-bold">Hotline: {selectedApplicant.phone}</span>
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
                  <button className="p-1 rounded hover:bg-surface-container-high text-secondary cursor-pointer" title="Thu nhỏ">
                    <span className="material-symbols-outlined text-[16px]">zoom_out</span>
                  </button>
                  <span className="font-data-mono text-data-mono text-on-surface px-1">100%</span>
                  <button className="p-1 rounded hover:bg-surface-container-high text-secondary cursor-pointer" title="Phóng to">
                    <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                  </button>
                  <button className="p-1 rounded hover:bg-surface-container-high text-secondary cursor-pointer" title="Xoay 90 độ">
                    <span className="material-symbols-outlined text-[16px]">rotate_right</span>
                  </button>
                  <button className="p-1 rounded hover:bg-surface-container-high text-secondary cursor-pointer" title="Toàn màn hình">
                    <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                  </button>
                </div>
              </div>

              {/* Document Selector Tabs */}
              <div className="flex items-center gap-1 py-space-sm">
                <button
                  onClick={() => setDocTab('id_card')}
                  className={`px-space-md py-1.5 rounded font-label-md text-label-md font-bold flex items-center gap-1 cursor-pointer ${
                    docTab === 'id_card' ? 'bg-surface-container-high text-on-surface' : 'bg-surface-container-low text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
                  <span>CCCD 2 Mặt ({selectedApplicant.ownerName})</span>
                </button>
                <button
                  onClick={() => setDocTab('business_license')}
                  className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-1 cursor-pointer ${
                    docTab === 'business_license' ? 'bg-surface-container-high text-on-surface font-bold' : 'bg-surface-container-low text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-tertiary text-[16px]">verified</span>
                  <span>GPKD Sửa Xe Máy (#{selectedApplicant.taxCode.split('-')[0]})</span>
                </button>
                <button
                  onClick={() => setDocTab('certificate')}
                  className={`px-space-md py-1.5 rounded font-label-md text-label-md flex items-center gap-1 cursor-pointer ${
                    docTab === 'certificate' ? 'bg-surface-container-high text-on-surface font-bold' : 'bg-surface-container-low text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-primary text-[16px]">engineering</span>
                  <span>Chứng Chỉ Xử Lý Xe Thủy Kích (6 Thợ)</span>
                </button>
              </div>

              {/* Embedded Viewer Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm bg-surface-container-low p-space-sm rounded">
                <div className="relative bg-surface-container-lowest rounded p-space-xs shadow-sm flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-1 px-1">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Mặt trước CCCD gắn chip</span>
                    <span className="font-data-mono text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded font-bold">
                      HỢP LỆ QUA eKYC
                    </span>
                  </div>
                  <div className="w-full h-48 overflow-hidden rounded relative">
                    <img
                      className="w-full h-full object-cover"
                      alt="CCCD"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWM9Le3DFpJGryPyvhe1q4xl-nJEPjlF4svMZMhMLQcH5gLHLkoWVdNtj7E89ZK_-ZInzvBuNep0TWzg7S2RfwHOVMQKtCYTTilu_aHhGE1vk8iQihtDR92dN3zMQrrSS8Tp-txJJNDnZSBoWWvXeHfS2W149b-EaHICoBDsvq3-wHeHIn45XNrHr4bP85GF4VAtIJeWN7rv6wk9bWSX7tYNyxC7k3EDLL1nLjcFmGraAJDCoStXQX"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-on-background/80 text-surface-bright backdrop-blur-sm p-1 rounded font-data-mono text-label-sm flex justify-between">
                      <span>OCR: {selectedApplicant.ownerName.toUpperCase()}</span>
                      <span>DOB: 12/04/1988</span>
                    </div>
                  </div>
                </div>

                <div className="relative bg-surface-container-lowest rounded p-space-xs shadow-sm flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-1 px-1">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Giấy Phép Kinh Doanh & Con Dấu</span>
                    <span className="font-data-mono text-label-sm bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded font-bold">
                      DẤU ĐỎ KHỚP 100%
                    </span>
                  </div>
                  <div className="w-full h-48 overflow-hidden rounded relative">
                    <img
                      className="w-full h-full object-cover"
                      alt="GPKD"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKXRIc4yw1N1xsVyeB63efPg_34jKVhv1Ec3nWuPBPPwJkeQcBLOyO877xvmUN46lHXuzDgJY8ExSMyol8xFTuvmbGRiYdJJO6I2w848MdunLxzgZ3nxE9foXtw5a2fHkixE9jYPYAzf-cHUgMqIVqYf8JQgHHWOb-QvXFVy7yfYi11gyaIB9dHvZvNKqcdkVVOL0Z1rEq_cynnvKVaytnPJ5aPMktRf5bYs0PWhZRGJ3MX4y4EtjN"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-on-background/80 text-surface-bright backdrop-blur-sm p-1 rounded font-data-mono text-label-sm flex justify-between">
                      <span>NGÀNH NGHỀ: 4520 (SỬA CHỮA MÔ TÔ)</span>
                      <span>CẤP: UBND Q.8</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-space-xs font-body-sm text-body-sm text-secondary">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">task_alt</span>
                  Dữ liệu đối chiếu chéo tự động với Hệ thống Đăng ký Kinh doanh Quốc gia: Hoàn tất lúc 14:22.
                </span>
                <button
                  onClick={() => onShowToast('Tải Tệp PDF', 'Đang tải file hồ sơ thẩm định 3.8MB...')}
                  className="text-tertiary font-label-md text-label-md hover:underline cursor-pointer"
                >
                  Tải toàn bộ file PDF (3.8MB)
                </button>
              </div>
            </div>

            {/* Multi-Branch Verification Section */}
            <div className="bg-surface-container-lowest p-space-md rounded shadow-sm border border-surface-container">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container mb-space-sm">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Chi nhánh đăng ký ({selectedApplicant.branches.length || 3} Điểm)
                    </h3>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Kiểm định vị trí thực địa, bán kính bao phủ vùng ngập và khả năng chứa xe ngập nước.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md font-bold">
                  3/3 TỌA ĐỘ GPS KHỚP
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-sm">
                {selectedApplicant.branches.map((b, idx) => (
                  <div key={idx} className="bg-surface-container-low p-space-sm rounded flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-md text-label-md font-bold text-on-surface">{b.name}</span>
                        <span className="font-data-mono text-label-sm bg-tertiary text-on-tertiary px-1 rounded">GPS ✓</span>
                      </div>
                      <p className="font-body-sm text-body-sm font-semibold text-on-surface">{b.address}</p>
                      <div className="mt-2 bg-error-container text-on-error-container p-1.5 rounded font-label-sm text-label-sm font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        {b.warning}
                      </div>

                      <div
                        className="mt-2 h-28 rounded overflow-hidden relative bg-cover bg-center"
                        style={{ backgroundImage: `url('${b.mapImage}')` }}
                      >
                        <div className="absolute inset-0 bg-on-background/20 flex items-center justify-center">
                          <div className="bg-primary text-on-primary p-1 rounded-full shadow-md">
                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                          </div>
                        </div>
                        <div className="absolute bottom-1 left-1 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded font-data-mono text-label-sm text-on-surface">
                          {b.coords}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 text-secondary font-label-sm text-label-sm flex justify-between border-t border-surface-container">
                      <span>Sức chứa: {b.capacity} xe</span>
                      <span className="text-tertiary font-bold">{b.activeMechanics} Thợ cơ động trực</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fleet & Equipment Verification Grid */}
            <div className="bg-surface-container-lowest p-space-md rounded shadow-sm border border-surface-container">
              <div className="flex items-center justify-between pb-space-sm border-b border-surface-container mb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">local_shipping</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Thiết bị cứu hộ
                  </h3>
                </div>
                <span className="font-data-mono text-data-mono text-secondary">4 Hạng mục thiết bị đạt chuẩn</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
                {selectedApplicant.equipment.map((eq, idx) => (
                  <div key={idx} className="bg-surface-container-low p-space-sm rounded flex flex-col justify-between">
                    <div className="h-28 rounded overflow-hidden mb-2 relative">
                      <img className="w-full h-full object-cover" alt={eq.name} src={eq.image} />
                      <span className="absolute top-1 right-1 bg-tertiary text-on-tertiary px-1 py-0.5 rounded font-data-mono text-label-sm">
                        {eq.plate}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-md text-label-md font-bold text-on-surface block">{eq.name}</span>
                      <span className="font-body-sm text-body-sm text-secondary">{eq.specs}</span>
                    </div>
                    <div className="mt-2 flex items-center text-tertiary font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[16px] mr-1">check_circle</span>
                      {eq.statusNote}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STICKY ACTION BOTTOM TOOLBAR FOR AUDITOR DISPATCH */}
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
                placeholder="Nhập ghi chú thẩm định viên (Ví dụ: Đã gọi xác minh chủ gara lúc 14:15, các chi nhánh đầy đủ đồ nghề cứu hộ lụt)..."
                type="text"
                value={auditorNote}
                onChange={(e) => setAuditorNote(e.target.value)}
              />
            </div>
          </div>

          {/* Action Decision Button Cluster */}
          <div className="flex items-center gap-space-sm shrink-0">
            <button
              onClick={handleReject}
              className="bg-error text-on-error hover:bg-on-error-container px-space-md py-2 rounded font-label-lg text-label-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span>Từ Chối Hồ Sơ</span>
            </button>

            <button
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
          </div>
        </div>
      </aside>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-on-background/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full p-space-xl rounded shadow-2xl mx-margin border border-surface-container animate-scale-in">
            <div className="flex items-center gap-space-md text-primary mb-space-md">
              <div className="w-12 h-12 rounded bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">verified</span>
              </div>
              <div>
                <h4 className="font-headline-md text-headline-md text-on-surface font-bold">Xác Nhận Kích Hoạt Hệ Thống?</h4>
                <span className="font-body-sm text-body-sm text-secondary">
                  {selectedApplicant.id} ({selectedApplicant.branches.length || 3} Chi nhánh)
                </span>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface mb-space-md leading-relaxed">
              Sau khi kích hoạt, <strong>{selectedApplicant.name}</strong> sẽ ngay lập tức nhận thông báo khẩn cấp và đơn điều phối cứu hộ từ ứng dụng người dân trong bán kính 5km của các chi nhánh.
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
                <span>{isActivating ? 'Đang kích hoạt...' : 'Kích Hoạt Tiếp Nhận Khẩn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
