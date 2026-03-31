import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./router/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import SchedulesPage from "./pages/SchedulesPage";
import ArticlesPage from "./pages/ArticlesPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import GalleryPage from "./pages/GalleryPage";
import ContactPage from "./pages/ContactPage";
import ShopPage from "./pages/ShopPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import TrackOrderPage from "./pages/TrackOrderPage";

const LivePage = lazy(() => import("./pages/LivePage"));
const PrayerPage = lazy(() => import("./pages/PrayerPage"));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ArticleEditorPage = lazy(() => import("./pages/ArticleEditorPage"));
const ManageArticlesPage = lazy(() => import("./pages/ManageArticlesPage"));
const CongregationDataPage = lazy(() => import("./pages/CongregationDataPage"));
const ManageStorePage = lazy(() => import("./pages/ManageStorePage"));
const StorePosPage = lazy(() => import("./pages/StorePosPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

import ErrorBoundary from "./components/ErrorBoundary";

const RouteLoader = () => (
  <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-[1760px] items-start px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <div className="w-full space-y-5 sm:space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-brand-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,248,0.92))] p-5 dark:border-brand-700 dark:bg-[linear-gradient(180deg,rgba(8,16,12,0.94),rgba(6,12,9,0.92))] sm:p-6">
        <div className="h-3 w-24 rounded-full skeleton" />
        <div className="mt-4 h-10 w-3/4 rounded-[1rem] skeleton sm:w-1/2" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded-full skeleton" />
        <div className="mt-2 h-4 w-5/6 max-w-xl rounded-full skeleton" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-brand-200/80 bg-white/90 p-5 dark:border-brand-700 dark:bg-brand-900/40 sm:p-6">
          <div className="aspect-[16/10] rounded-[1.5rem] skeleton" />
        </div>
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-brand-200/80 bg-white/90 p-5 dark:border-brand-700 dark:bg-brand-900/40 sm:p-6">
            <div className="h-4 w-28 rounded-full skeleton" />
            <div className="mt-4 h-8 w-2/3 rounded-[0.9rem] skeleton" />
            <div className="mt-4 h-4 w-full rounded-full skeleton" />
            <div className="mt-2 h-4 w-5/6 rounded-full skeleton" />
          </div>
          <div className="rounded-[2rem] border border-brand-200/80 bg-white/90 p-5 dark:border-brand-700 dark:bg-brand-900/40 sm:p-6">
            <div className="h-12 w-full rounded-[1rem] skeleton" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <MainLayout>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute roles={["admin", "multimedia"]} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="/dashboard/store" element={<ManageStorePage />} />
              <Route path="/dashboard/store/pos" element={<StorePosPage />} />
            </Route>

            <Route
              element={<ProtectedRoute roles={["admin", "multimedia", "jemaat"]} />}
            >
              <Route path="/live" element={<LivePage />} />
              <Route path="/prayer" element={<PrayerPage />} />
              <Route path="/my-orders" element={<MyOrdersPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={["admin", "multimedia"]} />}>
              <Route
                path="/dashboard/articles/new"
                element={<ArticleEditorPage />}
              />
              <Route
                path="/dashboard/articles/:id/edit"
                element={<ArticleEditorPage />}
              />
              <Route
                path="/dashboard/articles/manage"
                element={<ManageArticlesPage />}
              />
            </Route>

            <Route element={<ProtectedRoute roles={["admin", "jemaat"]} />}>
              <Route
                path="/dashboard/congregation"
                element={<CongregationDataPage />}
              />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
