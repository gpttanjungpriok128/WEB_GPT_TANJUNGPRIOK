import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PageHero from "../components/PageHero";
import StoreOrderProgress from "../components/StoreOrderProgress";
import StoreOrderInvoice from "../components/StoreOrderInvoice";
import heroImage from "../img/store/you-are-the-light.png";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "../utils/storeOrderStatus";

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

function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);

  const fetchMyOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/store/my-orders", {
        params: { page: 1, limit: 50 },
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
    fetchMyOrders();
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "completed" && order.status !== "cancelled"),
    [orders],
  );

  return (
    <div>
      <PageHero
        title="Pesanan Saya"
        subtitle="Riwayat pesanan Anda dan status konfirmasi admin"
        image={heroImage}
      />

      <div className="page-stack space-y-5">
        <section className="rounded-2xl border border-brand-200 bg-white/85 p-4 dark:border-brand-700 dark:bg-brand-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
                Total pesanan: {orders.length}
              </p>
              <p className="text-xs text-brand-500 dark:text-brand-400">
                Pesanan aktif: {activeOrders.length} • Estimasi pre-order 5 hari kerja setelah konfirmasi.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchMyOrders}
                className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
              >
                Refresh
              </button>
              <Link
                to="/shop"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Belanja Lagi
              </Link>
              <Link
                to="/track-order"
                className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
              >
                Lacak Pesanan
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </section>
        )}

        {loading ? (
          <section className="flex justify-center py-16">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </section>
        ) : orders.length === 0 ? (
          <section className="rounded-2xl border border-brand-200 bg-white/80 p-10 text-center dark:border-brand-700 dark:bg-brand-900/40">
            <p className="text-base font-semibold text-brand-800 dark:text-brand-200">
              Belum ada pesanan
            </p>
            <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
              Pesanan yang sudah checkout akan muncul di halaman ini.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/shop" className="btn-primary inline-block">
                Mulai Belanja
              </Link>
              <Link to="/track-order" className="btn-outline inline-block">
                Lacak Pesanan
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border border-brand-200 bg-white/90 p-4 dark:border-brand-700 dark:bg-brand-900/50"
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
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_BADGE[order.status] || ORDER_STATUS_BADGE.new}`}>
                    {ORDER_STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-brand-600 dark:text-brand-300 sm:grid-cols-2">
                  <p>Pengiriman: {order.shippingMethod || "-"}</p>
                  <p>Pembayaran: {order.paymentMethod || "-"}</p>
                  <p>Subtotal: {formatRupiah(order.subtotal)}</p>
                  <p>Ongkir: {formatRupiah(order.shippingCost)}</p>
                  <p className="sm:col-span-2 font-semibold text-primary">
                    Total: {formatRupiah(order.totalAmount)}
                  </p>
                </div>

                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                      Item Pesanan
                    </p>
                    <div className="mt-2 space-y-1">
                      {order.items.map((item) => (
                        <p key={item.id} className="text-sm text-brand-700 dark:text-brand-300">
                          {item.productName} • Size {item.size} • Qty {item.quantity}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <StoreOrderProgress status={order.status} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/track-order?orderCode=${encodeURIComponent(order.orderCode)}`}
                    className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                  >
                    Lacak Detail
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpandedInvoiceId((previous) => previous === order.id ? null : order.id)}
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
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export default MyOrdersPage;
