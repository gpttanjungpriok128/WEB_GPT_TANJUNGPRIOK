import { formatDateTime, formatRupiah } from "./storeFormatters";
import { isPickupShippingMethod } from "./storeOrderStatus";

export function isOfflineStoreOrder(order) {
  return String(order?.channel || "").trim().toLowerCase() === "offline_store";
}

export function getStoreOrderPrintLabel(order) {
  return isOfflineStoreOrder(order) ? "Print Struk" : "Print Resi";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildQrUrl(value, size = 140) {
  const encoded = encodeURIComponent(String(value || "").trim());
  if (!encoded) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}

function buildOrderQrValue(orderCode, mode, baseUrl = "") {
  if (!orderCode) return "";
  if (!baseUrl) return orderCode;
  const params = new URLSearchParams({ orderCode });
  if (mode) params.set("mode", mode);
  return `${baseUrl}/track-order?${params.toString()}`;
}

function buildShippingLabelMarkup(order, { logoUrl, qrValue } = {}) {
  const isPickup = isPickupShippingMethod(order?.shippingMethod);
  const deliveryLabel = isPickup ? "Resi Ambil di Gereja" : "Resi Pengiriman";
  const items = Array.isArray(order?.items) ? order.items : [];
  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const itemRows = items.length > 0
    ? items.map((item) => `<tr><td>${escapeHtml(item.productName || "-")}</td><td class="muted">(${escapeHtml(item.size || "-")} x${Number(item.quantity) || 0})</td></tr>`).join("")
    : `<tr><td colspan="2" class="muted">Tidak ada item.</td></tr>`;
  const resolvedQrValue = qrValue || order?.orderCode || "";
  const qrUrl = buildQrUrl(resolvedQrValue, 140);

  return `<div class="label"><div class="header"><div class="brand">${logoUrl ? `<img src="${logoUrl}" alt="GTshirt" class="logo" />` : ""}<div><div class="brand-name">GTshirtwear</div><div class="muted">${deliveryLabel}</div></div></div>${qrUrl ? `<img src="${qrUrl}" alt="QR ${escapeHtml(order?.orderCode)}" class="qr" />` : ""}</div><div class="muted">Tanggal: ${escapeHtml(formatDateTime(order?.createdAt))}</div><div class="section"><div class="label-title">Penerima</div><div class="value">${escapeHtml(order?.customerName || "-")}</div><div class="muted">WA: ${escapeHtml(order?.customerPhone || "-")}</div><div class="muted">Alamat: ${escapeHtml(order?.customerAddress || "-")}</div></div><div class="section"><div class="label-title">Pengiriman</div><div class="value">${escapeHtml(order?.shippingMethod || "-")}</div><div class="muted">Pembayaran: ${escapeHtml(order?.paymentMethod || "-")}</div></div><div class="section"><div class="label-title">Item</div><table>${itemRows}</table></div>${order?.notes ? `<div class="section"><div class="label-title">Catatan</div><div class="muted">${escapeHtml(order.notes)}</div></div>` : ""}<div class="footer"><div>Total Item: ${totalItems}</div><div>${escapeHtml(formatRupiah(order?.totalAmount))}</div></div><div class="order-code">Resi: ${escapeHtml(order?.orderCode || "-")}</div></div>`;
}

function buildOfflineReceiptMarkup(order, { logoUrl, qrValue } = {}) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemRows = items.length > 0
    ? items.map((item) => (
      `<tr><td>${escapeHtml(item.productName || "-")}<div class="muted">Size ${escapeHtml(item.size || "-")}</div></td><td class="qty">${Number(item.quantity) || 0}</td><td class="price">${escapeHtml(formatRupiah(item.lineTotal))}</td></tr>`
    )).join("")
    : `<tr><td colspan="3" class="muted empty">Tidak ada item.</td></tr>`;
  const qrUrl = buildQrUrl(qrValue || order?.orderCode || "", 100);
  const reversalTitle = String(order?.reversalType || "").trim().toLowerCase() === "return"
    ? "RETUR DIPROSES"
    : "VOID DIPROSES";

  return `<div class="receipt"><div class="receipt-head">${logoUrl ? `<img src="${logoUrl}" alt="GTshirt" class="receipt-logo" />` : ""}<div><div class="receipt-title">GTshirt Offline Store</div><div class="muted center">Gereja GPT Tanjung Priok</div></div></div><div class="divider"></div><div class="center strong">STRUK TRANSAKSI</div><div class="muted center">${escapeHtml(order?.orderCode || "-")}</div>${qrUrl ? `<div class="qr-shell"><img src="${qrUrl}" alt="QR ${escapeHtml(order?.orderCode || "-")}" class="receipt-qr" /></div>` : ""}<div class="meta-row"><span>Tanggal</span><span>${escapeHtml(formatDateTime(order?.createdAt))}</span></div><div class="meta-row"><span>Kasir</span><span>${escapeHtml(order?.cashierName || "-")}</span></div><div class="meta-row"><span>Pelanggan</span><span>${escapeHtml(order?.customerName || "-")}</span></div><div class="meta-row"><span>Pembayaran</span><span>${escapeHtml(order?.paymentMethod || "-")}</span></div><div class="divider"></div><table class="receipt-table"><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table><div class="divider"></div><div class="meta-row"><span>Subtotal</span><span>${escapeHtml(formatRupiah(order?.subtotal))}</span></div><div class="meta-row strong"><span>Total</span><span>${escapeHtml(formatRupiah(order?.totalAmount))}</span></div><div class="meta-row"><span>Dibayar</span><span>${escapeHtml(formatRupiah(order?.amountPaid))}</span></div><div class="meta-row"><span>Kembalian</span><span>${escapeHtml(formatRupiah(order?.changeAmount))}</span></div>${order?.notes ? `<div class="note-box"><div class="strong">Catatan</div><div class="muted">${escapeHtml(order.notes)}</div></div>` : ""}${order?.reversedAt ? `<div class="reversal-box"><div class="strong">${reversalTitle}</div><div class="muted">${escapeHtml(formatDateTime(order.reversedAt))}</div>${order?.reversalReason ? `<div class="muted">Alasan: ${escapeHtml(order.reversalReason)}</div>` : ""}</div>` : ""}<div class="divider dashed"></div><div class="muted center">Terima kasih. Tuhan Yesus memberkati.</div></div>`;
}

