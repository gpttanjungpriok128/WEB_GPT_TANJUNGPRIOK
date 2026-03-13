import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function SettingsPage() {
  const { user } = useAuth();
  const [liveStreamUrl, setLiveStreamUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchLiveStream = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/live-stream");
        if (res.data?.youtubeUrl) setLiveStreamUrl(res.data.youtubeUrl);
      } catch {
        setLiveStreamUrl("");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLiveStream();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.put("/live-stream", { youtubeUrl: liveStreamUrl });
      setMessage({ type: "success", text: "Link live streaming berhasil diperbarui!" });
    } catch {
      setMessage({ type: "error", text: "Gagal memperbarui link live streaming." });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !["admin", "multimedia"].includes(user.role)) {
    return (
      <div className="glass-card p-10 text-center">
        <h2 className="text-2xl font-bold text-rose-500">Akses Ditolak</h2>
        <p className="text-brand-600 dark:text-brand-400 mt-2">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
      </div>
    );
  }

  return (
    <div className="page-stack space-y-8 sm:space-y-10">
      <section className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-900 dark:text-white">
          Pengaturan <span className="gradient-text">Website</span>
        </h1>
        <p className="text-lg text-brand-600 dark:text-brand-400">
          Kelola pengaturan umum website GPT Tanjung Priok
        </p>
      </section>

      <section className="glass-card p-8">
        <h2 className="text-2xl font-bold mb-6 text-brand-900 dark:text-white">
          🔴 Pengaturan Live Streaming
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-700 dark:text-brand-300">
                Link Embed YouTube
              </label>
              <input
                type="text"
                value={liveStreamUrl}
                onChange={(e) => setLiveStreamUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="input-modern"
              />
              <p className="text-sm text-brand-500 dark:text-brand-400 mt-2">
                Contoh: https://www.youtube.com/embed/dQw4w9WgXcQ
              </p>
            </div>
            {message.text && (
              <div className={`rounded-xl p-3 text-sm ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}>
                {message.text}
              </div>
            )}
            <button type="submit" disabled={isSaving} className="btn-primary disabled:opacity-60">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        )}
      </section>

      <section className="glass-card p-6">
        <h3 className="font-semibold mb-3 text-brand-800 dark:text-white">
          Cara Mendapatkan Link Embed:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-brand-700 dark:text-brand-300">
          <li>Buka video YouTube yang ingin disiarkan</li>
          <li>Klik tombol "Share" (Bagikan)</li>
          <li>Pilih opsi "Embed"</li>
          <li>Copy URL dari atribut src pada kode embed</li>
          <li>Contoh: https://www.youtube.com/embed/VIDEO_ID</li>
        </ol>
      </section>
    </div>
  );
}

export default SettingsPage;
