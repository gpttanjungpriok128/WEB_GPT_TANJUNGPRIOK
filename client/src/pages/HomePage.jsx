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
  SparklesIcon,
  UsersIcon,
} from "../components/SiteIcons";
import { swrGet } from "../utils/swrCache";

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
    description: "Akses bacaan terbaru dengan layout bersih dan cepat dibaca di mobile.",
    link: "/articles",
    cta: "Buka renungan",
    Icon: BookIcon,
    gridClass: "lg:col-span-4",
  },
  {
    title: "Galeri",
    description: "Album kegiatan gereja ditata dengan grid ringan dan native lazy loading.",
    link: "/gallery",
    cta: "Lihat galeri",
    Icon: GalleryIcon,
    gridClass: "lg:col-span-4",
  },
  {
    title: "GTshirt Store",
    description: "Katalog produk dengan fokus ke gambar, stok, dan CTA yang jelas.",
    link: "/shop",
    cta: "Belanja sekarang",
    Icon: ShoppingBagIcon,
    gridClass: "lg:col-span-6",
  },
  {
    title: "Konten Live",
    description: "Streaming dan update pelayanan tersedia cepat tanpa elemen visual yang berat.",
    link: "/live",
    cta: "Tonton live",
    Icon: PlayIcon,
    gridClass: "lg:col-span-6",
    requiresAuth: true,
  },
];

const DESIGN_PRINCIPLES = [
  {
    title: "Mobile-first layout",
    description: "Semua section dimulai dari satu kolom, lalu berkembang ke grid 12 kolom di desktop.",
    Icon: SparklesIcon,
  },
  {
    title: "Cheap animations",
    description: "Reveal dan hover hanya memakai transform dan opacity untuk menjaga frame rate tetap stabil.",
    Icon: ShieldIcon,
  },
  {
    title: "Content clarity",
    description: "Whitespace lebih lega, hierarchy lebih tajam, dan CTA dibuat mudah dipindai dalam beberapa detik.",
    Icon: UsersIcon,
  },
];

function HomePage() {
  const { user } = useAuth();
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

  const communityCards = useMemo(
    () => COMMUNITY_LINKS.filter((item) => !item.requiresAuth || user),
    [user],
  );

  useEffect(() => {
    let isMounted = true;
    const params = { limit: 3 };

    swrGet(
      "/articles",
      { params },
      {
        ttlMs: 60 * 1000,
        onUpdate: (data) => {
          if (!isMounted) return;
          setFeaturedArticles(Array.isArray(data?.data) ? data.data : []);
        },
      },
    )
      .then(({ data }) => {
        if (!isMounted) return;
        setFeaturedArticles(Array.isArray(data?.data) ? data.data : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setFeaturedArticles([]);
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
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-emerald-100 blur-3xl dark:bg-emerald-950/60" />
          <div className="absolute right-0 top-6 h-40 w-40 rounded-full bg-zinc-100 blur-3xl dark:bg-zinc-900" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent dark:via-emerald-500/40" />
        </div>

        <div className="relative">
          <header className="max-w-3xl">
            <p className="hero-kicker hero-reveal">Selamat Datang di</p>
            <h1 className="hero-reveal delay-1 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-5xl lg:text-6xl">
              GPT Tanjung Priok
            </h1>
            <p className="hero-reveal delay-2 mt-3 text-lg font-medium text-zinc-500 dark:text-zinc-400 sm:text-xl">
              {"\ud83c\udf31 Growing Together"}
            </p>
            <p className="hero-reveal delay-2 mt-5 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
              Menjadi komunitas yang berakar dalam Kristus dan bertumbuh dalam kasih untuk saling melayani.
            </p>

            <div className="hero-reveal delay-3 mt-7 flex flex-wrap gap-3">
              <Link to="/schedules" className="btn-primary tap-target">
                {"\ud83d\udcc5 Jadwal Ibadah"}
              </Link>
              <Link to="/shop" className="btn-outline tap-target">
                {"\ud83d\uded2 GTshirt Store"}
              </Link>
              {user && (
                <Link to="/prayer" className="btn-outline tap-target">
                  {"\ud83d\ude4f Kirim Permohonan Doa"}
                </Link>
              )}
            </div>
          </header>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12" aria-label="Jelajahi konten utama">
        {communityCards.map(({ title, description, link, cta, Icon, gridClass }) => (
          <article
            key={title}
            className={`motion-item rounded-[1.5rem] border border-zinc-200/80 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.04)] transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${gridClass}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400">
                Quick Access
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
            Design Direction
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white">
            Minimal, cepat, dan tetap terasa hangat.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            Kami menjaga tampilan tetap modern dengan whitespace lega, border tipis, dan motion halus yang tidak membebani render pipeline.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-3">
          {DESIGN_PRINCIPLES.map(({ title, description, Icon }, index) => (
            <article
              key={title}
              className="motion-item rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/70"
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:bg-zinc-950 dark:text-zinc-100">
                <Icon className="h-5 w-5" />
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
                  className="group overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.04)] transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <Link to={`/articles?open=${article.id}`} aria-label={`Baca renungan ${article.title}`}>
                    <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={article.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
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
