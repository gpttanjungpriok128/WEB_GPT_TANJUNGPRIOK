import { Link } from "react-router-dom";
import gtshirtImage from "../img/store/made-to-worship.png";

function ShopHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 shadow-2xl py-12 md:py-16">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 px-6 md:px-12 grid gap-8 md:gap-12 md:grid-cols-2 items-center">
        {/* Left Content */}
        <div className="space-y-6">
          {/* Label */}
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              GT Shirt Storefront
            </span>
          </div>

          {/* Main Heading */}
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.15]">
              Streetwear rohani yang{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">
                clean, bold, dan siap dipakai
              </span>{" "}
              setiap hari.
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-lg">
            Koleksi kaos minimalis dari komunitas gereja. Checkout cepat, status order jelas, dan desain siap tampil.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary hover:bg-primary-light text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/50"
            >
              📋 Lihat Katalog
            </Link>
            <Link
              to="/cart"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-primary/50 text-white font-semibold hover:border-primary hover:bg-primary/10 transition-all duration-300"
            >
              🛒 Lihat Keranjang
            </Link>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/10">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase text-primary tracking-wider">Order Flow</p>
              <p className="text-sm text-white/80">Fast Checkout & Tracking</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase text-emerald-300 tracking-wider">Brand Voice</p>
              <p className="text-sm text-white/80">Clean. Bold. Faithful.</p>
            </div>
          </div>
        </div>

        {/* Right Image & Details */}
        <div className="relative h-96 md:h-full flex items-center justify-center">
          {/* Decorative Label */}
          <div className="absolute top-8 right-8 z-20 glass-card p-4 backdrop-blur-md rounded-xl max-w-xs">
            <p className="text-xs font-bold uppercase text-primary tracking-widest">Signature Drop</p>
            <h3 className="text-lg font-bold text-white mt-2 leading-tight">Modern Worship Tee, Weekly Production</h3>
          </div>

          {/* Product Image */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-brand-900/20 blur-2xl" />
            <img
              src={gtshirtImage}
              alt="GTshirt Storefront"
              className="relative h-72 md:h-96 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Bottom Badge */}
          <div className="absolute bottom-8 left-8 z-20 glass-card p-4 backdrop-blur-md rounded-xl">
            <p className="text-xs font-bold uppercase text-emerald-300 tracking-widest">Order Center</p>
            <p className="text-sm text-white/90 mt-1">Lacak pesanan dari area toko</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ShopHero;
