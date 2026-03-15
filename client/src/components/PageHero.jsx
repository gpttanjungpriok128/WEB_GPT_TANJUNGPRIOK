function PageHero({ image, title, titleAccent, subtitle, tone = "default" }) {
  const shadowClass = tone === "dense" ? "shadow-lg" : "shadow-xl";

  return (
    <section className={`page-hero page-hero-organic relative overflow-hidden ${shadowClass}`}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt=""
          className="hero-bg-media h-full w-full object-cover"
          loading="eager"
          fetchpriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03140d]/98 via-[#062417]/94 to-[#03140d]/92" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/56 to-black/34" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 py-12 sm:px-6 sm:py-14 md:px-12 md:py-20 lg:px-16">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight animate-text-reveal drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          {title}{" "}
          {titleAccent && (
            <span className="text-emerald-300">{titleAccent}</span>
          )}
        </h1>
        <p className="mt-3 text-sm sm:text-base md:text-lg text-white/90 max-w-2xl leading-relaxed animate-text-reveal delay-1 drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)]" style={{ animationFillMode: "both" }}>
          {subtitle}
        </p>
      </div>
    </section>
  );
}

export default PageHero;
