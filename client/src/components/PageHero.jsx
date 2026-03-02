function PageHero({ image, title, titleAccent, subtitle }) {
  return (
    <section className="page-hero relative rounded-3xl overflow-hidden shadow-xl">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/85 via-brand-800/70 to-brand-900/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-14 md:px-12 md:py-20">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight animate-text-reveal">
          {title}{" "}
          {titleAccent && (
            <span className="text-emerald-300">{titleAccent}</span>
          )}
        </h1>
        <p className="mt-3 text-base md:text-lg text-white/80 max-w-2xl leading-relaxed animate-text-reveal delay-1" style={{ animationFillMode: "both" }}>
          {subtitle}
        </p>
      </div>
    </section>
  );
}

export default PageHero;
