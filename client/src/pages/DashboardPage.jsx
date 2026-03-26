import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import api from "../services/api";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "../utils/storeOrderStatus";
import "../styles.admin.css";

const ROLE_LABELS = {
  admin: "Admin",
  multimedia: "Multimedia",
  jemaat: "Jemaat",
};

const ROLE_CAPABILITIES = {
  admin: [
    "Membuat dan menerbitkan renungan langsung",
    "Review renungan yang diajukan tim multimedia",
    "Menangani order, stok, promo, dan laporan GTshirt",
    "Melihat prayer request dan follow-up jemaat",
    "Mengelola pendataan jemaat serta statistik ringkas",
  ],
  multimedia: [
    "Membuat draft renungan dan mengirimkan untuk approval",
    "Mengelola galeri dan konten multimedia gereja",
    "Mengatur link live streaming dan kebutuhan siaran",
  ],
  jemaat: [
    "Membaca renungan dan melihat jadwal ibadah",
    "Mengirim permohonan doa dan memantau live streaming",
    "Mengisi pendataan diri dan keluarga",
  ],
};

const CATEGORY_LABELS = {
  kaum_pria: "Kaum Pria",
  kaum_wanita: "Kaum Wanita",
  kaum_muda: "Kaum Muda",
  sekolah_minggu: "Sekolah Minggu",
};

