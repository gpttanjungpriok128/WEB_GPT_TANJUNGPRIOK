import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  GalleryIcon,
  PlayIcon,
  ShieldIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "../components/SiteIcons";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";

const COMMUNITY_LINKS = [
  {
    title: "Jadwal Ibadah",
    description: "Lihat ibadah mingguan, persekutuan, dan agenda gereja dari satu tempat.",
    link: "/schedules",
    cta: "Lihat jadwal",
    Icon: CalendarIcon,
    gridClass: "lg:col-span-4",
  },
  {
    title: "Renungan",
    description: "Baca renungan terbaru untuk menguatkan iman dan pengharapan setiap hari.",
    link: "/articles",
    cta: "Buka renungan",
    Icon: BookIcon,
    gridClass: "lg:col-span-4",
  },
  {
    title: "Galeri",
    description: "Lihat dokumentasi ibadah, pelayanan, dan kebersamaan jemaat dalam satu galeri.",
    link: "/gallery",
    cta: "Lihat galeri",
    Icon: GalleryIcon,
    gridClass: "lg:col-span-4",
  },
  {
    title: "GTshirt Store",
    description: "Temukan koleksi GTshirt untuk jemaat, komunitas, dan berbagai kegiatan pelayanan.",
    link: "/shop",
    cta: "Belanja sekarang",
    Icon: ShoppingBagIcon,
    gridClass: "lg:col-span-6",
  },
  {
    title: "Konten Live",
    description: "Ikuti siaran dan update pelayanan yang sedang berlangsung bersama komunitas.",
    link: "/live",
    cta: "Tonton live",
    Icon: PlayIcon,
    gridClass: "lg:col-span-6",
    requiresAuth: true,
  },
];

const COMMUNITY_VALUES = [
  {
    title: "Bertumbuh dalam firman",
    description: "Renungan dan pengajaran membantu jemaat terus dikuatkan dalam perjalanan iman.",
    Icon: BookIcon,
  },
  {
    title: "Hadir dalam persekutuan",
    description: "Jadwal, galeri, dan informasi kegiatan menolong jemaat tetap terhubung satu sama lain.",
    Icon: UsersIcon,
  },
  {
    title: "Melayani bersama",
    description: "Setiap bagian dihadirkan untuk mendukung pelayanan dan kebutuhan komunitas gereja.",
    Icon: ShieldIcon,
  },
];

const HOME_HERO_CARDS = [
  {
    label: "Ibadah",
    title: "Jadwal mingguan dan agenda jemaat",
    description: "Temukan waktu ibadah, persekutuan, dan kegiatan pelayanan dari satu tempat.",
    Icon: CalendarIcon,
  },
  {
    label: "Renungan",
    title: "Penguatan iman setiap hari",
    description: "Bacaan yang membantu jemaat terus bertumbuh dalam firman dan pengharapan.",
    Icon: BookIcon,
  },
  {
    label: "GTshirt",
    title: "Koleksi komunitas dan dukungan pelayanan",
    description: "Produk jemaat yang bisa dipesan untuk ibadah, event, dan kebersamaan komunitas.",
    Icon: ShoppingBagIcon,
  },
];

const FEATURED_ARTICLE_PARAMS = { limit: 3 };
const FEATURED_ARTICLE_CACHE_KEY = buildCacheKey("/articles", { params: FEATURED_ARTICLE_PARAMS });
const FEATURED_ARTICLE_SKELETONS = Array.from({ length: 3 }, (_, index) => index);

