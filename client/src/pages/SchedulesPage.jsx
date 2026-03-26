import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";

const FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "today", label: "Hari Ini" },
  { value: "thisWeek", label: "Minggu Ini" },
  { value: "umum", label: "Ibadah Umum" },
  { value: "kategorial", label: "Kategorial" },
];

function getCategory(title = "") {
  const normalized = title.toLowerCase();
  if (
    normalized.includes("sekolah minggu") ||
    normalized.includes("kaum muda") ||
    normalized.includes("kaum wanita") ||
    normalized.includes("kaum pria")
  ) {
    return "kategorial";
  }
  return "umum";
}

function getIcon(title = "") {
  const normalized = title.toLowerCase();
  if (normalized.includes("minggu raya")) return "⛪";
  if (normalized.includes("doa")) return "🙏";
  if (normalized.includes("alkitab")) return "📖";
  if (normalized.includes("sekolah minggu")) return "🧒";
  if (normalized.includes("kaum muda")) return "🧑";
  if (normalized.includes("kaum wanita")) return "👩";
  if (normalized.includes("kaum pria")) return "👨";
  return "📅";
}

function parseScheduleDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseScheduleTime(value = "") {
  const match = String(value).match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
}

function toScheduleDateString(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getScheduleDateTime(dateValue, timeValue) {
  const baseDate = dateValue instanceof Date ? new Date(dateValue) : parseScheduleDate(dateValue);
  if (!baseDate) return null;

  const parsedTime = parseScheduleTime(timeValue);
  if (parsedTime) {
    baseDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  } else {
    baseDate.setHours(23, 59, 59, 999);
  }

  return baseDate;
}

function hasSchedulePassed(dateValue, timeValue, reference = new Date()) {
  const scheduleDateTime = getScheduleDateTime(dateValue, timeValue);
  if (!scheduleDateTime) return false;
  return scheduleDateTime.getTime() < reference.getTime();
}

function getRecurringWeekNumbers(description = "") {
  const normalized = String(description).toLowerCase();
  if (!normalized.includes("minggu ke-")) return [];

  return [...normalized.matchAll(/ke-(\d)/g)]
    .map((match) => Number(match[1]))
    .filter((value, index, values) => Number.isInteger(value) && value > 0 && value < 6 && values.indexOf(value) === index)
    .sort((left, right) => left - right);
}

function getNthWeekdayOfMonth(year, month, weekday, occurrence) {
  const firstDayOfMonth = new Date(year, month, 1);
  const offset = (weekday - firstDayOfMonth.getDay() + 7) % 7;
  const dayOfMonth = 1 + offset + ((occurrence - 1) * 7);
  const candidate = new Date(year, month, dayOfMonth);

  if (candidate.getMonth() !== month) return null;
  return candidate;
}

function resolveWeeklyScheduleDate(baseDateValue, timeValue, reference = new Date()) {
  const baseDate = parseScheduleDate(baseDateValue);
  if (!baseDate) return baseDateValue;

  const nextDate = new Date(baseDate);
  while (hasSchedulePassed(nextDate, timeValue, reference)) {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  return toScheduleDateString(nextDate);
}

function resolveMonthlyScheduleDate(baseDateValue, timeValue, weekNumbers, reference = new Date()) {
  const baseDate = parseScheduleDate(baseDateValue);
  if (!baseDate || weekNumbers.length === 0) return baseDateValue;

  const weekday = baseDate.getDay();

  for (let monthOffset = 0; monthOffset < 18; monthOffset += 1) {
    const cursor = new Date(reference.getFullYear(), reference.getMonth() + monthOffset, 1);
    const nextCandidate = weekNumbers
      .map((weekNumber) => getNthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), weekday, weekNumber))
      .filter(Boolean)
      .find((candidate) => !hasSchedulePassed(candidate, timeValue, reference));

    if (nextCandidate) {
      return toScheduleDateString(nextCandidate);
    }
  }

  return baseDateValue;
}

function resolveScheduleDate(item, reference = new Date()) {
  const description = String(item?.description || "").toLowerCase();
  const weekNumbers = getRecurringWeekNumbers(description);

  if (weekNumbers.length > 0) {
    return resolveMonthlyScheduleDate(item?.date, item?.time, weekNumbers, reference);
  }

  if (description.includes("setiap")) {
    return resolveWeeklyScheduleDate(item?.date, item?.time, reference);
  }

  return item?.date;
}

