import { useState, useEffect } from "react";
import api from "../../services/api";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export default function ShippingTab({ isActive }) {
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingCostInput, setShippingCostInput] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const fetchShippingSettings = async () => {
    try {
      const { data } = await api.get("/store/admin/settings");
      const cost = data?.data?.shippingCost ?? 15000;
      setShippingCost(cost);
      setShippingCostInput(String(cost));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchShippingSettings();
      setFeedback({ type: "", text: "" });
    }
  }, [isActive]);

  const handleSaveShipping = async () => {
    setSavingShipping(true);
    setFeedback({ type: "", text: "" });
    try {
      await api.patch("/store/admin/settings", {
        shippingCost: Math.max(0, Number(shippingCostInput) || 0),
      });
      const newCost = Math.max(0, Number(shippingCostInput) || 0);
      setShippingCost(newCost);
      setFeedback({ type: "success", text: "Harga ongkir berhasil diperbarui." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal menyimpan harga ongkir.",
      });
    } finally {
      setSavingShipping(false);
    }
  };

  return (
    <section className="glass-card dense-card p-6">
      <h2 className="text-xl font-bold text-brand-900 dark:text-white">
        ⚙️ Pengaturan Ongkir
      </h2>
      
      {feedback.text && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium border ${
          feedback.type === 'success' 
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300' 
            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300'
        }`}>
          {feedback.text}
        </div>
      )}

      <p className="mt-4 text-xs text-brand-500 dark:text-brand-400">
        Harga ongkir saat ini: <strong>{formatRupiah(shippingCost)}</strong>
      </p>
      
      <div className="mt-6 space-y-4 max-w-md">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
            Harga Ongkir (Rp)
          </label>
          <input
            type="number"
            min="0"
            className="input-modern"
            value={shippingCostInput}
            onChange={(e) => setShippingCostInput(e.target.value)}
            placeholder="15000"
          />
          <p className="text-xs text-brand-500 dark:text-brand-400">
            Masukkan dalam satuan Rupiah (contoh: 15000 untuk Rp 15.000)
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveShipping}
          disabled={savingShipping}
          className="btn-primary !w-full !px-6 !py-3 disabled:opacity-60 font-semibold"
        >
          {savingShipping ? "🔄 Menyimpan..." : "✅ Simpan Pengaturan Ongkir"}
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-700 dark:bg-brand-900/20">
        <p className="text-sm font-semibold text-brand-900 dark:text-white">
          📌 Informasi Pengaturan Ongkir
        </p>
        <ul className="mt-2 space-y-1 text-xs text-brand-600 dark:text-brand-400 list-disc list-inside">
          <li>Ongkir yang diset di sini akan otomatis ditambahkan ke setiap pesanan</li>
          <li>Pelanggan akan melihat biaya ongkir saat checkout</li>
          <li>Perubahan ongkir hanya mempengaruhi pesanan yang dibuat setelah disimpan</li>
          <li>Anggap ongkir sudah termasuk dalam total harga ketika negosiasi dengan kurir</li>
        </ul>
      </div>
    </section>
  );
}
