import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import api from "../services/api";
import "../styles.admin.css";

const DashboardSkeletonBlock = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-[1rem] bg-brand-100/85 dark:bg-brand-800/70 ${className}`}
  />
);

const DashboardStatsSkeleton = () => (
  <section className="admin-stats-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="glass-card relative overflow-hidden p-6">
        <DashboardSkeletonBlock className="h-3 w-24 rounded-full" />
        <DashboardSkeletonBlock className="mt-4 h-10 w-28" />
      </div>
    ))}
  </section>
);

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(() => !user || user?.role === "admin");

  useEffect(() => {
    if (user?.role !== "admin") return;
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/dashboard/stats");
        setStats(res.data);
      } catch {
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const getRoleLabel = (role) => {
    const labels = { admin: "👨‍💼 Admin", multimedia: "🎬 Multimedia", jemaat: "👥 Jemaat" };
    return labels[role] || role;
  };

  const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const formatStatValue = (key, value) => {
    const normalized = String(key || "").toLowerCase();
    if (normalized.includes("revenue")) {
      return formatRupiah(value);
    }
    return value;
  };

  const shouldReserveStats = !user || user?.role === "admin";

  return (
    <div className="page-stack space-y-8 sm:space-y-10">
      {/* Welcome Banner */}
      <PageHero 
        title={`Selamat Datang, ${user?.name || "Admin"}! 👋`}
        subtitle={`${getRoleLabel(user?.role)} - Kelola akun dan konten Anda dari dashboard ini.`}
      />

      {/* Stats */}
      {shouldReserveStats && (
        <>
          {isLoading || !stats ? (
            <DashboardStatsSkeleton />
          ) : stats ? (
            <section className="admin-stats-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="glass-card relative overflow-hidden p-6 group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100/50 to-teal-100/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:scale-150 transition-transform duration-500 dark:from-emerald-900/30 dark:to-teal-900/10 pointer-events-none" />
                  <p className="relative z-10 text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold tracking-[0.2em] mb-1">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="relative z-10 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 drop-shadow-sm">{formatStatValue(key, value)}</p>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}

      {/* Quick Actions */}
      {["admin", "multimedia"].includes(user?.role) && (
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-brand-900 dark:text-white">Aksi Cepat</h2>
          <div className="admin-quick-actions grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { to: "/dashboard/articles/new", icon: "📝", title: "Buat Renungan Baru", desc: "Tulis dan publikasikan renungan baru untuk jemaat." },
              { to: "/dashboard/articles/manage", icon: "📋", title: "Kelola Renungan", desc: "Lihat, edit, dan kelola semua renungan Anda." },
              { to: "/gallery", icon: "🖼️", title: "Upload Galeri", desc: "Tambah foto kegiatan gereja ke halaman galeri." },
              { to: "/live", icon: "📺", title: "Halaman Live", desc: "Atur link live streaming langsung dari halaman Live." },
              ...(user?.role === "admin"
                ? [
                  { to: "/dashboard/store", icon: "🛍️", title: "GTshirt Store", desc: "Kelola produk, harga, promo, order, dan analitik toko online." },
                  { to: "/prayer", icon: "🙏", title: "Prayer Request", desc: "Lihat dan tandai permohonan doa jemaat di halaman Doa." },
                  { to: "/dashboard/congregation", icon: "📇", title: "Data Jemaat", desc: "Tambah, edit, dan kelola pendataan jemaat." }
                ]
                : []),
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="glass-card relative overflow-hidden p-6 lg:p-8 group hover:-translate-y-2 hover:shadow-xl transition-all duration-500"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-100/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 dark:bg-emerald-900/20 pointer-events-none" />
                <div className="relative z-10 icon-box-glow h-14 w-14 mb-5 shadow-sm group-hover:shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                  <span className="text-2xl">{action.icon}</span>
                </div>
                <h3 className="relative z-10 mb-2 font-bold text-lg text-brand-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  {action.title}
                </h3>
                <p className="relative z-10 text-sm text-brand-600 dark:text-brand-400 leading-relaxed">
                  {action.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Role Info */}
      <section className="glass-card relative overflow-hidden p-8 md:p-10 shadow-sm">
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-teal-100/30 rounded-full blur-3xl dark:bg-teal-900/10 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-brand-900 dark:text-white">
            Informasi Role Anda
          </h2>
        <div className="sm:hidden">
          <details className="admin-role-accordion rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45">
            <summary className="mobile-summary flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-semibold text-brand-900 dark:text-white">
                Lihat Hak Akses
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
            <div className="pt-3">
              {user?.role === "admin" && (
                <div className="space-y-3 text-brand-700 dark:text-brand-300">
                  <p className="font-semibold text-primary">👨‍💼 Sebagai Admin, Anda dapat:</p>
                  <ul className="ml-4 space-y-2">
                    {[
                      "Membuat dan menerbitkan renungan langsung",
                      "Menyetujui atau menolak renungan dari multimedia",
                      "Mengelola jadwal ibadah dan galeri",
                      "Mengelola data pengguna dan permissions",
                      "Mengelola pendataan jemaat",
                      "Melihat statistik dan laporan lengkap",
                      "Mengelola toko GTshirt (produk, harga, promo, order, analitik)",
                      "Mengelola link live streaming di halaman Live",
                      "Menangani prayer request jemaat di halaman Doa",
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {user?.role === "multimedia" && (
                <div className="space-y-3 text-brand-700 dark:text-brand-300">
                  <p className="font-semibold text-primary">🎬 Sebagai Multimedia, Anda dapat:</p>
                  <ul className="ml-4 space-y-2">
                    {[
                      "Membuat renungan yang menunggu approval admin",
                      "Upload foto untuk galeri",
                      "Mengelola link live streaming di halaman Live",
                      "Mengelola konten multimedia gereja",
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {user?.role === "jemaat" && (
                <div className="space-y-3 text-brand-700 dark:text-brand-300">
                  <p className="font-semibold text-primary">👥 Sebagai Jemaat, Anda dapat:</p>
                  <ul className="ml-4 space-y-2">
                    {[
                      "Membaca renungan dari gereja",
                      "Melihat jadwal ibadah dan kegiatan",
                      "Menonton galeri foto kegiatan gereja",
                      "Mengirimkan permohonan doa kepada gereja",
                      "Menyaksikan live streaming ibadah",
                      "Mengisi pendataan diri dan keluarga",
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </div>
        <div className="hidden sm:block">
          {user?.role === "admin" && (
            <div className="space-y-3 text-brand-700 dark:text-brand-300">
              <p className="font-semibold text-primary">👨‍💼 Sebagai Admin, Anda dapat:</p>
              <ul className="ml-4 space-y-2">
                {[
                  "Membuat dan menerbitkan renungan langsung",
                  "Menyetujui atau menolak renungan dari multimedia",
                  "Mengelola jadwal ibadah dan galeri",
                  "Mengelola data pengguna dan permissions",
                  "Mengelola pendataan jemaat",
                  "Melihat statistik dan laporan lengkap",
                  "Mengelola toko GTshirt (produk, harga, promo, order, analitik)",
                  "Mengelola link live streaming di halaman Live",
                  "Menangani prayer request jemaat di halaman Doa",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {user?.role === "multimedia" && (
            <div className="space-y-3 text-brand-700 dark:text-brand-300">
              <p className="font-semibold text-primary">🎬 Sebagai Multimedia, Anda dapat:</p>
              <ul className="ml-4 space-y-2">
                {[
                  "Membuat renungan yang menunggu approval admin",
                  "Upload foto untuk galeri",
                  "Mengelola link live streaming di halaman Live",
                  "Mengelola konten multimedia gereja",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {user?.role === "jemaat" && (
            <div className="space-y-3 text-brand-700 dark:text-brand-300">
              <p className="font-semibold text-primary">👥 Sebagai Jemaat, Anda dapat:</p>
              <ul className="ml-4 space-y-2">
                {[
                  "Membaca renungan dari gereja",
                  "Melihat jadwal ibadah dan kegiatan",
                  "Menonton galeri foto kegiatan gereja",
                  "Mengirimkan permohonan doa kepada gereja",
                  "Menyaksikan live streaming ibadah",
                  "Mengisi pendataan diri dan keluarga",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </div>
      </section>

      {/* Help */}
      <section className="glass-card p-6">
        <h3 className="mb-3 font-semibold text-brand-800 dark:text-white">Perlu Bantuan?</h3>
        <p className="mb-3 text-sm text-brand-700 dark:text-brand-300">
          Jika Anda memiliki pertanyaan atau membutuhkan bantuan teknis, silakan hubungi tim administrator kami.
        </p>
        <a href="mailto:admin@gpt-tanjungpriok.org" className="font-semibold text-primary hover:text-primary-light transition-colors">
          📧 Hubungi Admin
        </a>
      </section>
    </div>
  );
}

export default DashboardPage;
