import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../services/api";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
import jsQR from "jsqr";
import AdminStoreTabs from "../components/store-admin/AdminStoreTabs";
import ProductsTab from "../components/store-admin/ProductsTab";
import OrdersTab from "../components/store-admin/OrdersTab";
import ScanTab from "../components/store-admin/ScanTab";
import ReviewsTab from "../components/store-admin/ReviewsTab";
import ReportsTab from "../components/store-admin/ReportsTab";
import ShippingTab from "../components/store-admin/ShippingTab";

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

  const productTabCtx = {
    editingProductId,
    handleSaveProduct,
    productAccordion,
    toggleAccordion,
    productForm,
    productFieldErrors,
    nameInputRef,
    descriptionInputRef,
    basePriceInputRef,
    sizesInputRef,
    productFormSizes,
    productFormStockBySize,
    productFormTotalStock,
    productFormHasPreorderSizes,
    handleProductFormChange,
    handleStockBySizeChange,
    normalizeSizePayload,
    fileInputRef,
    imageDropRef,
    handleDropFiles,
    handleFileInputChange,
    existingImages,
    imagePreviews,
    removeExistingImage,
    removeNewImage,
    handlePreviewDragStart,
    handlePreviewDragOver,
    handlePreviewDrop,
    handlePreviewDragEnd,
    movePreview,
    savingProduct,
    resetProductForm,
    products,
    loadingProducts,
    productSearch,
    setProductSearch,
    productActiveFilter,
    setProductActiveFilter,
    PRODUCT_ACTIVE_OPTIONS,
    fetchProducts,
    fillProductForm,
    handleToggleProductStatus,
    handleDeleteProduct,
    resolveImageUrl,
    formatRupiah,
    filterOutXXL,
    normalizeSizeLabel,
  };

  const ordersTabCtx = {
    orderSearch,
    setOrderSearch,
    orderStatusFilter,
    setOrderStatusFilter,
    setOrderPage,
    fetchOrders,
    handleClearOrders,
    selectAllOrders,
    clearSelectedOrders,
    bulkStatus,
    setBulkStatus,
    handleBulkStatusUpdate,
    printOrderLabels,
    selectedOrders,
    selectedOrderIds,
    orderListRef,
    setOrderScrollTop,
    loadingOrders,
    orders,
    orderPage,
    orderMeta,
    isLoadingMoreOrders,
    useVirtualOrders,
    orderPaddingTop,
    orderPaddingBottom,
    visibleOrders,
    orderRowMeasureRef,
    toggleOrderSelection,
    handleQuickOrderAction,
    setActiveOrderSheet,
    handleOrderStatusChange,
    printOrderLabel,
    statusBadge,
    mapOrderStatusLabel,
    formatDateTime,
    formatRupiah,
    ORDER_STATUS_OPTIONS,
    getQuickActionForOrder,
    analytics,
    setActiveTab,
    setScanError,
  };

  const scanTabCtx = {
    qrVideoRef,
    isScannerActive,
    scanStatus,
    scanError,
    setScanError,
    setScanStatus,
    setScanSession,
    toggleTorch,
    torchSupported,
    torchEnabled,
    setActiveTab,
    lastScannedCode,
    lastScannedAt,
    lastScannedMode,
    lastScannedStatus,
    formatDateTime,
  };

  const reviewsTabCtx = {
    reviewSearch,
    setReviewSearch,
    reviewStatusFilter,
    setReviewStatusFilter,
    setReviewPage,
    fetchReviews,
    loadingReviews,
    reviews,
    reviewPage,
    reviewMeta,
    isLoadingMoreReviews,
    REVIEW_STATUS_OPTIONS,
    reviewStatusBadge,
    renderStars,
    formatDateTime,
    handleReviewStatusToggle,
    handleDeleteReview,
    analytics,
  };

  const reportsTabCtx = {
    reportFilters,
    setReportFilters,
    REPORT_STATUS_OPTIONS,
    fetchRevenueReport,
    handleExportReport,
    handleSyncReportSheet,
    syncingSheet,
    sheetSyncInfo,
    reportRows,
    reportMeta,
    loadingReport,
    formatRupiah,
    formatDateTime,
    statusBadge,
    mapOrderStatusLabel,
  };

  const shippingTabCtx = {
    shippingCost,
    shippingCostInput,
    setShippingCostInput,
    handleSaveShipping,
    savingShipping,
    formatRupiah,
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

      <section className="admin-metric-strip">
        {loadingAnalytics && (
          <div className="col-span-full flex justify-center py-8">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </div>
        )}
        {!loadingAnalytics &&
          metricCards.map((item) => (
            <article key={item.label} className="admin-metric-card glass-card dense-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                {item.label}
              </p>
              <p className="admin-metric-value mt-2 text-2xl font-bold gradient-text">
                {item.value}
              </p>
            </article>
          ))}
      </section>

      {/* ── Tab Navigation ──────────────────────── */}
      <AdminStoreTabs activeTab={activeTab} setActiveTab={setActiveTab} tabHidden={tabHidden} />

      {/* ── TAB: PRODUK GTSHIRT ──────────────────── */}
      {activeTab === "produk" && <ProductsTab ctx={productTabCtx} />}

      {/* ── TAB: PESANAN MASUK ──────────────────── */}
      {activeTab === "pesanan" && <OrdersTab ctx={ordersTabCtx} />}

      {/* ── TAB: SCAN RESI ──────────────────── */}
      {activeTab === "scan" && <ScanTab ctx={scanTabCtx} />}

      {/* ── TAB: ULASAN PRODUK ──────────────────── */}
      {activeTab === "ulasan" && <ReviewsTab ctx={reviewsTabCtx} />}

      {/* ── TAB: LAPORAN PEMASUKAN ──────────────────── */}
      {activeTab === "laporan" && <ReportsTab ctx={reportsTabCtx} />}

      {/* ── TAB: PENGATURAN ONGKIR ──────────────────── */}
      {activeTab === "ongkir" && <ShippingTab ctx={shippingTabCtx} />}

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
