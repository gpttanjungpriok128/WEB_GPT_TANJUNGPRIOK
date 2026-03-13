import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../services/api";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
import jsQR from "jsqr";

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

const REPORT_STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "picked_up", label: "Sudah Diambil" },
  { value: "ready_pickup", label: "Siap Diambil" },
  { value: "completed", label: "Selesai" },
  { value: "shipping", label: "Dalam Pengiriman" },
  { value: "packed", label: "Dikemas" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "new", label: "Baru" },
  { value: "cancelled", label: "Dibatalkan" },
];

const REVIEW_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "approved", label: "Tayang" },
  { value: "pending", label: "Menunggu" },
];

const PRODUCT_ACTIVE_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

const DEFAULT_SIZES = ["S", "M", "L", "XL"];
const REPORT_FILTERS_KEY = "gpt_tanjungpriok_admin_report_filters_v1";
const ORDER_PAGE_SIZE = 12;
const REVIEW_PAGE_SIZE = 12;
const STATUS_RANK = {
  new: 0,
  confirmed: 1,
  packed: 2,
  ready_pickup: 3,
  shipping: 3,
  picked_up: 4,
  completed: 4,
  cancelled: 5,
};
const SCAN_STATUS_LABELS = {
  packed: "dikemas",
  ready_pickup: "siap diambil",
  shipping: "shipping",
  picked_up: "sudah diambil",
  completed: "selesai",
  cancelled: "dibatalkan",
};

const normalizeSizeLabel = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const isAboveXL = (value) => {
  const normalized = normalizeSizeLabel(value);
  if (!normalized) return false;
  if (["XXL", "XXXL", "XXXXL"].includes(normalized)) return true;
  const match = normalized.match(/^(\d+)XL$/);
  if (match) return Number(match[1]) >= 2;
  return false;
};

const filterOutXXL = (sizes = []) =>
  sizes.filter((size) => normalizeSizeLabel(size) !== "XXL");

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeQrMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["resi", "label", "shipping"].includes(normalized)) return "resi";
  if (["invoice", "inv", "pickup", "verify"].includes(normalized)) return "invoice";
  return normalized;
}

function parseOrderQrPayload(value) {
  const raw = String(value || "").trim();
  if (!raw) return { orderCode: "", mode: "", raw: "" };
  try {
    const url = new URL(raw);
    const orderCode = (
      url.searchParams.get("orderCode") ||
      url.searchParams.get("code") ||
      url.searchParams.get("order") ||
      ""
    ).trim();
    const mode = normalizeQrMode(
      url.searchParams.get("mode") ||
      url.searchParams.get("qr") ||
      url.searchParams.get("type") ||
      "",
    );
    return { orderCode, mode, raw };
  } catch {
    return { orderCode: raw, mode: "", raw };
  }
}

function buildOrderQrValue(orderCode, mode, baseUrl = "") {
  if (!orderCode) return "";
  if (!baseUrl) return orderCode;
  const params = new URLSearchParams({ orderCode });
  if (mode) params.set("mode", mode);
  return `${baseUrl}/track-order?${params.toString()}`;
}

function isPickupShippingMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("ambil") ||
    normalized.includes("pickup") ||
    normalized.includes("pick up") ||
    normalized.includes("pick-up")
  );
}

function resolveScanStatusLabel(status) {
  return SCAN_STATUS_LABELS[status] || status;
}