function formatFullDate(value) {
  const date = parseScheduleDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value) {
  const date = parseScheduleDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

function getTemporalState(value, timeValue, reference = new Date()) {
  const date = parseScheduleDate(value);
  const scheduleDateTime = getScheduleDateTime(value, timeValue);
  if (!date || !scheduleDateTime) {
    return {
      key: "unknown",
      label: "Tanggal belum valid",
      accent: "border-brand-200 bg-brand-100 text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    };
  }

  const startOfToday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const endOfToday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  if (scheduleDateTime.getTime() < reference.getTime()) {
    return {
      key: "past",
      label: "Sudah lewat",
      accent: "border-brand-200 bg-brand-100 text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    };
  }

  if (date >= startOfToday && date <= endOfToday) {
    return {
      key: "today",
      label: "Hari ini",
      accent: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300",
    };
  }

  if (date > endOfToday && date <= endOfWeek) {
    return {
      key: "thisWeek",
      label: "Minggu ini",
      accent: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-900/20 dark:text-sky-300",
    };
  }

  if (date < startOfToday) {
    return {
      key: "past",
      label: "Sudah lewat",
      accent: "border-brand-200 bg-brand-100 text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    };
  }

  return {
    key: "upcoming",
    label: "Berikutnya",
    accent: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-300",
  };
}

function SchedulesPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      const cacheKey = buildCacheKey("/schedules");
      const cached = getCacheSnapshot(cacheKey);

      if (cached?.data) {
        setItems(Array.isArray(cached.data) ? cached.data : []);
      }

      setIsLoading(!cached);

      try {
        const { data } = await swrGet(
          "/schedules",
          {},
          {
            ttlMs: 5 * 60 * 1000,
            onUpdate: (payload) => {
              setItems(Array.isArray(payload) ? payload : []);
            },
          },
        );
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const scheduleEntries = useMemo(
    () =>
      [...items]
        .map((item) => {
          const resolvedDate = resolveScheduleDate(item, now);

          return {
            ...item,
            date: resolvedDate,
            category: getCategory(item.title),
            temporal: getTemporalState(resolvedDate, item.time, now),
            parsedDate: parseScheduleDate(resolvedDate),
          };
        })
        .sort((left, right) => {
          const leftTime = left.parsedDate?.getTime() || 0;
          const rightTime = right.parsedDate?.getTime() || 0;
          return leftTime - rightTime;
        }),
    [items, now],
  );

  const summary = useMemo(
    () => ({
      total: scheduleEntries.length,
      today: scheduleEntries.filter((item) => item.temporal.key === "today").length,
      thisWeek: scheduleEntries.filter(
        (item) => item.temporal.key === "today" || item.temporal.key === "thisWeek",
      ).length,
      kategorial: scheduleEntries.filter((item) => item.category === "kategorial").length,
    }),
    [scheduleEntries],
  );

  const featuredSchedules = useMemo(
    () =>
      scheduleEntries.filter(
        (item) => item.temporal.key === "today" || item.temporal.key === "thisWeek",
      ),
    [scheduleEntries],
  );

  const filteredSchedules = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return scheduleEntries.filter((item) => {
      const matchesSearch =
        !keyword ||
        `${item.title} ${item.description || ""} ${item.time || ""}`.toLowerCase().includes(keyword);

      if (!matchesSearch) return false;

      if (activeFilter === "all") return true;
      if (activeFilter === "today") return item.temporal.key === "today";
      if (activeFilter === "thisWeek") {
        return item.temporal.key === "today" || item.temporal.key === "thisWeek";
      }
      return item.category === activeFilter;
    });
  }, [activeFilter, scheduleEntries, searchQuery]);

  const handleCopySchedule = async (item) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(
        `${item.title}\n${formatFullDate(item.date)}\n${item.time}\n${item.description || "GPT Tanjung Priok"}`,
      );
      setCopyFeedback(`Detail jadwal "${item.title}" berhasil disalin.`);
      window.setTimeout(() => setCopyFeedback(""), 2500);
    } catch {
      setCopyFeedback("Browser tidak bisa menyalin detail jadwal.");
    }
  };

  return (
    <div className="page-stack space-y-6 sm:space-y-7">
      <PageHero
        title="Jadwal"
        titleAccent="Ibadah"
        subtitle="Cari jadwal paling dekat, filter berdasarkan kategori, dan salin detail ibadah dengan cepat."
      />

      <section className="overflow-hidden rounded-[2rem] border border-brand-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,250,247,0.94))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:border-brand-700 dark:bg-[linear-gradient(135deg,rgba(8,16,12,0.95),rgba(9,18,14,0.92))] sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Jadwal",
              value: String(summary.total),
              helper: "Semua kegiatan yang tampil di halaman ini",
            },
            {
              label: "Hari Ini",
              value: String(summary.today),
              helper: "Jadwal yang berlangsung tepat hari ini",
            },
            {
              label: "Minggu Ini",
              value: String(summary.thisWeek),
              helper: "Termasuk jadwal hari ini dan 6 hari ke depan",
            },
            {
              label: "Kategorial",
              value: String(summary.kategorial),
              helper: "Kegiatan per kelompok pelayanan atau usia",
            },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-[1.35rem] border border-brand-200/70 bg-white/90 p-4 dark:border-brand-700 dark:bg-white/[0.03]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-brand-500 dark:text-brand-400">
                {card.helper}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              Cari Jadwal
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari ibadah, doa, PA, sekolah minggu, atau waktu"
              className="input-modern !rounded-[1.15rem]"
            />
          </label>

          <Link
            to="/contact"
            className="flex min-h-[48px] items-center justify-center rounded-[1.15rem] border border-brand-300 bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40 xl:self-end"
          >
            Butuh Bantuan?
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => {
            const count =
              option.value === "all"
                ? summary.total
                : option.value === "today"
                  ? summary.today
                  : option.value === "thisWeek"
                    ? summary.thisWeek
                    : scheduleEntries.filter((item) => item.category === option.value).length;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveFilter(option.value)}
                className={`min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  activeFilter === option.value
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-brand-200 text-brand-700 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-200 dark:hover:bg-brand-800/40"
                }`}
              >
                {option.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {copyFeedback && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300">
          {copyFeedback}
        </section>
      )}

      {isLoading ? (
        <section className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-200 border-t-primary" />
        </section>
      ) : (
        <>
          {featuredSchedules.length > 0 && (
            <section className="rounded-[2rem] border border-emerald-200/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.88),rgba(255,255,255,0.95))] p-5 dark:border-emerald-900/40 dark:bg-[linear-gradient(135deg,rgba(6,24,16,0.95),rgba(10,18,14,0.9))] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                    Fokus Minggu Ini
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                    Jadwal paling dekat
                  </h2>
                </div>
                <p className="text-sm text-brand-600 dark:text-brand-300">
                  Prioritaskan ibadah yang berlangsung hari ini atau 6 hari ke depan.
                </p>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {featuredSchedules.slice(0, 4).map((item) => (
                  <article
                    key={`featured-${item.id}`}
                    className="rounded-[1.35rem] border border-white/70 bg-white/90 p-4 shadow-sm dark:border-brand-800 dark:bg-brand-950/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl shadow-sm dark:bg-emerald-900/30">
                          <span>{getIcon(item.title)}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold tracking-[-0.03em] text-brand-900 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
                            {formatFullDate(item.date)} • {item.time}
                          </p>
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.temporal.accent}`}>
                        {item.temporal.label}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {filteredSchedules.length === 0 ? (
            <section className="rounded-[2rem] border border-brand-200 bg-white/80 p-10 text-center dark:border-brand-700 dark:bg-brand-900/40">
              <div className="text-5xl">📭</div>
              <p className="mt-4 text-base font-semibold text-brand-800 dark:text-brand-200">
                Tidak ada jadwal yang cocok
              </p>
              <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
                Ubah kata kunci pencarian atau filter untuk melihat jadwal lain.
              </p>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-2">
              {filteredSchedules.map((item) => (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-[2rem] border border-brand-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-brand-700 dark:bg-brand-900/50"
                >
                  <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 translate-x-1/3 -translate-y-1/3 rounded-full bg-gradient-to-br from-emerald-200/45 to-teal-200/10 blur-3xl transition-transform duration-500 group-hover:scale-125 dark:from-emerald-900/30 dark:to-transparent" />
                  <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.3rem] bg-brand-100 text-3xl shadow-sm dark:bg-brand-800/60">
                        <span>{getIcon(item.title)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              item.category === "kategorial"
                                ? "border-brand-200 bg-brand-100 text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300"
                            }`}
                          >
                            {item.category === "kategorial" ? "Kategorial" : "Umum"}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.temporal.accent}`}>
                            {item.temporal.label}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                          {item.description || "Informasi detail kegiatan belum ditambahkan."}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-brand-200/80 bg-brand-50/80 px-3 py-2 text-right dark:border-brand-700 dark:bg-brand-900/30">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                        Tanggal
                      </p>
                      <p className="mt-2 text-lg font-semibold text-brand-900 dark:text-white">
                        {formatShortDate(item.date)}
                      </p>
                      <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">{item.time}</p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopySchedule(item)}
                      className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                    >
                      Salin Detail
                    </button>
                    <Link
                      to="/contact"
                      className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 dark:bg-white dark:text-brand-900 dark:hover:bg-brand-100"
                    >
                      Tanya Admin
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}

      <section className="rounded-[2rem] border border-brand-200 bg-white/85 p-6 dark:border-brand-700 dark:bg-brand-900/40">
        <div className="flex gap-4">
          <div className="icon-box-glow h-11 w-11 shrink-0">
            <span className="text-lg">ℹ️</span>
          </div>
          <div>
            <h3 className="font-semibold text-brand-800 dark:text-white">Panduan Singkat</h3>
            <div className="mt-3 space-y-2 text-sm leading-6 text-brand-700 dark:text-brand-300">
              <p>Datang 15 menit lebih awal supaya proses parkir, duduk, dan persiapan ibadah lebih tenang.</p>
              <p>Gunakan filter `Hari Ini` atau `Minggu Ini` kalau Anda hanya ingin melihat jadwal terdekat.</p>
              <p>Kalau jadwal perlu dikonfirmasi, gunakan tombol `Tanya Admin` supaya tidak salah datang.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SchedulesPage;
