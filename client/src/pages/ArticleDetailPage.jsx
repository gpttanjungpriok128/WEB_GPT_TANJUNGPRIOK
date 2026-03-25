import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { resolveApiAssetUrl } from "../config/env";
import DOMPurify from "dompurify";
import "../styles.article-detail.css";

function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchArticle = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const { data } = await api.get(`/articles/${id}`);
        if (active) {
          setArticle(data);
        }
      } catch (error) {
        if (active) {
          setArticle(null);
          setLoadError(error.response?.data?.message || "Renungan tidak ditemukan.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchArticle();
    return () => {
      active = false;
    };
  }, [id]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getPublishedDate = (entry) =>
    entry?.approvedAt || entry?.updatedAt || entry?.createdAt;

  const getReadDuration = useMemo(() => {
    const plainText = String(article?.content || "").replace(/<[^>]*>/g, " ");
    const words = plainText.split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.ceil(words / 190))} min baca`;
  }, [article?.content]);

  const resolveImageUrl = (imagePath) => {
    return resolveApiAssetUrl(imagePath);
  };

  return (
    <div className="page-stack space-y-5 sm:space-y-6">
      <section className="article-detail-shell">
        <div className="mb-3 md:mb-4">
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/70 dark:text-brand-200 dark:hover:bg-brand-800/60"
          >
            ← Kembali ke Renungan
          </Link>
        </div>

        {isLoading && (
          <div className="glass-card p-12">
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="glass-card p-8 text-center">
            <h2 className="text-2xl font-bold text-rose-500">Renungan Tidak Ditemukan</h2>
            <p className="mt-2 text-sm text-brand-600 dark:text-brand-400">{loadError}</p>
          </div>
        )}

        {!isLoading && article && (
          <article className="glass-card relative overflow-hidden p-6 md:p-10 lg:p-12 mb-10 shadow-sm hover:shadow-xl transition-shadow duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-emerald-900/10 pointer-events-none" />
            <header className="relative z-10 mb-8 pb-8 border-b border-brand-200/60 dark:border-brand-800/60">
              <h1 className="font-display text-3xl font-extrabold tracking-tight leading-tight text-brand-900 dark:text-white md:text-5xl">
                {article.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-medium text-brand-600 dark:text-brand-400">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50/80 dark:bg-brand-900/40 border border-brand-200/50 dark:border-brand-800/50 shadow-sm">
                  📅 {formatDate(getPublishedDate(article))}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50/80 dark:bg-brand-900/40 border border-brand-200/50 dark:border-brand-800/50 shadow-sm">
                  ⏱️ {getReadDuration}
                </span>
              </div>
            </header>

            {article.image && (
              <figure className="relative z-10 mb-10 overflow-hidden rounded-[1.5rem] shadow-md border border-brand-200/50 dark:border-brand-800/50">
                <img
                  src={resolveImageUrl(article.image)}
                  alt={article.title}
                  loading="eager"
                  decoding="async"
                  className="w-full object-cover max-h-[500px]"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </figure>
            )}

            <div className="relative z-10 article-reader-content article-detail-content">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} />
            </div>
          </article>
        )}
      </section>
    </div>
  );
}

export default ArticleDetailPage;
