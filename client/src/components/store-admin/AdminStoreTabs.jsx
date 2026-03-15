export default function AdminStoreTabs({ activeTab, setActiveTab, tabHidden }) {
  return (
    <div
      className={`admin-tabs flex gap-2 border-b border-brand-200 dark:border-brand-700 overflow-x-auto pb-1 ${
        tabHidden ? "admin-tabs-hidden" : ""
      }`}
    >
      <button
        onClick={() => setActiveTab("produk")}
        className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
          activeTab === "produk"
            ? "text-primary"
            : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
        }`}
      >
        📦 Produk GTshirt
        {activeTab === "produk" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
        )}
      </button>
      <button
        onClick={() => setActiveTab("pesanan")}
        className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
          activeTab === "pesanan"
            ? "text-primary"
            : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
        }`}
      >
        📬 Pesanan Masuk
        {activeTab === "pesanan" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
        )}
      </button>
      <button
        onClick={() => setActiveTab("scan")}
        className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
          activeTab === "scan"
            ? "text-primary"
            : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
        }`}
      >
        📷 Scan Resi
        {activeTab === "scan" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
        )}
      </button>
      <button
        onClick={() => setActiveTab("ulasan")}
        className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
          activeTab === "ulasan"
            ? "text-primary"
            : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
        }`}
      >
        ⭐ Ulasan Produk
        {activeTab === "ulasan" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
        )}
      </button>
      <button
        onClick={() => setActiveTab("laporan")}
        className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
          activeTab === "laporan"
            ? "text-primary"
            : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
        }`}
      >
        📈 Laporan
        {activeTab === "laporan" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
        )}
      </button>
      <button
        onClick={() => setActiveTab("ongkir")}
        className={`px-4 py-3 font-semibold transition relative whitespace-nowrap shrink-0 min-h-[44px] ${
          activeTab === "ongkir"
            ? "text-primary"
            : "text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white"
        }`}
      >
        ⚙️ Pengaturan Ongkir
        {activeTab === "ongkir" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t"></div>
        )}
      </button>
    </div>
  );
}
