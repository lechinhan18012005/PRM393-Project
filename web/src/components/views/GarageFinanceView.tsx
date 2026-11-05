import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Receipt, Truck, Wallet } from 'lucide-react';
import { GarageEmpty, GarageError, GarageHeading, GarageModal, GaragePanel, GarageStat } from '../garage/GarageUI';
import { financeApi, GarageWalletBackend } from '../../services/financeApi';

const money = (value?: number | null) => typeof value === 'number' && Number.isFinite(value)
  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : '---';
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const serviceNames: Record<string, string> = {
  SINGLE_CROSSING: 'Chở xe vượt ngập đơn lẻ', BATCH_CROSSING: 'Gom xe vượt ngập',
  ONSITE_REPAIR: 'Sửa chữa tại chỗ', TOWING: 'Kéo xe về gara', OTHER: 'Dịch vụ khác'
};
const statuses: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt, chờ chuyển khoản', TRANSFERRED: 'Đã chuyển khoản', REJECTED: 'Từ chối' };
const transactionNames: Record<string, string> = {
  ORDER_INCOME: 'Thu từ đơn hàng', COMMISSION_DEDUCT: 'Khấu trừ phí sàn', PAYOUT_WITHDRAW: 'Rút tiền',
  DISPUTE_REFUND_DEDUCT: 'Hoàn tiền khiếu nại', MANUAL_ADJUSTMENT: 'Điều chỉnh số dư'
};

export function GarageRevenueStats({ revenue }: { revenue: GarageWalletBackend['revenue'] }) {
  const month = revenue?.month?.split('-').reverse().join('/');
  return <div className="garage-stat-grid three">
    <GarageStat label={month ? `Thực nhận · Tháng ${month}` : 'Thực nhận'} value={money(revenue?.netRevenue)} detail={revenue ? 'Từ giao dịch thanh toán thành công' : 'Chưa có dữ liệu doanh thu'} icon={<Receipt size={18} />} />
    <GarageStat label="Đơn đã thanh toán" value={typeof revenue?.paidOrderCount === 'number' && Number.isFinite(revenue.paidOrderCount) ? String(revenue.paidOrderCount) : '---'} detail={month ? `Trong tháng ${month}` : 'Chưa có dữ liệu doanh thu'} icon={<Truck size={18} />} accent="teal" />
    <GarageStat label="Phí sàn" value={money(revenue?.platformFee)} detail={revenue ? 'Theo phí thực tế của từng giao dịch' : 'Chưa có dữ liệu doanh thu'} icon={<Wallet size={18} />} accent="blue" />
  </div>;
}

export function GarageRevenueBreakdown({ revenue }: { revenue: GarageWalletBackend['revenue'] }) {
  const groups = Object.entries(revenue?.revenueByService || {});
  const maxRevenue = Math.max(1, ...groups.map(([, value]) => Number(value)));
  const month = revenue?.month?.split('-').reverse().join('/');
  return <GaragePanel title="Cơ cấu doanh thu" description={month ? `Tháng ${month} · Thực nhận theo nhóm dịch vụ` : undefined}>
    {!revenue ? <div className="garage-empty"><strong>---</strong><p>Chưa có dữ liệu doanh thu</p></div>
      : groups.length ? <div className="garage-revenue-list">{groups.map(([type, value]) => <div key={type}>
        <div><span>{serviceNames[type] || type}</span><strong>{money(value)}</strong></div>
        <div className="garage-revenue-track"><i style={{ width: `${Math.max(0, Number(value)) / maxRevenue * 100}%` }} /></div>
      </div>)}</div> : <GarageEmpty title="Chưa có doanh thu trong tháng" description="Doanh thu sẽ xuất hiện khi có giao dịch thanh toán thành công." />}
  </GaragePanel>;
}

