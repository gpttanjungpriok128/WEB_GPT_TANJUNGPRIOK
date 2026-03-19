import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PageHero from "../components/PageHero";
import { buildCacheKey, getCacheSnapshot, setCacheData, swrGet } from "../utils/swrCache";

function LivePage() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [liveStreamUrl, setLiveStreamUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchLive = async () => {
      const cacheKey = buildCacheKey("/live-stream");
      const cached = getCacheSnapshot(cacheKey);
      if (cached?.data?.youtubeUrl) {
        setUrl(cached.data.youtubeUrl);
        setLiveStreamUrl(cached.data.youtubeUrl);
      }
      setIsLoading(!cached);
      try {
        const { data } = await swrGet("/live-stream", {}, {
          ttlMs: 60 * 1000,
          onUpdate: (payload) => {
            const nextUrl = payload?.youtubeUrl || "";
            setUrl(nextUrl);
            setLiveStreamUrl(nextUrl);
          }
        });
        const currentUrl = data?.youtubeUrl || "";
        setUrl(currentUrl);
        setLiveStreamUrl(currentUrl);
      } catch {
        setUrl("");
        setLiveStreamUrl("");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLive();
  }, []);

  const normalizeYouTubeUrl = (value = "") => {
    const input = value.trim();
    if (!input) return "";
    if (input.includes("/embed/")) return input;
    try {
      const parsed = new URL(input);
      const host = parsed.hostname.replace("www.", "");
      if (host === "youtu.be") {
        const id = parsed.pathname.split("/").filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}` : input;
      }
      if (host.includes("youtube.com")) {
        const videoId = parsed.searchParams.get("v");
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        if (pathParts[0] === "shorts" && pathParts[1]) return `https://www.youtube.com/embed/${pathParts[1]}`;
        if (pathParts[0] === "live" && pathParts[1]) return `https://www.youtube.com/embed/${pathParts[1]}`;
      }
    } catch {
      return input;
    }
    return input;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    const normalizedUrl = normalizeYouTubeUrl(liveStreamUrl);
    if (!normalizedUrl) {
      setMessage({ type: "error", text: "Link live streaming tidak boleh kosong." });
      return;
    }
    setIsSaving(true);
    try {
      await api.put("/live-stream", { youtubeUrl: normalizedUrl });
      setLiveStreamUrl(normalizedUrl);
      setUrl(normalizedUrl);
      const cacheKey = buildCacheKey("/live-stream");
      setCacheData(cacheKey, { youtubeUrl: normalizedUrl }, 60 * 1000);
      setMessage({ type: "success", text: "Link live streaming berhasil diperbarui." });
    } catch {
      setMessage({ type: "error", text: "Gagal memperbarui link live streaming." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-stack space-y-8 sm:space-y-10">
      {/* Hero */}
      <PageHero
        title="Ibadah"
        titleAccent="Live Streaming"
        subtitle="Tetap dan selalu Beribadah, Memuji, dan Menyembah Tuhan bersama kami dari mana saja."
      />

      {/* Loading State */}
      {isLoading && (
        <div className="aspect-video rounded-2xl glass-card flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
        </div>
      )}

      {/* Admin/Multimedia Live Stream Input */}
      {["admin", "multimedia"].includes(user?.role) && (
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-brand-900 dark:text-white">Input Link Live Streaming</h2>
          <p className="text-sm text-brand-600 dark:text-brand-400">
            Kelola link live streaming untuk seluruh jemaat.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-brand-700 dark:text-brand-300">
                Link YouTube (embed / watch / youtu.be)
              </label>
              <input
                type="text"
                value={liveStreamUrl}
                onChange={(e) => {
                  setLiveStreamUrl(e.target.value);
                  if (message.text) setMessage({ type: "", text: "" });
                }}
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                className="input-modern"
              />
              <p className="mt-2 text-xs text-brand-500 dark:text-brand-400">
                Sistem otomatis mengubah link watch/share ke format embed.
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
              {isSaving ? "Menyimpan..." : "Simpan Link Live"}
            </button>
          </form>
        </section>
      )}

      {/* Live Stream */}
      {!isLoading && url ? (
        <div className="relative rounded-2xl overflow-hidden border border-brand-200 dark:border-brand-700 shadow-glass-lg">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-brand-400/10 to-primary/20 rounded-2xl blur-sm animate-pulse-glow pointer-events-none" />
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
            <iframe
              title="Live Streaming"
              src={url}
              className="h-full w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      ) : !isLoading ? (
        <div className="glass-card p-10 text-center">
          <div className="text-5xl mb-4">📺</div>
          <h2 className="text-2xl font-bold mb-2 text-brand-900 dark:text-white">
            Live Streaming Tidak Tersedia
          </h2>
          <p className="text-brand-600 dark:text-brand-400 mb-6 max-w-md mx-auto">
            Maaf, link live streaming belum diatur. Silakan hubungi administrator atau kunjungi jadwal ibadah untuk informasi lebih lanjut.
          </p>
          <a
            href="https://www.youtube.com/@ChurchName"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            🎥 Kunjungi Channel YouTube Kami
          </a>
        </div>
      ) : null}

      {/* Schedule Info */}
      <section className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-brand-800 dark:text-white">
          Jadwal Ibadah Live
        </h3>
        <ul className="space-y-3 text-sm text-brand-700 dark:text-brand-300">
          {[
            { icon: "📅", text: <><strong>Minggu:</strong> 09:00 WIB</> },
            { icon: "💡", text: "Live streaming dimulai 15 menit sebelum ibadah dimulai" },
            { icon: "🔄", text: "Koneksi internet stabil diperlukan untuk pengalaman terbaik" },
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default LivePage;
