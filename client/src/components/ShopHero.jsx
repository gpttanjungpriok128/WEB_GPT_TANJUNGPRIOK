import { Link } from "react-router-dom";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";
import {
  ShieldIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from "./SiteIcons";

const HIGHLIGHTS = [
  {
    label: "Koleksi",
    title: "Siap untuk ibadah dan keseharian.",
    description: "Pilihan kaos komunitas yang nyaman dipakai dalam berbagai kegiatan.",
    Icon: ShoppingBagIcon,
  },
  {
    label: "Pemesanan",
    title: "Pesan dan pantau dengan mudah.",
    description: "Status pesanan bisa dicek kembali kapan saja setelah checkout.",
    Icon: SparklesIcon,
  },
  {
    label: "Pelayanan",
    title: "Mendukung kebutuhan komunitas.",
    description: "Setiap pesanan menjadi bagian dari karya bersama di tengah jemaat.",
    Icon: ShieldIcon,
  },
];

const HERO_NOTES = [
  { label: "Bahan", value: "Nyaman" },
  { label: "Pesanan", value: "Mudah" },
  { label: "Komunitas", value: "Bersama" },
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
    <section className="relative overflow-hidden rounded-[2rem] border border-emerald-950/20 bg-[linear-gradient(135deg,#07120d_0%,#0d1d15_38%,#1d4630_72%,#356b47_100%)] px-4 py-4 shadow-[0_28px_70px_rgba(3,12,8,0.36)] sm:rounded-[2.3rem] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 right-[-8%] w-full sm:w-[72%] lg:w-[54%]">
          <div
            className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-[0.05] sm:opacity-[0.07] lg:opacity-[0.11]"
            style={{ backgroundImage: `url(${gtshirtLogo})`, filter: "saturate(0.88) brightness(0.82)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(7,18,13,0.95)] via-[rgba(7,18,13,0.72)] to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_34%)]" />
        </div>
        <div className="absolute left-[-3rem] top-[-2rem] h-44 w-44 rounded-full bg-emerald-400/[0.12] blur-3xl" />
        <div className="absolute bottom-[-3rem] right-[-1rem] h-56 w-56 rounded-full bg-emerald-300/[0.12] blur-3xl" />
        <div className="absolute right-10 top-10 hidden h-24 w-24 rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur lg:block" />
        <div className="absolute bottom-10 left-[46%] hidden h-16 w-36 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#06100c]/50 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
      </div>

      <div className="relative grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] lg:items-end">
        <div className="max-w-[46rem]">
          <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(155deg,rgba(4,12,9,0.84),rgba(8,24,16,0.58))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:rounded-[2rem] sm:p-6 lg:p-8">
            <div className="hero-reveal h-px w-16 bg-gradient-to-r from-emerald-300 via-emerald-200 to-transparent" />

            <div className="hero-reveal mt-4 inline-flex items-center gap-3 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-2 text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur">
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
                  Komunitas GTshirt
                </p>
                <p className="truncate text-sm font-semibold text-white">GTshirtwear</p>
              </div>
            </div>
            <p className="hero-kicker hero-reveal mt-4 text-emerald-200/90">KOLEKSI GTSHIRT</p>
            <h1 className="hero-reveal delay-1 max-w-4xl text-[2rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white drop-shadow-[0_12px_32px_rgba(0,0,0,0.32)] sm:text-4xl sm:leading-[0.96] lg:text-[3.6rem] lg:leading-[0.94] xl:text-[4rem]">
              Kaos komunitas yang nyaman dan siap dipakai setiap hari.
            </h1>
            <p className="hero-reveal delay-2 mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:mt-5 sm:text-base sm:leading-7">
              Koleksi kaos dari komunitas gereja untuk ibadah, pelayanan, dan kegiatan sehari-hari.
            </p>

            <div className="hero-reveal delay-3 mt-5 flex flex-wrap gap-2.5 sm:gap-3">
              <Link
                to="/cart"
                className="tap-target inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 sm:px-6 sm:py-3"
              >
                Lihat Keranjang
              </Link>
              <button
                type="button"
                onClick={handleScrollToCatalog}
                className="tap-target inline-flex items-center justify-center rounded-full border border-emerald-200/40 px-5 py-2.5 text-sm font-semibold text-emerald-50 transition hover:border-emerald-200 hover:bg-white/5 sm:px-6 sm:py-3"
              >
                Lihat Katalog
              </button>
            </div>

            <div className="hero-reveal delay-3 mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3 sm:hidden">
              {HERO_NOTES.map((item) => (
                <div
                  key={item.label}
                  className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <p className="text-[10px] font-semibold text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.2)]">
                    {item.label} · {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="hero-reveal delay-3 mt-5 hidden grid-cols-3 gap-3 border-t border-white/10 pt-4 sm:grid">
              {HERO_NOTES.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.2rem] border border-white/[0.12] bg-white/[0.06] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100/60">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.2)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="grid gap-4">
            <div className="hero-reveal relative overflow-hidden rounded-[2rem] border border-emerald-200/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur">
              <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[linear-gradient(135deg,#5d4036,#83594e)] dark:bg-[linear-gradient(135deg,#81584d,#a36f63)]">
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
                <div className="absolute bottom-4 left-4 right-4 rounded-[1.4rem] border border-white/[0.14] bg-[rgba(8,18,13,0.38)] px-4 py-3 backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
                    GTshirt Pilihan
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">Siap dipakai untuk ibadah dan keseharian</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/80">
                    Koleksi yang nyaman, sederhana, dan mudah dipadukan untuk berbagai kegiatan komunitas.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
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