const ARTICLE_STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const DashboardSkeletonBlock = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-[1rem] bg-brand-100/85 dark:bg-brand-800/70 ${className}`}
  />
);

const DashboardStatsSkeleton = () => (
  <div className="space-y-5" aria-hidden="true">
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="glass-card relative overflow-hidden p-6">
          <DashboardSkeletonBlock className="h-3 w-24 rounded-full" />
          <DashboardSkeletonBlock className="mt-4 h-10 w-24" />
          <DashboardSkeletonBlock className="mt-3 h-4 w-full" />
        </div>
      ))}
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="glass-card relative overflow-hidden p-5">
          <DashboardSkeletonBlock className="h-3 w-28 rounded-full" />
          <DashboardSkeletonBlock className="mt-4 h-8 w-24" />
          <DashboardSkeletonBlock className="mt-3 h-4 w-full" />
        </div>
      ))}
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="glass-card relative overflow-hidden p-5">
          <DashboardSkeletonBlock className="h-4 w-40" />
          <DashboardSkeletonBlock className="mt-4 h-16 w-full rounded-[1.2rem]" />
          <DashboardSkeletonBlock className="mt-3 h-16 w-full rounded-[1.2rem]" />
          <DashboardSkeletonBlock className="mt-3 h-16 w-full rounded-[1.2rem]" />
        </div>
      ))}
    </section>
  </div>
);

const DashboardPanel = ({ id, title, subtitle, actionTo, actionLabel, children }) => (
  <section id={id} className="glass-card relative overflow-hidden p-5 sm:p-6">
    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-100/40 blur-3xl dark:bg-emerald-900/15 pointer-events-none" />
    <div className="relative z-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
            {subtitle}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-brand-900 dark:text-white">
            {title}
          </h2>
        </div>
        {actionTo && actionLabel && (
          <Link
            to={actionTo}
            className="rounded-full border border-brand-200 bg-white/85 px-4 py-2 text-xs font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200 dark:hover:bg-brand-800/60"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  </section>
);

const DashboardEmptyState = ({ text }) => (
  <div className="rounded-[1.2rem] border border-dashed border-brand-300 bg-white/70 px-4 py-5 text-sm text-brand-500 dark:border-brand-700 dark:bg-brand-900/35 dark:text-brand-400">
    {text}
  </div>
);

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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

function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [processingContactId, setProcessingContactId] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setStats(null);
      setStatsError("");
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setStatsError("");

      try {
        const res = await api.get("/dashboard/stats");
        setStats(res.data || null);
      } catch (error) {
        setStats(null);
        setStatsError(error.response?.data?.message || "Gagal memuat dashboard admin.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  const markContactMessageRead = async (id) => {
    if (!id || processingContactId) return;

    setProcessingContactId(id);
    try {
      await api.put(`/contact-messages/${id}/read`);
      setStats((previous) => {
        if (!previous) return previous;

        const currentUnreadCount = Number(previous.summary?.unreadContactMessages) || 0;
        const wasUnread = previous.contactInbox?.some((item) => item.id === id && !item.isRead);

        return {
          ...previous,
          summary: {
            ...previous.summary,
            unreadContactMessages: wasUnread ? Math.max(0, currentUnreadCount - 1) : currentUnreadCount,
          },
          contactInbox: Array.isArray(previous.contactInbox)
            ? previous.contactInbox.map((item) =>
                item.id === id ? { ...item, isRead: true } : item,
              )
            : previous.contactInbox,
        };
      });
    } catch (error) {
      setStatsError(error.response?.data?.message || "Gagal memperbarui status pesan kontak.");
    } finally {
      setProcessingContactId(null);
    }
  };

  const summary = stats?.summary || {};
  const priorityCards = useMemo(
    () => [
      {
        key: "newStoreOrders",
        label: "Order Baru",
        value: summary.newStoreOrders || 0,
        description: "Pesanan checkout yang masih menunggu konfirmasi admin.",
        to: "/dashboard/store",
        action: "Buka Store",
        accent: "text-emerald-600 dark:text-emerald-300",
      },
      {
        key: "pendingArticles",
        label: "Artikel Pending",
        value: summary.pendingArticles || 0,
        description: "Draft dari tim multimedia yang perlu direview atau diterbitkan.",
        to: "/dashboard/articles/manage",
        action: "Review Artikel",
        accent: "text-amber-600 dark:text-amber-300",
      },
      {
        key: "unreadPrayerRequests",
        label: "Prayer Inbox",
        value: summary.unreadPrayerRequests || 0,
        description: "Permohonan doa yang belum ditindaklanjuti tim gereja.",
        to: "/prayer",
        action: "Buka Doa",
        accent: "text-sky-600 dark:text-sky-300",
      },
      {
        key: "lowStockProducts",
        label: "Stok Kritis",
        value: summary.lowStockProducts || 0,
        description: `Produk aktif dengan stok <= ${stats?.thresholds?.lowStock || 5} pcs yang butuh dicek.`,
        to: "/dashboard/store",
        action: "Cek Produk",
        accent: "text-rose-600 dark:text-rose-300",
      },
      {
        key: "unreadContactMessages",
        label: "Pesan Kontak",
        value: summary.unreadContactMessages || 0,
        description: "Pesan masuk dari halaman contact yang belum dibaca admin.",
        to: "/dashboard#contact-inbox",
        action: "Buka Inbox",
        accent: "text-violet-600 dark:text-violet-300",
      },
    ],
    [summary, stats?.thresholds?.lowStock],
  );

  const overviewCards = useMemo(
    () => [
      {
        key: "storeRevenue",
        label: "Revenue Toko",
        value: formatRupiah(summary.storeRevenue || 0),
        description: `${summary.completedStoreOrders || 0} order selesai tercatat.`,
      },
      {
        key: "publishedArticles",
        label: "Renungan Terbit",
        value: summary.publishedArticles || 0,
        description: `${summary.draftArticles || 0} draft masih belum dipublikasikan.`,
      },
      {
        key: "activeStoreProducts",
        label: "Produk Aktif",
        value: summary.activeStoreProducts || 0,
        description: `${summary.storeOrders || 0} total order pernah masuk.`,
      },
      {
        key: "congregationMembers",
        label: "Data Jemaat",
        value: summary.congregationMembers || 0,
        description: `${summary.newCongregationMembers || 0} data baru dalam 7 hari terakhir.`,
      },
      {
        key: "galleries",
        label: "Item Galeri",
        value: summary.galleries || 0,
        description: `${summary.schedules || 0} jadwal aktif ada di sistem.`,
      },
      {
        key: "contactMessages",
        label: "Pesan Masuk",
        value: summary.contactMessages || 0,
        description: `${summary.unreadContactMessages || 0} pesan kontak masih belum dibaca.`,
      },
      {
        key: "users",
        label: "Akun Terdaftar",
        value: summary.users || 0,
        description: "Total admin, multimedia, dan jemaat yang sudah punya akun.",
      },
    ],
    [summary],
  );

  const quickActions = useMemo(
    () => [
      {
        to: "/dashboard/articles/new",
        icon: "📝",
        title: "Buat Renungan Baru",
        desc: "Tulis dan siapkan renungan baru untuk jemaat.",
      },
      {
        to: "/dashboard/articles/manage",
        icon: "📋",
        title: "Kelola Renungan",
        desc: "Review, edit, dan rapikan konten renungan yang sudah ada.",
        meta: isAdmin && summary.pendingArticles ? `${summary.pendingArticles} perlu review` : "",
      },
      {
        to: "/gallery",
        icon: "🖼️",
        title: "Kelola Galeri",
        desc: "Tambah dokumentasi kegiatan dan pastikan album tetap rapi.",
      },
      {
        to: "/live",
        icon: "📺",
        title: "Halaman Live",
        desc: "Cek link siaran dan kesiapan halaman ibadah online.",
      },
      ...(isAdmin
        ? [
            {
              to: "/dashboard/store",
              icon: "🛍️",
              title: "GTshirt Store",
              desc: "Pantau order, stok, promo, dan performa penjualan toko.",
              meta:
                summary.newStoreOrders > 0
                  ? `${summary.newStoreOrders} order baru`
                  : `${summary.activeStoreProducts || 0} produk aktif`,
            },
            {
              to: "/prayer",
              icon: "🙏",
              title: "Prayer Request",
              desc: "Baca prayer inbox dan tandai permohonan yang sudah ditindaklanjuti.",
              meta:
                summary.unreadPrayerRequests > 0
                  ? `${summary.unreadPrayerRequests} belum dibaca`
                  : "Inbox terkendali",
            },
            {
              to: "/dashboard/congregation",
              icon: "📇",
              title: "Data Jemaat",
              desc: "Lihat data terbaru dan rapikan pendataan keluarga jemaat.",
              meta:
                summary.newCongregationMembers > 0
                  ? `${summary.newCongregationMembers} data baru minggu ini`
                  : "",
            },
          ]
        : []),
    ],
    [isAdmin, summary],
  );

  const roleCapabilities = ROLE_CAPABILITIES[user?.role] || [];

  return (
    <div className="page-stack space-y-8 sm:space-y-10">
      <PageHero
        title={`Selamat Datang, ${user?.name || ROLE_LABELS[user?.role] || "Tim GPT"}!`}
        subtitle={`${ROLE_LABELS[user?.role] || "User"} - fokuskan pekerjaan penting Anda dari dashboard ini.`}
      />

      {isAdmin && (
        <>
          {isLoading ? (
            <DashboardStatsSkeleton />
          ) : statsError ? (
            <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300">
              {statsError}
            </section>
          ) : stats ? (
            <>
              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500 dark:text-brand-400">
                    Prioritas Admin
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-900 dark:text-white">
                    Yang perlu dicek hari ini
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {priorityCards.map((card) => (
                    <Link
                      key={card.key}
                      to={card.to}
                      className="glass-card relative overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/50 blur-2xl dark:bg-brand-900/20 pointer-events-none" />
                      <div className="relative z-10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                          {card.label}
                        </p>
                        <p className={`mt-3 text-4xl font-black tracking-tight ${card.accent}`}>
                          {card.value}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-brand-600 dark:text-brand-300">
                          {card.description}
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                          {card.action}
                          <span aria-hidden="true">→</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500 dark:text-brand-400">
                    Ringkasan Operasional
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-900 dark:text-white">
                    Gambaran cepat kondisi dashboard
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {overviewCards.map((card) => (
                    <div key={card.key} className="glass-card relative overflow-hidden p-5">
                      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-100/30 blur-2xl dark:bg-emerald-900/10 pointer-events-none" />
                      <div className="relative z-10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                          {card.label}
                        </p>
                        <p className="mt-3 text-3xl font-black tracking-tight text-brand-950 dark:text-white">
                          {card.value}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-brand-600 dark:text-brand-300">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <DashboardPanel
                  title="Order terbaru"
                  subtitle="Store queue"
                  actionTo="/dashboard/store"
                  actionLabel="Buka Store"
                >
                  {Array.isArray(stats.recentOrders) && stats.recentOrders.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-[1.2rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-brand-900 dark:text-white">
                                {order.orderCode}
                              </p>
                              <p className="text-xs text-brand-500 dark:text-brand-400">
                                {order.customerName} • {formatDateTime(order.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                ORDER_STATUS_BADGE[order.status] || ORDER_STATUS_BADGE.new
                              }`}
                            >
                              {ORDER_STATUS_LABEL[order.status] || order.status}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-brand-600 dark:text-brand-300">
                            <span>{order.shippingMethod || "-"}</span>
                            <span className="font-semibold text-primary">
                              {formatRupiah(order.totalAmount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState text="Belum ada order masuk terbaru untuk ditampilkan." />
                  )}
                </DashboardPanel>

                <DashboardPanel
                  title="Artikel butuh review"
                  subtitle="Editorial queue"
                  actionTo="/dashboard/articles/manage"
                  actionLabel="Review Artikel"
                >
                  {Array.isArray(stats.pendingArticleList) && stats.pendingArticleList.length > 0 ? (
                    <div className="space-y-3">
                      {stats.pendingArticleList.map((article) => (
                        <div
                          key={article.id}
                          className="rounded-[1.2rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-brand-900 dark:text-white">
                                {article.title}
                              </p>
                              <p className="text-xs text-brand-500 dark:text-brand-400">
                                {article.authorName} • {formatDateTime(article.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                ARTICLE_STATUS_BADGE[article.status] || ARTICLE_STATUS_BADGE.pending
                              }`}
                            >
                              {article.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState text="Tidak ada renungan pending. Antrian editorial sedang longgar." />
                  )}
                </DashboardPanel>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <DashboardPanel
                  title="Prayer inbox"
                  subtitle="Permohonan jemaat"
                  actionTo="/prayer"
                  actionLabel="Buka Halaman Doa"
                >
                  {Array.isArray(stats.prayerInbox) && stats.prayerInbox.length > 0 ? (
                    <div className="space-y-3">
                      {stats.prayerInbox.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[1.2rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-bold text-brand-900 dark:text-white">
                              {item.name}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                item.isRead
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300"
                                  : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                              }`}
                            >
                              {item.isRead ? "Sudah dibaca" : "Baru"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                            {item.excerpt || "Permohonan doa tersedia di halaman doa."}
                          </p>
                          <p className="mt-3 text-xs text-brand-500 dark:text-brand-400">
                            {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState text="Prayer inbox kosong. Belum ada permohonan doa baru." />
                  )}
                </DashboardPanel>

                <DashboardPanel
                  id="contact-inbox"
                  title="Pesan kontak terbaru"
                  subtitle="Contact inbox"
                >
                  {Array.isArray(stats.contactInbox) && stats.contactInbox.length > 0 ? (
                    <div className="space-y-3">
                      {stats.contactInbox.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[1.2rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-brand-900 dark:text-white">
                                {item.subject}
                              </p>
                              <p className="text-xs text-brand-500 dark:text-brand-400">
                                {item.name} • {item.email}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                item.isRead
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300"
                                  : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                              }`}
                            >
                              {item.isRead ? "Sudah dibaca" : "Baru"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                            {item.excerpt}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-brand-500 dark:text-brand-400">
                              {formatDateTime(item.createdAt)}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`}
                                className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/60"
                              >
                                Balas Email
                              </a>
                              {!item.isRead && (
                                <button
                                  type="button"
                                  onClick={() => markContactMessageRead(item.id)}
                                  disabled={processingContactId === item.id}
                                  className="rounded-full bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60 dark:bg-white dark:text-brand-900 dark:hover:bg-brand-100"
                                >
                                  {processingContactId === item.id ? "Menyimpan..." : "Tandai Dibaca"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState text="Belum ada pesan baru dari halaman contact." />
                  )}
                </DashboardPanel>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <DashboardPanel
                  title="Stok perlu dicek"
                  subtitle="Inventory watch"
                  actionTo="/dashboard/store"
                  actionLabel="Kelola Produk"
                >
                  {Array.isArray(stats.lowStockProducts) && stats.lowStockProducts.length > 0 ? (
                    <div className="space-y-3">
                      {stats.lowStockProducts.map((product) => (
                        <div
                          key={product.id}
                          className="rounded-[1.2rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-brand-900 dark:text-white">
                                {product.name}
                              </p>
                              <p className="text-xs text-brand-500 dark:text-brand-400">
                                {product.color || "Tanpa varian warna"} • update {formatDateTime(product.updatedAt)}
                              </p>
                            </div>
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                              {product.totalStock} pcs
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState text="Belum ada produk aktif dengan stok kritis. Kondisi inventori relatif aman." />
                  )}
                </DashboardPanel>

                <DashboardPanel
                  title="Data jemaat terbaru"
                  subtitle="Congregation updates"
                  actionTo="/dashboard/congregation"
                  actionLabel="Buka Pendataan"
                >
                  {Array.isArray(stats.recentMembers) && stats.recentMembers.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentMembers.map((member) => (
                        <div
                          key={member.id}
                          className="rounded-[1.2rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-brand-900 dark:text-white">
                                {member.fullName}
                              </p>
                              <p className="text-xs text-brand-500 dark:text-brand-400">
                                {CATEGORY_LABELS[member.category] || member.category} • {member.phone || "Tanpa nomor"}
                              </p>
                            </div>
                            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-800/60 dark:text-brand-200">
                              {member.submittedBy}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-brand-500 dark:text-brand-400">
                            Masuk pada {formatDateTime(member.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState text="Belum ada data jemaat terbaru yang masuk." />
                  )}
                </DashboardPanel>
              </section>
            </>
          ) : null}
        </>
      )}

      {["admin", "multimedia"].includes(user?.role) && (
        <section className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500 dark:text-brand-400">
              Workflow
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-900 dark:text-white">
              Aksi cepat
            </h2>
          </div>
          <div className="admin-quick-actions grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="glass-card relative overflow-hidden p-6 lg:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-100/35 blur-2xl dark:bg-emerald-900/15 pointer-events-none" />
                <div className="relative z-10">
                  <div className="icon-box-glow h-14 w-14 shadow-sm">
                    <span className="text-2xl">{action.icon}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-brand-900 dark:text-white">
                    {action.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                    {action.desc}
                  </p>
                  {action.meta && (
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {action.meta}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="glass-card relative overflow-hidden p-8 md:p-10 shadow-sm">
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-teal-100/30 blur-3xl dark:bg-teal-900/10 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500 dark:text-brand-400">
            Hak akses
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-900 dark:text-white">
            Informasi role Anda
          </h2>
          <div className="mt-6 rounded-[1.5rem] border border-brand-200 bg-white/75 p-5 dark:border-brand-700 dark:bg-brand-900/45">
            <p className="font-semibold text-primary">
              {ROLE_LABELS[user?.role] || "User"} dapat melakukan:
            </p>
            <ul className="mt-4 space-y-3 text-sm text-brand-700 dark:text-brand-300">
              {roleCapabilities.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 text-primary">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="glass-card p-6">
        <h3 className="mb-3 text-lg font-semibold text-brand-800 dark:text-white">Perlu Bantuan?</h3>
        <p className="mb-3 text-sm text-brand-700 dark:text-brand-300">
          Jika Anda membutuhkan bantuan teknis atau ada data yang terasa janggal di dashboard, hubungi administrator agar bisa dicek cepat.
        </p>
        <a
          href="mailto:admin@gpt-tanjungpriok.org"
          className="font-semibold text-primary transition-colors hover:text-primary-light"
        >
          📧 Hubungi Admin
        </a>
      </section>
    </div>
  );
}

export default DashboardPage;
