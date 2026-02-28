import { useEffect, useState } from "react";
import api from "../services/api";

function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/articles", {
          params: { page, limit: 6, search },
        });
        setArticles(res.data.data);
        setMeta(res.data.meta);
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
    if (!imagePath) return "";
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
    return `${serverUrl}${imagePath}`;
  };

  useEffect(() => {
    if (!selectedArticle) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const closeWithEsc = (event) => {
      if (event.key === "Escape") setSelectedArticle(null);
    };
    window.addEventListener("keydown", closeWithEsc);
    return () => {
      window.removeEventListener("keydown", closeWithEsc);
      document.body.style.overflow = "";
    };
  }, [selectedArticle]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-900 dark:text-white">
          <span className="gradient-text">Renungan</span>
        </h1>
        <p className="text-lg text-brand-600 dark:text-brand-400 max-w-2xl">
          Membaca renungan harian sebagai penguatan iman dan pengaharapan kita
        </p>
      </section>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400">🔍</span>
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Cari renungan..."
          className="input-modern !pl-11"
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
              onClick={() => setSelectedArticle(article)}
              className="group overflow-hidden rounded-2xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900/40 transition-all duration-400 cursor-pointer hover:shadow-glass-lg hover:-translate-y-1"
            >
              <div className="h-48 bg-gradient-to-br from-brand-300 via-brand-400 to-primary relative overflow-hidden">
                {article.image && (
                  <img
                    src={resolveImageUrl(article.image)}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-brand-900/90 backdrop-blur-sm text-primary dark:text-brand-300 text-xs font-semibold px-3 py-1 rounded-full">
                  {article.status}
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase text-primary dark:text-brand-400 tracking-widest">
                  Renungan
                </p>
                <h2 className="mt-2 font-semibold text-lg text-brand-800 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h2>
                <p className="mt-3 text-sm text-brand-600 dark:text-brand-400 line-clamp-3">
                  {stripHtml(article.content)}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-brand-500 dark:text-brand-400">
                  <span>{formatDate(getPublishedDate(article))}</span>
                  <span className="text-primary font-semibold group-hover:underline">Baca →</span>
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

      {/* Reflection Modal */}
      {selectedArticle && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedArticle(null)}
        >
          <article
            onClick={(event) => event.stopPropagation()}
            className="modal-content mx-4 flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-950 shadow-2xl"
          >
            <header className="relative border-b border-brand-200 dark:border-brand-700">
              {selectedArticle.image && (
                <div className="h-52 w-full overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900">
                  <img
                    src={resolveImageUrl(selectedArticle.image)}
                    alt={selectedArticle.title}
                    className="h-full w-full object-cover opacity-90"
                  />
                </div>
              )}

              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-lg text-white hover:bg-black/60 transition"
              >
                ✕
              </button>

              <div className="space-y-3 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary px-3 py-1 font-semibold uppercase tracking-wide text-white">
                    Renungan
                  </span>
                  <span className="rounded-full border border-brand-200 dark:border-brand-700 px-3 py-1 font-medium text-brand-600 dark:text-brand-300">
                    {selectedArticle.status}
                  </span>
                </div>
                <h2 className="text-2xl font-bold leading-tight md:text-3xl text-brand-900 dark:text-white">
                  {selectedArticle.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-brand-600 dark:text-brand-400">
                  <span>{formatDate(getPublishedDate(selectedArticle))}</span>
                </div>
              </div>
            </header>

            <div className="overflow-y-auto p-6 md:p-8">
              <div className="prose prose-slate max-w-none dark:prose-invert prose-p:leading-8 prose-p:text-base md:prose-p:text-lg prose-headings:font-bold">
                <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

export default ArticlesPage;
