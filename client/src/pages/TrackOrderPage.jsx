import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import PageHero from "../components/PageHero";
import StoreOrderProgress from "../components/StoreOrderProgress";
import StoreOrderInvoice from "../components/StoreOrderInvoice";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "../utils/storeOrderStatus";
import heroImage from "../img/store/for-all-my-hope-is-in-him.png";

const TRACKING_STORAGE_KEY = "gpt_tanjungpriok_last_order_tracking_v1";

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

function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    orderCode: searchParams.get("orderCode") || "",
    phone: "",
  });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(TRACKING_STORAGE_KEY) || "null");
      if (!saved) return;

      setForm((previous) => ({
        orderCode: previous.orderCode || saved.orderCode || "",
        phone: saved.phone || "",
      }));
    } catch {
      // noop
    }
  }, []);

  const handleFieldChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
  };

  const handleTrackOrder = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/store/orders/track", {
        params: {
          orderCode: form.orderCode.trim(),
          phone: form.phone.trim(),
        },
      });

      setOrder(data?.data || null);
      window.localStorage.setItem(
        TRACKING_STORAGE_KEY,
        JSON.stringify({
          orderCode: form.orderCode.trim(),
          phone: form.phone.trim(),
        }),
      );
    } catch (err) {
      setOrder(null);
      setError(err?.response?.data?.message || "Pesanan tidak berhasil ditemukan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero
        title="Lacak Pesanan"
        subtitle="Masukkan kode pesanan dan nomor WhatsApp untuk melihat progres order GTshirt"
        image={heroImage}
      />

      <div className="page-stack grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-5">
          <article className="glass-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
              Order Tracking
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 dark:text-white">
              Cek status pembelian
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-600 dark:text-brand-300">
              Gunakan kode pesanan yang Anda dapat setelah checkout dan nomor WhatsApp yang dipakai saat pemesanan.
            </p>

            <form onSubmit={handleTrackOrder} className="mt-5 space-y-3">
              <input
                className="input-modern"
                placeholder="Kode pesanan, contoh GTS-20260310-0001"
                value={form.orderCode}
                onChange={(event) => handleFieldChange("orderCode", event.target.value.toUpperCase())}
                required
              />
              <input
                className="input-modern"
                placeholder="Nomor WhatsApp saat checkout"
                value={form.phone}
                onChange={(event) => handleFieldChange("phone", event.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full !py-3 disabled:opacity-60"
              >
                {loading ? "Melacak Pesanan..." : "Lacak Pesanan"}
              </button>
            </form>

            {error && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300">
                {error}
              </p>
            )}

            <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/70 p-4 text-sm text-brand-600 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              Status order akan bergerak dari `Order Masuk` ke `Dikonfirmasi`, lalu `Dikemas`, dan terakhir `Selesai`.
            </div>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700/80 dark:text-blue-200/80">
                Cara Menemukan Kode Pesanan
              </p>
              <ul className="mt-2 space-y-1">
                <li>• Kode pesanan muncul setelah checkout dan dikirim via WhatsApp.</li>
                <li>• Format kode: GTS-YYYYMMDD-XXXX (contoh: GTS-20260310-0001).</li>
                <li>• Jika belum ada, cek kembali chat konfirmasi atau hubungi admin GTshirt.</li>
              </ul>
            </div>
          </article>
        </section>

        <section className="space-y-5">
          {!order ? (
            <article className="glass-card p-8 text-center">
              <p className="text-lg font-semibold text-brand-800 dark:text-brand-200">
                Belum ada data pesanan yang ditampilkan
              </p>
              <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
                Setelah kode pesanan ditemukan, progres dan ringkasan order akan muncul di sini.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link to="/shop" className="btn-primary">
                  Belanja GTshirt
                </Link>
                <Link
                  to="/cart"
                  className="btn-outline"
                >
                  Ke Keranjang
                </Link>
              </div>
            </article>
          ) : (
            <>
              <article className="glass-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Kode Pesanan
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-brand-900 dark:text-white">
                      {order.orderCode}
                    </h2>
                    <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
                      Dibuat {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <span className={`status-pill rounded-full px-3 py-1.5 text-xs font-semibold ${ORDER_STATUS_BADGE[order.status] || ORDER_STATUS_BADGE.new}`}>
                    {ORDER_STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                <div className="mt-6">
                  <StoreOrderProgress status={order.status} />
                </div>
              </article>

              <article className="glass-card p-6">
                <div className="grid gap-3 text-sm text-brand-700 dark:text-brand-300 sm:grid-cols-2">
                  <p><span className="font-semibold text-brand-900 dark:text-white">Nama:</span> {order.customerName}</p>
                  <p><span className="font-semibold text-brand-900 dark:text-white">WhatsApp:</span> {order.customerPhone}</p>
                  <p><span className="font-semibold text-brand-900 dark:text-white">Pengiriman:</span> {order.shippingMethod}</p>
                  <p><span className="font-semibold text-brand-900 dark:text-white">Pembayaran:</span> {order.paymentMethod}</p>
                  <p className="sm:col-span-2"><span className="font-semibold text-brand-900 dark:text-white">Alamat:</span> {order.customerAddress}</p>
                  {order.notes && (
                    <p className="sm:col-span-2"><span className="font-semibold text-brand-900 dark:text-white">Catatan:</span> {order.notes}</p>
                  )}
                </div>
              </article>

              <StoreOrderInvoice order={order} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default TrackOrderPage;
