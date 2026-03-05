import { Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./router/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import SchedulesPage from "./pages/SchedulesPage";
import ArticlesPage from "./pages/ArticlesPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import GalleryPage from "./pages/GalleryPage";
import LivePage from "./pages/LivePage";
import PrayerPage from "./pages/PrayerPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ArticleEditorPage from "./pages/ArticleEditorPage";
import ManageArticlesPage from "./pages/ManageArticlesPage";
import CongregationDataPage from "./pages/CongregationDataPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:id" element={<ArticleDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute roles={["admin", "multimedia"]} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        <Route
          element={<ProtectedRoute roles={["admin", "multimedia", "jemaat"]} />}
        >
          <Route path="/live" element={<LivePage />} />
          <Route path="/prayer" element={<PrayerPage />} />
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
    </MainLayout>
  );
}

export default App;
