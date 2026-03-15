import { useState, useEffect } from "react";
import api from "../../services/api";
import { formatDateTime } from "../../utils/storeFormatters";

const REVIEW_PAGE_SIZE = 12;
const REVIEW_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "approved", label: "Tayang" },
  { value: "pending", label: "Menunggu" },
];

function reviewStatusBadge(isApproved) {
  return isApproved
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
}

function renderStars(value) {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  const filledCount = Math.round(safeValue);
  return [...Array(5)].map((_, index) => (
    <span
      key={index}
      className={index < filledCount ? "text-amber-400" : "text-brand-200 dark:text-brand-700"}
    >
      ★
    </span>
  ));
}

export default function ReviewsTab({ isActive, analytics }) {
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewMeta, setReviewMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const fetchReviews = async (overrides = {}) => {
    const page = Math.max(1, Number(overrides.page ?? reviewPage) || 1);
    const limit = Math.min(50, Math.max(1, Number(overrides.limit ?? REVIEW_PAGE_SIZE) || REVIEW_PAGE_SIZE));
    const append = Boolean(overrides.append);
    if (append) {
      setIsLoadingMoreReviews(true);
    } else {
      setLoadingReviews(true);
    }
    try {
      const { data } = await api.get("/store/admin/reviews", {
        params: {
          page,
          limit,
          search: overrides.search ?? reviewSearch,
          status: overrides.status ?? reviewStatusFilter,
        },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const meta = data?.meta || { page, totalPages: 1, total: rows.length };
      setReviewMeta({
        page: meta.page ?? page,
        totalPages: meta.totalPages ?? 1,
        total: meta.total ?? rows.length,
      });
      setReviewPage(page);
      setReviews((prev) => {
        if (!append) return rows;
        const existing = new Set(prev.map((review) => review.id));
        const merged = [...prev];
        rows.forEach((review) => {
          if (!existing.has(review.id)) merged.push(review);
        });
        return merged;
      });
    } catch (error) {
      setReviews([]);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat ulasan produk.",
      });
    } finally {
      if (append) {
        setIsLoadingMoreReviews(false);
      } else {
        setLoadingReviews(false);
      }
    }
  };

  const handleReviewStatusToggle = async (reviewId, nextApproved) => {
    try {
      await api.patch(`/store/admin/reviews/${reviewId}`, { isApproved: nextApproved });
      setFeedback({ type: "success", text: "Status ulasan diperbarui." });
      await fetchReviews();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memperbarui status ulasan.",
      });
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm("Hapus ulasan ini? Tindakan ini permanen.");
    if (!confirmed) return;
    try {
      await api.delete(`/store/admin/reviews/${reviewId}`);
      setFeedback({ type: "success", text: "Ulasan berhasil dihapus." });
      await fetchReviews();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menghapus ulasan.",
      });
    }
  };

  useEffect(() => {
    if (isActive) {
      setFeedback({ type: "", text: "" });
      fetchReviews({ page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <article className="glass-card dense-card p-6">
        {feedback.text && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium border ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300"
          }`}>
            {feedback.text}
          </div>
        )}

        <div className="admin-filter-card flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Cari Ulasan
            </label>
            <input
              className="input-modern"
              value={reviewSearch}
              onChange={(event) => setReviewSearch(event.target.value)}
              placeholder="Nama, nomor WA, atau isi ulasan"
            />
          </div>
          <div className="min-w-[180px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Status
            </label>
            <select
              className="input-modern"
              value={reviewStatusFilter}
              onChange={(event) => setReviewStatusFilter(event.target.value)}
            >
              {REVIEW_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setReviewPage(1);
              fetchReviews({ page: 1 });
            }}
            className="btn-primary !px-6 !py-2.5"
          >
            Terapkan
          </button>
        </div>

        <div className="admin-scroll-panel mt-4 max-h-[560px] space-y-4 overflow-auto pr-1">
          {loadingReviews && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`review-skeleton-${index}`}
                  className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="h-3 w-32 rounded-full skeleton" />
                      <div className="h-3 w-40 rounded-full skeleton" />
                    </div>
                    <div className="h-6 w-16 rounded-full skeleton" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-full rounded-full skeleton" />
                    <div className="h-3 w-5/6 rounded-full skeleton" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingReviews && reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
              Belum ada ulasan masuk.
            </div>
          )}
          {!loadingReviews &&
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-brand-900 dark:text-white">
                      {review.product?.name || "Produk"}
                    </p>
                    <p className="text-xs text-brand-500 dark:text-brand-400">
                      {review.reviewerName} • {review.reviewerPhone}
                    </p>
                    {review.order?.orderCode && (
                      <p className="text-[11px] text-brand-500 dark:text-brand-400">
                        Order: {review.order.orderCode}
                      </p>
                    )}
                  </div>
                  <span
                    className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${reviewStatusBadge(review.isApproved)}`}
                  >
                    {review.isApproved ? "Tayang" : "Menunggu"}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-brand-500 dark:text-brand-400">
                    {formatDateTime(review.createdAt)}
                  </span>
                </div>

                {review.reviewText && (
                  <p className="mt-3 text-sm text-brand-700 dark:text-brand-300">
                    {review.reviewText}
                  </p>
                )}

                <div className="admin-review-actions mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewStatusToggle(review.id, !review.isApproved)}
                    className="min-h-[44px] rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:border-primary hover:text-primary dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                  >
                    {review.isApproved ? "Sembunyikan" : "Tayangkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(review.id)}
                    className="min-h-[44px] rounded-xl border border-rose-500 bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:border-rose-600 hover:bg-rose-700 dark:border-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          {!loadingReviews && reviewPage < reviewMeta.totalPages && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fetchReviews({ page: reviewPage + 1, append: true })}
                disabled={isLoadingMoreReviews}
                className="btn-outline !px-4 !py-2 text-xs disabled:opacity-60"
              >
                {isLoadingMoreReviews ? "Memuat..." : "Muat Ulasan Lainnya"}
              </button>
            </div>
          )}
        </div>
      </article>

      <article className="glass-card dense-card p-6">
        <h3 className="text-lg font-bold text-brand-900 dark:text-white">
          Ringkasan Rating
        </h3>
        <div className="mt-4 space-y-2 text-sm text-brand-600 dark:text-brand-300">
          <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 dark:border-brand-700 dark:bg-brand-900/45">
            <span>Rata-rata Rating</span>
            <span className="font-semibold text-brand-900 dark:text-white">
              {(Number(analytics?.metrics?.averageRating) || 0).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 dark:border-brand-700 dark:bg-brand-900/45">
            <span>Total Ulasan</span>
            <span className="font-semibold text-brand-900 dark:text-white">
              {analytics?.metrics?.totalReviews ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 dark:border-brand-700 dark:bg-brand-900/45">
            <span>Ulasan Pending</span>
            <span className="font-semibold text-brand-900 dark:text-white">
              {analytics?.metrics?.pendingReviews ?? 0}
            </span>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
          Gunakan toggle untuk menayangkan atau menyembunyikan ulasan sebelum tampil di katalog publik.
        </div>
      </article>
    </section>
  );
}