function HomePage() {
  const { user } = useAuth();
  const [featuredArticles, setFeaturedArticles] = useState(() => {
    if (typeof window === "undefined") return [];
    const snapshot = getCacheSnapshot(FEATURED_ARTICLE_CACHE_KEY);
    return Array.isArray(snapshot?.data?.data) ? snapshot.data.data : [];
  });
  const [articlesResolved, setArticlesResolved] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(getCacheSnapshot(FEATURED_ARTICLE_CACHE_KEY));
  });
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

  const communityCards = useMemo(
    () => COMMUNITY_LINKS.filter((item) => !item.requiresAuth || user),
    [user],
  );

  useEffect(() => {
    let isMounted = true;

    swrGet(
      "/articles",
      { params: FEATURED_ARTICLE_PARAMS },
      {
        ttlMs: 60 * 1000,
        onUpdate: (data) => {
          if (!isMounted) return;
          setFeaturedArticles(Array.isArray(data?.data) ? data.data : []);
          setArticlesResolved(true);
        },
      },
    )
      .then(({ data }) => {
        if (!isMounted) return;
        setFeaturedArticles(Array.isArray(data?.data) ? data.data : []);
        setArticlesResolved(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setFeaturedArticles([]);
        setArticlesResolved(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPublishedDate = (article) =>
    article?.approvedAt || article?.updatedAt || article?.createdAt;

  const stripHtml = (html = "") => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const resolveImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    if (!imagePath.startsWith("/")) return `${serverUrl}/${imagePath}`;
    return `${serverUrl}${imagePath}`;
  };

  return (
    <div className="page-stack space-y-6 sm:space-y-8 lg:space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-600 via-teal-700 to-brand-900 px-6 py-8 shadow-[0_20px_60px_rgba(16,185,129,0.2)] dark:border-emerald-800/50 dark:from-emerald-900 dark:via-teal-900 dark:to-emerald-950 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -left-16 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-[-3rem] left-[22%] h-28 w-28 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_38%)]" />
          <div className="absolute right-[-6%] top-[-12%] h-64 w-64 rounded-full border border-white/10 bg-white/5 blur-2xl" />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)] lg:items-end">
          <header className="max-w-3xl">
            <div className="hero-reveal inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100 shadow-[0_10px_24px_rgba(0,0,0,0.1)] backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Selamat Datang
            </div>
            <h1 className="hero-reveal delay-1 mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl drop-shadow-md">
              GPT Tanjung Priok
            </h1>
            <p className="hero-reveal delay-2 mt-3 text-lg font-medium text-emerald-100 sm:text-xl drop-shadow-sm">
              {"\ud83c\udf31 Growing Together"}
            </p>
            <p className="hero-reveal delay-2 mt-5 max-w-2xl text-sm leading-7 text-emerald-50/90 sm:text-base">
              Menjadi komunitas yang berakar dalam Kristus dan bertumbuh dalam kasih untuk saling melayani.
            </p>

            <div className="hero-reveal delay-3 mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-[0_10px_24px_rgba(0,0,0,0.1)] backdrop-blur">
                Komunitas
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-[0_10px_24px_rgba(0,0,0,0.1)] backdrop-blur">
                Ibadah
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-[0_10px_24px_rgba(0,0,0,0.1)] backdrop-blur">
                Pelayanan
              </span>
            </div>

            <div className="hero-reveal delay-3 mt-7 flex flex-wrap gap-3">
              <Link to="/schedules" className="btn-hero tap-target">
                {"\ud83d\udcc5 Jadwal Ibadah"}
              </Link>
              <Link to="/shop" className="btn-hero-outline tap-target">
                {"\ud83d\uded2 GTshirt Store"}
              </Link>
              {user && (
                <Link to="/prayer" className="btn-hero-outline tap-target">
                  {"\ud83d\ude4f Kirim Permohonan Doa"}
                </Link>
              )}
            </div>
          </header>

          <div className="hidden gap-3 lg:grid">
            <article className="hero-reveal delay-2 rounded-[1.7rem] border border-white/20 bg-white/10 p-5 shadow-[0_16px_36px_rgba(0,0,0,0.1)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/80">
                Komunitas Iman
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">
                Bertumbuh bersama dalam Kristus dan kasih.
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                Temukan jadwal, renungan, galeri, dan kebutuhan jemaat dalam satu ruang yang saling terhubung.
              </p>
            </article>

            <div className="grid gap-3 lg:grid-cols-1 xl:grid-cols-3">
              {HOME_HERO_CARDS.map(({ label, title, description, Icon }) => (
                <article
                  key={label}
                  className="hero-reveal delay-3 rounded-[1.4rem] border border-white/20 bg-white/10 p-4 backdrop-blur shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/80">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12" aria-label="Jelajahi konten utama">
        {communityCards.map(({ title, description, link, cta, Icon, gridClass }) => (
          <article
            key={title}
            className={`glass-card relative overflow-hidden p-8 group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl flex flex-col ${gridClass}`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-100/60 to-teal-100/30 rounded-full blur-3xl -translate-y-2/3 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 dark:from-emerald-900/40 dark:to-teal-900/20" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 dark:bg-zinc-900 dark:text-emerald-400 border border-emerald-50 dark:border-emerald-800/50">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400">
                Jelajahi
              </span>
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {description}
            </p>
            <Link
              to={link}
              className="tap-target mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              {cta}
              <ArrowRightIcon />
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <header className="rounded-[1.75rem] border border-zinc-200/80 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-4 lg:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            Nilai Komunitas
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
            Bertumbuh, bersekutu, dan melayani bersama.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            Kami rindu halaman ini menolong jemaat menemukan informasi, penguatan iman, dan kebutuhan pelayanan dalam satu tempat.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-3">
          {COMMUNITY_VALUES.map(({ title, description, Icon }, index) => (
            <article
              key={title}
              className="glass-card group p-7 hover:-translate-y-2 hover:shadow-xl transition-all duration-500 relative overflow-hidden"
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 dark:bg-emerald-900/30" />
              <div className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-md group-hover:shadow-lg group-hover:-rotate-3 transition-all duration-300 dark:bg-zinc-950 dark:text-emerald-400 border border-emerald-50 dark:border-emerald-800/50">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-white">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="featured-articles-heading" className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Latest Reflection
            </p>
            <h2
              id="featured-articles-heading"
              className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white"
            >
              Renungan terbaru dari komunitas.
            </h2>
          </div>
          <Link to="/articles" className="tap-target inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
            Lihat semua
            <ArrowRightIcon />
          </Link>
        </div>

        {featuredArticles.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {featuredArticles.map((article) => {
              const imageUrl = resolveImageUrl(article.image);
              return (
                <article
                  key={article.id}
                  className="glass-card group flex flex-col min-h-[24rem] overflow-hidden hover:-translate-y-2 hover:shadow-2xl transition-all duration-500"
                >
                  <Link to={`/articles?open=${article.id}`} aria-label={`Baca renungan ${article.title}`} className="flex flex-col h-full">
                    <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900 m-2 rounded-2xl shadow-inner">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={article.title}
                          loading="lazy"
                          decoding="async"
                          width="640"
                          height="480"
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/10 to-transparent" />
                    </div>
                    <div className="p-5 sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Renungan
                      </p>
                      <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-zinc-950 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                        {article.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                        {stripHtml(article.content).slice(0, 140)}
                      </p>
                      <div className="mt-5 flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <span>{formatDate(getPublishedDate(article))}</span>
                        <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                          Baca
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : !articlesResolved ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {FEATURED_ARTICLE_SKELETONS.map((item) => (
              <article
                key={`featured-article-skeleton-${item}`}
                className="glass-card flex min-h-[24rem] flex-col overflow-hidden"
              >
                <div className="m-2 aspect-[4/3] rounded-2xl skeleton" />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="h-3 w-24 rounded-full skeleton" />
                  <div className="mt-4 h-6 w-4/5 rounded-full skeleton" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-full rounded-full skeleton" />
                    <div className="h-4 w-11/12 rounded-full skeleton" />
                    <div className="h-4 w-2/3 rounded-full skeleton" />
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <div className="h-4 w-24 rounded-full skeleton" />
                    <div className="h-4 w-16 rounded-full skeleton" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-950/70">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Renungan terbaru akan muncul di sini setelah tersedia.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
