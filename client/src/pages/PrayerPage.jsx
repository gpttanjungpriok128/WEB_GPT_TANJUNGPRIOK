import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PageHero from "../components/PageHero";

function PrayerPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", request: "" });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [prayerRequests, setPrayerRequests] = useState([]);
  const [isPrayerLoading, setIsPrayerLoading] = useState(false);
  const [completingPrayerId, setCompletingPrayerId] = useState(null);
  const [deletingPrayerId, setDeletingPrayerId] = useState(null);
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

  const handleDeleteCompletedPrayer = async (id) => {
    const isConfirmed = window.confirm("Hapus permanen permohonan doa yang sudah selesai ini?");
    if (!isConfirmed) return;

    setDeletingPrayerId(id);
    setAdminMessage({ type: "", text: "" });

    try {
      await api.delete(`/prayer-requests/${id}`);
      setPrayerRequests((prev) => prev.filter((item) => item.id !== id));
      setAdminMessage({ type: "success", text: "Permohonan doa selesai berhasil dihapus." });
    } catch (error) {
      const message = error.response?.data?.message || "Gagal menghapus permohonan doa selesai.";
      setAdminMessage({ type: "error", text: message });
    } finally {
      setDeletingPrayerId(null);
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
    <div className="page-stack space-y-8 sm:space-y-10">
      {/* Hero */}
      <PageHero
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
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={item.isRead || completingPrayerId === item.id || deletingPrayerId === item.id}
                      onClick={() => handleCompletePrayer(item.id)}
                      className="btn-primary !text-sm !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: item.isRead ? "#94a3b8" : undefined }}
                    >
                      {item.isRead ? "Sudah Selesai" : completingPrayerId === item.id ? "Memproses..." : "Tandai Selesai"}
                    </button>
                    {item.isRead && (
                      <button
                        type="button"
                        disabled={deletingPrayerId === item.id || completingPrayerId === item.id}
                        onClick={() => handleDeleteCompletedPrayer(item.id)}
                        className="btn-outline !text-sm !px-4 !py-2 border-rose-500 text-rose-600 hover:!bg-rose-500 hover:!text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingPrayerId === item.id ? "Menghapus..." : "Hapus"}
                      </button>
                    )}
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
            <div key={i} className="glass-card relative overflow-hidden p-8 group hover:-translate-y-2 hover:shadow-xl transition-all duration-500">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-100/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 dark:bg-emerald-900/20 pointer-events-none" />
              <div className="relative z-10 icon-box-glow h-14 w-14 mb-5 shadow-sm group-hover:shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <span className="text-2xl">{item.icon}</span>
              </div>
              <h3 className="relative z-10 font-bold text-lg mb-2 text-brand-900 dark:text-white">{item.title}</h3>
              <p className="text-sm text-brand-600 dark:text-brand-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="md:col-span-2 glass-card relative overflow-hidden p-8 md:p-10 space-y-6 shadow-md hover:shadow-xl transition-shadow duration-500">
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-teal-100/40 rounded-full blur-3xl dark:bg-teal-900/20 pointer-events-none" />
          <h2 className="relative z-10 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
            Kirim Permohonan Doa
          </h2>

          <div className="relative z-10 space-y-2">
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
      <section className="glass-card relative overflow-hidden p-8 space-y-5 shadow-sm hover:shadow-md transition-shadow duration-300 mt-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 dark:bg-emerald-900/10 pointer-events-none" />
        <h3 className="relative z-10 font-bold text-xl tracking-tight text-brand-900 dark:text-white flex items-center gap-2">
          <span>ℹ️</span> Panduan Pengiriman Permohonan Doa
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
