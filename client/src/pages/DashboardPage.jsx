import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="page-stack space-y-10">
      {/* Welcome Banner */}
      <section className="organic-banner relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-primary to-brand-600 p-8 md:p-10 text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute h-48 w-48 rounded-full bg-white/5 animate-float blur-2xl" style={{ top: "10%", right: "10%" }} />
          <div className="absolute h-36 w-36 rounded-full bg-white/5 animate-float-delayed blur-2xl" style={{ bottom: "10%", left: "10%" }} />
        </div>
        <div className="relative z-10">
          <h1 className="mb-2 text-3xl md:text-4xl font-extrabold">
            Selamat Datang, {user?.name}! 👋
          </h1>
          <p className="text-white/80 text-lg">{getRoleLabel(user?.role)}</p>
          <p className="mt-2 text-white/60">
            Kelola akun dan konten Anda dari dashboard ini.
          </p>
        </div>
      </section>

      {/* Stats */}
      {user?.role === "admin" && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
            </div>
          ) : stats ? (
            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="glass-card p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="mt-2 text-3xl font-bold gradient-text">{formatStatValue(key, value)}</p>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                className="glass-card p-6 group"
              >
                <div className="icon-box h-12 w-12 mb-4 text-2xl group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </div>
                <h3 className="mb-1 font-semibold text-brand-800 dark:text-white group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-brand-600 dark:text-brand-400">
                  {action.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Role Info */}
      <section className="glass-card p-8">
        <h2 className="mb-5 text-2xl font-bold text-brand-900 dark:text-white">
          Informasi Role Anda
        </h2>
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
