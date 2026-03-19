function PageHero({ title, titleAccent, subtitle, tone = "default" }) {
  const heading = [title, titleAccent].filter(Boolean).join(" ") || "GPT Tanjung Priok";
  const isDense = tone === "dense";

  return (
    <section
      className={`page-hero-modern relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950 sm:px-8 sm:py-10 lg:px-12 ${
        isDense ? "lg:py-9" : "lg:py-12"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent dark:via-emerald-500/40" />
        <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-emerald-100 blur-3xl dark:bg-emerald-950/70" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-zinc-100 blur-3xl dark:bg-zinc-900" />
        <div className="absolute bottom-0 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-emerald-200/60 blur-3xl dark:bg-emerald-900/40" />
      </div>

      <div className="relative">
        <div className="max-w-4xl">
          <h1 className="hero-reveal max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white sm:text-4xl lg:text-5xl">
            {heading}
          </h1>
          {subtitle ? (
            <p className="hero-reveal delay-1 mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default PageHero;
