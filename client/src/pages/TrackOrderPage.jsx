import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import PageHero from "../components/PageHero";
import StoreOrderProgress from "../components/StoreOrderProgress";
import StoreOrderInvoice from "../components/StoreOrderInvoice";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "../utils/storeOrderStatus";

const TRACKING_STORAGE_KEY = "gpt_tanjungpriok_last_order_tracking_v1";
const TRACK_SECTION_SHELL = "relative overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,248,0.92))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:border-emerald-900/40 dark:bg-[linear-gradient(180deg,rgba(8,16,12,0.94),rgba(6,12,9,0.92))] sm:p-6";
const TRACK_LABEL = "text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600/80 dark:text-emerald-200/70";
const TRACK_EMPTY_STEPS = [
  {
    key: "checkout",
    label: "Langkah 01",
    title: "Simpan kode order",
    description: "Kode pesanan muncul setelah checkout dan ikut dikirim lewat WhatsApp.",
  },
  {
    key: "phone",
    label: "Langkah 02",
    title: "Gunakan nomor yang sama",
    description: "Masukkan nomor WhatsApp yang dipakai saat pemesanan supaya data cocok.",
  },
  {
    key: "status",
    label: "Langkah 03",
    title: "Pantau progres order",
    description: "Setelah ketemu, status dan ringkasan order akan muncul di panel ini.",
  },
];

const OrderCodeIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="5" width="16" height="14" rx="3" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </svg>
);

const PhoneFieldIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6.8 3.8h2.5l1.4 3.8-1.8 1.8a14.2 14.2 0 0 0 5.7 5.7l1.8-1.8 3.8 1.4v2.5a1.8 1.8 0 0 1-1.9 1.8A15.5 15.5 0 0 1 5 5.7a1.8 1.8 0 0 1 1.8-1.9Z" />
  </svg>
);

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
  const initialOrderCode =
    searchParams.get("orderCode") ||
    searchParams.get("code") ||
    searchParams.get("order") ||
    "";
  const [form, setForm] = useState({
    orderCode: initialOrderCode,
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
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_60%)] blur-2xl" />
      <PageHero
        title="Lacak Pesanan"
        subtitle="Masukkan kode pesanan dan nomor WhatsApp untuk melihat progres order GTshirt"
        tone="dense"
      />

      <div className="page-stack relative grid gap-5 sm:gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="space-y-5">
          <article className={TRACK_SECTION_SHELL}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.06),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.08),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.03),transparent_58%)]" />
            <div className="relative">
            <p className={TRACK_LABEL}>
              Order Tracking
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
              Cek status pembelian
            </h2>
            <p className="mt-3 text-sm leading-7 text-brand-600 dark:text-brand-300">
              Gunakan kode pesanan yang Anda dapat setelah checkout dan nomor WhatsApp yang dipakai saat pemesanan.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                Realtime status
              </span>
              <span className="rounded-full border border-brand-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                Invoice siap
              </span>
            </div>

            <form onSubmit={handleTrackOrder} className="mt-5 space-y-4">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                  Kode Pesanan
                </span>
                <div className="input-leading-shell">
                  <OrderCodeIcon className="input-leading-icon" />
                  <input
                    className="input-modern !rounded-[1.15rem]"
                    placeholder="Kode pesanan, contoh GTS-20260310-0001"
                    value={form.orderCode}
                    onChange={(event) => handleFieldChange("orderCode", event.target.value.toUpperCase())}
                    required
                  />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                  WhatsApp
                </span>
                <div className="input-leading-shell">
                  <PhoneFieldIcon className="input-leading-icon" />
                  <input
                    className="input-modern !rounded-[1.15rem]"
                    placeholder="Nomor WhatsApp saat checkout"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(event) => handleFieldChange("phone", event.target.value)}
                    required
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full !rounded-[1.2rem] !py-3 disabled:opacity-60"
              >
                {loading ? "Melacak Pesanan..." : "Lacak Pesanan"}
              </button>
            </form>

            {error && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300">
                {error}
              </p>
            )}

            <div className="mt-5 rounded-[1.5rem] border border-brand-200 bg-white/[0.72] p-4 text-sm leading-7 text-brand-600 dark:border-brand-700 dark:bg-white/[0.03] dark:text-brand-300">
              Status order bergerak dari `Order Masuk` → `Dikonfirmasi` → `Dikemas`.
              Untuk kurir lanjut ke `Dalam Pengiriman` → `Selesai`, sedangkan ambil di gereja lanjut ke `Siap Diambil` → `Sudah Diambil`.
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700/80 dark:text-blue-200/80">
                Cara Menemukan Kode Pesanan
              </p>
              <ul className="mt-2 space-y-1">
                <li>• Kode pesanan muncul setelah checkout dan dikirim via WhatsApp.</li>
                <li>• Format kode: GTS-YYYYMMDD-XXXX (contoh: GTS-20260310-0001).</li>
                <li>• Jika belum ada, cek kembali chat konfirmasi atau hubungi admin GTshirt.</li>
              </ul>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.35rem] border border-brand-200/80 bg-white/[0.72] p-4 dark:border-brand-700 dark:bg-white/[0.03]">
                <p className={TRACK_LABEL}>Flow</p>
                <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                  Checkout cepat, tracking jelas.
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-brand-200/80 bg-white/[0.72] p-4 dark:border-brand-700 dark:bg-white/[0.03]">
                <p className={TRACK_LABEL}>Support</p>
                <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                  Cocok untuk kurir, pickup gereja, dan preorder komunitas.
                </p>
              </div>
            </div>
            </div>
          </article>
        </section>

        <section className="space-y-5">
          {!order ? (
            <article className={TRACK_SECTION_SHELL}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.1),transparent_35%)]" />
              <div className="relative">
                <div className="text-center lg:text-left">
                  <p className={TRACK_LABEL}>Preview Panel</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2rem]">
                    Belum ada data pesanan yang ditampilkan
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-brand-500 dark:text-brand-400 sm:text-base">
                    Setelah kode pesanan ditemukan, progres, ringkasan order, dan invoice akan muncul di area ini.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {TRACK_EMPTY_STEPS.map((step) => (
                    <article
                      key={step.key}
                      className="rounded-[1.45rem] border border-brand-200/80 bg-white/[0.72] p-4 text-left dark:border-brand-700 dark:bg-white/[0.03]"
                    >
                      <p className={TRACK_LABEL}>{step.label}</p>
                      <h3 className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                        {step.description}
                      </p>
                    </article>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center xl:justify-start">
                  <Link to="/shop" className="btn-primary !rounded-[1.2rem]">
                    Belanja GTshirt
                  </Link>
                  <Link
                    to="/cart"
                    className="btn-outline !rounded-[1.2rem]"
                  >
                    Ke Keranjang
                  </Link>
                </div>
              </div>
            </article>
          ) : (
            <>
              <article className={TRACK_SECTION_SHELL}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.1),transparent_34%)]" />
                <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={TRACK_LABEL}>
                      Kode Pesanan
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
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
                  <StoreOrderProgress status={order.status} shippingMethod={order.shippingMethod} />
                </div>
                </div>
              </article>

              <article className={TRACK_SECTION_SHELL}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_34%)]" />
                <div className="relative">
                <p className={TRACK_LABEL}>Customer Detail</p>
                <div className="mt-4 grid gap-3 text-sm text-brand-700 dark:text-brand-300 sm:grid-cols-2">
                  <p><span className="font-semibold text-brand-900 dark:text-white">Nama:</span> {order.customerName}</p>
                  <p><span className="font-semibold text-brand-900 dark:text-white">WhatsApp:</span> {order.customerPhone}</p>
                  <p><span className="font-semibold text-brand-900 dark:text-white">Pengiriman:</span> {order.shippingMethod}</p>
                  <p><span className="font-semibold text-brand-900 dark:text-white">Pembayaran:</span> {order.paymentMethod}</p>
                  <p className="sm:col-span-2"><span className="font-semibold text-brand-900 dark:text-white">Alamat:</span> {order.customerAddress}</p>
                  {order.notes && (
                    <p className="sm:col-span-2"><span className="font-semibold text-brand-900 dark:text-white">Catatan:</span> {order.notes}</p>
                  )}
                </div>
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
