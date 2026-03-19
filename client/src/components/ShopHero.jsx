import { Link } from "react-router-dom";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
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

const HERO_NOTES = [
  { label: "Release", value: "Weekly Drop" },
  { label: "Tone", value: "Clean Streetwear" },
  { label: "Flow", value: "Fast Checkout" },
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
    <section className="relative overflow-hidden rounded-[2.1rem] border border-emerald-950/20 bg-[linear-gradient(135deg,#07120d_0%,#0d1d15_48%,#2c623c_100%)] px-4 py-5 shadow-[0_28px_70px_rgba(3,12,8,0.36)] sm:rounded-[2.25rem] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 right-[-8%] w-full sm:w-[72%] lg:w-[52%]">
          <div
            className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-[0.06] sm:opacity-[0.08] lg:opacity-[0.12]"
            style={{ backgroundImage: `url(${gtshirtLogo})`, filter: "saturate(0.88) brightness(0.82)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(7,18,13,0.92)] via-[rgba(7,18,13,0.72)] to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_34%)]" />
        </div>
        <div className="absolute left-[-3rem] top-[-2rem] h-44 w-44 rounded-full bg-emerald-400/[0.12] blur-3xl" />
        <div className="absolute bottom-[-3rem] right-[-1rem] h-56 w-56 rounded-full bg-emerald-300/[0.12] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#06100c]/50 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
      </div>

      <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <div className="max-w-[46rem] rounded-[1.7rem] border border-white/10 bg-[linear-gradient(160deg,rgba(4,12,9,0.84),rgba(8,24,16,0.58))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:rounded-[1.95rem] sm:p-6 lg:p-8">
            <div className="hero-reveal inline-flex items-center gap-3 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-2 text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur">
              <img
                src={gtshirtLogo}
                alt="GTshirt"
                width="44"
                height="44"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/[0.15]"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-100/80">
                  Official Brand
                </p>
                <p className="truncate text-sm font-semibold text-white">GTshirtwear</p>
              </div>
            </div>
            <p className="hero-kicker hero-reveal mt-4 text-emerald-200/90">GTSHIRT STOREFRONT</p>
            <h1 className="hero-reveal delay-1 max-w-4xl text-[2.45rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white drop-shadow-[0_12px_32px_rgba(0,0,0,0.32)] sm:text-4xl sm:leading-[0.96] lg:text-[3.7rem] lg:leading-[0.94] xl:text-[4.1rem]">
              Streetwear rohani yang clean, bold, dan siap dipakai setiap hari.
            </h1>
            <p className="hero-reveal delay-2 mt-4 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:mt-5 sm:text-base sm:leading-7">
              Koleksi kaos minimalist dari komunitas gereja. Checkout cepat, status order jelas, dan desain siap tampil.
            </p>

            <div className="hero-reveal delay-2 mt-4 flex flex-wrap gap-2 sm:mt-5">
              <span className="rounded-full border border-emerald-200/20 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/[0.85]">
                Checkout cepat
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/[0.85]">
                Tracking jelas
              </span>
              <span className="rounded-full border border-emerald-200/20 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/[0.85]">
                Desain clean
              </span>
            </div>

            <div className="hero-reveal delay-3 mt-5 flex flex-wrap gap-3 sm:mt-7">
              <Link
                to="/cart"
                className="tap-target inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
              >
                Lihat Keranjang
              </Link>
              <button
                type="button"
                onClick={handleScrollToCatalog}
                className="tap-target inline-flex items-center justify-center rounded-full border border-emerald-200/40 px-6 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-200 hover:bg-white/5"
              >
                Lihat Katalog
              </button>
            </div>

            <div className="hero-reveal delay-3 mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 sm:mt-7 sm:gap-3 sm:pt-4">
              {HERO_NOTES.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1rem] border border-white/[0.12] bg-white/[0.06] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[1.2rem] sm:px-4 sm:py-3"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-100/60 sm:text-[10px] sm:tracking-[0.22em]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.2)] sm:text-sm">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:col-span-5 lg:block">
          <div className="space-y-4">
            <div className="hero-reveal relative overflow-hidden rounded-[1.85rem] border border-emerald-200/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,#5d4036,#83594e)] dark:bg-[linear-gradient(135deg,#81584d,#a36f63)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_34%)]" />
                <img
                  src={gtshirtLogo}
                  alt="Logo GTshirt"
                  width="768"
                  height="768"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[5/3] w-full object-cover opacity-[0.94] brightness-[1.02] contrast-105 saturate-[1.02] dark:opacity-100 dark:brightness-[1.12] dark:contrast-110 dark:saturate-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,18,13,0.22)] via-transparent to-transparent" />
                <div className="absolute left-4 top-4 rounded-full border border-white/[0.14] bg-[rgba(8,18,13,0.42)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-50/80 backdrop-blur">
                  Official Drop
                </div>
                <div className="absolute bottom-4 left-4 rounded-2xl border border-white/[0.14] bg-[rgba(8,18,13,0.38)] px-4 py-3 backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
                    GTshirt Signature
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">Streetwear yang clean dan relevan</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {HIGHLIGHTS.map(({ label, title, description, Icon }) => (
                <article
                  key={label}
                  className="hero-reveal rounded-[1.5rem] border border-emerald-200/20 bg-white/10 p-4 text-white shadow-[0_14px_34px_rgba(0,0,0,0.14)] backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.94)] text-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/70">
                        {label}
                      </p>
                      <h2 className="mt-2 text-base font-semibold text-white">
                        {title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-emerald-50/[0.88]">
                        {description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ShopHero;
