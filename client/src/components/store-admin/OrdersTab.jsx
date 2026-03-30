import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import api from "../../services/api";
import gtshirtLogo from "../../img/gtshirt-logo.jpeg";
import { formatRupiah, formatDateTime, mapOrderStatusLabel } from "../../utils/storeFormatters";
import { invalidateStoreCatalogCache } from "../../utils/storeCatalogCache";
import {
  buildStoreOrderPrintDocument,
  buildStoreOrderPrintDocumentFromAssets,
  getStoreOrderPrintAsset,
  getStoreOrderPrintLabel,
} from "../../utils/storePrint";
import {
  ORDER_STATUS_BADGE,
  getAllowedNextOrderStatuses,
} from "../../utils/storeOrderStatus";

const ORDER_STATUS_OPTIONS = [
  { value: "new", label: "Baru" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "packed", label: "Dikemas" },
  { value: "ready_pickup", label: "Siap Diambil" },
  { value: "shipping", label: "Dalam Pengiriman" },
  { value: "picked_up", label: "Sudah Diambil" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];
const ORDER_CHANNEL_OPTIONS = [
  { value: "", label: "Semua Channel" },
  { value: "whatsapp", label: "Online / Web" },
  { value: "offline_store", label: "Offline Store" },
];
const ORDER_PAGE_SIZE = 12;
const ORDER_STATUS_OPTION_MAP = new Map(ORDER_STATUS_OPTIONS.map((option) => [option.value, option]));

function statusBadge(status) {
  return ORDER_STATUS_BADGE[status] || "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isPickupShippingMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes("ambil") || normalized.includes("pickup") || normalized.includes("pick up") || normalized.includes("pick-up");
}

function isOfflineOrder(order) {
  return String(order?.channel || "").trim().toLowerCase() === "offline_store";
}

function mapOrderChannelLabel(order) {
  if (isOfflineOrder(order)) return "Offline Store";
  if (String(order?.channel || "").trim().toLowerCase() === "whatsapp") return "Online / Web";
  return String(order?.channel || "Store").trim() || "Store";
}

function getPrintLabelTitle(order) {
  if (isOfflineOrder(order)) return "Struk Offline Store";
  return isPickupShippingMethod(order?.shippingMethod) ? "Resi Ambil di Gereja" : "Resi Pengiriman";
}

function getPrintButtonLabel(order) {
  return getStoreOrderPrintLabel(order);
}

function getReversalTypeLabel(order) {
  return String(order?.reversalType || "").trim().toLowerCase() === "return" ? "Retur" : "Void";
}

function getOrderTransitionOptions(order) {
  const currentStatus = String(order?.status || "").trim();
  const allowedNext = getAllowedNextOrderStatuses(currentStatus, order?.shippingMethod);
  const values = [currentStatus, ...allowedNext].filter(Boolean);

  return values.map((value) => (
    ORDER_STATUS_OPTION_MAP.get(value) || { value, label: mapOrderStatusLabel(value) }
  ));
}

function buildOrderQrValue(orderCode, mode, baseUrl = "") {
  if (!orderCode) return "";
  if (!baseUrl) return orderCode;
  const params = new URLSearchParams({ orderCode });
  if (mode) params.set("mode", mode);
  return `${baseUrl}/track-order?${params.toString()}`;
}

function buildPrintLabelMarkup(order, { logoUrl, qrValue } = {}) {
  if (!order) return "";
  const deliveryLabel = getPrintLabelTitle(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const itemRows = items.length > 0
    ? items.map((item) => `<tr><td>${escapeHtml(item.productName || "-")}</td><td class="muted">(${escapeHtml(item.size || "-")} x${Number(item.quantity) || 0})</td></tr>`).join("")
    : `<tr><td colspan="2" class="muted">Tidak ada item.</td></tr>`;
  const resolvedQrValue = qrValue || order.orderCode || "";
  const encodedQrValue = resolvedQrValue ? encodeURIComponent(resolvedQrValue) : "";
  const qrUrl = encodedQrValue ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodedQrValue}` : "";
  return `<div class="label"><div class="header"><div class="brand">${logoUrl ? `<img src="${logoUrl}" alt="GTshirt" class="logo" />` : ""}<div><div class="brand-name">GTshirtwear</div><div class="muted">${deliveryLabel}</div></div></div>${qrUrl ? `<img src="${qrUrl}" alt="QR ${escapeHtml(order.orderCode)}" class="qr" />` : ""}</div><div class="muted">Tanggal: ${escapeHtml(formatDateTime(order.createdAt))}</div><div class="section"><div class="label-title">Penerima</div><div class="value">${escapeHtml(order.customerName || "-")}</div><div class="muted">WA: ${escapeHtml(order.customerPhone || "-")}</div><div class="muted">Alamat: ${escapeHtml(order.customerAddress || "-")}</div></div><div class="section"><div class="label-title">Pengiriman</div><div class="value">${escapeHtml(order.shippingMethod || "-")}</div><div class="muted">Pembayaran: ${escapeHtml(order.paymentMethod || "-")}</div></div><div class="section"><div class="label-title">Item</div><table>${itemRows}</table></div>${order.notes ? `<div class="section"><div class="label-title">Catatan</div><div class="muted">${escapeHtml(order.notes)}</div></div>` : ""}<div class="footer"><div>Total Item: ${totalItems}</div><div>${escapeHtml(formatRupiah(order.totalAmount))}</div></div><div class="order-code">Resi: ${escapeHtml(order.orderCode || "-")}</div></div>`;
}

function buildPrintDocument(markup, { layout = "thermal" } = {}) {
  const isA4 = layout === "a4";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>Resi Pesanan</title><style>@page{size:${isA4 ? "A4" : "100mm 150mm"};margin:${isA4 ? "8mm" : "0"}}*{box-sizing:border-box}html,body{width:${isA4 ? "210mm" : "100mm"};min-height:${isA4 ? "297mm" : "150mm"}}body{font-family:"Arial",sans-serif;color:#0f172a;margin:0;padding:0;background:#fff}.sheet{${isA4 ? "display:grid;grid-template-columns:repeat(2,1fr);gap:6mm;align-content:start" : ""}}.label{width:${isA4 ? "94mm" : "100mm"};min-height:${isA4 ? "137mm" : "150mm"};padding:${isA4 ? "6mm" : "8mm"};border:${isA4 ? "1px dashed #0f766e" : "0"};border-radius:${isA4 ? "10px" : "0"};margin:0;break-inside:avoid;page-break-inside:avoid}.header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}.brand{display:flex;align-items:center;gap:10px}.logo{width:42px;height:42px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0}.brand-name{font-weight:800;font-size:16px;letter-spacing:0.04em;color:#0f766e}.qr{width:84px;height:84px}.section{margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0}.label-title{font-size:11px;letter-spacing:0.18em;font-weight:700;color:#64748b;text-transform:uppercase}.value{font-size:13px;font-weight:600;margin-top:4px}.muted{color:#64748b;font-size:11px}table{width:100%;border-collapse:collapse;margin-top:6px}td{padding:4px 0;font-size:12px;vertical-align:top}.footer{margin-top:10px;display:flex;justify-content:space-between;font-size:12px;font-weight:700}.order-code{margin-top:8px;font-size:12px;font-weight:700;color:#0f766e}</style></head><body>${isA4 ? `<div class="sheet">${markup}</div>` : markup}</body></html>`;
}

export default function OrdersTab({ isActive, analytics, onGoToScan }) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderChannelFilter, setOrderChannelFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderMeta, setOrderMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [activeOrderSheet, setActiveOrderSheet] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [orderScrollTop, setOrderScrollTop] = useState(0);
  const [orderViewportHeight, setOrderViewportHeight] = useState(560);
  const [orderRowHeight, setOrderRowHeight] = useState(190);

  const orderListRef = useRef(null);
  const orderRowMeasureRef = useRef(null);

  const fetchOrders = useCallback(async (overrides = {}) => {
    const page = Math.max(1, Number(overrides.page ?? orderPage) || 1);
    const limit = Math.min(50, Math.max(1, Number(overrides.limit ?? ORDER_PAGE_SIZE) || ORDER_PAGE_SIZE));
    const append = Boolean(overrides.append);
    if (append) { setIsLoadingMoreOrders(true); } else { setLoadingOrders(true); }
    try {
      const { data } = await api.get("/store/admin/orders", {
        params: {
          page,
          limit,
          search: overrides.search ?? orderSearch,
          status: overrides.status ?? orderStatusFilter,
          channel: overrides.channel ?? orderChannelFilter,
        },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const meta = data?.meta || { page, totalPages: 1, total: rows.length };
      setOrderMeta({ page: meta.page ?? page, totalPages: meta.totalPages ?? 1, total: meta.total ?? rows.length });
      setOrderPage(page);
      setOrders((prev) => {
        if (!append) return rows;
        const existing = new Set(prev.map((o) => o.id));
        const merged = [...prev];
        rows.forEach((o) => { if (!existing.has(o.id)) merged.push(o); });
        return merged;
      });
      return rows;
    } catch (error) {
      setOrders([]);
      setFeedback({ type: "error", text: error.response?.data?.message || "Gagal memuat data order toko." });
      return [];
    } finally {
      if (append) { setIsLoadingMoreOrders(false); } else { setLoadingOrders(false); }
    }
  }, [orderPage, orderSearch, orderStatusFilter, orderChannelFilter]);

  const handleOrderStatusChange = async (orderId, status) => {
    const previousOrders = orders;
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    try {
      await api.patch(`/store/admin/orders/${orderId}/status`, { status });
      invalidateStoreCatalogCache();
      setFeedback({ type: "success", text: "Status order berhasil diperbarui." });
    } catch (error) {
      setOrders(previousOrders);
      setFeedback({ type: "error", text: error.response?.data?.message || "Gagal memperbarui status order." });
    }
  };

  const handleClearOrders = async () => {
    if (!window.confirm("Hapus semua pesanan? Data pesanan dan item akan dihapus permanen.")) return;
    try {
      await api.post("/store/admin/orders/reset");
      setFeedback({ type: "success", text: "Semua pesanan berhasil dihapus." });
      setOrderPage(1);
      await fetchOrders({ page: 1 });
    } catch (error) {
      setFeedback({ type: "error", text: error.response?.data?.message || "Gagal menghapus semua pesanan." });
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) { setFeedback({ type: "error", text: "Pilih status terlebih dahulu." }); return; }
    if (selectedOrders.length === 0) { setFeedback({ type: "error", text: "Pilih minimal 1 order." }); return; }
    if (!window.confirm(`Ubah status ${selectedOrders.length} order menjadi "${mapOrderStatusLabel(bulkStatus)}"?`)) return;
    const previousOrders = orders;
    const ids = new Set(selectedOrders.map((o) => o.id));
    setOrders((prev) => prev.map((o) => ids.has(o.id) ? { ...o, status: bulkStatus } : o));
    const results = await Promise.allSettled(selectedOrders.map((o) => api.patch(`/store/admin/orders/${o.id}/status`, { status: bulkStatus })));
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    if (successCount > 0) invalidateStoreCatalogCache();
    if (failed > 0) { setOrders(previousOrders); setFeedback({ type: "error", text: `${failed} order gagal diperbarui. Coba ulangi.` }); return; }
    setFeedback({ type: "success", text: "Status order terpilih berhasil diperbarui." });
    setSelectedOrderIds(new Set());
    setBulkStatus("");
  };

  const getQuickActionForOrder = (order) => {
    if (!order) return null;
    if (order.status === "new") return { label: "Konfirmasi Pesanan", nextStatus: "confirmed" };
    if (order.status === "confirmed") return { label: "Dikemas", nextStatus: "packed" };
    return null;
  };

  const handleQuickOrderAction = async (order, action) => {
    if (!order || !action) return;
    await handleOrderStatusChange(order.id, action.nextStatus);
  };

  const handleOfflineReversal = async (order, action) => {
    if (!order || !isOfflineOrder(order)) return;
    const actionLabel = action === "return" ? "retur" : "void";
    const reason = window.prompt(`Alasan ${actionLabel} transaksi ${order.orderCode} (opsional):`, "");
    if (reason === null) return false;

    try {
      const { data } = await api.post(`/store/admin/orders/${order.id}/reversal`, {
        action,
        reason: reason.trim(),
      });
      const updatedOrder = data?.data || null;
      if (updatedOrder) {
        setOrders((prev) => prev.map((entry) => (
          entry.id === order.id
            ? { ...entry, ...updatedOrder, user: entry.user, reversalActor: entry.reversalActor }
            : entry
        )));
        if (activeOrderSheet?.id === order.id) {
          setActiveOrderSheet((prev) => (prev ? { ...prev, ...updatedOrder } : prev));
        }
      }
      invalidateStoreCatalogCache();
      setFeedback({
        type: "success",
        text: data?.message || `Transaksi ${actionLabel} berhasil diproses.`,
      });
      return true;
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || `Gagal memproses ${actionLabel} transaksi.`,
      });
      return false;
    }
  };

  const openPrintWindow = (html) => {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=720,height=900");
    if (!popup) { setFeedback({ type: "error", text: "Popup diblokir browser. Izinkan popup untuk mencetak resi." }); return; }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.onload = () => { popup.focus(); setTimeout(() => popup.print(), 300); };
  };

  const printOrderLabel = (order) => {
    if (!order) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    openPrintWindow(buildStoreOrderPrintDocument(order, { logoUrl: gtshirtLogo, baseUrl }));
  };

  const printOrderLabels = (orderList) => {
    const safeOrders = Array.isArray(orderList) ? orderList.filter(Boolean) : [];
    if (safeOrders.length === 0) { setFeedback({ type: "error", text: "Pilih minimal 1 order untuk dicetak." }); return; }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    try {
      const assets = safeOrders.map((order) => getStoreOrderPrintAsset(order, { logoUrl: gtshirtLogo, baseUrl }));
      openPrintWindow(buildStoreOrderPrintDocumentFromAssets(assets));
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.message || "Bulk print belum mendukung kombinasi dokumen terpilih.",
      });
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((prev) => { const next = new Set(prev); if (next.has(orderId)) next.delete(orderId); else next.add(orderId); return next; });
  };
  const selectAllOrders = () => { setSelectedOrderIds(new Set(orders.map((o) => o.id))); };
  const clearSelectedOrders = () => { setSelectedOrderIds(new Set()); };

  const selectedOrders = useMemo(() => orders.filter((o) => selectedOrderIds.has(o.id)), [orders, selectedOrderIds]);
  const bulkStatusOptions = useMemo(() => {
    if (selectedOrders.length === 0) return [];

    let sharedStatuses = new Set(
      getAllowedNextOrderStatuses(selectedOrders[0].status, selectedOrders[0].shippingMethod),
    );

    selectedOrders.slice(1).forEach((order) => {
      const nextStatuses = new Set(getAllowedNextOrderStatuses(order.status, order.shippingMethod));
      sharedStatuses = new Set([...sharedStatuses].filter((status) => nextStatuses.has(status)));
    });

    return ORDER_STATUS_OPTIONS.filter((option) => sharedStatuses.has(option.value));
  }, [selectedOrders]);

  useEffect(() => {
    if (bulkStatus && !bulkStatusOptions.some((option) => option.value === bulkStatus)) {
      setBulkStatus("");
    }
  }, [bulkStatus, bulkStatusOptions]);

  // Virtual scroll
  const useVirtualOrders = orders.length > 60;
  const orderOverscan = 4;
  const virtualStartIndex = useMemo(() => { if (!useVirtualOrders) return 0; return Math.max(0, Math.floor(orderScrollTop / orderRowHeight) - orderOverscan); }, [useVirtualOrders, orderScrollTop, orderRowHeight]);
  const virtualVisibleCount = useMemo(() => { if (!useVirtualOrders) return orders.length; return Math.ceil(orderViewportHeight / orderRowHeight) + orderOverscan * 2; }, [useVirtualOrders, orderViewportHeight, orderRowHeight]);
  const virtualEndIndex = useMemo(() => { if (!useVirtualOrders) return orders.length; return Math.min(orders.length, virtualStartIndex + virtualVisibleCount); }, [useVirtualOrders, orders.length, virtualStartIndex, virtualVisibleCount]);
  const visibleOrders = useMemo(() => { if (!useVirtualOrders) return orders; return orders.slice(virtualStartIndex, virtualEndIndex); }, [useVirtualOrders, orders, virtualStartIndex, virtualEndIndex]);
  const orderPaddingTop = useVirtualOrders ? virtualStartIndex * orderRowHeight : 0;
  const orderPaddingBottom = useVirtualOrders ? Math.max(0, orders.length - virtualEndIndex) * orderRowHeight : 0;

  // Sync selected orders with actual order list
  useEffect(() => {
    setSelectedOrderIds((prev) => {
      if (prev.size === 0) return prev;
      const available = new Set(orders.map((o) => o.id));
      return new Set([...prev].filter((id) => available.has(id)));
    });
  }, [orders]);

  // Debounced search
  useEffect(() => {
    if (!isActive) return;
    const timeout = window.setTimeout(() => {
      setOrderPage(1);
      fetchOrders({
        page: 1,
        search: orderSearch,
        status: orderStatusFilter,
        channel: orderChannelFilter,
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [isActive, orderSearch, orderStatusFilter, orderChannelFilter]);

  // Viewport resize observer
  useEffect(() => {
    if (!isActive) return;
    const target = orderListRef.current;
    if (!target) return;
    const updateHeight = () => setOrderViewportHeight(target.clientHeight || 560);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(target);
    return () => observer.disconnect();
  }, [isActive]);

  // Measure row height
  useEffect(() => {
    if (!isActive || !orderRowMeasureRef.current) return;
    const rect = orderRowMeasureRef.current.getBoundingClientRect();
    if (rect.height && Math.abs(rect.height - orderRowHeight) > 6) setOrderRowHeight(rect.height);
  }, [isActive, orders.length, orderPage]);

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-card dense-card p-6">
          {feedback.text && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium border ${
              feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300"
            }`}>{feedback.text}</div>
          )}

          <div className="admin-filter-card flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">Cari Order</label>
              <input className="input-modern" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Kode order / nama / nomor WA" />
            </div>
            <div className="min-w-[180px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">Status</label>
              <select className="input-modern" value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
                <option value="">Semua Status</option>
                {ORDER_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="min-w-[180px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">Channel</label>
              <select className="input-modern" value={orderChannelFilter} onChange={(e) => setOrderChannelFilter(e.target.value)}>
                {ORDER_CHANNEL_OPTIONS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => { setOrderPage(1); fetchOrders({ page: 1 }); }} className="btn-primary !px-6 !py-2.5">Terapkan</button>
            <button type="button" onClick={handleClearOrders} className="rounded-2xl border border-rose-500 bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:border-rose-600 hover:bg-rose-700 dark:border-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600">Reset Semua Pesanan</button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={selectAllOrders} className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40">Pilih Semua</button>
            <button type="button" onClick={() => onGoToScan?.()} className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40">Scan QR</button>
            <button type="button" onClick={clearSelectedOrders} className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40">Bersihkan</button>
            <select className="input-modern !py-2 text-xs" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              <option value="">{selectedOrders.length > 0 && bulkStatusOptions.length === 0 ? "Tidak ada status bersama" : "Pilih Status"}</option>
              {bulkStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="button" onClick={handleBulkStatusUpdate} disabled={!bulkStatus || selectedOrders.length === 0} className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">Update Status ({selectedOrders.length})</button>
            <button type="button" onClick={() => printOrderLabels(selectedOrders)} disabled={selectedOrders.length === 0} className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">Print Dokumen ({selectedOrders.length})</button>
          </div>

          <div ref={orderListRef} onScroll={(e) => setOrderScrollTop(e.currentTarget.scrollTop)} className="admin-scroll-panel mt-4 max-h-[560px] space-y-4 overflow-auto pr-1">
            {loadingOrders && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`order-skeleton-${i}`} className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45">
                    <div className="flex items-center justify-between gap-3"><div className="space-y-2"><div className="h-3 w-32 rounded-full skeleton" /><div className="h-3 w-40 rounded-full skeleton" /></div><div className="h-6 w-20 rounded-full skeleton" /></div>
                    <div className="mt-3 grid grid-cols-2 gap-2"><div className="h-3 rounded-full skeleton" /><div className="h-3 rounded-full skeleton" /></div>
                  </div>
                ))}
              </div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">Belum ada order masuk.</div>
            )}
            {!loadingOrders && (
              <div style={{ paddingTop: orderPaddingTop, paddingBottom: orderPaddingBottom }}>
                {visibleOrders.map((order, index) => {
                  const quickAction = getQuickActionForOrder(order);
                  const canReverseOrder = isOfflineOrder(order) && order.status !== "cancelled" && Boolean(order.stockDeductedAt);
                  return (
                    <div key={order.id} ref={useVirtualOrders && index === 0 ? orderRowMeasureRef : null} className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45">
                      <div className="sm:hidden">
                        <details className="admin-order-details">
                          <summary className="admin-order-summary mobile-summary flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={() => toggleOrderSelection(order.id)} className="h-4 w-4 rounded border-brand-300 text-primary" />
                              </label>
                              <div>
                                <p className="text-sm font-bold text-brand-900 dark:text-white">{order.orderCode}</p>
                                <p className="text-[11px] text-brand-500 dark:text-brand-400">{formatDateTime(order.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>{mapOrderStatusLabel(order.status)}</span>
                                <p className="mt-1 text-xs font-semibold text-primary">{formatRupiah(order.totalAmount)}</p>
                              </div>
                              <svg className="mobile-summary-icon h-5 w-5 text-brand-500 dark:text-brand-300" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" /></svg>
                            </div>
                          </summary>
                          <div className="mt-3 space-y-2 text-xs text-brand-600 dark:text-brand-300">
                            <p>{order.customerName} • {order.customerPhone}</p>
                            {order.user?.email && <p className="text-[11px] text-brand-500 dark:text-brand-400">Akun: {order.user.email}</p>}
                            <p>{mapOrderChannelLabel(order)} • {order.shippingMethod} • {order.paymentMethod}</p>
                            {isOfflineOrder(order) && (
                              <p className="text-[11px] text-brand-500 dark:text-brand-400">
                                Kasir: {order.cashierName || "-"} • Dibayar {formatRupiah(order.amountPaid)} • Kembalian {formatRupiah(order.changeAmount)}
                              </p>
                            )}
                            <p className="text-[11px] text-brand-500 dark:text-brand-400">Potong stok: {order.stockDeductedAt ? `Sudah (${formatDateTime(order.stockDeductedAt)})` : "Belum"}</p>
                            {order.reversedAt && (
                              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                                {getReversalTypeLabel(order)} • {formatDateTime(order.reversedAt)}{order.reversalReason ? ` • ${order.reversalReason}` : ""}
                              </p>
                            )}
                            {Array.isArray(order.items) && order.items.length > 0 && (<p className="text-[11px] text-brand-500 dark:text-brand-400">{order.items.length} item • {order.items.map((i) => `${i.productName} (${i.size} x${i.quantity})`).join(", ")}</p>)}
                            {quickAction && <button type="button" onClick={() => handleQuickOrderAction(order, quickAction)} className="btn-primary !w-full !py-2 !text-xs">{quickAction.label}</button>}
                            {canReverseOrder && (
                              <>
                                <button type="button" onClick={() => handleOfflineReversal(order, "void")} className="admin-order-action">Void Transaksi</button>
                                <button type="button" onClick={() => handleOfflineReversal(order, "return")} className="admin-order-action">Retur Transaksi</button>
                              </>
                            )}
                            <button type="button" onClick={() => setActiveOrderSheet(order)} className="admin-order-action">Ubah Status</button>
                            <button type="button" onClick={() => printOrderLabel(order)} className="admin-order-action">{getPrintButtonLabel(order)}</button>
                          </div>
                        </details>
                      </div>

                      <div className="hidden sm:block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <label className="flex items-start pt-1"><input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={() => toggleOrderSelection(order.id)} className="h-4 w-4 rounded border-brand-300 text-primary" /></label>
                            <div>
                              <p className="text-sm font-bold text-brand-900 dark:text-white">{order.orderCode}</p>
                              <p className="text-xs text-brand-500 dark:text-brand-400">{order.customerName} • {order.customerPhone}</p>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-400 dark:text-brand-500">{mapOrderChannelLabel(order)}</p>
                              {order.user?.email && <p className="text-[11px] text-brand-500 dark:text-brand-400">Akun: {order.user.email}</p>}
                            </div>
                          </div>
                          <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>{mapOrderStatusLabel(order.status)}</span>
                        </div>
                        <div className="mt-2 text-xs text-brand-600 dark:text-brand-300">{formatDateTime(order.createdAt)} • {mapOrderChannelLabel(order)} • {order.shippingMethod} • {order.paymentMethod}</div>
                        <div className="mt-1 text-xs font-semibold text-primary">Total: {formatRupiah(order.totalAmount)}</div>
                        {isOfflineOrder(order) && (
                          <div className="mt-1 text-[11px] text-brand-500 dark:text-brand-400">
                            Kasir: {order.cashierName || "-"} • Dibayar {formatRupiah(order.amountPaid)} • Kembalian {formatRupiah(order.changeAmount)}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-brand-500 dark:text-brand-400">Potong stok: {order.stockDeductedAt ? `Sudah (${formatDateTime(order.stockDeductedAt)})` : "Belum"}</div>
                        {order.reversedAt && (
                          <div className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                            {getReversalTypeLabel(order)} • {formatDateTime(order.reversedAt)}{order.reversalReason ? ` • ${order.reversalReason}` : ""}
                          </div>
                        )}
                        {Array.isArray(order.items) && order.items.length > 0 && (<p className="mt-1 text-xs text-brand-500 dark:text-brand-400">{order.items.length} item • {order.items.map((i) => `${i.productName} (${i.size} x${i.quantity})`).join(", ")}</p>)}
                        <div className="mt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {quickAction && <button type="button" onClick={() => handleQuickOrderAction(order, quickAction)} className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90">{quickAction.label}</button>}
                            {canReverseOrder && <button type="button" onClick={() => handleOfflineReversal(order, "void")} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">Void</button>}
                            {canReverseOrder && <button type="button" onClick={() => handleOfflineReversal(order, "return")} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">Retur</button>}
                            <select className="input-modern !py-2 text-xs" value={order.status} onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}>
                              {getOrderTransitionOptions(order).map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <button type="button" onClick={() => printOrderLabel(order)} className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200 dark:hover:bg-brand-800/40">{getPrintButtonLabel(order)}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!loadingOrders && orderPage < orderMeta.totalPages && (
              <div className="flex justify-center">
                <button type="button" onClick={() => fetchOrders({ page: orderPage + 1, append: true })} disabled={isLoadingMoreOrders} className="btn-outline !px-4 !py-2 text-xs disabled:opacity-60">{isLoadingMoreOrders ? "Memuat..." : "Muat Order Lainnya"}</button>
              </div>
            )}
          </div>
        </article>

        <article className="glass-card dense-card p-6">
          <h3 className="text-lg font-bold text-brand-900 dark:text-white">Top Produk Terlaris</h3>
          <div className="mt-4 space-y-2">
            {!analytics?.topProducts?.length && <p className="text-sm text-brand-600 dark:text-brand-400">Belum ada data penjualan produk.</p>}
            {analytics?.topProducts?.map((item) => (
              <div key={item.productName} className="rounded-xl border border-brand-200 bg-white/70 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900/45">
                <p className="font-semibold text-brand-900 dark:text-white">{item.productName}</p>
                <p className="text-xs text-brand-500 dark:text-brand-400">Terjual: {item.soldQty} • Revenue: {formatRupiah(item.revenue)}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-6 text-lg font-bold text-brand-900 dark:text-white">Revenue per Status</h3>
          <div className="mt-3 space-y-2">
            {!analytics?.revenueByStatus && <p className="text-sm text-brand-600 dark:text-brand-400">Belum ada data revenue.</p>}
            {analytics?.revenueByStatus && Object.entries(analytics.revenueByStatus).map(([status, amount]) => (
              <div key={status} className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900/45">
                <span className="font-medium text-brand-700 dark:text-brand-300">{mapOrderStatusLabel(status)}</span>
                <span className="font-semibold text-brand-900 dark:text-white">{formatRupiah(amount)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {activeOrderSheet && (
        <div className="admin-sheet-backdrop sm:hidden" onClick={() => setActiveOrderSheet(null)} role="presentation">
          <div className="admin-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="admin-sheet-handle" />
            <div className="admin-sheet-header">
              <div>
                <p className="text-sm font-semibold text-brand-900 dark:text-white">{activeOrderSheet.orderCode}</p>
                <p className="text-xs text-brand-500 dark:text-brand-400">{activeOrderSheet.customerName} • {activeOrderSheet.customerPhone}</p>
              </div>
              <button type="button" onClick={() => setActiveOrderSheet(null)} className="admin-sheet-close">Tutup</button>
            </div>
            <div className="admin-sheet-body">
              <div className="admin-sheet-meta">
                <span>{formatDateTime(activeOrderSheet.createdAt)}</span>
                <span>{mapOrderChannelLabel(activeOrderSheet)}</span>
                <span>{activeOrderSheet.shippingMethod}</span>
                <span>{activeOrderSheet.paymentMethod}</span>
                <span className="font-semibold text-brand-900 dark:text-white">{formatRupiah(activeOrderSheet.totalAmount)}</span>
              </div>
              {isOfflineOrder(activeOrderSheet) && (
                <p className="mt-2 text-xs text-brand-500 dark:text-brand-400">
                  Kasir: {activeOrderSheet.cashierName || "-"} • Dibayar {formatRupiah(activeOrderSheet.amountPaid)} • Kembalian {formatRupiah(activeOrderSheet.changeAmount)}
                </p>
              )}
              {activeOrderSheet.reversedAt && (
                <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
                  {getReversalTypeLabel(activeOrderSheet)} • {formatDateTime(activeOrderSheet.reversedAt)}{activeOrderSheet.reversalReason ? ` • ${activeOrderSheet.reversalReason}` : ""}
                </p>
              )}
              {Array.isArray(activeOrderSheet.items) && activeOrderSheet.items.length > 0 && (
                <p className="mt-2 text-xs text-brand-500 dark:text-brand-400">{activeOrderSheet.items.length} item • {activeOrderSheet.items.map((i) => `${i.productName} (${i.size} x${i.quantity})`).join(", ")}</p>
              )}
              <button type="button" onClick={() => printOrderLabel(activeOrderSheet)} className="mt-3 w-full rounded-xl border border-brand-200 bg-white/80 px-4 py-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200 dark:hover:bg-brand-800/40">{getPrintButtonLabel(activeOrderSheet)}</button>
              {isOfflineOrder(activeOrderSheet) && activeOrderSheet.status !== "cancelled" && activeOrderSheet.stockDeductedAt && (
                <div className="mt-3 grid gap-2">
                  <button type="button" onClick={async () => { const didReverse = await handleOfflineReversal(activeOrderSheet, "void"); if (didReverse) setActiveOrderSheet(null); }} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">Void Transaksi</button>
                  <button type="button" onClick={async () => { const didReverse = await handleOfflineReversal(activeOrderSheet, "return"); if (didReverse) setActiveOrderSheet(null); }} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">Retur Transaksi</button>
                </div>
              )}
              <div className="admin-sheet-options">
                {getOrderTransitionOptions(activeOrderSheet).map((option) => (
                  <button key={option.value} type="button" onClick={() => { handleOrderStatusChange(activeOrderSheet.id, option.value); setActiveOrderSheet(null); }} className={`admin-sheet-option ${activeOrderSheet.status === option.value ? "is-active" : ""}`}>{option.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