export function GarageFinanceView() {
  const [wallet, setWallet] = useState<GarageWalletBackend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPayout, setShowPayout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [form, setForm] = useState({ amount: '', bankCode: '', bankName: '', accountNumber: '', accountHolderName: '' });
  const requestRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const data = await financeApi.getGarageWallet(controller.signal);
      if (!controller.signal.aborted) setWallet(data);
    } catch (err) {
      if (!controller.signal.aborted) {
        setWallet(null);
        setError(err instanceof Error ? err.message : 'Không thể tải ví gara.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => requestRef.current?.abort();
  }, [load]);

  async function submitPayout(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || !wallet || loading) return;
    const amount = Number(form.amount);
    if (!Number.isSafeInteger(amount) || amount < 50000 || amount > wallet.availableBalance) {
      setPayoutError('Số tiền phải là số nguyên, tối thiểu 50.000đ và không vượt số dư khả dụng.');
      return;
    }
    if (![form.bankCode, form.accountNumber, form.accountHolderName].every(value => value.trim())) {
      setPayoutError('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setPayoutError('');
    try {
      const payout = await financeApi.createGaragePayout({
        requestedAmount: amount, bankCode: form.bankCode.trim(), bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(), accountHolderName: form.accountHolderName.trim()
      });
      setShowPayout(false);
      setForm({ amount: '', bankCode: '', bankName: '', accountNumber: '', accountHolderName: '' });
      setMessage(`Đã gửi yêu cầu ${payout.requestCode}. Vui lòng chờ Admin duyệt và chuyển khoản.`);
      await load();
    } catch (err) {
      setPayoutError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu rút tiền.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const revenue = wallet?.revenue;
  const transactions = wallet?.recentTransactions ?? [];
  const payouts = wallet?.payoutRequests ?? [];

  return (
    <section className="garage-portal">
      <GarageHeading title="Doanh thu & ví gara" description="Theo dõi doanh thu, đối soát và dòng tiền của gara."
        action={<button className="garage-button" disabled={loading || submitting} onClick={() => void load()}>Làm mới</button>} />
      {message && <div className="garage-note" role="status">{message}</div>}
      <GarageError message={error} retry={() => void load()} />
      {loading && <p className="garage-muted" role="status">Đang tải dữ liệu doanh thu và ví...</p>}
      <>
        <GarageRevenueStats revenue={revenue} />
        <div className="garage-columns">
          <GarageRevenueBreakdown revenue={revenue} />
          <GaragePanel title={wallet?.garageName ? `Ví gara · ${wallet.garageName}` : 'Ví gara'}>
            <div className="garage-wallet">
              <small>SỐ DƯ KHẢ DỤNG</small><strong>{money(wallet?.availableBalance)}</strong>
              <small>Đang chờ rút tiền: {money(wallet?.pendingPayoutAmount)}</small>
            </div>
            <div style={{ padding: 20 }}>
              <p className="garage-muted">Tổng số dư: {money(wallet?.walletBalance)} · Đã rút: {money(wallet?.totalWithdrawnAmount)}</p>
              <button className="garage-button" disabled={loading || !wallet || !Number.isFinite(wallet.availableBalance) || wallet.availableBalance < 50000} onClick={() => { setPayoutError(''); setMessage(''); setShowPayout(true); }}>Yêu cầu rút tiền</button>
              <p className="garage-muted">Tối thiểu 50.000đ. Yêu cầu được Admin duyệt trước khi chuyển khoản.</p>
            </div>
          </GaragePanel>
        </div>
        {wallet && <>
        <GaragePanel title="Lịch sử giao dịch ví">
          {transactions.length ? <div className="garage-table-wrap"><table className="garage-table">
            <thead><tr><th>Thời gian</th><th>Mã tham chiếu</th><th>Loại giao dịch</th><th>Nội dung</th><th>Số tiền</th><th>Số dư sau giao dịch</th></tr></thead>
            <tbody>{transactions.map(tx => <tr key={tx.id}><td>{date(tx.createdAt)}</td><td>{tx.referenceCode || '—'}</td><td>{transactionNames[tx.transactionType] || tx.transactionType}</td><td>{tx.description || '—'}</td><td>{money(tx.amount)}</td><td>{money(tx.balanceAfter)}</td></tr>)}</tbody>
          </table></div> : <GarageEmpty title="Chưa có giao dịch ví" description="Các biến động số dư sẽ được hiển thị tại đây." />}
        </GaragePanel>
        <GaragePanel title="Yêu cầu rút tiền">
          {payouts.length ? <div className="garage-table-wrap"><table className="garage-table">
            <thead><tr><th>Mã yêu cầu</th><th>Ngày tạo</th><th>Ngân hàng / Tài khoản</th><th>Số tiền</th><th>Trạng thái</th><th>Ghi chú / Mã chuyển khoản</th></tr></thead>
            <tbody>{payouts.map(p => <tr key={p.id}><td>{p.requestCode}</td><td>{date(p.createdAt)}</td><td>{p.bankName || p.bankCode} · {p.accountNumber}<br />{p.accountHolderName}</td><td>{money(p.requestedAmount)}</td><td>{statuses[p.status] || p.status}</td><td>{p.adminNote || '—'}<br />{p.transactionReference}</td></tr>)}</tbody>
          </table></div> : <GarageEmpty title="Chưa có yêu cầu rút tiền" description="Yêu cầu đã gửi và kết quả xử lý sẽ xuất hiện tại đây." />}
        </GaragePanel>
        </>}
      </>
      {showPayout && wallet && <GarageModal title="Yêu cầu rút tiền" description={`Số dư khả dụng: ${money(wallet?.availableBalance)}`} onClose={() => { if (!submittingRef.current) setShowPayout(false); }}>
        <form className="garage-form" onSubmit={submitPayout}>
          <GarageError message={payoutError} />
          <label>Số tiền (VNĐ)<input type="number" min="50000" max={wallet.availableBalance} step="1" required disabled={submitting} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
          <label>Mã ngân hàng<input required maxLength={30} placeholder="VD: VCB" disabled={submitting} value={form.bankCode} onChange={e => setForm({ ...form, bankCode: e.target.value })} /></label>
          <label>Tên ngân hàng<input maxLength={120} disabled={submitting} value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></label>
          <label>Số tài khoản<input required maxLength={60} inputMode="numeric" disabled={submitting} value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} /></label>
          <label>Chủ tài khoản<input required maxLength={150} disabled={submitting} value={form.accountHolderName} onChange={e => setForm({ ...form, accountHolderName: e.target.value })} /></label>
          <button type="submit" disabled={submitting || loading}>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}</button>
        </form>
      </GarageModal>}
    </section>
  );
}
