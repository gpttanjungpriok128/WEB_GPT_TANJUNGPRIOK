import { useEffect, useMemo, useState } from "react";
import PageHero from "../components/PageHero";
import heroImage from "../img/hero-schedules.webp";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";

function SchedulesPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      const cacheKey = buildCacheKey("/schedules");
      const cached = getCacheSnapshot(cacheKey);
      if (cached?.data) {
        setItems(Array.isArray(cached.data) ? cached.data : []);
      }
      setIsLoading(!cached);
      try {
        const { data } = await swrGet("/schedules", {}, {
          ttlMs: 5 * 60 * 1000,
          onUpdate: (payload) => {
            setItems(Array.isArray(payload) ? payload : []);
          }
        });
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const getCategory = (title = "") => {
    const normalized = title.toLowerCase();
    if (normalized.includes("sekolah minggu") || normalized.includes("kaum")) {
      return "kategorial";
    }
    return "umum";
  };

  const { ibadahUmum, ibadahKategorial } = useMemo(() => {
    const umum = items.filter((item) => getCategory(item.title) === "umum");
    const kategorial = items.filter(
      (item) => getCategory(item.title) === "kategorial"
    );
    return { ibadahUmum: umum, ibadahKategorial: kategorial };
  }, [items]);

  const getIcon = (title) => {
    const normalized = title.toLowerCase();
    if (normalized.includes("minggu raya")) return "⛪";
    if (normalized.includes("doa")) return "🙏";
    if (normalized.includes("alkitab")) return "📖";
    if (normalized.includes("sekolah minggu")) return "🧒";
    if (normalized.includes("kaum muda")) return "🧑";
    if (normalized.includes("kaum wanita")) return "👩";
    if (normalized.includes("kaum pria")) return "👨";
    return "📅";
  };

  const renderScheduleSection = (title, subtitle, data) => (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-900 dark:text-white">{title}</h2>
          <p className="text-sm text-brand-600 dark:text-brand-400 mt-1">
            {subtitle}
          </p>
        </div>
        <span className="rounded-full bg-gradient-to-r from-primary/10 to-brand-300/10 dark:from-primary/20 dark:to-brand-600/20 px-4 py-1.5 text-xs font-semibold text-primary dark:text-brand-300 border border-primary/20 dark:border-brand-600/30">
          {data.length} Jadwal
        </span>
      </div>

      {data.length === 0 ? (
        <div className="glass-card py-10 text-center">
          <p className="text-brand-600 dark:text-brand-400">
            Belum ada jadwal pada kategori ini.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((item) => (
            <div
              key={item.id}
              className="glass-card p-6 group border-l-4 !border-l-primary"
            >
              <div className="flex gap-4">
                <div className="icon-box h-14 w-14 shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">{getIcon(item.title)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-800 dark:text-white group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400">
                    <span>⏰</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
              {item.description && (
                <p className="mt-4 text-sm text-brand-700 dark:text-brand-300 leading-relaxed pl-[4.5rem]">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="page-stack space-y-8 sm:space-y-10">
      {/* Hero */}
      <PageHero
        image={heroImage}
        title="Jadwal"
        titleAccent="Ibadah"
        subtitle="Jadwal ibadah umum dan kategorial di GPT Tanjung Priok dan Volker."
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
        </div>
      )}

      {/* Schedule Sections */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-12">
          {renderScheduleSection(
            "Ibadah Umum",
            "Jadwal ibadah umum untuk seluruh jemaat",
            ibadahUmum
          )}
          <div className="section-divider" />
          {renderScheduleSection(
            "Ibadah Kategorial",
            "Jadwal ibadah berdasarkan kelompok pelayanan",
            ibadahKategorial
          )}
        </div>
      )}

      {/* No Schedules */}
      {!isLoading && items.length === 0 && (
        <div className="glass-card py-14 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-brand-600 dark:text-brand-400">
            Jadwal belum tersedia
          </p>
        </div>
      )}

      {/* Info Panel */}
      <section className="glass-card p-6">
        <div className="flex gap-4">
          <div className="icon-box-glow h-11 w-11 shrink-0">
            <span className="text-lg">ℹ️</span>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-brand-800 dark:text-white">
              Informasi Penting
            </h3>
            <ul className="text-sm text-brand-700 dark:text-brand-300 space-y-2">
              {[
                "Datang 15 menit lebih awal untuk persiapan",
                "Semua usia dan latar belakang diundang untuk bergabung",
                "Hubungi kami jika memiliki pertanyaan atau kebutuhan khusus",
                "Setiap kegiatan dilakukan dalam suasana yang hangat dan menyambut",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SchedulesPage;
