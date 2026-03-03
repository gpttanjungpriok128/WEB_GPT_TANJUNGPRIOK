import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="page-stack min-h-[calc(100vh-280px)] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="text-8xl md:text-9xl font-extrabold gradient-text animate-text-reveal">
            404
          </div>
          <div className="absolute -top-4 -right-4 text-4xl animate-float">🔍</div>
          <div className="absolute -bottom-2 -left-4 text-3xl animate-float-delayed">✨</div>
        </div>
        <h2 className="text-2xl font-bold text-brand-800 dark:text-white animate-text-reveal delay-2" style={{ animationFillMode: "both" }}>
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-brand-600 dark:text-brand-400 max-w-md mx-auto animate-text-reveal delay-3" style={{ animationFillMode: "both" }}>
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan ke lokasi lain.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2 animate-text-reveal delay-4" style={{ animationFillMode: "both" }}>
          <Link to="/" className="btn-primary">
            Kembali ke Beranda
          </Link>
          <Link to="/contact" className="btn-outline">
            Hubungi Kami
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
