import { Link } from "react-router-dom";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";

function ShopHero() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-emerald-900/30 bg-[#0b1712] shadow-[0_28px_70px_rgba(3,12,8,0.55)]">
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 h-full w-[62%]">
          <div
            className="absolute inset-0 bg-no-repeat opacity-90"
            style={{
              backgroundImage: `url(${gtshirtLogo})`,
              backgroundSize: "cover",
              backgroundPosition: "right center",
              filter: "saturate(0.95) brightness(0.8)"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1712] via-[#0b1712]/78 to-transparent" />
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-64 w-64 rounded-full bg-teal-400/15 blur-3xl" />
      </div>

      <div className="relative z-10 grid gap-8 px-6 py-10 md:px-10 md:py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-200/80">
            GTSHIRT STOREFRONT
          </p>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            Streetwear rohani yang clean, bold, dan siap dipakai setiap hari.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-emerald-100/80 sm:text-base">
            Koleksi kaos minimalist dari komunitas gereja. Checkout cepat, status order jelas, dan desain siap tampil.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/cart"
              className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
            >
              Lihat Keranjang
            </Link>
            <Link
              to="/shop"
              className="rounded-full border border-emerald-200/40 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200 hover:text-white"
            >
              Lihat Katalog
            </Link>
          </div>
        </div>

        <div className="relative min-h-[260px] lg:min-h-[360px]">
          <div className="absolute left-6 top-6 rounded-2xl border border-emerald-200/30 bg-black/55 px-4 py-3 text-xs backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
              Signature Drop
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Modern Worship Tee, Weekly Production.
            </p>
          </div>

          <div className="absolute bottom-6 left-6 rounded-2xl border border-emerald-200/30 bg-black/55 px-4 py-3 text-xs backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
              Order Flow
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Fast checkout & tracking.
            </p>
          </div>

          <div className="absolute bottom-6 right-6 rounded-2xl border border-emerald-200/30 bg-black/55 px-4 py-3 text-xs backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
              Brand Voice
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Clean. Bold. Faithful.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ShopHero;
