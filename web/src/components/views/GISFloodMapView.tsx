import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FloodPoint } from '../../types';
import { floodMapApi } from '../../services/floodMapApi';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GISFloodMapViewProps {
  floodPoints?: FloodPoint[];
  onShowToast: (title: string, msg: string) => void;
}

interface AuditEntry {
  text: string;
  time: string;
  isDanger?: boolean;
}

// Chuẩn hóa và bóc tách Quận/Huyện từ chuỗi địa chỉ
function extractDistrict(address?: string): string {
  if (!address) return 'Chưa xác định';
  const match = address.match(
    /(quận\s*\d+|q\.\s*\d+|q\s*\d+|thủ đức|bình thạnh|gò vấp|phú nhuận|tân bình|tân phú|bình tân|nhà bè|hóc môn|bình chánh|củ chi|cần giờ|quận\s*[a-zà-ỹ]+)/i
  );
  if (match) {
    const raw = match[0].trim();
    const qNum = raw.match(/^(?:quận|q\.?)\s*(\d+)$/i);
    if (qNum) return `Quận ${qNum[1]}`;
    return raw.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
  }
  return 'TP. Hồ Chí Minh';
}

// Format thời gian tương đối
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Vừa gửi';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(date.getTime()) || diffMs < 0) return 'Vừa gửi';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  } catch {
    return 'Vừa gửi';
  }
}

