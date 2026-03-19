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
    <section className="relative overflow-hidden rounded-[2rem] border border-emerald-950/20 bg-[#0b1712] px-6 py-8 shadow-[0_28px_70px_rgba(3,12,8,0.42)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 right-0 w-full sm:w-[70%] lg:w-[56%]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-18 sm:opacity-28 lg:opacity-74"
            style={{ backgroundImage: `url(${gtshirtLogo})`, filter: "saturate(0.92) brightness(0.78)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08110d] via-[#08110d]/96 to-[#08110d]/48 sm:via-[#08110d]/88 lg:to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_38%)]" />
        </div>
        <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
      </div>

      <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(160deg,rgba(4,12,9,0.9),rgba(8,20,15,0.62))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
            <div className="hero-reveal inline-flex items-center gap-3 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-2 text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur">
              <img
                src={gtshirtLogo}
                alt="GTshirt"
                width="44"
                height="44"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/15"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-100/80">
                  Official Brand
                </p>
                <p className="truncate text-sm font-semibold text-white">GTshirtwear</p>
              </div>
            </div>
            <p className="hero-kicker hero-reveal mt-5 text-emerald-200/90">GTSHIRT STOREFRONT</p>
            <h1 className="hero-reveal delay-1 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.36)] sm:text-4xl lg:text-5xl">
              Streetwear rohani yang clean, bold, dan siap dipakai setiap hari.
            </h1>
            <p className="hero-reveal delay-2 mt-4 max-w-2xl text-sm leading-7 text-emerald-50/92 sm:text-base">
              Koleksi kaos minimalist dari komunitas gereja. Checkout cepat, status order jelas, dan desain siap tampil.
            </p>

            <div className="hero-reveal delay-3 mt-7 flex flex-wrap gap-3">
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

            <div className="hero-reveal delay-3 mt-6 lg:hidden">
              <div className="overflow-hidden rounded-[1.5rem] border border-emerald-200/20 bg-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.2)] backdrop-blur">
                <img
                  src={gtshirtLogo}
                  alt="Logo GTshirt"
                  width="768"
                  height="768"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="hero-reveal relative mb-4 hidden overflow-hidden rounded-[1.75rem] border border-emerald-200/20 bg-white/10 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur lg:block">
            <img
              src={gtshirtLogo}
              alt="Logo GTshirt"
              width="768"
              height="768"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="aspect-[5/3] w-full object-cover opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1712]/60 via-transparent to-transparent" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {HIGHLIGHTS.map(({ label, title, description, Icon }) => (
            <article
              key={label}
              className="hero-reveal rounded-[1.5rem] border border-emerald-200/20 bg-white/12 p-4 text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/70">
                    {label}
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-white">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/88">
                    {description}
                  </p>
                </div>
              </div>
            </article>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ShopHero;
