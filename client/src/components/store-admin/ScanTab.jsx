export default function ScanTab({ ctx }) {
  const {
    qrVideoRef,
    isScannerActive,
    scanStatus,
    scanError,
    setScanError,
    setScanStatus,
    setScanSession,
    toggleTorch,
    torchSupported,
    torchEnabled,
    setActiveTab,
    lastScannedCode,
    lastScannedAt,
    lastScannedMode,
    lastScannedStatus,
    formatDateTime,
  } = ctx;

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <article className="glass-card dense-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
          Scanner Standby
        </p>
        <h3 className="mt-2 text-2xl font-bold text-brand-900 dark:text-white">
          Scan QR Resi / Invoice
        </h3>
        <p className="mt-2 text-sm text-brand-600 dark:text-brand-300">
          QR resi menandai pesanan menjadi <strong>siap diambil</strong> (ambil di gereja) atau <strong>shipping</strong> (kurir).
          QR invoice menandai pesanan menjadi <strong>sudah diambil</strong> / <strong>selesai</strong>.
        </p>

        <div className="mt-4 relative overflow-hidden rounded-2xl border border-brand-200 bg-black dark:border-brand-700">
          <video
            ref={qrVideoRef}
            className="h-72 w-full object-cover"
            muted
            playsInline
          />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-emerald-400/70" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-500 dark:text-brand-400">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            Standby: {isScannerActive ? "Aktif" : "Nonaktif"}
          </span>
          {scanStatus && (
            <span className="rounded-full border border-brand-200 bg-white/80 px-2 py-1 font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {scanStatus}
            </span>
          )}
        </div>
        {scanError && (
          <p className="mt-2 text-xs font-semibold text-rose-500">
            {scanError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setScanError("");
              setScanStatus("");
              setScanSession((prev) => prev + 1);
            }}
            className="rounded-xl border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
          >
            Restart Scanner
          </button>
          <button
            type="button"
            onClick={toggleTorch}
            disabled={!torchSupported}
            className="rounded-xl border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
          >
            {torchEnabled ? "Matikan Flash" : "Nyalakan Flash"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pesanan")}
            className="rounded-xl border border-brand-200 bg-white/80 px-4 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
          >
            Kembali ke Pesanan
          </button>
        </div>
      </article>

      <article className="glass-card dense-card p-6 space-y-4">
        <div>
          <h4 className="text-lg font-bold text-brand-900 dark:text-white">
            Log Scan Terakhir
          </h4>
          <p className="text-sm text-brand-600 dark:text-brand-400">
            Gunakan tab ini untuk scan cepat tanpa menutup kamera.
          </p>
        </div>

        {lastScannedCode ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200">
            <p className="font-semibold">Order: {lastScannedCode}</p>
            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
              Terakhir scan: {formatDateTime(lastScannedAt)}
            </p>
            <p className="mt-2 text-xs">
              QR: <strong>{lastScannedMode === "invoice" ? "Invoice" : "Resi"}</strong>
            </p>
            <p className="mt-1 text-xs">
              Status → <strong>{lastScannedStatus || "tersimpan"}</strong>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-brand-200 bg-white/80 p-4 text-sm text-brand-600 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            Belum ada QR yang discan.
          </div>
        )}

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
          Tips: pastikan cahaya cukup dan kamera fokus agar QR cepat terbaca.
        </div>
      </article>
    </section>
  );
}
