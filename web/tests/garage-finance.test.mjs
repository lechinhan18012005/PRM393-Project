import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server;
let Stats;
let Breakdown;
let View;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const view = await server.ssrLoadModule('/src/components/views/GarageFinanceView.tsx');
  Stats = view.GarageRevenueStats;
  Breakdown = view.GarageRevenueBreakdown;
  View = view.GarageFinanceView;
});
after(async () => { await server?.close(); });

for (const revenue of [undefined, null]) {
  test(`missing revenue (${revenue}) renders an unavailable state without throwing`, () => {
    const stats = renderToStaticMarkup(createElement(Stats, { revenue }));
    const breakdown = renderToStaticMarkup(createElement(Breakdown, { revenue }));
    assert.equal((stats.match(/<strong>---<\/strong>/g) || []).length, 3);
    assert.match(breakdown, /Chưa có dữ liệu doanh thu/);
    assert.doesNotMatch(stats + breakdown, /undefined|NaN|Tháng chưa xác định/);
    assert.doesNotMatch(breakdown, /Chưa có doanh thu trong tháng/);
    assert.match(breakdown, /<strong>---<\/strong>/);
  });
}

test('wallet not loaded still renders the cards and disables payout', () => {
  const html = renderToStaticMarkup(createElement(View));
  assert.equal((html.match(/<strong>---<\/strong>/g) || []).length, 5);
  assert.match(html, /SỐ DƯ KHẢ DỤNG/);
  assert.match(html, /disabled=""[^>]*>Yêu cầu rút tiền/);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test('partial revenue keeps missing individual values as placeholders', () => {
  const html = renderToStaticMarkup(createElement(Stats, { revenue: { netRevenue: 0 } }));
  assert.equal((html.match(/<strong>---<\/strong>/g) || []).length, 2);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test('valid zero revenue renders zero values and the empty month state', () => {
  const revenue = { month: '2026-11', paidOrderCount: 0, netRevenue: 0, platformFee: 0, revenueByService: {} };
  const stats = renderToStaticMarkup(createElement(Stats, { revenue }));
  const breakdown = renderToStaticMarkup(createElement(Breakdown, { revenue }));
  assert.match(stats, /11\/2026/);
  assert.match(stats, /Đơn đã thanh toán/);
  assert.match(stats, /<strong>0<\/strong>/);
  assert.match(breakdown, /Chưa có doanh thu trong tháng/);
});

test('populated revenue renders actual amounts and service labels', () => {
  const revenue = { month: '2026-11', paidOrderCount: 2, netRevenue: 180000, platformFee: 20000, revenueByService: { ONSITE_REPAIR: 180000 } };
  const stats = renderToStaticMarkup(createElement(Stats, { revenue }));
  const breakdown = renderToStaticMarkup(createElement(Breakdown, { revenue }));
  assert.match(stats, /180\.000/);
  assert.match(stats, /20\.000/);
  assert.match(breakdown, /Sửa chữa tại chỗ/);
  assert.match(breakdown, /width:100%/);
});
