import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resolveApiAssetUrl } from "../config/env";
import PageHero from "../components/PageHero";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";

const SearchIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const openArticleId = searchParams.get("open");

  useEffect(() => {
    if (!openArticleId) return;
    navigate(`/articles/${openArticleId}`, { replace: true });
  }, [openArticleId, navigate]);

  useEffect(() => {
    const fetchArticles = async () => {
      const params = { page, limit: 6, search };
      const cacheKey = buildCacheKey("/articles", { params });
      const cached = getCacheSnapshot(cacheKey);
      if (cached?.data?.data) {
        setArticles(cached.data.data);
        setMeta(cached.data.meta || { totalPages: 1 });
      }
      setIsLoading(!cached);
      try {
        const { data } = await swrGet("/articles", { params }, {
          ttlMs: 60 * 1000,
          onUpdate: (payload) => {
            setArticles(payload?.data || []);
            setMeta(payload?.meta || { totalPages: 1 });
          }
        });
        setArticles(data?.data || []);
        setMeta(data?.meta || { totalPages: 1 });
      } catch {
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
  }, [page, search]);

  const stripHtml = (html) =>
    html?.replace(/<[^>]*>/g, "").substring(0, 150) + "..." || "";

  const getReadDuration = (html = "") => {
    const plainText = String(html).replace(/<[^>]*>/g, " ");
    const words = plainText.split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.ceil(words / 190))} min baca`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getPublishedDate = (article) =>
    article?.approvedAt || article?.updatedAt || article?.createdAt;

  const resolveImageUrl = (imagePath) => {
    return resolveApiAssetUrl(imagePath);
  };

  return (
    <div className="page-stack space-y-6 sm:space-y-8">
      {/* Hero */}
      <PageHero
        titleAccent="Renungan"
        subtitle="Membaca renungan harian sebagai penguatan iman dan pengaharapan kita"
      />

      {/* Search */}
      <div className="input-leading-shell">
        <SearchIcon className="input-leading-icon" />
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Cari renungan..."
          className="input-modern"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
        </div>
      )}

      {/* Reflections Grid */}
      {!isLoading && articles.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article.id}
              onClick={() => navigate(`/articles/${article.id}`)}
              className="glass-card group flex flex-col overflow-hidden hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 cursor-pointer"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900 m-2 rounded-2xl shadow-inner">
                {article.image ? (
                  <img
                    src={resolveImageUrl(article.image)}
                    alt={article.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center">
                    <span className="text-5xl opacity-50">📖</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  {article.status || "Publik"}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
                  Renungan
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-zinc-950 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300 line-clamp-2">
                  {article.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300 flex-1">
                  {stripHtml(article.content)}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span>{formatDate(getPublishedDate(article))}</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold group-hover:translate-x-1 transition-transform">
                    Baca <span aria-hidden="true">&rarr;</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* No Reflections */}
      {!isLoading && articles.length === 0 && (
        <div className="glass-card py-14 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-brand-600 dark:text-brand-400">
            Tidak ada renungan yang ditemukan
          </p>
          {search && (
            <p className="text-sm text-brand-500 mt-2">
              Coba gunakan kata kunci yang berbeda
            </p>
          )}
        </div>
      )}

      {/* Pagination */}
      {articles.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-brand-200 dark:border-brand-700 px-4 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Sebelumnya
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                    page === p
                      ? "bg-primary text-white shadow-sm"
                      : "border border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-800/50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            {meta.totalPages > 5 && <span className="text-brand-400 px-1">...</span>}
          </div>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-brand-200 dark:border-brand-700 px-4 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  );
}

export default ArticlesPage;
