import { useEffect, useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";

const ORDER_STATUS_OPTIONS = [
  { value: "new", label: "Baru" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "packed", label: "Dikemas" },
  { value: "shipping", label: "Dalam Pengiriman" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const REPORT_STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
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

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

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

function statusBadge(status) {
  const map = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    packed: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    shipping: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
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
  const parsed = String(text || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
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
  const [activeTab, setActiveTab] = useState("produk");

  // ── Product State ──────────────────────────
  const [productForm, setProductForm] = useState(() => createInitialProductForm());
  const [editingProductId, setEditingProductId] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
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
  const [reportFilters, setReportFilters] = useState({
    startDate: "",
    endDate: "",
    status: "completed",
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // Image upload state
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const fileInputRef = useRef(null);

  // Shipping cost state
  const [shippingCost, setShippingCost] = useState(15000);
  const [shippingCostInput, setShippingCostInput] = useState("15000");
  const [savingShipping, setSavingShipping] = useState(false);

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
    setLoadingOrders(true);
    try {
      const { data } = await api.get("/store/admin/orders", {
        params: {
          page: 1,
          limit: 20,
          search: overrides.search ?? orderSearch,
          status: overrides.status ?? orderStatusFilter,
        },
      });
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      setOrders([]);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat data order toko.",
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchReviews = async (overrides = {}) => {
    setLoadingReviews(true);
    try {
      const { data } = await api.get("/store/admin/reviews", {
        params: {
          page: 1,
          limit: 20,
          search: overrides.search ?? reviewSearch,
          status: overrides.status ?? reviewStatusFilter,
        },
      });
      setReviews(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      setReviews([]);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat ulasan produk.",
      });
    } finally {
      setLoadingReviews(false);
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

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const { data } = await api.get("/store/admin/analytics");
      setAnalytics(data || null);
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
    fetchProducts();
    fetchOrders();
    fetchReviews();
    fetchAnalytics();
    fetchShippingSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "laporan") {
      fetchRevenueReport();
    }
  }, [activeTab]);

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

  const productFormSizes = useMemo(
    () => normalizeSizePayload(productForm.sizesText),
    [productForm.sizesText],
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

  // ── Product form ─────────────────────────────
  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(createInitialProductForm());
    clearImages();
  };

  const fillProductForm = (product) => {
    const sizes = Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes.map((size) => String(size).toUpperCase())
      : [...DEFAULT_SIZES];
    const stockBySize = normalizeStockBySizeMap(product.stockBySize, sizes);

    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      slug: product.slug || "",
      description: product.description || "",
      color: product.color || "",
      basePrice: product.basePrice || 0,
      sizesText: sizes.join(", "),
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

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setFeedback({ type: "", text: "" });

    const totalImages = existingImages.length + imageFiles.length;
    if (totalImages === 0) {
      setFeedback({ type: "error", text: "Minimal 1 foto produk wajib diupload." });
      setSavingProduct(false);
      return;
    }

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

  const handleDeactivateProduct = async (product) => {
    const confirmed = window.confirm(`Nonaktifkan produk "${product.name}" dari katalog?`);
    if (!confirmed) return;

    setFeedback({ type: "", text: "" });
    try {
      await api.delete(`/store/admin/products/${product.id}`);
      setFeedback({ type: "success", text: "Produk berhasil dinonaktifkan." });
      await Promise.all([fetchProducts(), fetchAnalytics()]);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menonaktifkan produk.",
      });
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      await api.patch(`/store/admin/orders/${orderId}/status`, { status });
      await Promise.all([fetchOrders(), fetchAnalytics()]);
      setFeedback({ type: "success", text: "Status order berhasil diperbarui." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memperbarui status order.",
      });
    }
  };

  const handleClearOrders = async () => {
    const confirmed = window.confirm(
      "Hapus semua pesanan? Data pesanan dan item akan dihapus permanen.",
    );
    if (!confirmed) return;
    try {
      await api.post("/store/admin/orders/reset");
      setFeedback({ type: "success", text: "Semua pesanan berhasil dihapus." });
      await Promise.all([fetchOrders(), fetchAnalytics()]);
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menghapus semua pesanan.",
      });
    }
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

  return (
    <div className="page-stack admin-shell space-y-6">
      <section className="glass-card overflow-hidden p-0">
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
            <article key={item.label} className="glass-card p-5">
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
      <div className="flex gap-2 border-b border-brand-200 dark:border-brand-700">
        <button
          onClick={() => setActiveTab("produk")}
          className={`px-4 py-3 font-semibold transition relative ${
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
          className={`px-4 py-3 font-semibold transition relative ${
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
          onClick={() => setActiveTab("ulasan")}
          className={`px-4 py-3 font-semibold transition relative ${
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
          className={`px-4 py-3 font-semibold transition relative ${
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
          className={`px-4 py-3 font-semibold transition relative ${
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
          <article className="glass-card p-6">
            <h2 className="text-xl font-bold text-brand-900 dark:text-white">
              {editingProductId ? "Edit Produk GTshirt" : "Tambah Produk GTshirt"}
            </h2>

            <form onSubmit={handleSaveProduct} className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Nama Produk *
              </label>
              <input
                required
                className="input-modern"
                value={productForm.name}
                onChange={(event) => handleProductFormChange("name", event.target.value)}
                placeholder="Contoh: Hope in Him Tee"
              />
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
                className="input-modern min-h-[86px] resize-y"
                value={productForm.description}
                onChange={(event) => handleProductFormChange("description", event.target.value)}
                placeholder="Deskripsi produk"
              />
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

            {/* ── Image Upload Section ────────────────── */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                📷 Foto Produk * (max 8 file, jpeg/png/webp, maks 2MB per file)
              </label>

              {/* Drop zone */}
              <div
                className="relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-4 transition hover:border-primary hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-900/30 dark:hover:border-primary"
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
                          className="h-20 w-20 rounded-xl border border-brand-200 object-cover dark:border-brand-700"
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
                      <div key={`new-${index}`} className="group relative">
                        <img
                          src={src}
                          alt={`Preview ${index + 1}`}
                          className="h-20 w-20 rounded-xl border border-brand-200 object-cover dark:border-brand-700"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Harga Dasar
              </label>
              <input
                type="number"
                min="0"
                className="input-modern"
                value={productForm.basePrice}
                onChange={(event) => handleProductFormChange("basePrice", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Ukuran (pisahkan koma)
              </label>
              <input
                className="input-modern"
                value={productForm.sizesText}
                onChange={(event) => handleProductFormChange("sizesText", event.target.value)}
                placeholder="S, M, L, XL, XXL"
              />
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

            <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300">
              <input
                type="checkbox"
                checked={productForm.isActive}
                onChange={(event) => handleProductFormChange("isActive", event.target.checked)}
              />
              Produk aktif ditampilkan di katalog
            </label>

            <div className="md:col-span-2 flex flex-wrap gap-3">
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
          </form>
        </article>

        <article className="glass-card p-6">
          <div className="flex flex-wrap items-end gap-3">
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

          <div className="mt-4 max-h-[560px] space-y-3 overflow-auto pr-1">
            {loadingProducts && (
              <div className="flex justify-center py-8">
                <div className="h-9 w-9 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
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
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
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
                    <span>Size: {Array.isArray(product.sizes) ? product.sizes.join("/") : "-"}</span>
                    <span>Foto: {Array.isArray(product.imageUrls) ? product.imageUrls.length : 0}</span>
                  </div>
                  {product.stockBySize && (
                    <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                      Stok per ukuran: {Object.entries(product.stockBySize)
                        .map(([size, qty]) => `${String(size).toUpperCase()}=${Number(qty) || 0}`)
                        .join(" • ")}
                    </p>
                  )}
                  {product.promoIsActive && (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      Promo aktif: {product.promoLabel}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillProductForm(product)}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivateProduct(product)}
                      className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600"
                    >
                      Nonaktifkan
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </article>
      </section>
      )}

      {/* ── TAB: PESANAN MASUK ──────────────────── */}
      {activeTab === "pesanan" && (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-card p-6">
          <div className="flex flex-wrap items-end gap-3">
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
              onClick={() => fetchOrders()}
              className="btn-primary !px-6 !py-2.5"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={handleClearOrders}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300"
            >
              Reset Semua Pesanan
            </button>
          </div>

          <div className="mt-4 max-h-[560px] space-y-3 overflow-auto pr-1">
            {loadingOrders && (
              <div className="flex justify-center py-8">
                <div className="h-9 w-9 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
              </div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
                Belum ada order masuk.
              </div>
            )}
            {!loadingOrders &&
              orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
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
                  </div>
                </div>
              ))}
          </div>
        </article>

        <article className="glass-card p-6">
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

      {/* ── TAB: ULASAN PRODUK ──────────────────── */}
      {activeTab === "ulasan" && (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="glass-card p-6">
            <div className="flex flex-wrap items-end gap-3">
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
                onClick={() => fetchReviews()}
                className="btn-primary !px-6 !py-2.5"
              >
                Terapkan
              </button>
            </div>

            <div className="mt-4 max-h-[560px] space-y-3 overflow-auto pr-1">
              {loadingReviews && (
                <div className="flex justify-center py-8">
                  <div className="h-9 w-9 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
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
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reviewStatusBadge(review.isApproved)}`}
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

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewStatusToggle(review.id, !review.isApproved)}
                        className="rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:border-primary hover:text-primary dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                      >
                        {review.isApproved ? "Sembunyikan" : "Tayangkan"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </article>

          <article className="glass-card p-6">
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
        <section className="grid gap-6">
          <article className="glass-card p-6">
            <div className="flex flex-wrap items-end gap-3">
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
            </div>

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

            <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-200 dark:border-brand-700">
              {loadingReport ? (
                <div className="flex justify-center py-8">
                  <div className="h-9 w-9 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
                </div>
              ) : reportRows.length === 0 ? (
                <div className="p-6 text-center text-sm text-brand-600 dark:text-brand-400">
                  Belum ada data pemasukan.
                </div>
              ) : (
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
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(row.status)}`}>
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
              )}
            </div>
          </article>
        </section>
      )}

      {/* ── TAB: PENGATURAN ONGKIR ──────────────────── */}
      {activeTab === "ongkir" && (
        <section className="glass-card p-6">
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
    </div>
  );
}

export default ManageStorePage;
