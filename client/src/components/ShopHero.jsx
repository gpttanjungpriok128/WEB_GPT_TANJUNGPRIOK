import { Link } from "react-router-dom";
import {
  ShieldIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from "./SiteIcons";

const HIGHLIGHTS = [
  {
    label: "Signature Drop",
    title: "Modern Worship Tee, Weekly Production.",
    description: "Drop utama GTshirt dengan ritme produksi mingguan dan karakter minimalist streetwear.",
    Icon: ShoppingBagIcon,
  },
  {
    label: "Order Flow",
    title: "Fast checkout & tracking.",
    description: "Alur belanja dibuat cepat dan jelas supaya jemaat bisa checkout tanpa ribet.",
    Icon: SparklesIcon,
  },
  {
    label: "Brand Voice",
    title: "Clean. Bold. Faithful.",
    description: "Visual GTshirt tetap sederhana, kuat, dan relevan dengan karakter komunitas.",
    Icon: ShieldIcon,
  },
];

function ShopHero() {
  const handleScrollToCatalog = () => {
    const target = document.getElementById("catalog-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 760, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-emerald-100 blur-3xl dark:bg-emerald-950/60" />
        <div className="absolute right-0 top-6 h-40 w-40 rounded-full bg-zinc-100 blur-3xl dark:bg-zinc-900" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent dark:via-emerald-500/30" />
      </div>

      <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="hero-kicker hero-reveal">GTSHIRT STOREFRONT</p>
          <h1 className="hero-reveal delay-1 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white sm:text-4xl lg:text-5xl">
            Streetwear rohani yang clean, bold, dan siap dipakai setiap hari.
          </h1>
          <p className="hero-reveal delay-2 mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
            Koleksi kaos minimalist dari komunitas gereja. Checkout cepat, status order jelas, dan desain siap tampil.
          </p>

          <div className="hero-reveal delay-3 mt-7 flex flex-wrap gap-3">
            <Link to="/cart" className="btn-primary tap-target">
              Lihat Keranjang
            </Link>
            <button
              type="button"
              onClick={handleScrollToCatalog}
              className="btn-outline tap-target"
            >
              Lihat Katalog
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {HIGHLIGHTS.map(({ label, title, description, Icon }) => (
            <article
              key={label}
              className="hero-reveal rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80"
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:bg-zinc-950 dark:text-zinc-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    {label}
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-zinc-950 dark:text-white">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ShopHero;