export const GISFloodMapView: React.FC<GISFloodMapViewProps> = ({ floodPoints, onShowToast }) => {
  const [pointsList, setPointsList] = useState<FloodPoint[]>(floodPoints || []);
  const [selectedPointId, setSelectedPointId] = useState<string>(floodPoints?.[0]?.id || '');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  
  // Persist autoPushAlert in localStorage
  const [autoPushAlert, setAutoPushAlert] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('flood_map_auto_alert');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Modal Phê duyệt & Phát cảnh báo khẩn cấp
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [selectedSeverity, setSelectedSeverity] = useState<'RED' | 'ORANGE' | 'YELLOW'>('RED');
  const [broadcastRadius, setBroadcastRadius] = useState<'500m' | '1km' | '2km'>('1km');
  const [broadcastNote, setBroadcastNote] = useState<string>('');

  // Modal Bác bỏ tin giả mạo / spam
  const [showSpamModal, setShowSpamModal] = useState<boolean>(false);
  const [spamReason, setSpamReason] = useState<string>('Tin giả mạo / Hiện trường không ngập');
  const [spamCustomNote, setSpamCustomNote] = useState<string>('');
  const [isRejectingSpam, setIsRejectingSpam] = useState<boolean>(false);

  // Modal Xác nhận nước rút
  const [showClearWaterModal, setShowClearWaterModal] = useState<boolean>(false);
  const [isResolvingWater, setIsResolvingWater] = useState<boolean>(false);

  // Leaflet Map Refs & States
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'streets' | 'satellite'>('streets');
  const streetTileRef = useRef<L.TileLayer | null>(null);
  const satelliteTileRef = useRef<L.TileLayer | null>(null);

  // Persist audit logs in sessionStorage
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem('flood_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const nowTimeStr = () => new Date().toTimeString().slice(0, 8);

  const addAuditLog = (entry: AuditEntry) => {
    setAuditLogs((prev) => {
      const updated = [entry, ...prev.filter((e) => e.text !== entry.text)].slice(0, 30);
      try {
        sessionStorage.setItem('flood_audit_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleAutoAlert = (checked: boolean) => {
    setAutoPushAlert(checked);
    try {
      localStorage.setItem('flood_map_auto_alert', String(checked));
    } catch {}
    onShowToast(
      'Cài Đặt Cảnh Báo Tự Động',
      checked
        ? 'Đã bật chế độ tự động ưu tiên cảnh báo các điểm ngập tin cậy cao (>90%).'
        : 'Đã tắt chế độ cảnh báo tự động.'
    );
  };

  const fetchFloodReports = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const liveReports = await floodMapApi.getAllFloodReports();
      if (liveReports && liveReports.length > 0) {
        const depthToLevel = (level: string) => {
          if (level === 'SEAT_60CM_PLUS') return { level: 3, severity: 'RED', label: 'Ngập sâu > 60cm (Lút yên xe)', depthCm: 65 };
          if (level === 'HALF_WHEEL_40CM') return { level: 2, severity: 'ORANGE', label: 'Ngập 40cm (Nửa bánh xe)', depthCm: 40 };
          return { level: 1, severity: 'YELLOW', label: 'Ngập 20cm (Ngập mắt cá chân)', depthCm: 20 };
        };

        const rejectedIds: string[] = (() => {
          try {
            return JSON.parse(localStorage.getItem('rejected_flood_report_ids') || '[]');
          } catch {
            return [];
          }
        })();

        const resolvedRecededIds: string[] = (() => {
          try {
            return JSON.parse(localStorage.getItem('resolved_receded_report_ids') || '[]');
          } catch {
            return [];
          }
        })();

        const mapped: FloodPoint[] = liveReports
          .filter((item) => {
            if (item.moderationStatus === 'REJECTED' || item.moderationStatus === 'EXPIRED') return false;
            if (rejectedIds.includes(String(item.id)) || rejectedIds.includes(`FL-${item.id}`)) return false;
            if (resolvedRecededIds.includes(String(item.id)) || resolvedRecededIds.includes(`FL-${item.id}`)) return false;
            return true;
          })
          .map((item) => {
            const meta = depthToLevel(item.waterDepthLevel);
            const normalizedConfidence = item.confidenceScore != null
              ? item.confidenceScore <= 5
                ? Math.min(98, Math.max(50, Math.round(item.confidenceScore * 19 + 3)))
                : item.confidenceScore
              : 80;

            const parsedPhotos = item.imageUrls
              ? item.imageUrls
                  .split(',')
                  .map((u) => u.trim())
                  .filter(Boolean)
                  .map((u, idx) => ({
                    url: u,
                    time: formatRelativeTime(item.createdAt),
                    caption: `Ảnh hiện trường #${item.id} (${idx + 1})`
                  }))
              : [];

            const reporterName = item.reportedByName?.trim();
            const hasDesc = !!item.description?.trim();

            return {
              id: `FL-${item.id}`,
              name: item.address || `Điểm ngập #${item.id}`,
              district: extractDistrict(item.address),
              address: item.address || 'Chưa có thông tin địa chỉ cụ thể',
              waterLevel: item.moderationStatus === 'EXPIRED' ? 'Nước đã rút (< 15cm)' : meta.label,
              depthCm: item.moderationStatus === 'EXPIRED' ? 10 : meta.depthCm,
              level: (item.moderationStatus === 'EXPIRED' ? 1 : meta.level) as 1 | 2 | 3,
              severity: (item.moderationStatus === 'EXPIRED' ? 'YELLOW' : meta.severity) as 'RED' | 'ORANGE' | 'YELLOW',
              moderationStatus: item.moderationStatus,
              reportsCount: item.clusterCount || 1,
              confidenceScore: normalizedConfidence,
              coords: { lat: item.latitude, lng: item.longitude },
              photos: parsedPhotos,
              recentReports: [
                {
                  author: reporterName || 'Người dân ẩn danh',
                  role: reporterName ? 'Người dân báo cáo' : 'Báo cáo cộng đồng',
                  text: hasDesc ? item.description! : 'Người dân không để lại mô tả hiện trường.',
                  time: formatRelativeTime(item.createdAt)
                }
              ]
            };
          });

        setPointsList(mapped);
        setSelectedPointId((curr) => {
          if (curr && mapped.some((m) => m.id === curr)) return curr;
          return mapped[0]?.id || '';
        });

        // Đồng bộ các bản ghi kiểm duyệt từ dữ liệu backend vào nhật ký ca trực
        const backendAuditEntries: AuditEntry[] = [];
        liveReports.forEach((item) => {
          if (item.moderationStatus === 'APPROVED') {
            backendAuditEntries.push({
              text: `Đã duyệt cảnh báo #${item.id}${item.moderatedByName ? ` (${item.moderatedByName})` : ''}: ${item.address || 'Điểm ngập'}`,
              time: formatRelativeTime(item.createdAt)
            });
          } else if (item.moderationStatus === 'EXPIRED') {
            backendAuditEntries.push({
              text: `Đã ghi nhận nước rút #${item.id}: ${item.address || 'Điểm ngập'}`,
              time: formatRelativeTime(item.createdAt)
            });
          } else if (item.moderationStatus === 'REJECTED') {
            backendAuditEntries.push({
              text: `Đã loại trừ tin rác #${item.id}${item.moderatorNote ? ` (${item.moderatorNote})` : ''}`,
              time: formatRelativeTime(item.createdAt),
              isDanger: true
            });
          }
        });

        setAuditLogs((prev) => {
          const existingTexts = new Set(prev.map((e) => e.text));
          const newItems = backendAuditEntries.filter((b) => !existingTexts.has(b.text));
          const combined = [...prev, ...newItems].slice(0, 30);
          try {
            sessionStorage.setItem('flood_audit_logs', JSON.stringify(combined));
          } catch {}
          return combined;
        });
      } else {
        setPointsList([]);
        setSelectedPointId('');
      }
    } catch (err: any) {
      console.warn('Backend flood reports fetch failed:', err);
      setLoadError(err.message || 'Không thể tải dữ liệu điểm ngập từ máy chủ.');
      setPointsList([]);
      setSelectedPointId('');
    } finally {
      setIsLoading(false);
    }
  };

  // Load real flood reports from backend on mount
  useEffect(() => {
    fetchFloodReports();
  }, []);

  // Danh sách quận/huyện tự động trích xuất từ dữ liệu thực tế
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    pointsList.forEach((p) => {
      if (p.district && p.district !== 'Chưa xác định') {
        set.add(p.district);
      }
    });
    return Array.from(set).sort();
  }, [pointsList]);

  // Nếu filter hiện tại không còn nằm trong các quận có sẵn, tự reset về 'all'
  useEffect(() => {
    if (districtFilter !== 'all' && !availableDistricts.includes(districtFilter)) {
      setDistrictFilter('all');
    }
  }, [availableDistricts, districtFilter]);

  const filteredPoints = useMemo(() => {
    if (districtFilter === 'all') return pointsList;
    return pointsList.filter((p) => p.district === districtFilter || p.address.includes(districtFilter));
  }, [pointsList, districtFilter]);

  const selectedPoint: FloodPoint | null =
    (selectedPointId ? filteredPoints.find((p) => p.id === selectedPointId) : null) ||
    (selectedPointId ? pointsList.find((p) => p.id === selectedPointId) : null) ||
    filteredPoints[0] ||
    pointsList[0] ||
    null;

  // KHỞI TẠO BẢN ĐỒ LEAFLET THỰC TẾ
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [10.7769, 106.7009],
      zoom: 12,
      zoomControl: false
    });

    const streetTile = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps'
    });

    const satelliteTile = L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps Satellite'
      }
    );

    streetTile.addTo(map);
    streetTileRef.current = streetTile;
    satelliteTileRef.current = satelliteTile;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Chuyển đổi lớp bản đồ (Đường phố vs Vệ tinh)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !streetTileRef.current || !satelliteTileRef.current) return;

    if (mapLayerType === 'streets') {
      map.removeLayer(satelliteTileRef.current);
      streetTileRef.current.addTo(map);
    } else {
      map.removeLayer(streetTileRef.current);
      satelliteTileRef.current.addTo(map);
    }
  }, [mapLayerType]);

  // Cập nhật Markers lên bản đồ Leaflet khi filteredPoints hoặc selectedPoint thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const validPoints = filteredPoints.filter(
      (pt) => pt.coords && pt.coords.lat && pt.coords.lng && !isNaN(pt.coords.lat) && !isNaN(pt.coords.lng)
    );

    validPoints.forEach((pt) => {
      const isSelected = selectedPoint?.id === pt.id;
      const isRed = pt.severity === 'RED';
      const isOrange = pt.severity === 'ORANGE';
      const bgColor = isRed ? '#dc2626' : isOrange ? '#d97706' : '#059669';

      const customIcon = L.divIcon({
        className: 'custom-flood-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${
              isRed
                ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background-color: rgba(220, 38, 38, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>`
                : ''
            }
            <div style="
              position: relative;
              z-index: 10;
              background-color: ${bgColor};
              color: white;
              padding: 4px 10px;
              border-radius: 9999px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              border: ${isSelected ? '3px solid #facc15' : '2px solid white'};
              font-size: 11px;
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: 5px;
              white-space: nowrap;
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
              transition: transform 0.2s ease;
            ">
              <span style="font-size: 13px;">🌊</span>
              <span>#${pt.id}</span>
              <span style="background: rgba(0,0,0,0.25); border-radius: 9999px; padding: 1px 5px; font-size: 9px;">+${pt.reportsCount || 1}</span>
            </div>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
      });

      const marker = L.marker([pt.coords.lat, pt.coords.lng], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
          <div style="font-weight: 700; color: ${bgColor}; font-size: 14px; margin-bottom: 2px;">
            ${pt.name}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            ${pt.address}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-weight: 600;">Mực nước:</span>
            <span style="color: ${bgColor}; font-weight: 700;">${pt.waterLevel} (${pt.depthCm}cm)</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #475569; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            <span>Độ tin cậy: <b>${pt.confidenceScore}%</b></span>
            <span><b>${pt.reportsCount}</b> lượt báo</span>
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedPointId(pt.id);
      });

      if (isSelected) {
        setTimeout(() => {
          marker.openPopup();
        }, 50);
      }

      group.addLayer(marker);
    });
  }, [filteredPoints, selectedPoint?.id]);

  // Khi chọn điểm ngập từ danh sách, tự động di chuyển bản đồ đến điểm đó
  useEffect(() => {
    if (!selectedPoint?.coords?.lat || !selectedPoint?.coords?.lng) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const dist = Math.hypot(
      currentCenter.lat - selectedPoint.coords.lat,
      currentCenter.lng - selectedPoint.coords.lng
    );
    if (dist > 0.001 || map.getZoom() < 14) {
      map.flyTo([selectedPoint.coords.lat, selectedPoint.coords.lng], 15, {
        duration: 1.2
      });
    }
  }, [selectedPointId]);

  useEffect(() => {
    if (selectedPoint) {
      setSelectedSeverity(selectedPoint.severity || 'RED');
      setBroadcastNote(
        selectedPoint.severity === 'RED'
          ? `Cảnh báo ngập sâu (>60cm) tại ${selectedPoint.name}. Các phương tiện ô tô gầm thấp và xe máy hạn chế đi vào.`
          : `Khu vực ${selectedPoint.name} ghi nhận ngập úng (${selectedPoint.waterLevel}). Chú ý giảm tốc độ khi di chuyển qua.`
      );
    }
  }, [selectedPointId, selectedPoint?.severity]);

  const handleOpenBroadcastModal = () => {
    if (!selectedPoint) return;
    setSelectedSeverity(selectedPoint.severity || 'RED');
    setBroadcastNote(
      selectedPoint.severity === 'RED'
        ? `Cảnh báo ngập sâu (>60cm) tại ${selectedPoint.name}. Các phương tiện ô tô gầm thấp và xe máy hạn chế đi vào.`
        : `Khu vực ${selectedPoint.name} ghi nhận ngập úng (${selectedPoint.waterLevel}). Chú ý giảm tốc độ khi di chuyển qua.`
    );
    setShowBroadcastModal(true);
  };

  const handleConfirmBroadcastAlert = async () => {
    if (!selectedPoint) return;
    setIsBroadcasting(true);
    const depthMeta =
      selectedSeverity === 'RED'
        ? { level: 3 as const, waterLevel: 'Ngập sâu > 60cm (Lút yên xe)', depthCm: 65 }
        : selectedSeverity === 'ORANGE'
        ? { level: 2 as const, waterLevel: 'Ngập 40cm (Nửa bánh xe)', depthCm: 40 }
        : { level: 1 as const, waterLevel: 'Ngập 20cm (Ngập mắt cá chân)', depthCm: 20 };

    try {
      const rawId = selectedPoint.id.replace('FL-', '');
      const numId = parseInt(rawId, 10);
      if (!isNaN(numId)) {
        await floodMapApi.moderateFloodReport(
          numId,
          'APPROVED',
          broadcastNote.trim() ||
            (selectedSeverity === 'RED'
              ? 'Phát cảnh báo khẩn cấp bán kính 1km'
              : `Duyệt mức ngập ${depthMeta.waterLevel}`),
          'Đã kích hoạt các gara ứng cứu lân cận'
        );
      }
    } catch (err) {
      console.warn('Backend moderate report:', err);
    } finally {
      setIsBroadcasting(false);
      setShowBroadcastModal(false);
      setPointsList((prev) =>
        prev.map((p) =>
          p.id === selectedPoint.id
            ? {
                ...p,
                severity: selectedSeverity,
                level: depthMeta.level,
                waterLevel: depthMeta.waterLevel,
                depthCm: depthMeta.depthCm,
                moderationStatus: 'APPROVED'
              }
            : p
        )
      );
      addAuditLog({
        text: `Đã duyệt & phát cảnh báo ${
          selectedSeverity === 'RED' ? 'ĐỎ' : selectedSeverity === 'ORANGE' ? 'CAM' : 'VÀNG'
        } #${selectedPoint.id} (${selectedPoint.name})`,
        time: nowTimeStr()
      });
      onShowToast(
        selectedSeverity === 'RED' ? 'Đã Phát Cảnh Báo Đỏ!' : 'Đã Phê Duyệt Điểm Ngập',
        selectedSeverity === 'RED'
          ? `Phát lệnh cảnh báo ngập sâu (>60cm) tới người dân trong bán kính ${broadcastRadius} quanh ${selectedPoint.name}.`
          : `Đã cập nhật mức ngập ${depthMeta.waterLevel} tại ${selectedPoint.name} lên bản đồ.`
      );
    }
  };

  const handleConfirmClearWater = async () => {
    if (!selectedPoint) return;
    setIsResolvingWater(true);
    try {
      const rawId = selectedPoint.id.replace('FL-', '');
      const numId = parseInt(rawId, 10);
      if (!isNaN(numId)) {
        await floodMapApi.resolveWaterReceded(numId);
      }
    } catch (err) {
      console.warn('Backend resolve water:', err);
    } finally {
      setIsResolvingWater(false);
      setShowClearWaterModal(false);
      try {
        const existing: string[] = JSON.parse(localStorage.getItem('resolved_receded_report_ids') || '[]');
        const updated = Array.from(new Set([...existing, String(selectedPoint.id), selectedPoint.id.replace('FL-', '')]));
        localStorage.setItem('resolved_receded_report_ids', JSON.stringify(updated));
      } catch {}
      setPointsList((prev) => prev.filter((p) => p.id !== selectedPoint.id));
      addAuditLog({
        text: `Đã giải tỏa điểm ngập #${selectedPoint.id} (${selectedPoint.name}) → Nước đã rút`,
        time: nowTimeStr()
      });
      onShowToast(
        'Đã Giải Tỏa Điểm Ngập',
        `Đã ghi nhận nước rút hoàn toàn tại ${selectedPoint.name}. Điểm cảnh báo đã được gỡ bỏ khỏi bản đồ.`
      );
    }
  };

  const handleConfirmReportSpam = async () => {
    if (!selectedPoint) return;
    setIsRejectingSpam(true);
    const finalReason = spamCustomNote.trim() ? `${spamReason}: ${spamCustomNote.trim()}` : spamReason;
    try {
      const rawId = selectedPoint.id.replace('FL-', '');
      const numId = parseInt(rawId, 10);
      if (!isNaN(numId)) {
        await floodMapApi.moderateFloodReport(numId, 'REJECTED', finalReason);
      }
    } catch (err) {
      console.warn('Backend spam report:', err);
    } finally {
      setIsRejectingSpam(false);
      setShowSpamModal(false);
      try {
        const existing: string[] = JSON.parse(localStorage.getItem('rejected_flood_report_ids') || '[]');
        const updated = Array.from(new Set([...existing, String(selectedPoint.id), selectedPoint.id.replace('FL-', '')]));
        localStorage.setItem('rejected_flood_report_ids', JSON.stringify(updated));
      } catch {}
      setPointsList((prev) => prev.filter((p) => p.id !== selectedPoint.id));
      addAuditLog({
        text: `Bác bỏ tin giả & loại trừ điểm #${selectedPoint.id} (${spamReason})`,
        time: nowTimeStr(),
        isDanger: true
      });
      onShowToast('Đã Bác Bỏ Tin Báo', `Đã loại trừ tin báo giả mạo/spam tại điểm ${selectedPoint.id}.`);
    }
  };


  // Sao chép tọa độ GPS vào bộ nhớ tạm
  const handleCopyCoords = () => {
    if (!selectedPoint?.coords?.lat || !selectedPoint?.coords?.lng) {
      onShowToast('Thông báo', 'Điểm ngập chưa có tọa độ GPS chính xác.');
      return;
    }
    const text = `${selectedPoint.coords.lat}, ${selectedPoint.coords.lng}`;
    navigator.clipboard.writeText(text);
    onShowToast('Đã Sao Chép GPS', `Đã chép tọa độ: ${text} vào bộ nhớ tạm.`);
  };

  // Xuất file GeoJSON chứa các điểm ngập đang lọc
  const handleExportGeoJSON = () => {
    if (filteredPoints.length === 0) {
      onShowToast('Thông báo', 'Không có điểm ngập nào để xuất file.');
      return;
    }
    const featureCollection = {
      type: 'FeatureCollection',
      generatedAt: new Date().toISOString(),
      features: filteredPoints.map((pt) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [pt.coords.lng, pt.coords.lat]
        },
        properties: {
          id: pt.id,
          name: pt.name,
          district: pt.district,
          address: pt.address,
          waterLevel: pt.waterLevel,
          depthCm: pt.depthCm,
          severity: pt.severity,
          confidenceScore: pt.confidenceScore,
          reportsCount: pt.reportsCount
        }
      }))
    };
    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flood_points_${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Xuất File Thành Công', `Đã tải về tệp GeoJSON chứa ${filteredPoints.length} điểm ngập.`);
  };

  // Các điểm ngập khẩn cấp cấp độ Đỏ hoặc độ tin cậy cao
  const urgentRedPoints = useMemo(() => {
    return pointsList.filter((p) => p.severity === 'RED');
  }, [pointsList]);

  return (
    <div className="flex flex-col w-full space-y-space-md">
      <style>{`
        .custom-flood-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2) !important;
          padding: 2px !important;
        }
        .leaflet-popup-content {
          margin: 10px 12px !important;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
        <div>
          <h1>Bản đồ ngập</h1>
          <p className="text-secondary text-body-sm mt-1">Theo dõi điểm ngập và thẩm định tin báo thực tế từ người dân.</p>
        </div>
        <button
          onClick={fetchFloodReports}
          disabled={isLoading}
          className="self-start sm:self-auto px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1.5 border border-surface-container-high disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          <span>{isLoading ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}</span>
        </button>
      </div>

      {/* AUTO ALERT BANNER NẾU CÓ ĐIỂM NGẬP ĐỎ KHẨN CẤP */}
      {autoPushAlert && urgentRedPoints.length > 0 && (
        <div className="bg-error-container/40 border border-error/30 rounded-xl p-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-error text-[24px] animate-pulse">crisis_alert</span>
            <div>
              <span className="font-label-md text-label-md font-bold text-error block">
                Phát hiện {urgentRedPoints.length} điểm ngập cấp độ ĐỎ (&gt; 60cm) cần ưu tiên giám sát!
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Các phương tiện xe máy có nguy cơ ngập lút yên xe và chết máy 100%. Hãy kiểm tra và phát lệnh cảnh báo bán kính 1km.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (urgentRedPoints[0]) setSelectedPointId(urgentRedPoints[0].id);
            }}
            className="px-space-md py-1.5 bg-error text-white font-label-sm text-label-sm rounded-lg hover:bg-red-700 transition-colors shrink-0 cursor-pointer font-bold shadow-sm"
          >
            Xem điểm ngập đỏ
          </button>
        </div>
      )}

      {/* TOP STATS & CRITICAL METRICS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">Điểm Ngập Hoạt Động</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{pointsList.length}</span>
              <span className="font-label-md text-label-md text-tertiary">Toàn thành phố</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">flood</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-error font-semibold">Báo Động Cấp 3 (Đỏ)</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-error font-bold">
                {pointsList.filter((p) => p.severity === 'RED').length.toString().padStart(2, '0')}
              </span>
              <span className="font-label-md text-label-md text-error">Ngập lút yên xe</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-error-container/60 flex items-center justify-center text-error animate-pulse">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-primary-container font-semibold">Báo Động Vàng / Cam</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-primary-container font-bold">
                {pointsList.filter((p) => p.severity !== 'RED').length.toString().padStart(2, '0')}
              </span>
              <span className="font-label-md text-label-md text-secondary">Ngập nửa bánh</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-fixed/40 flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[22px]">crisis_alert</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between border border-surface-container">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">Tin báo cộng đồng</span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-headline-xl text-headline-xl text-tertiary font-bold">
                {pointsList.reduce((acc, p) => acc + (p.reportsCount || 1), 0)}
              </span>
              <span className="font-label-md text-label-md text-tertiary-container">Lượt báo</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[22px]">mark_chat_unread</span>
          </div>
        </div>
      </div>

      {/* CONTROL TOOLBAR: Dynamic District Filters & GIS Automation Switch */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-wrap items-center justify-between gap-space-md border border-surface-container">
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="font-label-sm text-label-sm uppercase text-secondary mr-space-xs font-bold">Khu vực:</span>
          <button
            onClick={() => setDistrictFilter('all')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer ${
              districtFilter === 'all'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Tất cả ({pointsList.length})
          </button>
          {availableDistricts.map((dist) => {
            const count = pointsList.filter((p) => p.district === dist).length;
            return (
              <button
                key={dist}
                onClick={() => setDistrictFilter(dist)}
                className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer ${
                  districtFilter === dist
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {dist} ({count})
              </button>
            );
          })}
        </div>

        {/* Smart Auto Clustering Toggle */}
        <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-1.5 rounded-xl">
          <div className="flex flex-col text-right">
            <span className="font-label-md text-label-md text-on-surface font-semibold">Cảnh báo tự động</span>
            <span className="font-label-sm text-label-sm text-secondary">Độ tin cậy trên 90%</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              checked={autoPushAlert}
              onChange={(e) => handleToggleAutoAlert(e.target.checked)}
              className="sr-only peer"
              type="checkbox"
            />
            <div className="w-9 h-5 bg-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* MAIN OPERATIONAL VIEWPORT (Interactive Leaflet GIS Tactical Split Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT PANE: Real Leaflet Map */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="relative isolate z-0 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden h-[740px] flex flex-col border border-surface-container">
            {/* Interactive Leaflet Map Container */}
            <div ref={mapContainerRef} className="w-full h-full relative z-0" style={{ minHeight: '600px' }} />

            {/* Upper Map HUD Info Bar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between p-space-sm bg-surface-container-lowest/90 backdrop-blur rounded-xl shadow-sm border border-surface-container gap-2 pointer-events-auto">
              <div className="flex items-center gap-space-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${pointsList.length > 0 ? 'bg-error animate-ping' : 'bg-emerald-500'}`}></span>
                <div>
                  <span className="font-headline-sm text-headline-sm text-on-surface leading-none block font-bold">
                    Bản đồ điểm ngập TP. Hồ Chí Minh
                  </span>
                  <span className="font-data-mono text-data-mono text-secondary text-[10px]">
                    {isLoading
                      ? 'Đang đồng bộ dữ liệu thời gian thực...'
                      : `Đang hiển thị ${filteredPoints.length}/${pointsList.length} điểm ngập`}
                  </span>
                </div>
              </div>

              {/* Map Layer Switcher & Recenter Controls */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-surface-container-low rounded-lg p-0.5 border border-surface-container">
                  <button
                    onClick={() => setMapLayerType('streets')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      mapLayerType === 'streets'
                        ? 'bg-primary text-white shadow-xs font-bold'
                        : 'text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">map</span>
                    <span>Đường phố</span>
                  </button>
                  <button
                    onClick={() => setMapLayerType('satellite')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                      mapLayerType === 'satellite'
                        ? 'bg-primary text-white shadow-xs font-bold'
                        : 'text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
                    <span>Vệ tinh</span>
                  </button>
                </div>

                <button
                  onClick={() => mapInstanceRef.current?.flyTo([10.7769, 106.7009], 12)}
                  className="p-1.5 bg-surface-container-low rounded-lg border border-surface-container hover:bg-surface-container text-on-surface transition-colors cursor-pointer flex items-center justify-center"
                  title="Về trung tâm TP.HCM"
                >
                  <span className="material-symbols-outlined text-[16px]">my_location</span>
                </button>
              </div>
            </div>

            {/* Lower Map Legends */}
            <div className="relative z-10 p-space-md bg-surface-container-lowest/95 backdrop-blur flex flex-wrap items-center justify-between gap-space-md border-t border-surface-container pointer-events-auto">
              <div className="flex items-center gap-space-md text-body-sm font-body-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-error inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">Ngập sâu (&gt;60cm)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-600 inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">Ngập 40cm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface">Ngập nhẹ / Nước rút</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs font-data-mono text-data-mono text-secondary">
                <span className="material-symbols-outlined text-[16px] text-tertiary">autorenew</span>
                <span>BẢN ĐỒ LEAFLET TRỰC TUYẾN</span>
              </div>
            </div>
          </div>

          {/* Quick Route Advisory & Real GPS Action Tools */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-surface-container">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">alt_route</span>
              </div>
              <div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {selectedPoint
                    ? `Khuyến Nghị Cảnh Báo Tuyến: ${selectedPoint.name}`
                    : 'Kênh Thông Tin Phân Luồng Giao Thông'}
                </div>
                <p className="font-body-sm text-body-sm text-secondary">
                  {selectedPoint
                    ? `Điểm ngập #${selectedPoint.id} (${selectedPoint.waterLevel}) đang được theo dõi và phát cảnh báo.`
                    : 'Chưa có tuyến đường ngập sâu nào yêu cầu thiết lập phân luồng khẩn cấp.'}
                </p>
              </div>
            </div>

            {/* GPS & GeoJSON Actions */}
            <div className="flex items-center gap-space-xs shrink-0 flex-wrap">
              {selectedPoint?.coords?.lat && selectedPoint?.coords?.lng && (
                <>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPoint.coords.lat},${selectedPoint.coords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1"
                    title="Mở Google Maps"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Google Maps</span>
                  </a>
                  <button
                    onClick={handleCopyCoords}
                    className="px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1"
                    title="Sao chép tọa độ lat, lng"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Sao chép GPS</span>
                  </button>
                </>
              )}
              <button
                onClick={handleExportGeoJSON}
                className="px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1"
                title="Tải tệp GeoJSON chứa toàn bộ điểm ngập đang lọc"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Xuất GeoJSON ({filteredPoints.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Cluster Detail & Verification Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* Quick Selector Strip for all points in pointsList */}
          {filteredPoints.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm border border-surface-container flex items-center gap-space-xs overflow-x-auto">
              {filteredPoints.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => setSelectedPointId(pt.id)}
                  className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedPoint?.id === pt.id
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      pt.severity === 'RED' ? 'bg-error' : pt.severity === 'ORANGE' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                  ></span>
                  <span>#{pt.id}</span>
                </button>
              ))}
            </div>
          )}

          {/* MAIN INSPECTOR CARD */}
          {selectedPoint ? (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col border border-surface-container">
              {/* Header & Point Identity */}
              <div className="flex items-start justify-between pb-space-md border-b border-surface-container">
                <div>
                  <div className="flex items-center gap-space-xs mb-1">
                    <span className="px-2 py-0.5 rounded font-data-mono text-data-mono bg-error-container text-error font-bold">
                      ID: #{selectedPoint.id}
                    </span>
                    <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">
                      {(selectedPoint.district || 'TP.HCM').toUpperCase()} • TỌA ĐỘ NƯỚC DÂNG
                    </span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    {selectedPoint.name}
                  </h2>
                  <p className="font-body-sm text-body-sm text-secondary">{selectedPoint.address}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-label-sm text-label-sm text-secondary">ĐỘ TIN CẬY GIS</span>
                  <span className="font-headline-md text-headline-md text-tertiary-container font-data-mono font-bold">
                    {selectedPoint.confidenceScore}%
                  </span>
                  <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold">
                    {selectedPoint.confidenceScore >= 80 ? 'RẤT CAO' : selectedPoint.confidenceScore >= 50 ? 'TRUNG BÌNH' : 'CẦN XÁC MINH'}
                  </span>
                </div>
              </div>

              {/* Severity Gauge Indicator */}
              <div className="p-space-md rounded-xl bg-surface-container-low my-space-md flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md font-bold uppercase text-on-surface">Mức Độ Ngập Đo Được:</span>
                  <span className={`font-label-md text-label-md font-bold px-2 py-0.5 rounded ${
                    selectedPoint.severity === 'RED'
                      ? 'text-error bg-error-container'
                      : selectedPoint.severity === 'ORANGE'
                      ? 'text-amber-800 bg-amber-100'
                      : 'text-emerald-800 bg-emerald-100'
                  }`}>
                    {selectedPoint.waterLevel}
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden flex">
                  <div className={`w-1/4 h-full ${selectedPoint.level >= 1 ? 'bg-emerald-500' : 'bg-surface-variant'}`} title="Mức 1: <20cm"></div>
                  <div className={`w-1/4 h-full ${selectedPoint.level >= 2 ? 'bg-amber-500' : 'bg-surface-container-high'}`} title="Mức 2: 20-40cm"></div>
                  <div className={`w-1/4 h-full ${selectedPoint.level >= 3 ? 'bg-orange-500' : 'bg-surface-container-high'}`} title="Mức 3: 40-60cm"></div>
                  <div className={`w-1/4 h-full ${selectedPoint.severity === 'RED' ? 'bg-error animate-pulse' : 'bg-surface-container-high'}`} title="Mức 4: >60cm"></div>
                </div>
                <div className="flex justify-between font-data-mono text-[10px] text-secondary">
                  <span>Dưới bô xe</span>
                  <span>Nửa bánh</span>
                  <span>Bằng yên</span>
                  <span className="text-error font-bold">&gt; 60cm Chết máy 100%</span>
                </div>
              </div>

              {/* Crowdsourced Photo Proof Gallery */}
              {selectedPoint.photos && selectedPoint.photos.length > 0 && (
                <div className="mb-space-md">
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-md text-label-md uppercase text-secondary font-bold">
                      Ảnh Hiện Trường Người Dân Gửi Lên ({selectedPoint.photos.length} Ảnh)
                    </span>
                    <button
                      onClick={() => setPreviewPhoto(selectedPoint.photos[0].url)}
                      className="font-label-sm text-label-sm text-tertiary cursor-pointer hover:underline"
                    >
                      Phóng to toàn bộ
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-space-xs">
                    {selectedPoint.photos.map((photo, i) => (
                      <div
                        key={i}
                        onClick={() => setPreviewPhoto(photo.url)}
                        className="relative rounded-lg overflow-hidden group aspect-square shadow-sm bg-surface-container cursor-pointer"
                      >
                        <img
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          alt={photo.caption}
                          src={photo.url}
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1 text-center">
                          <span className="font-data-mono text-[9px] text-white block truncate">{photo.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Citizen Reports Real-time Feed */}
              {selectedPoint.recentReports && selectedPoint.recentReports.length > 0 && (
                <div className="mb-space-lg flex-1">
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-md text-label-md uppercase text-secondary font-bold">
                      Luồng Ý Kiến & Báo Cáo Trực Tiếp
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-data-mono">
                      {selectedPoint.reportsCount} báo cáo
                    </span>
                  </div>
                  <div className="space-y-space-xs max-h-48 overflow-y-auto pr-1">
                    {selectedPoint.recentReports.map((rep, idx) => (
                      <div key={idx} className="p-space-sm bg-surface-container-low rounded-lg flex items-start gap-space-sm">
                        <div className="w-7 h-7 rounded-full bg-error-container text-error flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">two_wheeler</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-label-md text-label-md font-bold text-on-surface truncate">{rep.author}</span>
                            <span className="font-data-mono text-[10px] text-secondary">{rep.time}</span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface mt-0.5">{rep.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OPERATOR MODERATION ACTION BOX */}
              {(() => {
                const isWaterReceded =
                  selectedPoint.moderationStatus === 'EXPIRED' || selectedPoint.waterLevel?.includes('Nước đã rút');
                const isApprovedRed =
                  selectedPoint.moderationStatus === 'APPROVED' && selectedPoint.severity === 'RED';

                return (
                  <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm border border-surface-container shadow-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="font-label-md text-label-md uppercase text-on-surface font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-primary">crisis_alert</span>
                        <span>Bảng Điều Khiển Can Thiệp</span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isWaterReceded
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedPoint.severity === 'RED'
                            ? 'bg-red-100 text-red-800 animate-pulse'
                            : selectedPoint.severity === 'ORANGE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {isWaterReceded
                          ? 'Nước đã rút'
                          : selectedPoint.severity === 'RED'
                          ? 'Cảnh báo đỏ'
                          : selectedPoint.severity === 'ORANGE'
                          ? 'Cảnh báo cam'
                          : 'Cảnh báo vàng'}
                      </span>
                    </div>

                    {/* Primary Emergency Action */}
                    <button
                      type="button"
                      onClick={handleOpenBroadcastModal}
                      disabled={isBroadcasting || isWaterReceded}
                      className={`w-full py-2.5 px-space-md rounded-lg font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs shadow-md transition-all cursor-pointer font-bold ${
                        isWaterReceded
                          ? 'bg-surface-container-high text-secondary/60 cursor-not-allowed shadow-none'
                          : isApprovedRed
                          ? 'bg-red-700 hover:bg-red-800 text-white'
                          : 'bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white'
                      }`}
                      title={
                        isWaterReceded
                          ? 'Nước đã rút, không cần phát cảnh báo'
                          : 'Phát cảnh báo khẩn cấp tới người dân trong khu vực'
                      }
                    >
                      <span className={`material-symbols-outlined text-[20px] ${isBroadcasting ? 'animate-spin' : ''}`}>
                        {isBroadcasting ? 'sync' : isApprovedRed ? 'campaign' : 'notification_important'}
                      </span>
                      <span>
                        {isBroadcasting
                          ? 'ĐANG PHÁT LỆNH TOÀN MẠNG...'
                          : isApprovedRed
                          ? 'ĐÃ PHÁT CẢNH BÁO ĐỎ (BẤM ĐỂ CẬP NHẬT)'
                          : 'PHÁT CẢNH BÁO KHẨN CẤP (PUSH 1KM)'}
                      </span>
                    </button>

                    {/* Secondary Balanced Actions: 2 columns, perfectly balanced without orphan words */}
                    <div className="grid grid-cols-2 gap-space-sm mt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowClearWaterModal(true)}
                        disabled={isWaterReceded}
                        className={`py-2 px-space-sm rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-xs transition-colors border ${
                          isWaterReceded
                            ? 'bg-surface-container text-secondary/50 border-surface-container cursor-not-allowed'
                            : 'bg-surface-container-lowest text-emerald-700 border-emerald-600/30 hover:bg-emerald-50 hover:border-emerald-600 cursor-pointer font-semibold'
                        }`}
                        title={isWaterReceded ? 'Điểm này đã xác nhận nước rút' : 'Xác nhận nước đã rút hoàn toàn'}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {isWaterReceded ? 'check_circle' : 'water_drop'}
                        </span>
                        <span className="whitespace-nowrap">
                          {isWaterReceded ? 'Đã ghi nhận rút' : 'Xác nhận nước rút'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSpamModal(true)}
                        className="py-2 px-space-sm rounded-lg bg-surface-container-lowest text-error border border-error/30 hover:bg-red-50 hover:border-error font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer font-semibold"
                        title="Bác bỏ tin báo giả mạo hoặc spam"
                      >
                        <span className="material-symbols-outlined text-[17px]">flag</span>
                        <span className="whitespace-nowrap">Bác bỏ tin giả</span>
                      </button>
                    </div>


                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col items-center justify-center text-center border border-surface-container min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-4">
                <span className="material-symbols-outlined text-[32px]">layers_clear</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1">
                {isLoading ? 'Đang tải dữ liệu điểm ngập...' : 'Chưa có điểm ngập nào'}
              </h3>
              <p className="font-body-sm text-body-sm text-secondary max-w-xs">
                {isLoading
                  ? 'Đang kết nối API kiểm duyệt để đồng bộ dữ liệu thực tế từ máy chủ...'
                  : loadError
                  ? loadError
                  : 'Hiện không có tin báo điểm ngập nào từ người dân cần phê duyệt.'}
              </p>
              {!isLoading && (
                <button
                  onClick={fetchFloodReports}
                  className="mt-4 px-4 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1.5 border border-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Tải lại</span>
                </button>
              )}
            </div>
          )}

          {/* AUDIT LEDGER */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container">
            <div className="flex items-center justify-between pb-space-xs mb-space-xs border-b border-surface-container">
              <span className="font-label-sm text-label-sm uppercase text-secondary font-bold">
                Lịch Sử Phê Duyệt Của Điều Phối Viên
              </span>
              <span className="font-data-mono text-data-mono text-secondary">NHẬT KÝ CA TRỰC</span>
            </div>
            <div className="space-y-space-xs font-body-sm text-body-sm max-h-52 overflow-y-auto pr-1">
              {auditLogs.length > 0 ? (
                auditLogs.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-surface-container/50 last:border-b-0">
                    <span className={`text-[12px] truncate pr-2 ${entry.isDanger ? 'text-error font-medium' : 'text-on-surface'}`}>{entry.text}</span>
                    <span className="font-data-mono text-[10px] text-secondary shrink-0">{entry.time}</span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-secondary text-body-sm">Chưa có thao tác kiểm duyệt nào trong ca trực</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PHÊ DUYỆT & PHÁT CẢNH BÁO KHẨN CẤP */}
      {showBroadcastModal && selectedPoint && (
        <div
          onClick={() => setShowBroadcastModal(false)}
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container overflow-hidden flex flex-col cursor-default animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="p-space-lg border-b border-surface-container flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">campaign</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Phê Duyệt & Phát Cảnh Báo
                  </h3>
                  <span className="text-secondary text-body-sm font-data-mono">
                    #{selectedPoint.id} • {selectedPoint.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-space-lg space-y-space-md max-h-[70vh] overflow-y-auto">
              {/* Snapshot vị trí */}
              <div className="p-space-sm rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">location_on</span>
                <div className="text-body-sm">
                  <p className="font-semibold text-on-surface">{selectedPoint.address}</p>
                  <p className="text-secondary text-label-xs font-data-mono mt-0.5">
                    Quận {selectedPoint.district} • Độ tin cậy: {selectedPoint.confidenceScore}% ({selectedPoint.reportsCount} lượt báo)
                  </p>
                </div>
              </div>

              {/* Lựa chọn cấp độ cảnh báo */}
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                  Chọn Cấp Độ Ngập Cần Phê Duyệt:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {/* RED */}
                  <div
                    onClick={() => {
                      setSelectedSeverity('RED');
                      setBroadcastNote(`Cảnh báo ngập sâu (>60cm) tại ${selectedPoint.name}. Các phương tiện ô tô gầm thấp và xe máy hạn chế đi vào.`);
                    }}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      selectedSeverity === 'RED'
                        ? 'border-red-500 bg-red-50/60 shadow-xs'
                        : 'border-surface-container bg-surface-container-lowest hover:border-surface-container-high'
                    }`}
                  >
                    <input
                      type="radio"
                      name="severitySelect"
                      checked={selectedSeverity === 'RED'}
                      onChange={() => setSelectedSeverity('RED')}
                      className="mt-1 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-body-sm text-red-700">Mức 3: Cảnh Báo Đỏ (&gt;60cm)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 uppercase">
                          Ngập sâu / Lút yên xe
                        </span>
                      </div>
                      <p className="text-label-xs text-secondary mt-1">
                        Nguy cơ thủy kích ô tô con và chết máy xe máy rất cao. Tự động phát thông báo khẩn Push Notification bán kính {broadcastRadius}.
                      </p>
                    </div>
                  </div>

                  {/* ORANGE */}
                  <div
                    onClick={() => {
                      setSelectedSeverity('ORANGE');
                      setBroadcastNote(`Cảnh báo ngập 40cm (nửa bánh xe) tại ${selectedPoint.name}. Phương tiện gầm thấp cần giảm tốc độ.`);
                    }}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      selectedSeverity === 'ORANGE'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-surface-container bg-surface-container-lowest hover:border-surface-container-high'
                    }`}
                  >
                    <input
                      type="radio"
                      name="severitySelect"
                      checked={selectedSeverity === 'ORANGE'}
                      onChange={() => setSelectedSeverity('ORANGE')}
                      className="mt-1 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-body-sm text-amber-800">Mức 2: Cảnh Báo Cam (40cm)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                          Ngập nửa bánh xe
                        </span>
                      </div>
                      <p className="text-label-xs text-secondary mt-1">
                        Xe ô tô gầm thấp khó lưu thông, xe máy di chuyển chậm. Ghim cảnh báo tuyến đường lên bản đồ.
                      </p>
                    </div>
                  </div>

                  {/* YELLOW */}
                  <div
                    onClick={() => {
                      setSelectedSeverity('YELLOW');
                      setBroadcastNote(`Khu vực ${selectedPoint.name} ghi nhận ngập nhẹ 20cm (mắt cá chân). Các phương tiện có thể đi chậm qua.`);
                    }}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      selectedSeverity === 'YELLOW'
                        ? 'border-yellow-500 bg-yellow-50/60 shadow-xs'
                        : 'border-surface-container bg-surface-container-lowest hover:border-surface-container-high'
                    }`}
                  >
                    <input
                      type="radio"
                      name="severitySelect"
                      checked={selectedSeverity === 'YELLOW'}
                      onChange={() => setSelectedSeverity('YELLOW')}
                      className="mt-1 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-body-sm text-yellow-800">Mức 1: Cảnh Báo Vàng (20cm)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 uppercase">
                          Ngập mắt cá chân
                        </span>
                      </div>
                      <p className="text-label-xs text-secondary mt-1">
                        Ngập nhẹ, phương tiện lưu thông bình thường nhưng chú ý trơn trượt.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bán kính thông báo (Chỉ khi mức Đỏ) */}
              {selectedSeverity === 'RED' && (
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">
                    Bán Kính Phát Sóng Thông Báo Đẩy:
                  </label>
                  <div className="flex gap-2">
                    {(['500m', '1km', '2km'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setBroadcastRadius(r)}
                        className={`flex-1 py-1.5 rounded-lg font-label-md text-label-md border transition-colors cursor-pointer ${
                          broadcastRadius === r
                            ? 'bg-red-600 text-white border-red-600 font-bold'
                            : 'bg-surface-container-lowest text-on-surface border-surface-container hover:bg-surface-container'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Thông điệp cảnh báo */}
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">
                  Nội Dung Cảnh Báo Điều Phối:
                </label>
                <textarea
                  rows={2}
                  value={broadcastNote}
                  onChange={(e) => setBroadcastNote(e.target.value)}
                  placeholder="Nhập thông điệp hiển thị cho người dân..."
                  className="w-full p-space-sm rounded-xl bg-surface-container-lowest border border-surface-container text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-space-md border-t border-surface-container bg-surface-container-low flex items-center justify-end gap-space-sm">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-space-md py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBroadcastAlert}
                disabled={isBroadcasting}
                className="px-space-md py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-label-md text-label-md font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-75"
              >
                <span className={`material-symbols-outlined text-[18px] ${isBroadcasting ? 'animate-spin' : ''}`}>
                  {isBroadcasting ? 'sync' : 'notification_important'}
                </span>
                <span>{isBroadcasting ? 'Đang Phát Lệnh...' : 'Xác Nhận Phát Cảnh Báo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁC BỎ TIN GIẢ MẠO / SPAM */}
      {showSpamModal && selectedPoint && (
        <div
          onClick={() => setShowSpamModal(false)}
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container overflow-hidden flex flex-col cursor-default animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="p-space-lg border-b border-surface-container flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">report_problem</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Bác Bỏ Tin Báo Giả Mạo
                  </h3>
                  <span className="text-secondary text-body-sm font-data-mono">
                    #{selectedPoint.id} • {selectedPoint.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSpamModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-space-lg space-y-space-md max-h-[70vh] overflow-y-auto">
              <div className="p-space-sm rounded-xl bg-red-50 border border-red-200 text-error text-body-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">warning</span>
                <p>
                  Thao tác này sẽ loại bỏ tin báo khỏi bản đồ công cộng và ghi nhật ký kiểm duyệt.
                </p>
              </div>

              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-1.5">
                  Lý Do Bác Bỏ:
                </label>
                <div className="space-y-1.5">
                  {[
                    'Tin giả mạo / Hiện trường không ngập',
                    'Hình ảnh hiện trường không trùng khớp',
                    'Nước đã rút từ trước khi gửi báo cáo',
                    'Tin báo trùng lặp hoặc spam phá hoại'
                  ].map((reason) => (
                    <label
                      key={reason}
                      onClick={() => setSpamReason(reason)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer text-body-sm transition-colors ${
                        spamReason === reason
                          ? 'border-error bg-red-50/50 font-semibold text-on-surface'
                          : 'border-surface-container bg-surface-container-lowest text-secondary hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="radio"
                        name="spamReason"
                        checked={spamReason === reason}
                        onChange={() => setSpamReason(reason)}
                        className="text-error focus:ring-error"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">
                  Ghi Chú Kiểm Duyệt (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={spamCustomNote}
                  onChange={(e) => setSpamCustomNote(e.target.value)}
                  placeholder="Ghi rõ thêm lý do nếu cần..."
                  className="w-full p-space-sm rounded-xl bg-surface-container-lowest border border-surface-container text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-error"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-space-md border-t border-surface-container bg-surface-container-low flex items-center justify-end gap-space-sm">
              <button
                type="button"
                onClick={() => setShowSpamModal(false)}
                className="px-space-md py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReportSpam}
                disabled={isRejectingSpam}
                className="px-space-md py-2 rounded-lg bg-error hover:bg-red-700 text-on-error font-label-md text-label-md font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-75"
              >
                <span className={`material-symbols-outlined text-[18px] ${isRejectingSpam ? 'animate-spin' : ''}`}>
                  {isRejectingSpam ? 'sync' : 'delete_forever'}
                </span>
                <span>{isRejectingSpam ? 'Đang Loại Bỏ...' : 'Xác Nhận Loại Bỏ (Spam)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN NƯỚC RÚT */}
      {showClearWaterModal && selectedPoint && (
        <div
          onClick={() => setShowClearWaterModal(false)}
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container overflow-hidden flex flex-col cursor-default animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="p-space-lg border-b border-surface-container flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">water_drop</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Xác Nhận Nước Đã Rút
                  </h3>
                  <span className="text-secondary text-body-sm font-data-mono">
                    #{selectedPoint.id} • {selectedPoint.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearWaterModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-space-lg space-y-space-md">
              <div className="p-space-md rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-[22px] text-emerald-700 shrink-0 mt-0.5">check_circle</span>
                <div>
                  <p className="font-bold text-on-surface mb-1">
                    Gỡ bỏ cảnh báo và mở lại lưu thông
                  </p>
                  <p className="text-secondary text-body-sm">
                    Mực nước tại <strong>{selectedPoint.name}</strong> ({selectedPoint.district}) đã rút hoàn toàn (&lt; 15cm). Điểm cảnh báo này sẽ được giải tỏa và <strong>gỡ bỏ ngay lập tức khỏi bản đồ</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-space-md border-t border-surface-container bg-surface-container-low flex items-center justify-end gap-space-sm">
              <button
                type="button"
                onClick={() => setShowClearWaterModal(false)}
                className="px-space-md py-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmClearWater}
                disabled={isResolvingWater}
                className="px-space-md py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-label-md text-label-md font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-75"
              >
                <span className={`material-symbols-outlined text-[18px] ${isResolvingWater ? 'animate-spin' : ''}`}>
                  {isResolvingWater ? 'sync' : 'water_drop'}
                </span>
                <span>{isResolvingWater ? 'Đang Cập Nhật...' : 'Xác Nhận Nước Rút'}</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full bg-surface-container-lowest p-2 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img className="w-full h-auto rounded-lg object-contain max-h-[80vh]" alt="Full Preview" src={previewPhoto} />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2 cursor-pointer hover:bg-black"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
