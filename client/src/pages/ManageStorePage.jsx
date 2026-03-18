import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
import { formatRupiah } from "../utils/storeFormatters";
import AdminStoreTabs from "../components/store-admin/AdminStoreTabs";
import ProductsTab from "../components/store-admin/ProductsTab";
import OrdersTab from "../components/store-admin/OrdersTab";
import ScanTab from "../components/store-admin/ScanTab";
import ReviewsTab from "../components/store-admin/ReviewsTab";
import ReportsTab from "../components/store-admin/ReportsTab";
import ShippingTab from "../components/store-admin/ShippingTab";

function ManageStorePage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("produk");
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [lastAnalyticsAt, setLastAnalyticsAt] = useState(0);
  const [tabHidden, setTabHidden] = useState(false);
  const tabHiddenRef = useRef(false);

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
    let ticking = false;
    let rafId = 0;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        const delta = currentY - lastY;
        let nextHidden = tabHiddenRef.current;

        if (currentY <= 80) {
          nextHidden = false;
        } else if (delta > 12) {
          nextHidden = true;
        } else if (delta < -8) {
          nextHidden = false;
        }

        if (nextHidden !== tabHiddenRef.current) {
          tabHiddenRef.current = nextHidden;
          setTabHidden(nextHidden);
        }

        lastY = currentY;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Handle deep-link to order search
  useEffect(() => {
    if (!location?.search) return;
    const params = new URLSearchParams(location.search);
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
          </div>
          <div className="bg-[#255C2F] p-5 md:p-6">
            <img
              src={gtshirtLogo}
              alt="GTshirt"
              loading="lazy"
              decoding="async"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      <section className="admin-metric-strip">
        {loadingAnalytics && (
          <div className="col-span-full flex justify-center py-8">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </div>
        )}
        {!loadingAnalytics &&
          metricCards.map((item) => (
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

      {activeTab === "produk" && (
        <ProductsTab isActive={activeTab === "produk"} onRefreshAnalytics={() => fetchAnalytics({ force: true })} />
      )}
      {activeTab === "pesanan" && (
        <OrdersTab isActive={activeTab === "pesanan"} analytics={analytics} onGoToScan={() => setActiveTab("scan")} />
      )}
      {activeTab === "scan" && (
        <ScanTab isActive={activeTab === "scan"} onGoToOrders={() => setActiveTab("pesanan")} />
      )}
      {activeTab === "ulasan" && (
        <ReviewsTab isActive={activeTab === "ulasan"} analytics={analytics} />
      )}
      {activeTab === "laporan" && (
        <ReportsTab isActive={activeTab === "laporan"} />
      )}
      {activeTab === "ongkir" && (
        <ShippingTab isActive={activeTab === "ongkir"} />
      )}
    </div>
  );
}

export default ManageStorePage;
