import { Suspense, lazy, useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
import { formatRupiah } from "../utils/storeFormatters";
import AdminStoreTabs from "../components/store-admin/AdminStoreTabs";
import "../styles.admin.css";

const ProductsTab = lazy(() => import("../components/store-admin/ProductsTab"));
const PosTab = lazy(() => import("../components/store-admin/PosTab"));
const OrdersTab = lazy(() => import("../components/store-admin/OrdersTab"));
const ScanTab = lazy(() => import("../components/store-admin/ScanTab"));
const ReviewsTab = lazy(() => import("../components/store-admin/ReviewsTab"));
const ReportsTab = lazy(() => import("../components/store-admin/ReportsTab"));
const ShippingTab = lazy(() => import("../components/store-admin/ShippingTab"));

const AdminMetricSkeleton = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-[1rem] bg-brand-100/85 dark:bg-brand-800/70 ${className}`}
  />
);

const TabLoader = () => (
  <section className="glass-card dense-card p-5 sm:p-6" aria-hidden="true">
    <div className="grid gap-4 lg:grid-cols-[0.34fr_0.66fr]">
      <div className="space-y-3">
        <AdminMetricSkeleton className="h-4 w-28 rounded-full" />
        <AdminMetricSkeleton className="h-9 w-36" />
        <AdminMetricSkeleton className="h-3.5 w-full" />
        <AdminMetricSkeleton className="h-3.5 w-[84%]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-[1.4rem] border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45">
            <AdminMetricSkeleton className="h-3 w-20 rounded-full" />
            <AdminMetricSkeleton className="mt-3 h-6 w-24" />
            <AdminMetricSkeleton className="mt-4 h-3.5 w-full" />
            <AdminMetricSkeleton className="mt-2 h-3.5 w-[74%]" />
          </div>
        ))}
      </div>
    </div>
  </section>
);

function ManageStorePage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("produk");
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [lastAnalyticsAt, setLastAnalyticsAt] = useState(0);
  const [tabHidden, setTabHidden] = useState(false);

  const fetchAnalytics = useCallback(async (options = {}) => {
    const now = Date.now();
    const ttlMs = 60 * 1000;
    if (!options.force && analytics && now - lastAnalyticsAt < ttlMs) return;
    setLoadingAnalytics(true);
    try {
      const { data } = await api.get("/store/admin/analytics");
      setAnalytics(data || null);
      setLastAnalyticsAt(Date.now());
    } catch {
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [analytics, lastAnalyticsAt]);

  useEffect(() => { fetchAnalytics(); }, []);

  // Auto-hide tabs on scroll (mobile)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastY = window.scrollY || 0;
    const onScroll = () => {
      const currentY = window.scrollY || 0;
      setTabHidden(currentY > 120 && currentY > lastY);
      lastY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Handle deep-link to order search
  useEffect(() => {
    if (!location?.search) return;
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get("tab");
    if (["produk", "kasir", "pesanan", "scan", "ulasan", "laporan", "ongkir"].includes(requestedTab || "")) {
      setActiveTab(requestedTab);
      return;
    }
    const rawCode = params.get("order") || params.get("orderCode") || params.get("code");
    if (rawCode?.trim()) {
      setActiveTab("pesanan");
    }
  }, [location.search]);

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

  return (
    <div className="page-stack admin-shell space-y-5 sm:space-y-6">
      <section className="glass-card dense-card overflow-hidden p-0">
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
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/dashboard/store/pos" className="btn-primary !px-5 !py-2.5 text-sm">
                Buka POS Kasir
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab("pesanan")}
                className="rounded-2xl border border-brand-300 bg-white/75 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:text-brand-900 dark:border-brand-700 dark:bg-brand-900/35 dark:text-brand-200 dark:hover:border-brand-600 dark:hover:text-white"
              >
                Lihat Pesanan
              </button>
            </div>
          </div>
          <div className="bg-[#255C2F] p-5 md:p-6">
            <img
              src={gtshirtLogo}
              alt="GTshirt"
              width={1200}
              height={900}
              sizes="(max-width: 767px) calc(100vw - 2.5rem), 28vw"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      <section className="admin-metric-strip">
        {loadingAnalytics || metricCards.length === 0
          ? Array.from({ length: 8 }).map((_, index) => (
            <article key={`metric-skeleton-${index}`} className="admin-metric-card glass-card dense-card" aria-hidden="true">
              <AdminMetricSkeleton className="h-3 w-24 rounded-full" />
              <AdminMetricSkeleton className="mt-3 h-8 w-20" />
            </article>
          ))
          : metricCards.map((item) => (
            <article key={item.label} className="admin-metric-card glass-card dense-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                {item.label}
              </p>
              <p className="admin-metric-value mt-2 text-2xl font-bold gradient-text">
                {item.value}
              </p>
            </article>
          ))}
      </section>

      <AdminStoreTabs activeTab={activeTab} setActiveTab={setActiveTab} tabHidden={tabHidden} />

      <Suspense fallback={<TabLoader />}>
        {activeTab === "produk" && (
          <ProductsTab
            isActive={activeTab === "produk"}
            onRefreshAnalytics={() => fetchAnalytics({ force: true })}
          />
        )}
        {activeTab === "kasir" && (
          <PosTab
            isActive={activeTab === "kasir"}
            onRefreshAnalytics={() => fetchAnalytics({ force: true })}
            onGoToOrders={() => setActiveTab("pesanan")}
          />
        )}
        {activeTab === "pesanan" && (
          <OrdersTab
            isActive={activeTab === "pesanan"}
            analytics={analytics}
            onGoToScan={() => setActiveTab("scan")}
          />
        )}
        {activeTab === "scan" && (
          <ScanTab
            isActive={activeTab === "scan"}
            onGoToOrders={() => setActiveTab("pesanan")}
          />
        )}
        {activeTab === "ulasan" && (
          <ReviewsTab isActive={activeTab === "ulasan"} analytics={analytics} />
        )}
        {activeTab === "laporan" && <ReportsTab isActive={activeTab === "laporan"} />}
        {activeTab === "ongkir" && <ShippingTab isActive={activeTab === "ongkir"} />}
      </Suspense>
    </div>
  );
}

export default ManageStorePage;
