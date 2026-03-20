import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./router/ProtectedRoute";
import HomePage from "./pages/HomePage";

const AboutPage = lazy(() => import("./pages/AboutPage"));
const SchedulesPage = lazy(() => import("./pages/SchedulesPage"));
const ArticlesPage = lazy(() => import("./pages/ArticlesPage"));
const ArticleDetailPage = lazy(() => import("./pages/ArticleDetailPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const LivePage = lazy(() => import("./pages/LivePage"));
const PrayerPage = lazy(() => import("./pages/PrayerPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ArticleEditorPage = lazy(() => import("./pages/ArticleEditorPage"));
const ManageArticlesPage = lazy(() => import("./pages/ManageArticlesPage"));
const CongregationDataPage = lazy(() => import("./pages/CongregationDataPage"));
const ManageStorePage = lazy(() => import("./pages/ManageStorePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

import ErrorBoundary from "./components/ErrorBoundary";

const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
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
