function PageHero({ title, titleAccent, subtitle, tone = "default" }) {
  const isDense = tone === "dense";
  const hasAccent = Boolean(titleAccent);

  const getIllustration = () => {
    const t = String((title || "") + " " + (titleAccent || "")).toLowerCase();
    if (t.includes("tentang")) return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800"; // Changed to safely load (sprout)
    if (t.includes("jadwal")) return "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=800"; // Worship gathering
    if (t.includes("renungan")) return "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=800"; // Open Bible
    if (t.includes("galeri")) return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800"; // Joyful community gathering
    if (t.includes("ibadah") || t.includes("live")) return "https://images.unsplash.com/photo-1516280440502-6288344e66c6?auto=format&fit=crop&q=80&w=800"; // Live worship
    if (t.includes("permohonan") || t.includes("doa")) return "https://images.unsplash.com/photo-1516981879613-9f5da904015f?auto=format&fit=crop&q=80&w=800"; // Hands held in prayer
    if (t.includes("hubungi") || t.includes("kontak")) return "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=800"; // Supporting hands
    if (t.includes("keranjang") || t.includes("pesanan") || t.includes("lacak")) return "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800"; // Shop
    return "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800"; // Fallback: Sprout/Growing Together
  };

  return (
    <section
      className={`page-hero-modern relative overflow-hidden rounded-[2.1rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-600 via-teal-700 to-brand-900 px-5 py-6 shadow-[0_20px_60px_rgba(16,185,129,0.2)] dark:border-emerald-800/50 dark:from-emerald-900 dark:via-teal-900 dark:to-emerald-950 sm:px-8 sm:py-8 lg:px-12 ${
        isDense ? "lg:py-8" : "lg:py-11"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="absolute -left-16 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-3rem] left-[22%] h-28 w-28 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute inset-y-0 right-0 w-full sm:w-[58%] lg:w-[42%]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_38%)]" />
          <div className="absolute right-[-6%] top-[-12%] h-64 w-64 rounded-full border border-white/10 bg-white/5 blur-2xl" />
          <div className="absolute inset-y-8 right-8 hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur sm:block lg:left-10" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05)_48%,transparent_76%)]" />
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(280px,0.98fr)] lg:items-end">
        <div className="max-w-4xl">
          <div className="hero-reveal h-px w-16 bg-gradient-to-r from-emerald-500 via-emerald-300 to-transparent" />

          <div className="mt-5 space-y-2">
            {hasAccent ? (
              <>
                <p className="hero-reveal text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-100/80 sm:text-xs">
                  {title}
                </p>
                <h1 className="hero-reveal delay-1 max-w-4xl text-3xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl drop-shadow-md">
                  <span className="text-emerald-100">{titleAccent}</span>
                </h1>
              </>
            ) : (
              <h1 className="hero-reveal delay-1 max-w-4xl text-3xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl drop-shadow-md">
                {title || "GPT Tanjung Priok"}
              </h1>
            )}
          </div>

          {subtitle ? (
            <p className="hero-reveal delay-2 mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex w-full justify-center lg:w-auto lg:justify-end mt-4 lg:mt-0">
          <div className="relative h-[200px] w-full max-w-[320px] sm:h-[240px] sm:max-w-[380px] hero-reveal delay-2 group">
            <div className="absolute inset-0 rounded-[2rem] bg-emerald-500/20 blur-2xl group-hover:bg-emerald-400/30 transition-colors duration-700" />
            <div className="relative h-full w-full rounded-[2rem] border-4 border-white/20 shadow-2xl overflow-hidden transform group-hover:scale-[1.02] lg:group-hover:-rotate-2 lg:group-hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
              <img 
                src={getIllustration()} 
                alt={`${title || titleAccent || "Page"} Illustration`} 
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
              />
            </div>
            {/* Floating glass elements to maintain the premium glassmorphism feel */}
            <div className="absolute -left-4 top-4 h-12 w-12 sm:-left-6 sm:top-8 sm:h-16 sm:w-16 rounded-[1.2rem] border border-white/30 bg-white/20 backdrop-blur-md shadow-xl flex items-center justify-center animate-float">
              <span className="text-xl sm:text-2xl">✨</span>
            </div>
            <div className="absolute -right-2 bottom-6 h-10 w-10 sm:-right-4 sm:bottom-10 sm:h-12 sm:w-12 rounded-full border border-white/30 bg-white/20 backdrop-blur-md shadow-xl flex items-center justify-center animate-float-delayed">
              <span className="h-3 w-3 sm:h-4 sm:w-4 bg-emerald-300 rounded-full shadow-[0_0_15px_rgba(110,231,183,1)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PageHero;