export function getStoreOrderPrintAsset(order, { logoUrl = "", baseUrl = "" } = {}) {
  if (isOfflineStoreOrder(order)) {
    return {
      layout: "receipt",
      markup: buildOfflineReceiptMarkup(order, {
        logoUrl,
        qrValue: order?.orderCode || "",
      }),
    };
  }

  return {
    layout: "label",
    markup: buildShippingLabelMarkup(order, {
      logoUrl,
      qrValue: buildOrderQrValue(order?.orderCode, "resi", baseUrl),
    }),
  };
}

export function buildStoreOrderPrintDocument(order, options = {}) {
  const asset = getStoreOrderPrintAsset(order, options);
  return buildStoreOrderPrintDocumentFromAssets([asset]);
}

export function buildStoreOrderPrintDocumentFromAssets(assets = []) {
  const safeAssets = Array.isArray(assets) ? assets.filter(Boolean) : [];
  const hasReceipt = safeAssets.some((asset) => asset.layout === "receipt");
  const hasLabel = safeAssets.some((asset) => asset.layout === "label");

  if (hasReceipt && hasLabel) {
    throw new Error("Dokumen print campuran belum didukung untuk bulk print.");
  }

  if (hasReceipt) {
    const markup = safeAssets.map((asset) => asset.markup).join("");
    return `<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>Struk GTshirt</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{width:80mm;background:#fff;color:#111827;margin:0;padding:0;font-family:"Courier New",ui-monospace,monospace}.receipt{width:80mm;padding:4mm 4mm 6mm;page-break-after:always}.receipt:last-child{page-break-after:auto}.receipt-head{display:flex;align-items:center;justify-content:center;gap:8px}.receipt-logo{width:34px;height:34px;object-fit:cover;border-radius:8px}.receipt-title{font-size:14px;font-weight:700;text-align:center}.center{text-align:center}.strong{font-weight:700}.muted{font-size:10px;color:#4b5563}.divider{border-top:1px solid #111827;margin:8px 0}.divider.dashed{border-top-style:dashed}.qr-shell{display:flex;justify-content:center;margin:8px 0}.receipt-qr{width:96px;height:96px}.meta-row{display:flex;justify-content:space-between;gap:10px;font-size:11px;line-height:1.45;margin:2px 0}.receipt-table{width:100%;border-collapse:collapse;font-size:11px}.receipt-table th,.receipt-table td{padding:4px 0;border-bottom:1px dotted #d1d5db;vertical-align:top}.receipt-table th{text-align:left}.receipt-table .qty,.receipt-table .price{text-align:right;white-space:nowrap}.receipt-table .empty{text-align:center;padding:10px 0}.note-box,.reversal-box{margin-top:8px;padding-top:6px;border-top:1px dashed #d1d5db}</style></head><body>${markup}</body></html>`;
  }

  const markup = safeAssets.map((asset) => asset.markup).join("");
  const isA4 = safeAssets.length > 1;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>Resi Pesanan</title><style>@page{size:${isA4 ? "A4" : "100mm 150mm"};margin:${isA4 ? "8mm" : "0"}}*{box-sizing:border-box}html,body{width:${isA4 ? "210mm" : "100mm"};min-height:${isA4 ? "297mm" : "150mm"}}body{font-family:"Arial",sans-serif;color:#0f172a;margin:0;padding:0;background:#fff}.sheet{${isA4 ? "display:grid;grid-template-columns:repeat(2,1fr);gap:6mm;align-content:start" : ""}}.label{width:${isA4 ? "94mm" : "100mm"};min-height:${isA4 ? "137mm" : "150mm"};padding:${isA4 ? "6mm" : "8mm"};border:${isA4 ? "1px dashed #0f766e" : "0"};border-radius:${isA4 ? "10px" : "0"};margin:0;break-inside:avoid;page-break-inside:avoid}.header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}.brand{display:flex;align-items:center;gap:10px}.logo{width:42px;height:42px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0}.brand-name{font-weight:800;font-size:16px;letter-spacing:0.04em;color:#0f766e}.qr{width:84px;height:84px}.section{margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0}.label-title{font-size:11px;letter-spacing:0.18em;font-weight:700;color:#64748b;text-transform:uppercase}.value{font-size:13px;font-weight:600;margin-top:4px}.muted{color:#64748b;font-size:11px}table{width:100%;border-collapse:collapse;margin-top:6px}td{padding:4px 0;font-size:12px;vertical-align:top}.footer{margin-top:10px;display:flex;justify-content:space-between;font-size:12px;font-weight:700}.order-code{margin-top:8px;font-size:12px;font-weight:700;color:#0f766e}</style></head><body>${isA4 ? `<div class="sheet">${markup}</div>` : markup}</body></html>`;
}
