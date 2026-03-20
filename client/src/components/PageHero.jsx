function PageHero({ title, titleAccent, subtitle, tone = "default" }) {
  const isDense = tone === "dense";
  const hasAccent = Boolean(titleAccent);

  return (
    <section
      className={`page-hero-modern relative overflow-hidden rounded-[2.1rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,249,0.93))] px-5 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-[linear-gradient(180deg,rgba(10,14,12,0.98),rgba(8,11,10,0.94))] sm:px-8 sm:py-8 lg:px-12 ${
        isDense ? "lg:py-8" : "lg:py-11"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent dark:via-emerald-500/40" />
        <div className="absolute -left-16 top-0 h-52 w-52 rounded-full bg-emerald-100/90 blur-3xl dark:bg-emerald-950/70" />
        <div className="absolute bottom-[-3rem] left-[22%] h-28 w-28 rounded-full bg-emerald-200/60 blur-3xl dark:bg-emerald-900/40" />
        <div className="absolute inset-y-0 right-0 w-full sm:w-[58%] lg:w-[42%]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_34%)]" />
          <div className="absolute right-[-6%] top-[-12%] h-64 w-64 rounded-full border border-emerald-200/40 bg-white/20 blur-2xl dark:border-emerald-900/30 dark:bg-emerald-950/10" />
          <div className="absolute inset-y-8 right-8 hidden rounded-[2rem] border border-zinc-200/60 bg-white/[0.26] backdrop-blur sm:block lg:left-10 dark:border-zinc-800/80 dark:bg-white/[0.03]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(16,185,129,0.05)_48%,transparent_76%)] dark:bg-[linear-gradient(120deg,transparent,rgba(52,211,153,0.04)_48%,transparent_76%)]" />
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(280px,0.98fr)] lg:items-end">
        <div className="max-w-4xl">
          <div className="hero-reveal h-px w-16 bg-gradient-to-r from-emerald-500 via-emerald-300 to-transparent" />

          <div className="mt-5 space-y-2">
            {hasAccent ? (
              <>
                <p className="hero-reveal text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400 sm:text-xs">
                  {title}
                </p>
                <h1 className="hero-reveal delay-1 max-w-4xl text-3xl font-semibold leading-[0.98] tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-4xl lg:text-5xl">
                  <span className="text-zinc-950 dark:text-white">{titleAccent}</span>
                </h1>
              </>
            ) : (
              <h1 className="hero-reveal delay-1 max-w-4xl text-3xl font-semibold leading-[0.98] tracking-[-0.05em] text-zinc-950 dark:text-white sm:text-4xl lg:text-5xl">
                {title || "GPT Tanjung Priok"}
              </h1>
            )}
          </div>

          {subtitle ? (
            <p className="hero-reveal delay-2 mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="hidden lg:flex lg:justify-end">
          <div className="relative h-[220px] w-full max-w-[360px]">
            <div className="hero-reveal delay-2 absolute left-0 top-3 h-24 w-24 rounded-[1.8rem] border border-zinc-200/70 bg-white/[0.7] shadow-[0_16px_34px_rgba(15,23,42,0.05)] backdrop-blur dark:border-zinc-800 dark:bg-white/[0.04]" />
            <div className="hero-reveal delay-3 absolute left-14 top-14 h-16 w-40 rounded-full border border-emerald-200/70 bg-emerald-50/70 backdrop-blur dark:border-emerald-900/40 dark:bg-emerald-900/20" />
            <div className="hero-reveal delay-2 absolute right-0 top-0 h-32 w-32 rounded-[2.4rem] border border-zinc-200/70 bg-white/[0.65] shadow-[0_18px_38px_rgba(15,23,42,0.05)] backdrop-blur dark:border-zinc-800 dark:bg-white/[0.04]" />
            <div className="hero-reveal delay-3 absolute bottom-0 right-2 h-[132px] w-[270px] rounded-[2rem] border border-zinc-200/70 bg-white/[0.72] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur dark:border-zinc-800 dark:bg-white/[0.04]">
              <div className="h-2.5 w-20 rounded-full bg-emerald-500/70 dark:bg-emerald-400/60" />
              <div className="mt-4 space-y-3">
                <div className="h-3 rounded-full bg-zinc-200/90 dark:bg-zinc-800/90" />
                <div className="h-3 w-[82%] rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
                <div className="h-3 w-[68%] rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
              </div>
              <div className="mt-5 flex gap-2">
                <div className="h-9 w-9 rounded-full border border-zinc-200/80 bg-white/90 dark:border-zinc-800 dark:bg-white/[0.06]" />
                <div className="h-9 flex-1 rounded-full border border-zinc-200/80 bg-white/90 dark:border-zinc-800 dark:bg-white/[0.06]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PageHero;
