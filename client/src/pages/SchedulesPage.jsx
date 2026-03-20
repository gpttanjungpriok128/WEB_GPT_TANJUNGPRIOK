import { useEffect, useMemo, useState } from "react";
import PageHero from "../components/PageHero";
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
    <section className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-white mb-2">{title}</h2>
          <p className="text-base text-brand-600 dark:text-brand-400">
            {subtitle}
          </p>
        </div>
        <div className="inline-flex items-center self-start sm:self-auto rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 px-5 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-100/50 dark:border-emerald-800/50">
          <span className="relative flex h-2.5 w-2.5 mr-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          {data.length} Jadwal
        </div>
      </div>

      {data.length === 0 ? (
        <div className="glass-card py-16 text-center shadow-sm">
          <p className="text-lg text-brand-600 dark:text-brand-400">
            Belum ada jadwal pada kategori ini.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {data.map((item, index) => (
            <div
              key={item.id}
              className={`glass-card relative overflow-hidden p-7 group motion-card delay-${(index % 5) + 1}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/40 to-teal-200/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative z-10 flex gap-5">
                <div className="icon-box h-16 w-16 shrink-0 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 group-hover:-rotate-3">
                  <span className="text-3xl filter drop-shadow-sm">{getIcon(item.title)}</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-xl font-bold text-brand-900 dark:text-white group-hover:text-primary transition-colors tracking-tight">
                    {item.title}
                  </h3>
                  <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-200 border border-emerald-100/50 dark:border-emerald-800/50">
                    <span className="text-emerald-500">⏰</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
              {item.description && (
                <p className="relative z-10 mt-5 text-sm text-brand-600 dark:text-brand-300 leading-relaxed pl-[5.25rem]">
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
