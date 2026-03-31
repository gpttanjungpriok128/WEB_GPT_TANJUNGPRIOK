import { Link, useNavigate } from "react-router-dom";
import PosTab from "../components/store-admin/PosTab";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
import "../styles.admin.css";

function StorePosPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_38%),linear-gradient(180deg,#f3fbf6_0%,#ecf7ef_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,#08110c_0%,#050b08_100%)]">
      <div className="admin-shell mx-auto flex min-h-screen w-full max-w-[1840px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-30 overflow-hidden rounded-[2rem] border border-brand-200/80 bg-white/86 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur dark:border-brand-800 dark:bg-brand-950/82 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={gtshirtLogo}
                alt="GTshirt POS"
                width={72}
                height={72}
                className="h-14 w-14 rounded-2xl object-cover shadow-sm"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                  Cashier Application
                </p>
                <h1 className="truncate text-2xl font-bold text-brand-950 dark:text-white">
                  POS Offline Store
                </h1>
                <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
                  Kasir aktif: <span className="font-semibold text-brand-900 dark:text-white">{user?.name || "Admin Store"}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard/store?tab=pesanan")}
                className="rounded-2xl border border-brand-300 bg-white/75 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:text-brand-900 dark:border-brand-700 dark:bg-brand-900/35 dark:text-brand-200 dark:hover:border-brand-600 dark:hover:text-white"
              >
                Pesanan
              </button>
              <Link
                to="/dashboard/store"
                className="rounded-2xl border border-brand-300 bg-white/75 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:text-brand-900 dark:border-brand-700 dark:bg-brand-900/35 dark:text-brand-200 dark:hover:border-brand-600 dark:hover:text-white"
              >
                Dashboard Store
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-2xl border border-brand-300 bg-white/75 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:text-brand-900 dark:border-brand-700 dark:bg-brand-900/35 dark:text-brand-200 dark:hover:border-brand-600 dark:hover:text-white"
              >
                {isDarkMode ? "Mode Terang" : "Mode Gelap"}
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-200 dark:hover:bg-rose-950/60"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 py-5">
          <section className="mb-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="glass-card dense-card p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                Mode Kasir
              </p>
              <h2 className="mt-2 text-xl font-bold text-brand-900 dark:text-white">
                Halaman kerja cepat untuk transaksi offline
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-600 dark:text-brand-300">
                Pilih produk dari stok live, lihat gambar barang langsung, checkout cepat, lalu print struk
                dari satu workspace penuh tanpa navigasi situs publik.
              </p>
            </article>

            <article className="glass-card dense-card p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Layout
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                    Full page cashier
                  </p>
                </div>
                <div className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Print
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                    Struk A6 siap cetak
                  </p>
                </div>
                <div className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Stok
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                    Live sync online store
                  </p>
                </div>
              </div>
            </article>
          </section>

          <PosTab
            isActive
            standalone
            onRefreshAnalytics={() => {}}
            onGoToOrders={() => navigate("/dashboard/store?tab=pesanan")}
          />
        </main>
      </div>
    </div>
  );
}

export default StorePosPage;
