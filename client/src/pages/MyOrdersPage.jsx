import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PageHero from "../components/PageHero";
import StoreOrderProgress from "../components/StoreOrderProgress";
import StoreOrderInvoice from "../components/StoreOrderInvoice";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "../utils/storeOrderStatus";

const ORDER_FILTERS = [
  { value: "active", label: "Perlu Dipantau" },
  { value: "completed", label: "Selesai" },
  { value: "all", label: "Semua" },
];

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

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [orderFilter, setOrderFilter] = useState("active");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");

  const fetchMyOrders = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/store/my-orders", {
        params: {
          page: 1,
          limit: 50,
          ...(search ? { search } : {}),
        },
      });
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setOrders([]);
      setError(err?.response?.data?.message || "Gagal memuat data pesanan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    fetchMyOrders(searchQuery);
  }, [searchQuery]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "completed" && order.status !== "cancelled"),
    [orders],
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "completed" || order.status === "cancelled"),
    [orders],
  );

  const totalSpent = useMemo(
    () => orders.reduce((total, order) => total + (Number(order.totalAmount) || 0), 0),
    [orders],
  );

  const totalItems = useMemo(
    () =>
      orders.reduce(
        (total, order) =>
          total +
          (Array.isArray(order.items)
            ? order.items.reduce((itemTotal, item) => itemTotal + (Number(item.quantity) || 0), 0)
            : 0),
        0,
      ),
    [orders],
  );

  const latestActiveOrder = useMemo(() => activeOrders[0] || null, [activeOrders]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "active") return activeOrders;
    if (orderFilter === "completed") return completedOrders;
    return orders;
  }, [activeOrders, completedOrders, orderFilter, orders]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Total Pesanan",
        value: String(orders.length),
        helper: "Semua order yang tercatat di akun Anda",
      },
      {
        label: "Perlu Dipantau",
        value: String(activeOrders.length),
        helper: "Order yang belum selesai atau belum dibatalkan",
      },
      {
        label: "Total Belanja",
        value: formatRupiah(totalSpent),
        helper: "Akumulasi seluruh pembayaran yang pernah masuk",
      },
      {
        label: "Total Item",
        value: String(totalItems),
        helper: "Jumlah barang dari seluruh transaksi",
      },
    ],
    [activeOrders.length, orders.length, totalItems, totalSpent],
  );

  const handleCopyOrderCode = async (orderCode) => {
    if (!orderCode || typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(orderCode);
      setCopyFeedback(`Kode ${orderCode} berhasil disalin.`);
      window.setTimeout(() => setCopyFeedback(""), 2500);
    } catch {
      setCopyFeedback("Browser tidak bisa menyalin kode pesanan.");
    }
  };

  const emptyMessage = searchQuery
    ? `Tidak ada pesanan yang cocok dengan pencarian "${searchQuery}".`
    : orders.length === 0
      ? "Belum ada pesanan"
      : orderFilter === "active"
        ? "Belum ada pesanan aktif"
        : orderFilter === "completed"
          ? "Belum ada pesanan selesai"
          : "Belum ada pesanan";

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(circle,rgba(16,185,129,0.14),transparent_62%)] blur-2xl" />
      <PageHero
        title="Pesanan Saya"
        subtitle="Pantau order aktif, cek invoice, dan cari pesanan lama tanpa perlu chat admin."
        tone="dense"
      />

      <div className="page-stack relative space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-brand-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,250,247,0.94))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:border-brand-700 dark:bg-[linear-gradient(135deg,rgba(8,16,12,0.95),rgba(9,18,14,0.92))] sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article
                key={card.label}
                className="rounded-[1.4rem] border border-brand-200/70 bg-white/90 p-4 dark:border-brand-700 dark:bg-white/[0.03]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                  {card.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-brand-500 dark:text-brand-400">
                  {card.helper}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                Cari Pesanan
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari kode order, nama, atau nomor WhatsApp"
                className="input-modern !rounded-[1.15rem]"
              />
            </label>
            <button
              type="button"
              onClick={() => fetchMyOrders(searchQuery)}
              className="min-h-[48px] rounded-[1.15rem] border border-brand-300 bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40 xl:self-end"
            >
              Refresh Data
            </button>
            <Link
              to="/shop"
              className="flex min-h-[48px] items-center justify-center rounded-[1.15rem] bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 xl:self-end"
            >
              Belanja Lagi
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ORDER_FILTERS.map((option) => {
              const count =
                option.value === "active"
                  ? activeOrders.length
                  : option.value === "completed"
                    ? completedOrders.length
                    : orders.length;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOrderFilter(option.value)}
                  className={`min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                    orderFilter === option.value
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-brand-200 text-brand-700 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-200 dark:hover:bg-brand-800/40"
                  }`}
                >
                  {option.label} ({count})
                </button>
              );
            })}
          </div>

          {latestActiveOrder && (
            <div className="mt-5 rounded-[1.6rem] border border-emerald-200/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.88),rgba(255,255,255,0.95))] p-4 dark:border-emerald-900/40 dark:bg-[linear-gradient(135deg,rgba(6,24,16,0.95),rgba(10,18,14,0.9))]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                    Order Aktif Terbaru
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                    {latestActiveOrder.orderCode}
                  </h2>
                  <p className="mt-2 text-sm text-brand-600 dark:text-brand-300">
                    Dibuat {formatDateTime(latestActiveOrder.createdAt)} • {ORDER_STATUS_LABEL[latestActiveOrder.status] || latestActiveOrder.status}
                  </p>
                </div>
                <span
                  className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${
                    ORDER_STATUS_BADGE[latestActiveOrder.status] || ORDER_STATUS_BADGE.new
                  }`}
                >
                  {ORDER_STATUS_LABEL[latestActiveOrder.status] || latestActiveOrder.status}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-brand-700 dark:text-brand-300 sm:grid-cols-3">
                <p>Total: {formatRupiah(latestActiveOrder.totalAmount)}</p>
                <p>Metode: {latestActiveOrder.shippingMethod || "-"}</p>
                <p>Pembayaran: {latestActiveOrder.paymentMethod || "-"}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={`/track-order?orderCode=${encodeURIComponent(latestActiveOrder.orderCode)}&phone=${encodeURIComponent(latestActiveOrder.customerPhone || "")}`}
                  className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                >
                  Buka Tracking
                </Link>
                <button
                  type="button"
                  onClick={() => handleCopyOrderCode(latestActiveOrder.orderCode)}
                  className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 dark:bg-white dark:text-brand-900 dark:hover:bg-brand-100"
                >
                  Salin Kode
                </button>
              </div>
            </div>
          )}
        </section>

        {copyFeedback && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300">
            {copyFeedback}
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </section>
        )}

        {loading ? (
          <section className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-200 border-t-primary" />
          </section>
        ) : filteredOrders.length === 0 ? (
          <section className="rounded-[2rem] border border-brand-200 bg-white/80 p-10 text-center dark:border-brand-700 dark:bg-brand-900/40">
            <p className="text-base font-semibold text-brand-800 dark:text-brand-200">{emptyMessage}</p>
            <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
              Pesanan checkout akan muncul di sini dan bisa langsung dilacak tanpa isi form lagi.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/shop" className="btn-primary inline-block">
                Mulai Belanja
              </Link>
              <Link
                to="/track-order"
                className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
              >
                Cek Tracking Manual
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {filteredOrders.map((order) => {
              const itemCount = Array.isArray(order.items)
                ? order.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
                : 0;

              return (
                <article
                  key={order.id}
                  className="rounded-[2rem] border border-brand-200 bg-white/90 p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/50 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-brand-900 dark:text-white">
                        {order.orderCode}
                      </p>
                      <p className="text-xs text-brand-500 dark:text-brand-400">
                        Dibuat: {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ORDER_STATUS_BADGE[order.status] || ORDER_STATUS_BADGE.new
                      }`}
                    >
                      {ORDER_STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      { label: "Pengiriman", value: order.shippingMethod || "-" },
                      { label: "Pembayaran", value: order.paymentMethod || "-" },
                      { label: "Tanggal", value: formatShortDate(order.createdAt) },
                      { label: "Total Item", value: `${itemCount} barang` },
                      { label: "Total Bayar", value: formatRupiah(order.totalAmount), accent: true },
                    ].map((detail) => (
                      <div
                        key={`${order.id}-${detail.label}`}
                        className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                          {detail.label}
                        </p>
                        <p
                          className={`mt-2 text-sm font-semibold ${
                            detail.accent
                              ? "text-primary"
                              : "text-brand-800 dark:text-brand-200"
                          }`}
                        >
                          {detail.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {Array.isArray(order.items) && order.items.length > 0 && (
                    <div className="mt-4 rounded-[1.35rem] border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-700 dark:bg-brand-900/30">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500 dark:text-brand-400">
                          Ringkasan Barang
                        </p>
                        <p className="text-xs text-brand-500 dark:text-brand-400">
                          {itemCount} item
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-white/70 bg-white/90 px-3 py-2.5 dark:border-brand-800 dark:bg-brand-950/30"
                          >
                            <div>
                              {item.productSlug ? (
                                <Link
                                  to={`/shop/${item.productSlug}`}
                                  className="text-sm font-semibold text-brand-800 transition hover:text-primary dark:text-brand-200"
                                >
                                  {item.productName}
                                </Link>
                              ) : (
                                <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
                                  {item.productName}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                                Size {item.size} • Qty {item.quantity} • {item.color || "Warna default"}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                              {formatRupiah(item.lineTotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <StoreOrderProgress status={order.status} shippingMethod={order.shippingMethod} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/track-order?orderCode=${encodeURIComponent(order.orderCode)}&phone=${encodeURIComponent(order.customerPhone || "")}`}
                      className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                    >
                      Lacak Detail
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCopyOrderCode(order.orderCode)}
                      className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                    >
                      Salin Kode
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInvoiceId((previous) => (previous === order.id ? null : order.id))
                      }
                      className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 dark:bg-white dark:text-brand-900 dark:hover:bg-brand-100"
                    >
                      {expandedInvoiceId === order.id ? "Tutup Invoice" : "Lihat Invoice"}
                    </button>
                  </div>

                  {expandedInvoiceId === order.id && (
                    <div className="mt-4">
                      <StoreOrderInvoice order={order} />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}

export default MyOrdersPage;
