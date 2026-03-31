import { Link, useNavigate } from "react-router-dom";
import PosTab from "../components/store-admin/PosTab";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
import "../styles.admin.css";

function StorePosPage() {
  const navigate = useNavigate();

  return (
    <div className="page-stack admin-shell space-y-5 sm:space-y-6">
      <section className="glass-card dense-card overflow-hidden p-0">
        <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
              Cashier Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-900 dark:text-white">
              POS Offline Store
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-600 dark:text-brand-300">
              Halaman khusus kasir untuk pilih produk, cek stok live, checkout cepat, dan print
              struk tanpa distraksi tab admin lain.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/dashboard/store" className="btn-primary !px-5 !py-2.5 text-sm">
                Kembali ke Dashboard Store
              </Link>
              <button
                type="button"
                onClick={() => navigate("/dashboard/store?tab=pesanan")}
                className="rounded-2xl border border-brand-300 bg-white/75 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:text-brand-900 dark:border-brand-700 dark:bg-brand-900/35 dark:text-brand-200 dark:hover:border-brand-600 dark:hover:text-white"
              >
                Buka Daftar Pesanan
              </button>
            </div>
          </div>

          <div className="bg-[#255C2F] p-5 md:p-6">
            <img
              src={gtshirtLogo}
              alt="GTshirt POS"
              width={1200}
              height={900}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      <PosTab
        isActive
        standalone
        onRefreshAnalytics={() => {}}
        onGoToOrders={() => navigate("/dashboard/store?tab=pesanan")}
      />
    </div>
  );
}

export default StorePosPage;
