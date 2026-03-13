import { useRef } from "react";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildQrUrl(value, size = 140) {
  if (!value) return "";
  const encoded = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}

function buildInvoiceHtml(order) {
  const qrUrl = buildQrUrl(order?.orderCode || "", 140);
  const itemsHtml = Array.isArray(order?.items)
    ? order.items.map((item) => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.size || "-"}</td>
        <td>${item.quantity || 0}</td>
        <td>${formatRupiah(item.unitPrice)}</td>
        <td>${formatRupiah(item.lineTotal)}</td>
      </tr>
    `).join("")
    : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${order.orderCode}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 32px; }
          .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .brand { font-size: 28px; font-weight: 800; }
          .muted { color: #6b7280; }
          .panel { border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; font-size: 14px; }
          th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
          .total { display: flex; justify-content: space-between; font-weight: 700; margin-top: 8px; }
          .grand { font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">GTshirt Invoice</div>
            <div class="muted">Church streetwear order receipt</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Kode:</strong> ${order.orderCode}</div>
            <div><strong>Tanggal:</strong> ${formatDateTime(order.createdAt)}</div>
            ${qrUrl ? `<img src="${qrUrl}" alt="QR ${order.orderCode}" style="margin-top:10px;width:110px;height:110px;border:1px solid #e5e7eb;border-radius:8px;" />` : ""}
          </div>
        </div>
        <div class="panel">
          <div class="grid">
            <div><strong>Nama</strong><br />${order.customerName || "-"}</div>
            <div><strong>WhatsApp</strong><br />${order.customerPhone || "-"}</div>
            <div><strong>Pengiriman</strong><br />${order.shippingMethod || "-"}</div>
            <div><strong>Pembayaran</strong><br />${order.paymentMethod || "-"}</div>
            <div style="grid-column: 1 / -1;"><strong>Alamat</strong><br />${order.customerAddress || "-"}</div>
          </div>
        </div>
        <div class="panel">
          <strong>Item Pesanan</strong>
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Harga</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="total"><span>Subtotal</span><span>${formatRupiah(order.subtotal)}</span></div>
          <div class="total"><span>Ongkir</span><span>${formatRupiah(order.shippingCost)}</span></div>
          <div class="total grand"><span>Total</span><span>${formatRupiah(order.totalAmount)}</span></div>
        </div>
      </body>
    </html>
  `;
}

function StoreOrderInvoice({ order }) {
  const invoiceRef = useRef(null);

  if (!order) return null;

  const qrValue = typeof window !== "undefined" && order.orderCode
    ? `${window.location.origin}/track-order?orderCode=${encodeURIComponent(order.orderCode)}`
    : order.orderCode || "";
  const qrUrl = buildQrUrl(qrValue, 140);

  const handlePrintInvoice = () => {
    const printWindow = window.open("", "_blank", "width=980,height=720");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(buildInvoiceHtml(order));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <article ref={invoiceRef} className="glass-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
            Invoice
          </p>
          <h3 className="mt-1 text-xl font-bold text-brand-900 dark:text-white">
            {order.orderCode}
          </h3>
          <p className="mt-1 text-sm text-brand-500 dark:text-brand-400">
            Dicetak dari sistem GTshirt
          </p>
        </div>
        <div className="flex items-center gap-3">
          {qrUrl && (
            <div className="rounded-2xl border border-brand-200 bg-white p-2 shadow-sm dark:border-brand-700 dark:bg-brand-900/40">
              <img src={qrUrl} alt={`QR ${order.orderCode}`} className="h-20 w-20" />
              <p className="mt-1 text-[10px] text-brand-500 dark:text-brand-400 text-center">
                Scan untuk verifikasi
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handlePrintInvoice}
            className="btn-outline !rounded-xl !px-4 !py-2.5 text-sm"
          >
            Print Invoice
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-brand-700 dark:text-brand-300 sm:grid-cols-2">
        <p><span className="font-semibold text-brand-900 dark:text-white">Nama:</span> {order.customerName}</p>
        <p><span className="font-semibold text-brand-900 dark:text-white">WhatsApp:</span> {order.customerPhone}</p>
        <p><span className="font-semibold text-brand-900 dark:text-white">Pengiriman:</span> {order.shippingMethod}</p>
        <p><span className="font-semibold text-brand-900 dark:text-white">Pembayaran:</span> {order.paymentMethod}</p>
      </div>

      <div className="mt-5 space-y-3">
        {Array.isArray(order.items) && order.items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-900 dark:text-white">
                  {item.productName}
                </p>
                <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                  Size {item.size} • Qty {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-primary">
                {formatRupiah(item.lineTotal)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2 border-t border-brand-200 pt-4 text-sm dark:border-brand-700">
        <div className="flex items-center justify-between text-brand-600 dark:text-brand-300">
          <span>Subtotal</span>
          <span>{formatRupiah(order.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-brand-600 dark:text-brand-300">
          <span>Ongkir</span>
          <span>{formatRupiah(order.shippingCost)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-bold text-brand-900 dark:text-white">
          <span>Total</span>
          <span className="text-primary">{formatRupiah(order.totalAmount)}</span>
        </div>
      </div>
    </article>
  );
}

export default StoreOrderInvoice;
