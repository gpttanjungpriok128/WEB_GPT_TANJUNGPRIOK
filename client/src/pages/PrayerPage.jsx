import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PageHero from "../components/PageHero";
import heroImage from "../img/hero-prayer.jpeg";

function PrayerPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", request: "" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [prayerRequests, setPrayerRequests] = useState([]);
  const [isPrayerLoading, setIsPrayerLoading] = useState(false);
  const [completingPrayerId, setCompletingPrayerId] = useState(null);
  const [adminMessage, setAdminMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user?.role !== "admin") return;
    const fetchPrayerRequests = async () => {
      setIsPrayerLoading(true);
      try {
        const res = await api.get("/prayer-requests");
        setPrayerRequests(Array.isArray(res.data) ? res.data : []);
      } catch {
        setPrayerRequests([]);
      } finally {
        setIsPrayerLoading(false);
      }
    };
    fetchPrayerRequests();
  }, [user]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Nama harus diisi";
    if (!form.request.trim()) newErrors.request = "Permohonan harus diisi";
    if (form.request.trim().length < 10) newErrors.request = "Permohonan minimal 10 karakter";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      await api.post("/prayer-requests", form);
      setForm({ name: "", request: "" });
      setMessage("✓ Permohonan doa berhasil dikirim. Terima kasih telah berbagi dengan kami.");
      setTimeout(() => setMessage(""), 5000);
    } catch {
      setMessage("✗ Gagal mengirim permohonan doa. Silakan coba lagi nanti.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletePrayer = async (id) => {
    setCompletingPrayerId(id);
    setAdminMessage({ type: "", text: "" });
    try {
      await api.put(`/prayer-requests/${id}/complete`);
      setPrayerRequests((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      setAdminMessage({ type: "success", text: "Permohonan doa ditandai selesai." });
    } catch {
      setAdminMessage({ type: "error", text: "Gagal menandai permohonan doa sebagai selesai." });
    } finally {
      setCompletingPrayerId(null);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <PageHero
        image={heroImage}
        title="Permohonan"
        titleAccent="Doa"
        subtitle="Bagikan kebutuhan doa Anda dengan komunitas kami. Kami akan mendoakan Anda dengan sepenuh hati."
      />

      {/* Admin Section */}
      {user?.role === "admin" && (
        <section className="glass-card p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-brand-900 dark:text-white">Permohonan Doa Jemaat</h2>
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-400">
              Kelola pergumulan jemaat dan tandai selesai saat doa sudah dijawab.
            </p>
          </div>

          {adminMessage.text && (
            <div className={`rounded-xl p-3 text-sm ${
              adminMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}>
              {adminMessage.text}
            </div>
          )}

          {isPrayerLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
            </div>
          ) : prayerRequests.length === 0 ? (
            <div className="glass-card py-8 text-center">
              <p className="text-brand-600 dark:text-brand-400">Belum ada permohonan doa yang masuk.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prayerRequests.map((item) => (
                <div key={item.id} className="glass-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-800 dark:text-white">{item.name}</p>
                      <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">
                        Dikirim: {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.isRead
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    }`}>
                      {item.isRead ? "Selesai" : "Belum Selesai"}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-brand-700 dark:text-brand-300 leading-relaxed">
                    {item.request}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={item.isRead || completingPrayerId === item.id}
                      onClick={() => handleCompletePrayer(item.id)}
                      className="btn-primary !text-sm !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: item.isRead ? "#94a3b8" : undefined }}
                    >
                      {item.isRead ? "Sudah Selesai" : completingPrayerId === item.id ? "Memproses..." : "Tandai Selesai"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-3">
        {/* Info Cards */}
        <div className="md:col-span-1 space-y-4">
          {[
            { icon: "🙏", title: "Doa Bersama", desc: "Permohonan Anda akan dijadikan bahan doa dalam persekutuan komunitas kami." },
            { icon: "🤝", title: "Dukungan", desc: "Tim pastoral kami siap mendengarkan dan memberikan dukungan spiritual kepada Anda." },
            { icon: "💌", title: "Kerahasiaan", desc: "Data Anda dijaga dengan aman dan hanya digunakan untuk kepentingan doa bersama." },
          ].map((item, i) => (
            <div key={i} className="glass-card p-5 group">
              <div className="icon-box-glow h-11 w-11 mb-3 group-hover:scale-110 transition-transform duration-300">
                <span className="text-lg">{item.icon}</span>
              </div>
              <h3 className="font-semibold mb-2 text-brand-800 dark:text-white">{item.title}</h3>
              <p className="text-sm text-brand-600 dark:text-brand-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="md:col-span-2 glass-card p-8 space-y-5">
          <h2 className="text-2xl font-bold text-brand-900 dark:text-white">
            Kirim Permohonan Doa
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              placeholder="Nama Anda"
              className={`input-modern ${errors.name ? "!border-rose-400 !ring-rose-100" : ""}`}
            />
            {errors.name && <p className="text-sm text-rose-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Isi Permohonan Doa *</label>
            <textarea
              required
              rows="7"
              value={form.request}
              onChange={(e) => {
                setForm({ ...form, request: e.target.value });
                if (errors.request) setErrors({ ...errors, request: "" });
              }}
              placeholder="Ceritakan kebutuhan doa Anda dengan detail... (minimal 10 karakter)"
              className={`input-modern resize-none ${errors.request ? "!border-rose-400 !ring-rose-100" : ""}`}
            />
            {errors.request && <p className="text-sm text-rose-500">{errors.request}</p>}
            <p className="text-xs text-brand-500 dark:text-brand-400">
              {form.request.length} / 10+ karakter
            </p>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
            {isSubmitting ? "✓ Mengirim..." : "🙏 Kirim Permohonan Doa"}
          </button>

          {message && (
            <div className={`rounded-xl p-4 text-center font-medium text-sm ${
              message.startsWith("✓")
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>

      {/* Prayer Guidelines */}
      <section className="glass-card p-6 space-y-4">
        <h3 className="font-semibold text-lg text-brand-800 dark:text-white">
          Panduan Pengiriman Permohonan Doa
        </h3>
        <ul className="space-y-2.5 text-sm text-brand-700 dark:text-brand-300">
          {[
            "Ceritakan kebutuhan Anda dengan jelas dan spesifik untuk doa yang lebih terarah",
            "Anda dapat mengirimkan permohonan doa dalam kondisi apapun - baik untuk kesembuhan, pekerjaan, keluarga, atau hal lainnya",
            "Permohonan Anda akan dibaca dan dijadikan bahan doa dalam pertemuan komunitas kami",
            "Jika perlu bantuan lebih lanjut, tim pastoral kami akan menghubungi Anda",
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default PrayerPage;
