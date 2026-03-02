import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import heroImage from "../img/hero-church.png";

function HomePage() {
  const { user } = useAuth();
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

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

  const resolveImageUrl = (imagePath) => {
    if (!imagePath) return "/src/img/logo1.png";
    if (imagePath.startsWith("http")) return imagePath;
    if (!imagePath.startsWith("/")) imagePath = "/" + imagePath;
    return `${serverUrl}${imagePath}`;
  };

  useEffect(() => {
    api
      .get("/articles", { params: { limit: 3 } })
      .then((res) => setFeaturedArticles(res.data.data))
      .catch(() => setFeaturedArticles([]));
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="cinematic-hero relative rounded-3xl text-white shadow-xl overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-800/75 to-brand-900/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* Decorative floating orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute h-72 w-72 rounded-full bg-white/10 animate-float blur-2xl"
            style={{ top: "-15%", right: "-8%" }}
          />
          <div
            className="absolute h-56 w-56 rounded-full bg-white/8 animate-float-delayed blur-3xl"
            style={{ bottom: "-20%", left: "-5%" }}
          />
        </div>

        <div className="relative z-10">
          {/* Text Content */}
          <div className="px-6 py-20 md:px-14 md:py-28 lg:py-32 max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/70 animate-text-reveal">
              Selamat Datang di
            </p>
            <h1 className="mb-2 text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] animate-text-reveal delay-1" style={{ animationFillMode: "both" }}>
              GPT Tanjung Priok
            </h1>
            <p className="mb-3 text-lg md:text-xl font-medium text-white/60 animate-text-reveal delay-2" style={{ animationFillMode: "both" }}>
              🌱 Growing Together
            </p>
            <p className="mb-8 text-base md:text-lg text-white/80 leading-relaxed max-w-lg animate-text-reveal delay-3" style={{ animationFillMode: "both" }}>
              Menjadi komunitas yang berakar dalam Kristus dan bertumbuh dalam
              kasih untuk saling melayani.
            </p>
            <div className="flex flex-wrap gap-3 animate-text-reveal delay-4" style={{ animationFillMode: "both" }}>
              <Link to="/schedules" className="btn-hero">
                📅 Jadwal Ibadah
              </Link>
              {user && (
                <Link
                  to="/prayer"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white border border-white/25 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
                >
                🙏 Kirim Permohonan Doa
              </Link>
            )}
          </div>
          </div>
        </div>
      </section>

      {/* Featured Content Grid */}
      <section
        className={`grid gap-6 ${user ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {[
          {
            icon: "📰",
            title: "Renungan",
            desc: "Baca renungan harian dan penguatan rohani untuk jemaat",
            link: "/articles",
            cta: "Baca Selengkapnya →",
          },
          {
            icon: "🖼️",
            title: "Galeri Kegiatan",
            desc: "Lihat foto kegiatan dan acara gereja terkini",
            link: "/gallery",
            cta: "Lihat Galeri →",
          },
          ...(user
            ? [
                {
                  icon: "📺",
                  title: "Ibadah Live",
                  desc: "Saksikan ibadah langsung dari youtube channel kami",
                  link: "/live",
                  cta: "Tonton Sekarang →",
                },
              ]
            : []),
        ].map((item, i) => (
          <div
            key={i}
            className="glass-card p-6 group"
          >
            <div className="mb-4 icon-box-glow h-12 w-12">
              <span className="text-xl">{item.icon}</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-brand-800 dark:text-white">
              {item.title}
            </h3>
            <p className="mb-4 text-sm text-brand-600 dark:text-brand-300 leading-relaxed">
              {item.desc}
            </p>
            <Link
              to={item.link}
              className="text-sm font-semibold text-primary hover:text-primary-light transition-colors dark:text-brand-300 dark:hover:text-white"
            >
              {item.cta}
            </Link>
          </div>
        ))}
      </section>

      {/* Featured Reflections */}
      {featuredArticles.length > 0 && (
        <section className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-brand-900 dark:text-white">
              Renungan Terbaru
            </h2>
            <p className="mt-2 text-brand-600 dark:text-brand-400">
              Kumpulan renungan terbaru dari komunitas kami
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredArticles.map((article) => (
              <article
                key={article.id}
                className="group overflow-hidden rounded-2xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900/40 transition-all duration-400 hover:shadow-glass-lg hover:-translate-y-1"
              >
                <div className="h-44 bg-gradient-to-br from-brand-300 to-primary relative overflow-hidden">
                  {article.image && (
                    <img
                      src={resolveImageUrl(article.image)}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase text-primary dark:text-brand-400 tracking-widest">
                    Renungan
                  </p>
                  <h3 className="mt-2 font-semibold text-brand-800 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-sm text-brand-600 dark:text-brand-300 line-clamp-2">
                    {article.content?.replace(/<[^>]*>/g, "").substring(0, 100)}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-brand-500 dark:text-brand-400">
                    <span>
                      {formatDate(getPublishedDate(article))}
                    </span>
                    <span className="text-primary font-medium">Baca →</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="text-center">
            <Link to="/articles" className="btn-primary">
              Lihat Semua Renungan →
            </Link>
          </div>
        </section>
      )}

      {/* About Section */}
      <section className="glass-card p-8 md:p-10">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-brand-800 dark:text-white">
              Tentang GPT Tanjung Priok
            </h2>
            <p className="mb-6 text-brand-700 dark:text-brand-300 leading-relaxed">
              GPT Tanjung Priok didirikan oleh Pdt. Agus Nelson Megawe pada
              tanggal 9 Januari 1972 dengan hanya 12 jiwa. Setelah Tuhan
              memanggil Pdt. Agus Nelson Megawe, penggembalaan dilanjutkan oleh
              putranya, Pdt. Jonatan Fredrik Megawe, pada tanggal 3 September
              2008.
            </p>
            <Link to="/about" className="btn-outline text-sm">
              Pelajari Lebih Lanjut →
            </Link>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-700 p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-6xl animate-float">⛪</div>
              <p className="font-bold text-lg text-brand-800 dark:text-white">
                GPT Tanjung Priok
              </p>
              <p className="text-sm text-brand-600 dark:text-brand-300 mt-1">
                Growing Together
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