function buildPrintLabelMarkup(order, { logoUrl, qrValue } = {}) {
  if (!order) return "";
  const isPickup = isPickupShippingMethod(order.shippingMethod);
  const deliveryLabel = isPickup ? "Resi Ambil di Gereja" : "Resi Pengiriman";
  const items = Array.isArray(order.items) ? order.items : [];
  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const itemRows = items.length > 0
    ? items.map((item) => `
        <tr>
          <td>${escapeHtml(item.productName || "-")}</td>
          <td class="muted">(${escapeHtml(item.size || "-")} x${Number(item.quantity) || 0})</td>
        </tr>
      `).join("")
    : `<tr><td colspan="2" class="muted">Tidak ada item.</td></tr>`;
  const resolvedQrValue = qrValue || order.orderCode || "";
  const encodedQrValue = resolvedQrValue ? encodeURIComponent(resolvedQrValue) : "";
  const qrUrl = encodedQrValue
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodedQrValue}`
    : "";

  return `
    <div class="label">
      <div class="header">
        <div class="brand">
          ${logoUrl ? `<img src="${logoUrl}" alt="GTshirt" class="logo" />` : ""}
          <div>
            <div class="brand-name">GTshirtwear</div>
            <div class="muted">${deliveryLabel}</div>
          </div>
        </div>
        ${qrUrl ? `<img src="${qrUrl}" alt="QR ${escapeHtml(order.orderCode)}" class="qr" />` : ""}
      </div>
      <div class="muted">Tanggal: ${escapeHtml(formatDateTime(order.createdAt))}</div>

      <div class="section">
        <div class="label-title">Penerima</div>
        <div class="value">${escapeHtml(order.customerName || "-")}</div>
        <div class="muted">WA: ${escapeHtml(order.customerPhone || "-")}</div>
        <div class="muted">Alamat: ${escapeHtml(order.customerAddress || "-")}</div>
      </div>

      <div class="section">
        <div class="label-title">Pengiriman</div>
        <div class="value">${escapeHtml(order.shippingMethod || "-")}</div>
        <div class="muted">Pembayaran: ${escapeHtml(order.paymentMethod || "-")}</div>
      </div>

      <div class="section">
        <div class="label-title">Item</div>
        <table>
          ${itemRows}
        </table>
      </div>

      ${order.notes ? `
        <div class="section">
          <div class="label-title">Catatan</div>
          <div class="muted">${escapeHtml(order.notes)}</div>
        </div>
      ` : ""}

      <div class="footer">
        <div>Total Item: ${totalItems}</div>
        <div>${escapeHtml(formatRupiah(order.totalAmount))}</div>
      </div>
      <div class="order-code">Resi: ${escapeHtml(order.orderCode || "-")}</div>
    </div>
  `;
}

function buildPrintDocument(markup, { layout = "thermal" } = {}) {
  const isA4 = layout === "a4";
  return `
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Resi Pesanan</title>
        <style>
          @page { size: ${isA4 ? "A4" : "100mm 150mm"}; margin: ${isA4 ? "8mm" : "0"}; }
          * { box-sizing: border-box; }
          html, body {
            width: ${isA4 ? "210mm" : "100mm"};
            min-height: ${isA4 ? "297mm" : "150mm"};
          }
          body {
            font-family: "Arial", sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .sheet {
            ${isA4 ? "display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; align-content: start;" : ""}
          }
          .label {
            width: ${isA4 ? "94mm" : "100mm"};
            min-height: ${isA4 ? "137mm" : "150mm"};
            padding: ${isA4 ? "6mm" : "8mm"};
            border: ${isA4 ? "1px dashed #0f766e" : "0"};
            border-radius: ${isA4 ? "10px" : "0"};
            margin: 0;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo {
            width: 42px;
            height: 42px;
            object-fit: cover;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .brand-name {
            font-weight: 800;
            font-size: 16px;
            letter-spacing: 0.04em;
            color: #0f766e;
          }
          .qr {
            width: 84px;
            height: 84px;
          }
          .section {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
          }
          .label-title {
            font-size: 11px;
            letter-spacing: 0.18em;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .value {
            font-size: 13px;
            font-weight: 600;
            margin-top: 4px;
          }
          .muted {
            color: #64748b;
            font-size: 11px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          td {
            padding: 4px 0;
            font-size: 12px;
            vertical-align: top;
          }
          .footer {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 700;
          }
          .order-code {
            margin-top: 8px;
            font-size: 12px;
            font-weight: 700;
            color: #0f766e;
          }
        </style>
      </head>
      <body>
        ${isA4 ? `<div class="sheet">${markup}</div>` : markup}
      </body>
    </html>
  `;
}

function playScanBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => {
      ctx.close();
    };
  } catch {
    // ignore
  }
}

function triggerHaptic() {
  if (typeof window === "undefined") return;
  if (navigator?.vibrate) {
    navigator.vibrate(20);
  }
}

function statusBadge(status) {
  const map = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    packed: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    ready_pickup: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    shipping: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    picked_up: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return map[status] || "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300";
}

function reviewStatusBadge(isApproved) {
  return isApproved
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
}

function mapOrderStatusLabel(status) {
  return ORDER_STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function renderStars(value) {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  const filledCount = Math.round(safeValue);
  return [...Array(5)].map((_, index) => (
    <span
      key={index}
      className={index < filledCount ? "text-amber-400" : "text-brand-200 dark:text-brand-700"}
    >
      ★
    </span>
  ));
}

function toLocalDatetimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function normalizeSizePayload(text) {
  const parsed = filterOutXXL(
    String(text || "")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean),
  );
  return parsed.length > 0 ? parsed : [...DEFAULT_SIZES];
}

function normalizeStockBySizeMap(stockBySize, sizes = DEFAULT_SIZES) {
  const source = stockBySize && typeof stockBySize === "object" && !Array.isArray(stockBySize)
    ? stockBySize
    : {};

  return sizes.reduce((accumulator, size) => {
    const normalizedSize = String(size || "").trim().toUpperCase();
    if (!normalizedSize) return accumulator;

    const matchedKey = Object.keys(source).find(
      (key) => String(key).trim().toUpperCase() === normalizedSize,
    );
    const rawValue = matchedKey ? source[matchedKey] : 0;
    accumulator[normalizedSize] = Math.max(0, Number(rawValue) || 0);
    return accumulator;
  }, {});
}

function sumStockBySize(stockBySize = {}) {
  return Object.values(stockBySize).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
}

function createInitialProductForm() {
  return {
    name: "",
    slug: "",
    description: "",
    color: "",
    basePrice: 0,
    sizesText: DEFAULT_SIZES.join(", "),
    stockBySize: normalizeStockBySizeMap({}, DEFAULT_SIZES),
    promoType: "none",
    promoValue: 0,
    promoStartAt: "",
    promoEndAt: "",
    isActive: true,
  };
}

function resolveImageUrl(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("blob:")) return src;
  return `${API_BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}

function ManageStorePage() {
  // ── Tab Navigation State ───────────────────
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("produk");

  // ── Product State ──────────────────────────
  const [productForm, setProductForm] = useState(() => createInitialProductForm());
  const [editingProductId, setEditingProductId] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [reviews, setReviews] = useState([]);
  const [reportRows, setReportRows] = useState([]);
  const [reportMeta, setReportMeta] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [productActiveFilter, setProductActiveFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");
  const [reportFilters, setReportFilters] = useState(() => {
    if (typeof window === "undefined") {
      return { startDate: "", endDate: "", status: "completed" };
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(REPORT_FILTERS_KEY) || "{}");
      return {
        startDate: stored.startDate || "",
        endDate: stored.endDate || "",
        status: stored.status || "completed",
      };
    } catch {
      return { startDate: "", endDate: "", status: "completed" };
    }
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [sheetSyncInfo, setSheetSyncInfo] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [activeOrderSheet, setActiveOrderSheet] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [lastScannedAt, setLastScannedAt] = useState(null);
  const [lastScannedStatus, setLastScannedStatus] = useState("");
  const [lastScannedMode, setLastScannedMode] = useState("");
  const [scanSession, setScanSession] = useState(0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [orderMeta, setOrderMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewMeta, setReviewMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);
  const [orderScrollTop, setOrderScrollTop] = useState(0);
  const [orderViewportHeight, setOrderViewportHeight] = useState(560);
  const [orderRowHeight, setOrderRowHeight] = useState(190);
  const [lastAnalyticsAt, setLastAnalyticsAt] = useState(0);
  const [productFieldErrors, setProductFieldErrors] = useState({});
  const [tabHidden, setTabHidden] = useState(false);

  // Image upload state
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const basePriceInputRef = useRef(null);
  const sizesInputRef = useRef(null);
  const imageDropRef = useRef(null);
  const orderListRef = useRef(null);
  const orderRowMeasureRef = useRef(null);
  const ordersRef = useRef([]);
  const orderCodeIndexRef = useRef(new Map());
  const orderCodeCacheRef = useRef(new Map());
  const recentScanRef = useRef({ code: "", at: 0 });
  const qrVideoRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const scanStreamRef = useRef(null);
  const hasScannedRef = useRef(false);
  const [dragPreviewIndex, setDragPreviewIndex] = useState(null);

  // Shipping cost state
  const [shippingCost, setShippingCost] = useState(15000);
  const [shippingCostInput, setShippingCostInput] = useState("15000");
  const [savingShipping, setSavingShipping] = useState(false);
  const [productAccordion, setProductAccordion] = useState({
    basic: true,
    media: true,
    stock: false,
    promo: false,
    status: true,
  });
  const isScannerActive = activeTab === "scan";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(REPORT_FILTERS_KEY, JSON.stringify(reportFilters));
    } catch {
      // ignore
    }
  }, [reportFilters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastY = window.scrollY || 0;
    const onScroll = () => {
      const currentY = window.scrollY || 0;
      if (currentY > 120 && currentY > lastY) {
        setTabHidden(true);
      } else {
        setTabHidden(false);
      }
      lastY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchProducts = async (overrides = {}) => {
    setLoadingProducts(true);
    try {
      const { data } = await api.get("/store/admin/products", {
        params: {
          search: overrides.search ?? productSearch,
          active: overrides.active ?? productActiveFilter,
        },
      });
      setProducts(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      setProducts([]);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat produk GTshirt.",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrders = async (overrides = {}) => {
    const page = Math.max(1, Number(overrides.page ?? orderPage) || 1);
    const limit = Math.min(50, Math.max(1, Number(overrides.limit ?? ORDER_PAGE_SIZE) || ORDER_PAGE_SIZE));
    const append = Boolean(overrides.append);
    const preserve = Boolean(overrides.preserve);
    if (append) {
      setIsLoadingMoreOrders(true);
    } else if (!overrides.silent) {
      setLoadingOrders(true);
    }
    try {
      const { data } = await api.get("/store/admin/orders", {
        params: {
          page,
          limit,
          search: overrides.search ?? orderSearch,
          status: overrides.status ?? orderStatusFilter,
        },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      if (!preserve) {
        const meta = data?.meta || { page, totalPages: 1, total: rows.length };
        setOrderMeta({
          page: meta.page ?? page,
          totalPages: meta.totalPages ?? 1,
          total: meta.total ?? rows.length,
        });
        setOrderPage(page);
        setOrders((prev) => {
          if (!append) return rows;
          const existing = new Set(prev.map((order) => order.id));
          const merged = [...prev];
          rows.forEach((order) => {
            if (!existing.has(order.id)) merged.push(order);
          });
          return merged;
        });
      }
      return rows;
    } catch (error) {
      if (!overrides.silent) {
        setOrders([]);
        setFeedback({
          type: "error",
          text: error.response?.data?.message || "Gagal memuat data order toko.",
        });
      }
      return [];
    } finally {
      if (append) {
        setIsLoadingMoreOrders(false);
      } else if (!overrides.silent) {
        setLoadingOrders(false);
      }
    }
  };

  const fetchReviews = async (overrides = {}) => {
    const page = Math.max(1, Number(overrides.page ?? reviewPage) || 1);
    const limit = Math.min(50, Math.max(1, Number(overrides.limit ?? REVIEW_PAGE_SIZE) || REVIEW_PAGE_SIZE));
    const append = Boolean(overrides.append);
    if (append) {
      setIsLoadingMoreReviews(true);
    } else {
      setLoadingReviews(true);
    }
    try {
      const { data } = await api.get("/store/admin/reviews", {
        params: {
          page,
          limit,
          search: overrides.search ?? reviewSearch,
          status: overrides.status ?? reviewStatusFilter,
        },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const meta = data?.meta || { page, totalPages: 1, total: rows.length };
      setReviewMeta({
        page: meta.page ?? page,
        totalPages: meta.totalPages ?? 1,
        total: meta.total ?? rows.length,
      });
      setReviewPage(page);
      setReviews((prev) => {
        if (!append) return rows;
        const existing = new Set(prev.map((review) => review.id));
        const merged = [...prev];
        rows.forEach((review) => {
          if (!existing.has(review.id)) merged.push(review);
        });
        return merged;
      });
    } catch (error) {
      setReviews([]);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat ulasan produk.",
      });
    } finally {
      if (append) {
        setIsLoadingMoreReviews(false);
      } else {
        setLoadingReviews(false);
      }
    }
  };

  const fetchRevenueReport = async (overrides = {}) => {
    setLoadingReport(true);
    try {
      const params = {
        startDate: overrides.startDate ?? reportFilters.startDate,
        endDate: overrides.endDate ?? reportFilters.endDate,
        status: overrides.status ?? reportFilters.status,
      };
      const { data } = await api.get("/store/admin/reports/revenue", { params });
      setReportRows(Array.isArray(data?.data) ? data.data : []);
      setReportMeta(data?.meta || null);
    } catch (error) {
      setReportRows([]);
      setReportMeta(null);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat laporan pemasukan.",
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSyncReportSheet = async () => {
    setSyncingSheet(true);
    setSheetSyncInfo(null);
    try {
      const payload = {
        startDate: reportFilters.startDate,
        endDate: reportFilters.endDate,
        status: reportFilters.status,
      };
      const { data } = await api.post("/store/admin/reports/revenue/sync", payload);
      setSheetSyncInfo({
        type: "success",
        text: data?.message || "Spreadsheet berhasil diperbarui.",
        sheetUrl: data?.data?.sheetUrl || "",
        sheetName: data?.data?.sheetName || "",
      });
    } catch (error) {
      setSheetSyncInfo({
        type: "error",
        text: error.response?.data?.message || "Gagal sinkron ke spreadsheet.",
      });
    } finally {
      setSyncingSheet(false);
    }
  };

  const fetchAnalytics = async (options = {}) => {
    const now = Date.now();
    const ttlMs = 60 * 1000;
    if (!options.force && analytics && now - lastAnalyticsAt < ttlMs) {
      return;
    }
    setLoadingAnalytics(true);
    try {
      const { data } = await api.get("/store/admin/analytics");
      setAnalytics(data || null);
      setLastAnalyticsAt(Date.now());
    } catch (error) {
      setAnalytics(null);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat analitik toko.",
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchShippingSettings = async () => {
    try {
      const { data } = await api.get("/store/admin/settings");
      const cost = data?.data?.shippingCost ?? 15000;
      setShippingCost(cost);
      setShippingCostInput(String(cost));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === "produk") {
      fetchProducts();
    }
    if (activeTab === "pesanan") {
      fetchOrders({ page: 1 });
    }
    if (activeTab === "ulasan") {
      fetchReviews({ page: 1 });
    }
    if (activeTab === "ongkir") {
      fetchShippingSettings();
    }
  }, [activeTab]);

  useEffect(() => {
    setSelectedOrderIds((previous) => {
      if (previous.size === 0) return previous;
      const available = new Set(orders.map((order) => order.id));
      const next = new Set([...previous].filter((id) => available.has(id)));
      return next;
    });
  }, [orders]);

  useEffect(() => {
    ordersRef.current = orders;
    const map = new Map();
    orders.forEach((order) => {
      if (order?.orderCode) {
        map.set(String(order.orderCode).toUpperCase(), order.id);
      }
    });
    orderCodeIndexRef.current = map;
  }, [orders]);

  useEffect(() => {
    if (activeTab !== "produk") return;
    const timeout = window.setTimeout(() => {
      fetchProducts({ search: productSearch, active: productActiveFilter });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [activeTab, productSearch, productActiveFilter]);

  useEffect(() => {
    if (activeTab !== "pesanan") return;
    const timeout = window.setTimeout(() => {
      setOrderPage(1);
      fetchOrders({ page: 1, search: orderSearch, status: orderStatusFilter });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [activeTab, orderSearch, orderStatusFilter]);

  useEffect(() => {
    if (activeTab !== "ulasan") return;
    const timeout = window.setTimeout(() => {
      setReviewPage(1);
      fetchReviews({ page: 1, search: reviewSearch, status: reviewStatusFilter });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [activeTab, reviewSearch, reviewStatusFilter]);

  useEffect(() => {
    if (activeTab === "laporan") {
      fetchRevenueReport();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "pesanan") return;
    const target = orderListRef.current;
    if (!target) return;
    const updateHeight = () => {
      const nextHeight = target.clientHeight || 560;
      setOrderViewportHeight(nextHeight);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "pesanan") return;
    if (!orderRowMeasureRef.current) return;
    const rect = orderRowMeasureRef.current.getBoundingClientRect();
    if (rect.height && Math.abs(rect.height - orderRowHeight) > 6) {
      setOrderRowHeight(rect.height);
    }
  }, [activeTab, orders.length, orderPage]);

  useEffect(() => {
    if (!location?.search) return;
    const params = new URLSearchParams(location.search);
    const rawCode = params.get("order") || params.get("orderCode") || params.get("code");
    if (!rawCode) return;
    const normalized = rawCode.trim().toUpperCase();
    if (!normalized) return;
    setActiveTab("pesanan");
    setOrderSearch(normalized);
    fetchOrders({ search: normalized });
  }, [location.search]);

  const metricCards = useMemo(() => {
    const metrics = analytics?.metrics;
    if (!metrics) return [];
    return [
      { label: "Total Produk", value: metrics.totalProducts ?? 0 },
      { label: "Produk Aktif", value: metrics.activeProducts ?? 0 },
      { label: "Produk Promo Aktif", value: metrics.activePromoCount ?? 0 },
      { label: "Total Order", value: metrics.totalOrders ?? 0 },
      { label: "Order Baru", value: metrics.newOrders ?? 0 },
      { label: "Rata-rata Rating", value: (Number(metrics.averageRating) || 0).toFixed(1) },
      { label: "Total Ulasan", value: metrics.totalReviews ?? 0 },
      { label: "Ulasan Pending", value: metrics.pendingReviews ?? 0 },
      { label: "Revenue Kotor", value: formatRupiah(metrics.grossRevenue ?? 0) },
      { label: "Average Order", value: formatRupiah(metrics.averageOrderValue ?? 0) },
    ];
  }, [analytics]);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderIds.has(order.id)),
    [orders, selectedOrderIds],
  );
  const useVirtualOrders = orders.length > 60;
  const orderOverscan = 4;
  const virtualStartIndex = useMemo(() => {
    if (!useVirtualOrders) return 0;
    return Math.max(0, Math.floor(orderScrollTop / orderRowHeight) - orderOverscan);
  }, [useVirtualOrders, orderScrollTop, orderRowHeight]);
  const virtualVisibleCount = useMemo(() => {
    if (!useVirtualOrders) return orders.length;
    return Math.ceil(orderViewportHeight / orderRowHeight) + orderOverscan * 2;
  }, [useVirtualOrders, orderViewportHeight, orderRowHeight]);
  const virtualEndIndex = useMemo(() => {
    if (!useVirtualOrders) return orders.length;
    return Math.min(orders.length, virtualStartIndex + virtualVisibleCount);
  }, [useVirtualOrders, orders.length, virtualStartIndex, virtualVisibleCount]);
  const visibleOrders = useMemo(() => {
    if (!useVirtualOrders) return orders;
    return orders.slice(virtualStartIndex, virtualEndIndex);
  }, [useVirtualOrders, orders, virtualStartIndex, virtualEndIndex]);
  const orderPaddingTop = useVirtualOrders ? virtualStartIndex * orderRowHeight : 0;
  const orderPaddingBottom = useVirtualOrders
    ? Math.max(0, orders.length - virtualEndIndex) * orderRowHeight
    : 0;

  const productFormSizes = useMemo(
    () => normalizeSizePayload(productForm.sizesText),
    [productForm.sizesText],
  );
  const productFormHasPreorderSizes = useMemo(
    () => productFormSizes.some(isAboveXL),
    [productFormSizes],
  );

  const productFormStockBySize = useMemo(
    () => normalizeStockBySizeMap(productForm.stockBySize, productFormSizes),
    [productForm.stockBySize, productFormSizes],
  );

  const productFormTotalStock = useMemo(
    () => sumStockBySize(productFormStockBySize),
    [productFormStockBySize],
  );

  // ── Image helpers ────────────────────────────
  const clearImages = () => {
    imagePreviews.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
  };

  const handleFilesSelected = (files) => {
    const fileArray = Array.from(files);
    const newPreviews = fileArray.map((file) => URL.createObjectURL(file));
    setImageFiles((prev) => [...prev, ...fileArray]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setProductFieldErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  };

  const handleFileInputChange = (event) => {
    if (event.target.files?.length) {
      handleFilesSelected(event.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDropFiles = (event) => {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files?.length) handleFilesSelected(files);
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const url = prev[index];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderPreviews = (fromIndex, toIndex) => {
    setImagePreviews((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setImageFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handlePreviewDragStart = (index, event) => {
    setDragPreviewIndex(index);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const handlePreviewDragOver = (event) => {
    event.preventDefault();
  };

  const handlePreviewDrop = (index) => {
    if (dragPreviewIndex === null || dragPreviewIndex === index) {
      setDragPreviewIndex(null);
      return;
    }
    reorderPreviews(dragPreviewIndex, index);
    setDragPreviewIndex(null);
  };

  const handlePreviewDragEnd = () => {
    setDragPreviewIndex(null);
  };

  const movePreview = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= imagePreviews.length) return;
    reorderPreviews(index, target);
  };

  // ── Product form ─────────────────────────────
  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(createInitialProductForm());
    clearImages();
    setProductFieldErrors({});
  };

  const fillProductForm = (product) => {
    const sizes = filterOutXXL(
      Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.map((size) => String(size).toUpperCase())
        : [...DEFAULT_SIZES],
    );
    const safeSizes = sizes.length > 0 ? sizes : [...DEFAULT_SIZES];
    const stockBySize = normalizeStockBySizeMap(product.stockBySize, safeSizes);

    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      slug: product.slug || "",
      description: product.description || "",
      color: product.color || "",
      basePrice: product.basePrice || 0,
      sizesText: safeSizes.join(", "),
      stockBySize,
      promoType: product.promoType || "none",
      promoValue: product.promoValue || 0,
      promoStartAt: toLocalDatetimeInput(product.promoStartAt),
      promoEndAt: toLocalDatetimeInput(product.promoEndAt),
      isActive: Boolean(product.isActive),
    });
    // Set existing images from server
    clearImages();
    const urls = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];
    setExistingImages(urls);
    setProductFieldErrors({});
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((previous) => {
      if (field === "sizesText") {
        const sizes = normalizeSizePayload(value);
        return {
          ...previous,
          sizesText: value,
          stockBySize: normalizeStockBySizeMap(previous.stockBySize, sizes),
        };
      }

      return {
        ...previous,
        [field]: value,
      };
    });
    setProductFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleStockBySizeChange = (size, value) => {
    const normalizedSize = String(size || "").trim().toUpperCase();
    if (!normalizedSize) return;

    setProductForm((previous) => ({
      ...previous,
      stockBySize: {
        ...(previous.stockBySize || {}),
        [normalizedSize]: Math.max(0, Number(value) || 0),
      },
    }));
  };

  const openPrintWindow = (html) => {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=720,height=900");
    if (!popup) {
      setFeedback({
        type: "error",
        text: "Popup diblokir browser. Izinkan popup untuk mencetak resi.",
      });
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.onload = () => {
      popup.focus();
      setTimeout(() => popup.print(), 300);
    };
  };

  const toggleTorch = async () => {
    if (!scanStreamRef.current) return;
    const track = scanStreamRef.current.getVideoTracks?.()[0];
    if (!track) return;
    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (!capabilities.torch) {
        setTorchSupported(false);
        return;
      }
      await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] });
      setTorchEnabled((prev) => !prev);
      setTorchSupported(true);
    } catch {
      setTorchSupported(false);
    }
  };

  const resolveScanTargetStatus = (order, mode) => {
    const isPickup = isPickupShippingMethod(order?.shippingMethod);
    if (mode === "invoice") return isPickup ? "picked_up" : "completed";
    if (mode === "resi") {
      return isPickup ? "ready_pickup" : "shipping";
    }
    return isPickup ? "ready_pickup" : "shipping";
  };

  const updateOrderStatusFromScan = async (orderId, orderCode, nextStatus) => {
    const snapshot = ordersRef.current || [];
    const existing = snapshot.find((order) => order.id === orderId);
    const targetStatus = nextStatus || "shipping";
    const targetLabel = resolveScanStatusLabel(targetStatus);

    if (existing?.status === "cancelled") {
      setScanStatus(`${orderCode} dibatalkan`);
      return existing.status;
    }
    if (existing?.status === targetStatus) {
      setScanStatus(`${orderCode} sudah ${targetLabel}`);
      return existing.status;
    }
    if (
      existing?.status &&
      STATUS_RANK[existing.status] > STATUS_RANK[targetStatus]
    ) {
      setScanStatus(`${orderCode} sudah ${resolveScanStatusLabel(existing.status)}`);
      return existing.status;
    }

    const previousStatus = existing?.status;
    if (existing) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: targetStatus } : order,
        ),
      );
    }

    try {
      await api.patch(`/store/admin/orders/${orderId}/status`, { status: targetStatus });
      setScanStatus(`Status ${orderCode} → ${targetLabel}`);
      return targetStatus;
    } catch (error) {
      if (existing && previousStatus) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status: previousStatus } : order,
          ),
        );
      }
      const serverMessage = error?.response?.data?.message;
      const hint = serverMessage && /status order tidak valid|enum/i.test(serverMessage)
        ? " Backend belum migrasi status pickup."
        : "";
      setScanError(serverMessage ? `${serverMessage}${hint}` : "Gagal memperbarui status order.");
      setScanStatus("");
      return previousStatus || targetStatus;
    }
  };

  const printOrderLabel = (order) => {
    if (!order) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const qrValue = buildOrderQrValue(order.orderCode, "resi", baseUrl);
    const markup = buildPrintLabelMarkup(order, { logoUrl: gtshirtLogo, qrValue });
    openPrintWindow(buildPrintDocument(markup, { layout: "thermal" }));
  };

  const printOrderLabels = (orderList) => {
    const safeOrders = Array.isArray(orderList)
      ? orderList.filter(Boolean)
      : [];
    if (safeOrders.length === 0) {
      setFeedback({
        type: "error",
        text: "Pilih minimal 1 order untuk dicetak.",
      });
      return;
    }
    const markup = safeOrders
      .map((order) => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const qrValue = buildOrderQrValue(order.orderCode, "resi", baseUrl);
        return buildPrintLabelMarkup(order, { logoUrl: gtshirtLogo, qrValue });
      })
      .join("");
    openPrintWindow(buildPrintDocument(markup, { layout: "a4" }));
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (scanStreamRef.current) {
      scanStreamRef.current.getTracks().forEach((track) => track.stop());
      scanStreamRef.current = null;
    }
    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }
    hasScannedRef.current = false;
    setTorchEnabled(false);
    setTorchSupported(false);
  };

  useEffect(() => {
    if (!isScannerActive) {
      stopScanner();
      return;
    }
    if (typeof window === "undefined") return;

    let cancelled = false;
    const hasMedia = Boolean(navigator.mediaDevices?.getUserMedia);
    if (!hasMedia) {
      setScanError("Browser tidak mendukung akses kamera.");
      return;
    }

    const useNativeDetector = "BarcodeDetector" in window;
    const detector = useNativeDetector
      ? new window.BarcodeDetector({ formats: ["qr_code"] })
      : null;

    const scanFrame = async () => {
      if (!qrVideoRef.current || hasScannedRef.current) return;
      if (qrVideoRef.current.readyState < 2) return;
      try {
        let rawValue = "";

        if (useNativeDetector && detector) {
          const results = await detector.detect(qrVideoRef.current);
          rawValue = results?.[0]?.rawValue || "";
        } else {
          const canvas = qrCanvasRef.current || document.createElement("canvas");
          qrCanvasRef.current = canvas;
          const width = qrVideoRef.current.videoWidth || 640;
          const height = qrVideoRef.current.videoHeight || 480;
          if (!width || !height) return;
          const size = Math.min(width, height);
          const cropSize = Math.min(size, 520);
          const targetSize = Math.min(420, cropSize);
          const sx = Math.floor((width - cropSize) / 2);
          const sy = Math.floor((height - cropSize) / 2);
          if (canvas.width !== targetSize) canvas.width = targetSize;
          if (canvas.height !== targetSize) canvas.height = targetSize;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(qrVideoRef.current, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);
          const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
          const code = jsQR(imageData.data, targetSize, targetSize, { inversionAttempts: "attemptBoth" });
          rawValue = code?.data || "";
        }

        if (!rawValue) return;
        const { orderCode, mode } = parseOrderQrPayload(rawValue);
        if (!orderCode) {
          setScanError("QR tidak berisi kode order.");
          return;
        }
        const normalized = orderCode.toUpperCase();
        const scanMode = normalizeQrMode(mode) || "resi";
        const now = Date.now();
        if (recentScanRef.current.code === normalized && now - recentScanRef.current.at < 1400) {
          return;
        }
        hasScannedRef.current = true;
        recentScanRef.current = { code: normalized, at: now };
        setLastScannedCode(normalized);
        setLastScannedAt(new Date());
        setLastScannedMode(scanMode);
        setScanStatus(`Memproses ${normalized}...`);
        setScanError("");
        playScanBeep();
        triggerHaptic();
        const localId = orderCodeIndexRef.current.get(normalized) ||
          orderCodeCacheRef.current.get(normalized);
        if (localId) {
          const localOrder = (ordersRef.current || []).find((order) => order.id === localId);
          const targetStatus = resolveScanTargetStatus(localOrder, scanMode);
          const updatedStatus = await updateOrderStatusFromScan(localId, normalized, targetStatus);
          setLastScannedStatus(resolveScanStatusLabel(updatedStatus));
          setTimeout(() => {
            hasScannedRef.current = false;
          }, 420);
          return;
        }

        const rows = await fetchOrders({
          search: normalized,
          silent: true,
          preserve: true,
          limit: 1,
        });
        const matched = rows.find((row) => String(row.orderCode || "").toUpperCase() === normalized);
        if (!matched) {
          setScanError("Order tidak ditemukan.");
          setScanStatus("");
          hasScannedRef.current = false;
          return;
        }
        orderCodeCacheRef.current.set(normalized, matched.id);
        const targetStatus = resolveScanTargetStatus(matched, scanMode);
        const updatedStatus = await updateOrderStatusFromScan(matched.id, normalized, targetStatus);
        setLastScannedStatus(resolveScanStatusLabel(updatedStatus));
        setTimeout(() => {
          hasScannedRef.current = false;
        }, 520);
      } catch (error) {
        setScanError("Gagal membaca QR. Coba ulangi.");
        hasScannedRef.current = false;
      }
    };

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        scanStreamRef.current = stream;
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
          await qrVideoRef.current.play();
        }
        const track = stream.getVideoTracks?.()[0];
        const capabilities = track?.getCapabilities ? track.getCapabilities() : {};
        setTorchSupported(Boolean(capabilities?.torch));
        hasScannedRef.current = false;
        scanIntervalRef.current = window.setInterval(scanFrame, 360);
      } catch (error) {
        setScanError("Gagal mengakses kamera. Pastikan izin kamera aktif.");
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isScannerActive, scanSession]);

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((previous) => {
      const next = new Set(previous);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const selectAllOrders = () => {
    setSelectedOrderIds(new Set(orders.map((order) => order.id)));
  };

  const clearSelectedOrders = () => {
    setSelectedOrderIds(new Set());
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setFeedback({ type: "", text: "" });

    const totalImages = existingImages.length + imageFiles.length;
    const nextErrors = {};
    if (!productForm.name.trim()) {
      nextErrors.name = "Nama produk wajib diisi.";
    }
    if (!productForm.description.trim()) {
      nextErrors.description = "Deskripsi produk wajib diisi.";
    }
    if (!productFormSizes.length) {
      nextErrors.sizesText = "Minimal 1 ukuran harus diisi.";
    }
    if (Number(productForm.basePrice) < 0 || Number.isNaN(Number(productForm.basePrice))) {
      nextErrors.basePrice = "Harga dasar tidak valid.";
    }
    if (totalImages === 0) {
      nextErrors.images = "Minimal 1 foto produk wajib diupload.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setProductFieldErrors(nextErrors);
      setProductAccordion((prev) => ({
        ...prev,
        basic: prev.basic || Boolean(nextErrors.name || nextErrors.description),
        stock: prev.stock || Boolean(nextErrors.basePrice || nextErrors.sizesText),
        media: prev.media || Boolean(nextErrors.images),
      }));
      const fieldOrder = ["name", "description", "basePrice", "sizesText", "images"];
      const firstKey = fieldOrder.find((key) => nextErrors[key]);
      const scrollTarget = {
        name: nameInputRef,
        description: descriptionInputRef,
        basePrice: basePriceInputRef,
        sizesText: sizesInputRef,
        images: imageDropRef,
      }[firstKey];
      if (scrollTarget?.current) {
        scrollTarget.current.scrollIntoView({ behavior: "smooth", block: "center" });
        scrollTarget.current.focus?.();
      }
      setFeedback({ type: "error", text: nextErrors[firstKey] || "Lengkapi data produk." });
      return;
    }

    setSavingProduct(true);

    const sizes = productFormSizes;
    const stockBySize = normalizeStockBySizeMap(productForm.stockBySize, sizes);
    const totalStock = sumStockBySize(stockBySize);

    const formData = new FormData();
    formData.append("name", productForm.name);
    formData.append("slug", productForm.slug);
    formData.append("description", productForm.description);
    formData.append("color", productForm.color);
    formData.append("basePrice", String(Number(productForm.basePrice) || 0));
    formData.append("stock", String(totalStock));
    formData.append("stockBySize", JSON.stringify(stockBySize));
    sizes.forEach((s) => formData.append("sizes", s));
    formData.append("promoType", productForm.promoType);
    formData.append(
      "promoValue",
      String(productForm.promoType === "none" ? 0 : Number(productForm.promoValue) || 0)
    );
    if (productForm.promoType !== "none" && productForm.promoStartAt) {
      formData.append("promoStartAt", new Date(productForm.promoStartAt).toISOString());
    }
    if (productForm.promoType !== "none" && productForm.promoEndAt) {
      formData.append("promoEndAt", new Date(productForm.promoEndAt).toISOString());
    }
    formData.append("isActive", String(productForm.isActive));

    // Append new image files
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      if (editingProductId) {
        // If user still has existing images and didn't add new ones, don't replace
        // If user added new files, those will replace old images via backend logic
        await api.put(`/store/admin/products/${editingProductId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFeedback({ type: "success", text: "Produk berhasil diperbarui." });
      } else {
        await api.post("/store/admin/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFeedback({ type: "success", text: "Produk baru berhasil ditambahkan." });
      }

      resetProductForm();
      await Promise.all([fetchProducts(), fetchAnalytics()]);
    } catch (error) {
      const firstError = error.response?.data?.errors?.[0]?.msg;
      setFeedback({
        type: "error",
        text: firstError || error.response?.data?.message || "Gagal menyimpan produk.",
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductStatus = async (product, nextActive) => {
    const actionLabel = nextActive ? "Aktifkan" : "Nonaktifkan";
    const confirmed = window.confirm(
      `${actionLabel} produk "${product.name}" ${nextActive ? "ke" : "dari"} katalog?`,
    );
    if (!confirmed) return;

    setFeedback({ type: "", text: "" });
    try {
      const formData = new FormData();
      formData.append("isActive", String(nextActive));
      await api.put(`/store/admin/products/${product.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFeedback({
        type: "success",
        text: `Produk berhasil ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`,
      });
      await Promise.all([fetchProducts(), fetchAnalytics()]);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || `Gagal ${actionLabel.toLowerCase()} produk.`,
      });
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Hapus permanen produk "${product.name}"? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    setFeedback({ type: "", text: "" });
    try {
      await api.delete(`/store/admin/products/${product.id}`);
      setFeedback({ type: "success", text: "Produk berhasil dihapus permanen." });
      await Promise.all([fetchProducts(), fetchAnalytics()]);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menghapus produk.",
      });
    }
  };

  const handleOrderStatusChange = async (orderId, status, options = {}) => {
    const previousOrders = orders;
    const shouldRefresh = !options.skipRefresh;
    const shouldNotify = !options.silent;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
    try {
      await api.patch(`/store/admin/orders/${orderId}/status`, { status });
      if (shouldRefresh) {
        await Promise.all([fetchOrders(), fetchAnalytics()]);
      }
      if (shouldNotify) {
        setFeedback({ type: "success", text: "Status order berhasil diperbarui." });
      }
    } catch (error) {
      setOrders(previousOrders);
      if (shouldNotify) {
        setFeedback({
          type: "error",
          text: error.response?.data?.message || "Gagal memperbarui status order.",
        });
      }
    }
  };

  const getQuickActionForOrder = (order) => {
    if (!order) return null;
    if (order.status === "new") {
      return { label: "Konfirmasi Pesanan", nextStatus: "confirmed" };
    }
    if (order.status === "confirmed") {
      return { label: "Dikemas", nextStatus: "packed" };
    }
    return null;
  };

  const handleQuickOrderAction = async (order, action) => {
    if (!order || !action) return;
    await handleOrderStatusChange(order.id, action.nextStatus, {
      skipRefresh: true,
      silent: true,
    });
  };

  const handleClearOrders = async () => {
    const confirmed = window.confirm(
      "Hapus semua pesanan? Data pesanan dan item akan dihapus permanen.",
    );
    if (!confirmed) return;
    try {
      await api.post("/store/admin/orders/reset");
      setFeedback({ type: "success", text: "Semua pesanan berhasil dihapus." });
      setOrderPage(1);
      await Promise.all([fetchOrders({ page: 1 }), fetchAnalytics({ force: true })]);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menghapus semua pesanan.",
      });
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) {
      setFeedback({ type: "error", text: "Pilih status terlebih dahulu." });
      return;
    }
    if (selectedOrders.length === 0) {
      setFeedback({ type: "error", text: "Pilih minimal 1 order." });
      return;
    }
    const confirmed = window.confirm(
      `Ubah status ${selectedOrders.length} order menjadi "${mapOrderStatusLabel(bulkStatus)}"?`,
    );
    if (!confirmed) return;

    const previousOrders = orders;
    const ids = new Set(selectedOrders.map((order) => order.id));
    setOrders((prev) =>
      prev.map((order) =>
        ids.has(order.id) ? { ...order, status: bulkStatus } : order,
      ),
    );

    const results = await Promise.allSettled(
      selectedOrders.map((order) =>
        api.patch(`/store/admin/orders/${order.id}/status`, { status: bulkStatus }),
      ),
    );
    const failed = results.filter((res) => res.status === "rejected").length;
    if (failed > 0) {
      setOrders(previousOrders);
      setFeedback({
        type: "error",
        text: `${failed} order gagal diperbarui. Coba ulangi.`,
      });
      return;
    }
    setFeedback({
      type: "success",
      text: "Status order terpilih berhasil diperbarui.",
    });
    setSelectedOrderIds(new Set());
    setBulkStatus("");
    fetchAnalytics();
  };

  const handleReviewStatusToggle = async (reviewId, nextApproved) => {
    try {
      await api.patch(`/store/admin/reviews/${reviewId}`, { isApproved: nextApproved });
      setFeedback({ type: "success", text: "Status ulasan diperbarui." });
      await Promise.all([fetchReviews(), fetchAnalytics()]);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memperbarui status ulasan.",
      });
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm("Hapus ulasan ini? Tindakan ini permanen.");
    if (!confirmed) return;
    try {
      await api.delete(`/store/admin/reviews/${reviewId}`);
      setFeedback({ type: "success", text: "Ulasan berhasil dihapus." });
      await Promise.all([fetchReviews(), fetchAnalytics()]);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menghapus ulasan.",
      });
    }
  };

  const handleExportReport = () => {
    if (!reportRows.length) {
      setFeedback({ type: "error", text: "Tidak ada data untuk diexport." });
      return;
    }

    const rows = reportRows.map((row, index) => ({
      No: index + 1,
      "Kode Order": row.orderCode,
      Tanggal: formatDateTime(row.createdAt),
      Nama: row.customerName,
      "No. WA": row.customerPhone,
      Status: mapOrderStatusLabel(row.status),
      Pengiriman: row.shippingMethod,
      Pembayaran: row.paymentMethod,
      Subtotal: row.subtotal,
      Ongkir: row.shippingCost,
      Total: row.totalAmount,
      "Jumlah Item": row.itemCount,
      Produk: row.itemsSummary,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pemasukan");

    const startLabel = reportFilters.startDate || "semua";
    const endLabel = reportFilters.endDate || "semua";
    XLSX.writeFile(workbook, `laporan-pemasukan-${startLabel}-${endLabel}.xlsx`);
  };

  const handleSaveShipping = async () => {
    setSavingShipping(true);
    setFeedback({ type: "", text: "" });
    try {
      await api.patch("/store/admin/settings", {
        shippingCost: Math.max(0, Number(shippingCostInput) || 0),
      });
      const newCost = Math.max(0, Number(shippingCostInput) || 0);
      setShippingCost(newCost);
      setFeedback({ type: "success", text: "Harga ongkir berhasil diperbarui." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menyimpan harga ongkir.",
      });
    } finally {
      setSavingShipping(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      setProductAccordion((prev) => ({
        ...prev,
        basic: true,
        media: true,
        stock: !isMobile ? true : prev.stock,
        promo: !isMobile ? true : prev.promo,
        status: true,
      }));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleAccordion = (key) => {
    setProductAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="page-stack admin-shell space-y-5 sm:space-y-6">
      <section className="glass-card dense-card overflow-hidden p-0">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
              Admin Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-900 dark:text-white">
              GTshirt Store Control
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-600 dark:text-brand-300">
              Kelola produk, harga, promo, ongkir, order, dan analisis performa penjualan
              brand GTshirt dari satu dashboard.
            </p>
          </div>
          <div className="bg-[#255C2F] p-5 md:p-6">
            <img
              src={gtshirtLogo}
              alt="GTshirt"
              loading="lazy"
              decoding="async"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {feedback.text && (
        <section
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300"
          }`}
        >
          {feedback.text}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loadingAnalytics && (
          <div className="col-span-full flex justify-center py-8">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </div>
        )}
        {!loadingAnalytics &&
          metricCards.map((item) => (
            <article key={item.label} className="glass-card dense-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold gradient-text">
                {item.value}
              </p>
            </article>
          ))}
      </section>

      {/* ── Tab Navigation ──────────────────────── */}
      <div className={`admin-tabs flex gap-2 border-b border-brand-200 dark:border-brand-700 overflow-x-auto pb-1 ${tabHidden ? "admin-tabs-hidden" : ""}`}>
        <button
          onClick={() => setActiveTab("produk")}
          className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === "produk"
              ? "text-primary"
              : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
          }`}
        >
          📦 Produk GTshirt
          {activeTab === "produk" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("pesanan")}
          className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === "pesanan"
              ? "text-primary"
              : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
          }`}
        >
          📬 Pesanan Masuk
          {activeTab === "pesanan" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("scan")}
          className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === "scan"
              ? "text-primary"
              : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
          }`}
        >
          📷 Scan Resi
          {activeTab === "scan" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ulasan")}
          className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === "ulasan"
              ? "text-primary"
              : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
          }`}
        >
          ⭐ Ulasan Produk
          {activeTab === "ulasan" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("laporan")}
          className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === "laporan"
              ? "text-primary"
              : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
          }`}
        >
          📈 Laporan
          {activeTab === "laporan" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ongkir")}
          className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === "ongkir"
              ? "text-primary"
              : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
          }`}
        >
          ⚙️ Pengaturan Ongkir
          {activeTab === "ongkir" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
          )}
        </button>
      </div>

      {/* ── TAB: PRODUK GTSHIRT ──────────────────── */}
      {activeTab === "produk" && (
        <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <article className="glass-card dense-card p-6">
            <h2 className="text-xl font-bold text-brand-900 dark:text-white">
              {editingProductId ? "Edit Produk GTshirt" : "Tambah Produk GTshirt"}
            </h2>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 pb-24 sm:pb-0">
              <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
                <button
                  type="button"
                  onClick={() => toggleAccordion("basic")}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={productAccordion.basic}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                      Informasi
                    </p>
                    <p className="text-sm font-bold text-brand-900 dark:text-white">
                      Detail Produk
                    </p>
                  </div>
                  <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                    {productAccordion.basic ? "−" : "+"}
                  </span>
                </button>
                {productAccordion.basic && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Nama Produk *
                      </label>
                      <input
                        required
                        ref={nameInputRef}
                        className={`input-modern ${productFieldErrors.name ? "input-error" : ""}`}
                        value={productForm.name}
                        onChange={(event) => handleProductFormChange("name", event.target.value)}
                        placeholder="Contoh: Hope in Him Tee"
                        aria-invalid={Boolean(productFieldErrors.name)}
                      />
                      {productFieldErrors.name && (
                        <p className="text-[11px] font-semibold text-rose-500">
                          {productFieldErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Slug
                      </label>
                      <input
                        className="input-modern"
                        value={productForm.slug}
                        onChange={(event) => handleProductFormChange("slug", event.target.value)}
                        placeholder="auto dari nama jika kosong"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Deskripsi
                      </label>
                      <textarea
                        ref={descriptionInputRef}
                        className={`input-modern min-h-[86px] resize-y ${productFieldErrors.description ? "input-error" : ""}`}
                        value={productForm.description}
                        onChange={(event) => handleProductFormChange("description", event.target.value)}
                        placeholder="Deskripsi produk"
                        aria-invalid={Boolean(productFieldErrors.description)}
                      />
                      {productFieldErrors.description && (
                        <p className="text-[11px] font-semibold text-rose-500">
                          {productFieldErrors.description}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Warna
                      </label>
                      <input
                        className="input-modern"
                        value={productForm.color}
                        onChange={(event) => handleProductFormChange("color", event.target.value)}
                        placeholder="Jet Black"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
                <button
                  type="button"
                  onClick={() => toggleAccordion("media")}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={productAccordion.media}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                      Media
                    </p>
                    <p className="text-sm font-bold text-brand-900 dark:text-white">
                      Foto Produk
                    </p>
                  </div>
                  <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                    {productAccordion.media ? "−" : "+"}
                  </span>
                </button>
                {productAccordion.media && (
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                      📷 Foto Produk * (max 8 file, jpeg/png/webp, maks 2MB per file)
                    </label>

                    {/* Drop zone */}
                    <div
                      ref={imageDropRef}
                      className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-4 transition hover:border-primary hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-900/30 dark:hover:border-primary ${productFieldErrors.images ? "input-error" : ""}`}
                      tabIndex={-1}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDropFiles}
                    >
                      <svg className="h-8 w-8 text-brand-400 dark:text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                      </svg>
                      <p className="text-sm text-brand-500 dark:text-brand-400">
                        <span className="font-semibold text-primary">Klik untuk pilih file</span> atau drag & drop
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                    </div>
                    {productFieldErrors.images && (
                      <p className="text-[11px] font-semibold text-rose-500">
                        {productFieldErrors.images}
                      </p>
                    )}

                    {/* Existing images (saat edit) */}
                    {existingImages.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-brand-500 dark:text-brand-400">
                          Gambar saat ini (tidak dikirim ulang jika tidak upload baru):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {existingImages.map((src, index) => (
                            <div key={`existing-${index}`} className="group relative">
                              <img
                                src={resolveImageUrl(src)}
                                alt={`Existing ${index + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="h-16 w-16 rounded-xl border border-brand-200 object-cover dark:border-brand-700 sm:h-20 sm:w-20"
                              />
                              <button
                                type="button"
                                onClick={() => removeExistingImage(index)}
                                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New image previews */}
                    {imagePreviews.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-brand-500 dark:text-brand-400">
                          Foto baru yang akan diupload:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {imagePreviews.map((src, index) => (
                            <div
                              key={`new-${index}`}
                              className="group relative"
                              draggable
                              onDragStart={(event) => handlePreviewDragStart(index, event)}
                              onDragOver={handlePreviewDragOver}
                              onDrop={(event) => {
                                event.preventDefault();
                                handlePreviewDrop(index);
                              }}
                              onDragEnd={handlePreviewDragEnd}
                            >
                              <img
                                src={src}
                                alt={`Preview ${index + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="h-16 w-16 rounded-xl border border-brand-200 object-cover dark:border-brand-700 sm:h-20 sm:w-20"
                              />
                              <button
                                type="button"
                                onClick={() => removeNewImage(index)}
                                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100"
                              >
                                ✕
                              </button>
                              <div className="image-reorder-controls sm:hidden">
                                <button type="button" onClick={() => movePreview(index, -1)}>◀</button>
                                <button type="button" onClick={() => movePreview(index, 1)}>▶</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
                <button
                  type="button"
                  onClick={() => toggleAccordion("stock")}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={productAccordion.stock}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                      Harga & Stok
                    </p>
                    <p className="text-sm font-bold text-brand-900 dark:text-white">
                      Pengaturan Stok
                    </p>
                  </div>
                  <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                    {productAccordion.stock ? "−" : "+"}
                  </span>
                </button>
                {productAccordion.stock && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Harga Dasar
                      </label>
                      <input
                        type="number"
                        min="0"
                        ref={basePriceInputRef}
                        className={`input-modern ${productFieldErrors.basePrice ? "input-error" : ""}`}
                        value={productForm.basePrice}
                        onChange={(event) => handleProductFormChange("basePrice", event.target.value)}
                        aria-invalid={Boolean(productFieldErrors.basePrice)}
                      />
                      {productFieldErrors.basePrice && (
                        <p className="text-[11px] font-semibold text-rose-500">
                          {productFieldErrors.basePrice}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Ukuran (pisahkan koma)
                      </label>
                      <input
                        ref={sizesInputRef}
                        className={`input-modern ${productFieldErrors.sizesText ? "input-error" : ""}`}
                        value={productForm.sizesText}
                        onChange={(event) => handleProductFormChange("sizesText", event.target.value)}
                        onBlur={() => {
                          const sanitized = normalizeSizePayload(productForm.sizesText);
                          setProductForm((previous) => ({
                            ...previous,
                            sizesText: sanitized.join(", "),
                          }));
                        }}
                        placeholder="S, M, L, XL"
                        aria-invalid={Boolean(productFieldErrors.sizesText)}
                      />
                      <p className="text-[11px] text-brand-500 dark:text-brand-400">
                        XXL tidak tersedia. Ukuran di atas XL akan masuk preorder.
                      </p>
                      {productFormHasPreorderSizes && (
                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                          Ukuran di atas XL terdeteksi — tandai sebagai preorder.
                        </p>
                      )}
                      {productFieldErrors.sizesText && (
                        <p className="text-[11px] font-semibold text-rose-500">
                          {productFieldErrors.sizesText}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                          Stok per Ukuran
                        </label>
                        <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                          Total stok: {productFormTotalStock}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {productFormSizes.map((size) => (
                          <label
                            key={size}
                            className="rounded-xl border border-brand-200 bg-white/70 p-2 text-xs dark:border-brand-700 dark:bg-brand-900/45"
                          >
                            <span className="mb-1 block font-semibold text-brand-700 dark:text-brand-300">
                              {size}
                            </span>
                            <input
                              type="number"
                              min="0"
                              className="input-modern !py-2 !text-sm"
                              value={productFormStockBySize[size] ?? 0}
                              onChange={(event) => handleStockBySizeChange(size, event.target.value)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
                <button
                  type="button"
                  onClick={() => toggleAccordion("promo")}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={productAccordion.promo}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                      Promo
                    </p>
                    <p className="text-sm font-bold text-brand-900 dark:text-white">
                      Harga Spesial
                    </p>
                  </div>
                  <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                    {productAccordion.promo ? "−" : "+"}
                  </span>
                </button>
                {productAccordion.promo && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Jenis Promo
                      </label>
                      <select
                        className="input-modern"
                        value={productForm.promoType}
                        onChange={(event) => handleProductFormChange("promoType", event.target.value)}
                      >
                        <option value="none">Tanpa Promo</option>
                        <option value="percentage">Persentase (%)</option>
                        <option value="fixed">Potongan Nominal</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Nilai Promo
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="input-modern"
                        value={productForm.promoValue}
                        onChange={(event) => handleProductFormChange("promoValue", event.target.value)}
                        disabled={productForm.promoType === "none"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Promo Mulai
                      </label>
                      <input
                        type="datetime-local"
                        className="input-modern"
                        value={productForm.promoStartAt}
                        onChange={(event) => handleProductFormChange("promoStartAt", event.target.value)}
                        disabled={productForm.promoType === "none"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                        Promo Selesai
                      </label>
                      <input
                        type="datetime-local"
                        className="input-modern"
                        value={productForm.promoEndAt}
                        onChange={(event) => handleProductFormChange("promoEndAt", event.target.value)}
                        disabled={productForm.promoType === "none"}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
                <button
                  type="button"
                  onClick={() => toggleAccordion("status")}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={productAccordion.status}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                      Status
                    </p>
                    <p className="text-sm font-bold text-brand-900 dark:text-white">
                      Simpan Produk
                    </p>
                  </div>
                  <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                    {productAccordion.status ? "−" : "+"}
                  </span>
                </button>
                {productAccordion.status && (
                  <div className="mt-4 space-y-4">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300">
                      <input
                        type="checkbox"
                        checked={productForm.isActive}
                        onChange={(event) => handleProductFormChange("isActive", event.target.checked)}
                      />
                      Produk aktif ditampilkan di katalog
                    </label>

                    <div className="admin-action-desktop flex flex-wrap gap-3">
                      <button type="submit" disabled={savingProduct} className="btn-primary !px-6 !py-2.5 disabled:opacity-60">
                        {savingProduct
                          ? "Menyimpan..."
                          : editingProductId
                            ? "Update Produk"
                            : "Tambah Produk"}
                      </button>
                      {editingProductId && (
                        <button type="button" onClick={resetProductForm} className="btn-outline !px-6 !py-2.5">
                          Batal Edit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-sticky-actions sm:hidden">
                <div className="admin-sticky-surface">
                  <button type="submit" disabled={savingProduct} className="btn-primary min-h-[44px] flex-1 !px-4 !py-3 disabled:opacity-60">
                    {savingProduct
                      ? "Menyimpan..."
                      : editingProductId
                        ? "Update Produk"
                        : "Tambah Produk"}
                  </button>
                  {editingProductId && (
                    <button type="button" onClick={resetProductForm} className="btn-outline min-h-[44px] !px-4 !py-3">
                      Batal
                    </button>
                  )}
                </div>
              </div>
            </form>
        </article>

        <article className="glass-card dense-card p-6">
          <div className="admin-filter-card flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Cari Produk
              </label>
              <input
                className="input-modern"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Nama / slug"
              />
            </div>
            <div className="min-w-[180px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Status
              </label>
              <select
                className="input-modern"
                value={productActiveFilter}
                onChange={(event) => setProductActiveFilter(event.target.value)}
              >
                {PRODUCT_ACTIVE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => fetchProducts()}
              className="btn-primary !px-6 !py-2.5"
            >
              Terapkan
            </button>
          </div>

          <div className="admin-scroll-panel mt-4 max-h-[560px] space-y-4 overflow-auto pr-1">
            {loadingProducts && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`product-skeleton-${index}`}
                    className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-xl skeleton" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded-full skeleton" />
                        <div className="h-3 w-1/3 rounded-full skeleton" />
                      </div>
                      <div className="h-6 w-16 rounded-full skeleton" />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="h-3 rounded-full skeleton" />
                      <div className="h-3 rounded-full skeleton" />
                      <div className="h-3 rounded-full skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loadingProducts && products.length === 0 && (
              <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
                Belum ada produk GTshirt.
              </div>
            )}
            {!loadingProducts &&
              products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                >
                  <div className="flex items-start gap-3">
                    {/* Product thumbnail */}
                    {product.imageUrl && (
                      <img
                        src={resolveImageUrl(product.imageUrl)}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 flex-shrink-0 rounded-xl border border-brand-200 object-cover dark:border-brand-700"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-brand-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="text-xs text-brand-500 dark:text-brand-400">
                            {product.slug}
                          </p>
                        </div>
                        <span
                          className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${
                            product.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          }`}
                        >
                          {product.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-600 dark:text-brand-300">
                    <span>Harga: {formatRupiah(product.basePrice)}</span>
                    <span>Final: {formatRupiah(product.finalPrice)}</span>
                    <span>Stok: {product.stock}</span>
                    <span>
                      Size: {Array.isArray(product.sizes)
                        ? filterOutXXL(product.sizes).join("/") || "-"
                        : "-"}
                    </span>
                    <span>Foto: {Array.isArray(product.imageUrls) ? product.imageUrls.length : 0}</span>
                  </div>
                  {product.stockBySize && (
                    <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                      Stok per ukuran: {Object.entries(product.stockBySize)
                        .filter(([size]) => normalizeSizeLabel(size) !== "XXL")
                        .map(([size, qty]) => `${String(size).toUpperCase()}=${Number(qty) || 0}`)
                        .join(" • ")}
                    </p>
                  )}
                  {product.promoIsActive && (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      Promo aktif: {product.promoLabel}
                    </p>
                  )}
                  <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
                    <button
                      type="button"
                      onClick={() => fillProductForm(product)}
                      className="min-h-[44px] rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleProductStatus(product, !product.isActive)}
                      className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                        product.isActive
                          ? "bg-rose-500 hover:bg-rose-600"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product)}
                      className="min-h-[44px] rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                    >
                      Hapus
                    </button>
                  </div>
                  <details className="mt-3 sm:hidden">
                    <summary className="admin-action-summary min-h-[44px] cursor-pointer rounded-xl border border-brand-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                      Aksi Produk
                    </summary>
                    <div className="mt-2 grid gap-2">
                      <button
                        type="button"
                        onClick={() => fillProductForm(product)}
                        className="min-h-[44px] rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleProductStatus(product, !product.isActive)}
                        className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                          product.isActive
                            ? "bg-rose-500 hover:bg-rose-600"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        className="min-h-[44px] rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </details>
                </div>
              ))}
          </div>
        </article>
      </section>
      )}

      {/* ── TAB: PESANAN MASUK ──────────────────── */}
      {activeTab === "pesanan" && (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-card dense-card p-6">
          <div className="admin-filter-card flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Cari Order
              </label>
              <input
                className="input-modern"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Kode order / nama / nomor WA"
              />
            </div>
            <div className="min-w-[180px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Status
              </label>
              <select
                className="input-modern"
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value)}
              >
                <option value="">Semua Status</option>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setOrderPage(1);
                fetchOrders({ page: 1 });
              }}
              className="btn-primary !px-6 !py-2.5"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={handleClearOrders}
              className="rounded-2xl border border-rose-500 bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:border-rose-600 hover:bg-rose-700 dark:border-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
            >
              Reset Semua Pesanan
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllOrders}
              className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("scan");
                setScanError("");
              }}
              className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
            >
              Scan QR
            </button>
            <button
              type="button"
              onClick={clearSelectedOrders}
              className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
            >
              Bersihkan
            </button>
            <select
              className="input-modern !py-2 text-xs"
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
            >
              <option value="">Pilih Status</option>
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || selectedOrders.length === 0}
              className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
            >
              Update Status ({selectedOrders.length})
            </button>
            <button
              type="button"
              onClick={() => printOrderLabels(selectedOrders)}
              disabled={selectedOrders.length === 0}
              className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
            >
              Print Resi Terpilih ({selectedOrders.length})
            </button>
          </div>

          <div
            ref={orderListRef}
            onScroll={(event) => setOrderScrollTop(event.currentTarget.scrollTop)}
            className="admin-scroll-panel mt-4 max-h-[560px] space-y-4 overflow-auto pr-1"
          >
            {loadingOrders && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`order-skeleton-${index}`}
                    className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="h-3 w-32 rounded-full skeleton" />
                        <div className="h-3 w-40 rounded-full skeleton" />
                      </div>
                      <div className="h-6 w-20 rounded-full skeleton" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="h-3 rounded-full skeleton" />
                      <div className="h-3 rounded-full skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
                Belum ada order masuk.
              </div>
            )}
            {!loadingOrders && (
              <div style={{ paddingTop: orderPaddingTop, paddingBottom: orderPaddingBottom }}>
                {visibleOrders.map((order, index) => {
                  const quickAction = getQuickActionForOrder(order);
                  return (
                    <div
                      key={order.id}
                      ref={useVirtualOrders && index === 0 ? orderRowMeasureRef : null}
                      className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                    >
                  <div className="sm:hidden">
                    <details className="admin-order-details">
                      <summary className="admin-order-summary mobile-summary flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <label
                            className="flex items-center"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="h-4 w-4 rounded border-brand-300 text-primary"
                            />
                          </label>
                          <div>
                            <p className="text-sm font-bold text-brand-900 dark:text-white">
                              {order.orderCode}
                            </p>
                            <p className="text-[11px] text-brand-500 dark:text-brand-400">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
                              {mapOrderStatusLabel(order.status)}
                            </span>
                            <p className="mt-1 text-xs font-semibold text-primary">
                              {formatRupiah(order.totalAmount)}
                            </p>
                          </div>
                          <svg
                            className="mobile-summary-icon h-5 w-5 text-brand-500 dark:text-brand-300"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.6}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                          </svg>
                        </div>
                      </summary>
                      <div className="mt-3 space-y-2 text-xs text-brand-600 dark:text-brand-300">
                        <p>{order.customerName} • {order.customerPhone}</p>
                        {order.user?.email && (
                          <p className="text-[11px] text-brand-500 dark:text-brand-400">
                            Akun: {order.user.email}
                          </p>
                        )}
                        <p>{order.shippingMethod} • {order.paymentMethod}</p>
                        <p className="text-[11px] text-brand-500 dark:text-brand-400">
                          Potong stok: {order.stockDeductedAt ? `Sudah (${formatDateTime(order.stockDeductedAt)})` : "Belum"}
                        </p>
                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <p className="text-[11px] text-brand-500 dark:text-brand-400">
                            {order.items.length} item • {order.items.map((item) => `${item.productName} (${item.size} x${item.quantity})`).join(", ")}
                          </p>
                        )}
                        {quickAction && (
                          <button
                            type="button"
                            onClick={() => handleQuickOrderAction(order, quickAction)}
                            className="btn-primary !w-full !py-2 !text-xs"
                          >
                            {quickAction.label}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveOrderSheet(order)}
                          className="admin-order-action"
                        >
                          Ubah Status
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrderLabel(order)}
                          className="admin-order-action"
                        >
                          Print Resi
                        </button>
                      </div>
                    </details>
                  </div>

                  <div className="hidden sm:block">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <label className="flex items-start pt-1">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="h-4 w-4 rounded border-brand-300 text-primary"
                          />
                        </label>
                        <div>
                          <p className="text-sm font-bold text-brand-900 dark:text-white">
                            {order.orderCode}
                          </p>
                          <p className="text-xs text-brand-500 dark:text-brand-400">
                            {order.customerName} • {order.customerPhone}
                          </p>
                          {order.user?.email && (
                            <p className="text-[11px] text-brand-500 dark:text-brand-400">
                              Akun: {order.user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
                        {mapOrderStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-brand-600 dark:text-brand-300">
                      {formatDateTime(order.createdAt)} • {order.shippingMethod} • {order.paymentMethod}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-primary">
                      Total: {formatRupiah(order.totalAmount)}
                    </div>
                    <div className="mt-1 text-[11px] text-brand-500 dark:text-brand-400">
                      Potong stok: {order.stockDeductedAt ? `Sudah (${formatDateTime(order.stockDeductedAt)})` : "Belum"}
                    </div>
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                        {order.items.length} item • {order.items.map((item) => `${item.productName} (${item.size} x${item.quantity})`).join(", ")}
                      </p>
                    )}

                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {quickAction && (
                          <button
                            type="button"
                            onClick={() => handleQuickOrderAction(order, quickAction)}
                            className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
                          >
                            {quickAction.label}
                          </button>
                        )}
                        <select
                          className="input-modern !py-2 text-xs"
                          value={order.status}
                          onChange={(event) =>
                            handleOrderStatusChange(order.id, event.target.value)
                          }
                        >
                          {ORDER_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => printOrderLabel(order)}
                          className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200 dark:hover:bg-brand-800/40"
                        >
                          Print Resi
                        </button>
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
                <button
                  type="button"
                  onClick={() => fetchOrders({ page: orderPage + 1, append: true })}
                  disabled={isLoadingMoreOrders}
                  className="btn-outline !px-4 !py-2 text-xs disabled:opacity-60"
                >
                  {isLoadingMoreOrders ? "Memuat..." : "Muat Order Lainnya"}
                </button>
              </div>
            )}
          </div>
        </article>

        <article className="glass-card dense-card p-6">
          <h3 className="text-lg font-bold text-brand-900 dark:text-white">
            Top Produk Terlaris
          </h3>
          <div className="mt-4 space-y-2">
            {!analytics?.topProducts?.length && (
              <p className="text-sm text-brand-600 dark:text-brand-400">
                Belum ada data penjualan produk.
              </p>
            )}
            {analytics?.topProducts?.map((item) => (
              <div
                key={item.productName}
                className="rounded-xl border border-brand-200 bg-white/70 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900/45"
              >
                <p className="font-semibold text-brand-900 dark:text-white">{item.productName}</p>
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  Terjual: {item.soldQty} • Revenue: {formatRupiah(item.revenue)}
                </p>
              </div>
            ))}
          </div>

          <h3 className="mt-6 text-lg font-bold text-brand-900 dark:text-white">
            Revenue per Status
          </h3>
          <div className="mt-3 space-y-2">
            {!analytics?.revenueByStatus && (
              <p className="text-sm text-brand-600 dark:text-brand-400">
                Belum ada data revenue.
              </p>
            )}
            {analytics?.revenueByStatus &&
              Object.entries(analytics.revenueByStatus).map(([status, amount]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900/45"
                >
                  <span className="font-medium text-brand-700 dark:text-brand-300">
                    {mapOrderStatusLabel(status)}
                  </span>
                  <span className="font-semibold text-brand-900 dark:text-white">
                    {formatRupiah(amount)}
                  </span>
                </div>
              ))}
          </div>
        </article>
      </section>
      )}

      {/* ── TAB: SCAN RESI ──────────────────── */}
      {activeTab === "scan" && (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="glass-card dense-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
              Scanner Standby
            </p>
            <h3 className="mt-2 text-2xl font-bold text-brand-900 dark:text-white">
              Scan QR Resi / Invoice
            </h3>
            <p className="mt-2 text-sm text-brand-600 dark:text-brand-300">
              QR resi menandai pesanan menjadi <strong>siap diambil</strong> (ambil di gereja) atau <strong>shipping</strong> (kurir).
              QR invoice menandai pesanan menjadi <strong>sudah diambil</strong> / <strong>selesai</strong>.
            </p>

            <div className="mt-4 relative overflow-hidden rounded-2xl border border-brand-200 bg-black dark:border-brand-700">
              <video
                ref={qrVideoRef}
                className="h-72 w-full object-cover"
                muted
                playsInline
              />
              <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-emerald-400/70" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-500 dark:text-brand-400">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                Standby: {isScannerActive ? "Aktif" : "Nonaktif"}
              </span>
              {scanStatus && (
                <span className="rounded-full border border-brand-200 bg-white/80 px-2 py-1 font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  {scanStatus}
                </span>
              )}
            </div>
            {scanError && (
              <p className="mt-2 text-xs font-semibold text-rose-500">
                {scanError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setScanError("");
                  setScanStatus("");
                  setScanSession((prev) => prev + 1);
                }}
                className="rounded-xl border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
              >
                Restart Scanner
              </button>
              <button
                type="button"
                onClick={toggleTorch}
                disabled={!torchSupported}
                className="rounded-xl border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
              >
                {torchEnabled ? "Matikan Flash" : "Nyalakan Flash"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pesanan")}
                className="rounded-xl border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
              >
                Kembali ke Pesanan
              </button>
            </div>
          </article>

          <article className="glass-card dense-card p-6 space-y-4">
            <div>
              <h4 className="text-lg font-bold text-brand-900 dark:text-white">
                Log Scan Terakhir
              </h4>
              <p className="text-sm text-brand-600 dark:text-brand-400">
                Gunakan tab ini untuk scan cepat tanpa menutup kamera.
              </p>
            </div>

            {lastScannedCode ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200">
                <p className="font-semibold">Order: {lastScannedCode}</p>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                  Terakhir scan: {formatDateTime(lastScannedAt)}
                </p>
                <p className="mt-2 text-xs">
                  QR: <strong>{lastScannedMode === "invoice" ? "Invoice" : "Resi"}</strong>
                </p>
                <p className="mt-1 text-xs">
                  Status → <strong>{lastScannedStatus || "tersimpan"}</strong>
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-brand-200 bg-white/80 p-4 text-sm text-brand-600 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                Belum ada QR yang discan.
              </div>
            )}

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
              Tips: pastikan cahaya cukup dan kamera fokus agar QR cepat terbaca.
            </div>
          </article>
        </section>
      )}

      {/* ── TAB: ULASAN PRODUK ──────────────────── */}
      {activeTab === "ulasan" && (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="glass-card dense-card p-6">
            <div className="admin-filter-card flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                  Cari Ulasan
                </label>
                <input
                  className="input-modern"
                  value={reviewSearch}
                  onChange={(event) => setReviewSearch(event.target.value)}
                  placeholder="Nama, nomor WA, atau isi ulasan"
                />
              </div>
              <div className="min-w-[180px] space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                  Status
                </label>
                <select
                  className="input-modern"
                  value={reviewStatusFilter}
                  onChange={(event) => setReviewStatusFilter(event.target.value)}
                >
                  {REVIEW_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewPage(1);
                  fetchReviews({ page: 1 });
                }}
                className="btn-primary !px-6 !py-2.5"
              >
                Terapkan
              </button>
            </div>

            <div className="admin-scroll-panel mt-4 max-h-[560px] space-y-4 overflow-auto pr-1">
              {loadingReviews && (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`review-skeleton-${index}`}
                      className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-2">
                          <div className="h-3 w-32 rounded-full skeleton" />
                          <div className="h-3 w-40 rounded-full skeleton" />
                        </div>
                        <div className="h-6 w-16 rounded-full skeleton" />
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="h-3 w-full rounded-full skeleton" />
                        <div className="h-3 w-5/6 rounded-full skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loadingReviews && reviews.length === 0 && (
                <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
                  Belum ada ulasan masuk.
                </div>
              )}
              {!loadingReviews &&
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-brand-900 dark:text-white">
                          {review.product?.name || "Produk"}
                        </p>
                        <p className="text-xs text-brand-500 dark:text-brand-400">
                          {review.reviewerName} • {review.reviewerPhone}
                        </p>
                        {review.order?.orderCode && (
                          <p className="text-[11px] text-brand-500 dark:text-brand-400">
                            Order: {review.order.orderCode}
                          </p>
                        )}
                      </div>
                      <span
                        className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${reviewStatusBadge(review.isApproved)}`}
                      >
                        {review.isApproved ? "Tayang" : "Menunggu"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-xs text-brand-500 dark:text-brand-400">
                        {formatDateTime(review.createdAt)}
                      </span>
                    </div>

                    {review.reviewText && (
                      <p className="mt-3 text-sm text-brand-700 dark:text-brand-300">
                        {review.reviewText}
                      </p>
                    )}

                    <div className="admin-review-actions mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewStatusToggle(review.id, !review.isApproved)}
                        className="min-h-[44px] rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:border-primary hover:text-primary dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                      >
                        {review.isApproved ? "Sembunyikan" : "Tayangkan"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review.id)}
                        className="min-h-[44px] rounded-xl border border-rose-500 bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:border-rose-600 hover:bg-rose-700 dark:border-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              {!loadingReviews && reviewPage < reviewMeta.totalPages && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => fetchReviews({ page: reviewPage + 1, append: true })}
                    disabled={isLoadingMoreReviews}
                    className="btn-outline !px-4 !py-2 text-xs disabled:opacity-60"
                  >
                    {isLoadingMoreReviews ? "Memuat..." : "Muat Ulasan Lainnya"}
                  </button>
                </div>
              )}
            </div>
          </article>

          <article className="glass-card dense-card p-6">
            <h3 className="text-lg font-bold text-brand-900 dark:text-white">
              Ringkasan Rating
            </h3>
            <div className="mt-4 space-y-2 text-sm text-brand-600 dark:text-brand-300">
              <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 dark:border-brand-700 dark:bg-brand-900/45">
                <span>Rata-rata Rating</span>
                <span className="font-semibold text-brand-900 dark:text-white">
                  {(Number(analytics?.metrics?.averageRating) || 0).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 dark:border-brand-700 dark:bg-brand-900/45">
                <span>Total Ulasan</span>
                <span className="font-semibold text-brand-900 dark:text-white">
                  {analytics?.metrics?.totalReviews ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 dark:border-brand-700 dark:bg-brand-900/45">
                <span>Ulasan Pending</span>
                <span className="font-semibold text-brand-900 dark:text-white">
                  {analytics?.metrics?.pendingReviews ?? 0}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
              Gunakan toggle untuk menayangkan atau menyembunyikan ulasan sebelum tampil di katalog publik.
            </div>
          </article>
        </section>
      )}

      {/* ── TAB: LAPORAN PEMASUKAN ──────────────────── */}
      {activeTab === "laporan" && (
        <>
          <section className="grid gap-6 pb-24 sm:pb-0">
          <article className="glass-card dense-card p-6">
            <div className="sm:hidden">
              <details className="admin-report-filter rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/45">
                <summary className="mobile-summary flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-brand-900 dark:text-white">
                    Filter Laporan
                  </span>
                  <svg
                    className="mobile-summary-icon h-5 w-5 text-brand-500 dark:text-brand-300"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                  </svg>
                </summary>
                <div className="mt-3 grid gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                      Mulai
                    </span>
                    <input
                      type="date"
                      className="input-modern"
                      value={reportFilters.startDate}
                      onChange={(event) =>
                        setReportFilters((prev) => ({ ...prev, startDate: event.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                      Sampai
                    </span>
                    <input
                      type="date"
                      className="input-modern"
                      value={reportFilters.endDate}
                      onChange={(event) =>
                        setReportFilters((prev) => ({ ...prev, endDate: event.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                      Status
                    </span>
                    <select
                      className="input-modern"
                      value={reportFilters.status}
                      onChange={(event) =>
                        setReportFilters((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      {REPORT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchRevenueReport()}
                    className="btn-primary !px-6 !py-2.5"
                  >
                    Terapkan
                  </button>
                </div>
              </details>
            </div>

            <div className="admin-filter-card hidden sm:flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                  Mulai
                </label>
                <input
                  type="date"
                  className="input-modern"
                  value={reportFilters.startDate}
                  onChange={(event) =>
                    setReportFilters((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </div>
              <div className="min-w-[180px] space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                  Sampai
                </label>
                <input
                  type="date"
                  className="input-modern"
                  value={reportFilters.endDate}
                  onChange={(event) =>
                    setReportFilters((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </div>
              <div className="min-w-[180px] space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                  Status
                </label>
                <select
                  className="input-modern"
                  value={reportFilters.status}
                  onChange={(event) =>
                    setReportFilters((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {REPORT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => fetchRevenueReport()}
                className="btn-primary !px-6 !py-2.5"
              >
                Terapkan
              </button>
              <button
                type="button"
                onClick={handleExportReport}
                disabled={!reportRows.length}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300"
              >
                Export Excel
              </button>
              <button
                type="button"
                onClick={handleSyncReportSheet}
                disabled={syncingSheet}
                className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:opacity-60 dark:border-sky-900/70 dark:bg-sky-900/20 dark:text-sky-200"
              >
                {syncingSheet ? "Syncing..." : "Sync Spreadsheet"}
              </button>
            </div>

            {sheetSyncInfo && (
              <div
                className={`mt-3 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold ${
                  sheetSyncInfo.type === "success"
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200"
                }`}
              >
                <span>{sheetSyncInfo.text}</span>
                {sheetSyncInfo.sheetUrl && (
                  <a
                    href={sheetSyncInfo.sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-current px-3 py-1 text-[11px] font-semibold hover:bg-white/70 dark:hover:bg-black/20"
                  >
                    Buka Spreadsheet
                  </a>
                )}
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                {
                  label: "Total Pemasukan",
                  value: formatRupiah(reportMeta?.totalRevenue ?? 0),
                },
                {
                  label: "Total Order",
                  value: reportMeta?.totalOrders ?? 0,
                },
                {
                  label: "Total Item Terjual",
                  value: reportMeta?.totalItems ?? 0,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-brand-200 bg-white/70 p-4 text-sm dark:border-brand-700 dark:bg-brand-900/45"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-brand-900 dark:text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-brand-200 dark:border-brand-700">
              {loadingReport ? (
                <div className="flex justify-center py-8">
                  <div className="h-9 w-9 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
                </div>
              ) : reportRows.length === 0 ? (
                <div className="p-6 text-center text-sm text-brand-600 dark:text-brand-400">
                  Belum ada data pemasukan.
                </div>
              ) : (
                <>
                  <div className="sm:hidden space-y-3 p-4">
                    {reportRows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-brand-200 bg-white/70 p-4 text-sm dark:border-brand-700 dark:bg-brand-900/45"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-brand-900 dark:text-white">
                              {row.orderCode}
                            </p>
                            <p className="text-xs text-brand-500 dark:text-brand-400">
                              {formatDateTime(row.createdAt)}
                            </p>
                          </div>
                          <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(row.status)}`}>
                            {mapOrderStatusLabel(row.status)}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-brand-500 dark:text-brand-400">
                          {row.customerName} • {row.customerPhone}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                          Total: {formatRupiah(row.totalAmount)}
                        </div>
                        <div className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                          {row.itemsSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-brand-50 text-xs uppercase tracking-[0.2em] text-brand-500 dark:bg-brand-900/50 dark:text-brand-400">
                        <tr>
                          <th className="px-4 py-3">Kode</th>
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Pelanggan</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Item</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportRows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-brand-100 text-brand-700 dark:border-brand-800 dark:text-brand-300"
                          >
                            <td className="px-4 py-3 font-semibold text-brand-900 dark:text-white">
                              {row.orderCode}
                            </td>
                            <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-brand-900 dark:text-white">
                                {row.customerName}
                              </div>
                              <div className="text-xs text-brand-500 dark:text-brand-400">
                                {row.customerPhone}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(row.status)}`}>
                                {mapOrderStatusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-brand-900 dark:text-white">
                              {formatRupiah(row.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-xs text-brand-500 dark:text-brand-400">
                              {row.itemsSummary}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

          </article>
          </section>
          <div className="admin-report-sticky sm:hidden">
            <div className="admin-report-surface">
              <button
                type="button"
                onClick={handleExportReport}
                disabled={!reportRows.length}
                className="admin-report-btn"
              >
                Export
              </button>
              <button
                type="button"
                onClick={handleSyncReportSheet}
                disabled={syncingSheet}
                className="admin-report-btn"
              >
                {syncingSheet ? "Syncing..." : "Sync"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: PENGATURAN ONGKIR ──────────────────── */}
      {activeTab === "ongkir" && (
        <section className="glass-card dense-card p-6">
          <h2 className="text-xl font-bold text-brand-900 dark:text-white">
            ⚙️ Pengaturan Ongkir
          </h2>
          <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
            Harga ongkir saat ini: <strong>{formatRupiah(shippingCost)}</strong>
          </p>
          <div className="mt-6 space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Harga Ongkir (Rp)
              </label>
              <input
                type="number"
                min="0"
                className="input-modern"
                value={shippingCostInput}
                onChange={(e) => setShippingCostInput(e.target.value)}
                placeholder="15000"
              />
              <p className="text-xs text-brand-500 dark:text-brand-400">
                Masukkan dalam satuan Rupiah (contoh: 15000 untuk Rp 15.000)
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveShipping}
              disabled={savingShipping}
              className="btn-primary !w-full !px-6 !py-3 disabled:opacity-60 font-semibold"
            >
              {savingShipping ? "🔄 Menyimpan..." : "✅ Simpan Pengaturan Ongkir"}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-700 dark:bg-brand-900/20">
            <p className="text-sm font-semibold text-brand-900 dark:text-white">
              📌 Informasi Pengaturan Ongkir
            </p>
            <ul className="mt-2 space-y-1 text-xs text-brand-600 dark:text-brand-400 list-disc list-inside">
              <li>Ongkir yang diset di sini akan otomatis ditambahkan ke setiap pesanan</li>
              <li>Pelanggan akan melihat biaya ongkir saat checkout</li>
              <li>Perubahan ongkir hanya mempengaruhi pesanan yang dibuat setelah disimpan</li>
              <li>Anggap ongkir sudah termasuk dalam total harga ketika negosiasi dengan kurir</li>
            </ul>
          </div>
        </section>
      )}

      {activeOrderSheet && (
        <div className="admin-sheet-backdrop sm:hidden" onClick={() => setActiveOrderSheet(null)} role="presentation">
          <div className="admin-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="admin-sheet-handle" />
            <div className="admin-sheet-header">
              <div>
                <p className="text-sm font-semibold text-brand-900 dark:text-white">
                  {activeOrderSheet.orderCode}
                </p>
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  {activeOrderSheet.customerName} • {activeOrderSheet.customerPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrderSheet(null)}
                className="admin-sheet-close"
              >
                Tutup
              </button>
            </div>
            <div className="admin-sheet-body">
              <div className="admin-sheet-meta">
                <span>{formatDateTime(activeOrderSheet.createdAt)}</span>
                <span>{activeOrderSheet.shippingMethod}</span>
                <span>{activeOrderSheet.paymentMethod}</span>
                <span className="font-semibold text-brand-900 dark:text-white">
                  {formatRupiah(activeOrderSheet.totalAmount)}
                </span>
              </div>
              {Array.isArray(activeOrderSheet.items) && activeOrderSheet.items.length > 0 && (
                <p className="mt-2 text-xs text-brand-500 dark:text-brand-400">
                  {activeOrderSheet.items.length} item • {activeOrderSheet.items.map((item) => `${item.productName} (${item.size} x${item.quantity})`).join(", ")}
                </p>
              )}
              <button
                type="button"
                onClick={() => printOrderLabel(activeOrderSheet)}
                className="mt-3 w-full rounded-xl border border-brand-200 bg-white/80 px-4 py-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200 dark:hover:bg-brand-800/40"
              >
                Print Resi
              </button>
              <div className="admin-sheet-options">
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      handleOrderStatusChange(activeOrderSheet.id, option.value);
                      setActiveOrderSheet(null);
                    }}
                    className={`admin-sheet-option ${activeOrderSheet.status === option.value ? "is-active" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageStorePage;
