import { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import api from "../../services/api";
import { formatDateTime } from "../../utils/storeFormatters";

const STATUS_RANK = {
  new: 0, confirmed: 1, packed: 2, ready_pickup: 3, shipping: 3,
  picked_up: 4, completed: 4, cancelled: 5,
};
const SCAN_STATUS_LABELS = {
  packed: "dikemas", ready_pickup: "siap diambil", shipping: "shipping",
  picked_up: "sudah diambil", completed: "selesai", cancelled: "dibatalkan",
};

function resolveScanStatusLabel(status) {
  return SCAN_STATUS_LABELS[status] || status;
}

function normalizeQrMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["resi", "label", "shipping"].includes(normalized)) return "resi";
  if (["invoice", "inv", "pickup", "verify"].includes(normalized)) return "invoice";
  return normalized;
}

function parseOrderQrPayload(value) {
  const raw = String(value || "").trim();
  if (!raw) return { orderCode: "", mode: "", raw: "" };
  try {
    const url = new URL(raw);
    const orderCode = (
      url.searchParams.get("orderCode") || url.searchParams.get("code") || url.searchParams.get("order") || ""
    ).trim();
    const mode = normalizeQrMode(
      url.searchParams.get("mode") || url.searchParams.get("qr") || url.searchParams.get("type") || "",
    );
    return { orderCode, mode, raw };
  } catch {
    return { orderCode: raw, mode: "", raw };
  }
}

function isPickupShippingMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("ambil") || normalized.includes("pickup") ||
    normalized.includes("pick up") || normalized.includes("pick-up")
  );
}

function playScanBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => { ctx.close(); };
  } catch { /* ignore */ }
}

function triggerHaptic() {
  if (typeof window === "undefined") return;
  if (navigator?.vibrate) navigator.vibrate(20);
}

export default function ScanTab({ isActive, onGoToOrders }) {
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanSession, setScanSession] = useState(0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [lastScannedAt, setLastScannedAt] = useState(null);
  const [lastScannedMode, setLastScannedMode] = useState("");
  const [lastScannedStatus, setLastScannedStatus] = useState("");

  const qrVideoRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const scanStreamRef = useRef(null);
  const hasScannedRef = useRef(false);
  const recentScanRef = useRef({ code: "", at: 0 });

  const resolveScanTargetStatus = useCallback((order, mode) => {
    const isPickup = isPickupShippingMethod(order?.shippingMethod);
    if (mode === "invoice") return isPickup ? "picked_up" : "completed";
    return isPickup ? "ready_pickup" : "shipping";
  }, []);

  const updateOrderStatusFromScan = useCallback(async (orderId, orderCode, nextStatus) => {
    const targetStatus = nextStatus || "shipping";
    const targetLabel = resolveScanStatusLabel(targetStatus);

    // Fetch current order status from API
    let currentStatus;
    try {
      const { data } = await api.get(`/store/admin/orders/${orderId}`);
      currentStatus = data?.data?.status || data?.status;
    } catch {
      // fallback: just proceed
    }

    if (currentStatus === "cancelled") {
      setScanStatus(`${orderCode} dibatalkan`);
      return currentStatus;
    }
    if (currentStatus === targetStatus) {
      setScanStatus(`${orderCode} sudah ${targetLabel}`);
      return currentStatus;
    }
    if (currentStatus && STATUS_RANK[currentStatus] > STATUS_RANK[targetStatus]) {
      setScanStatus(`${orderCode} sudah ${resolveScanStatusLabel(currentStatus)}`);
      return currentStatus;
    }

    try {
      await api.patch(`/store/admin/orders/${orderId}/status`, { status: targetStatus });
      setScanStatus(`Status ${orderCode} → ${targetLabel}`);
      return targetStatus;
    } catch (error) {
      const serverMessage = error?.response?.data?.message;
      const hint = serverMessage && /status order tidak valid|enum/i.test(serverMessage)
        ? " Backend belum migrasi status pickup."
        : "";
      setScanError(serverMessage ? `${serverMessage}${hint}` : "Gagal memperbarui status order.");
      setScanStatus("");
      return currentStatus || targetStatus;
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (scanStreamRef.current) {
      scanStreamRef.current.getTracks().forEach((track) => track.stop());
      scanStreamRef.current = null;
    }
    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }
    hasScannedRef.current = false;
    setTorchEnabled(false);
    setTorchSupported(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!scanStreamRef.current) return;
    const track = scanStreamRef.current.getVideoTracks?.()[0];
    if (!track) return;
    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (!capabilities.torch) { setTorchSupported(false); return; }
      await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] });
      setTorchEnabled((prev) => !prev);
      setTorchSupported(true);
    } catch { setTorchSupported(false); }
  }, [torchEnabled]);

  useEffect(() => {
    if (!isActive) { stopScanner(); return; }
    if (typeof window === "undefined") return;

    let cancelled = false;
    const hasMedia = Boolean(navigator.mediaDevices?.getUserMedia);
    if (!hasMedia) { setScanError("Browser tidak mendukung akses kamera."); return; }

    const useNativeDetector = "BarcodeDetector" in window;
    const detector = useNativeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;

    const scanFrame = async () => {
      if (!qrVideoRef.current || hasScannedRef.current) return;
      if (qrVideoRef.current.readyState < 2) return;
      try {
        let rawValue = "";
        if (useNativeDetector && detector) {
          const results = await detector.detect(qrVideoRef.current);
          rawValue = results?.[0]?.rawValue || "";
        } else {
          const canvas = qrCanvasRef.current || document.createElement("canvas");
          qrCanvasRef.current = canvas;
          const width = qrVideoRef.current.videoWidth || 640;
          const height = qrVideoRef.current.videoHeight || 480;
          if (!width || !height) return;
          const size = Math.min(width, height);
          const cropSize = Math.min(size, 520);
          const targetSize = Math.min(420, cropSize);
          const sx = Math.floor((width - cropSize) / 2);
          const sy = Math.floor((height - cropSize) / 2);
          if (canvas.width !== targetSize) canvas.width = targetSize;
          if (canvas.height !== targetSize) canvas.height = targetSize;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(qrVideoRef.current, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);
          const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
          const code = jsQR(imageData.data, targetSize, targetSize, { inversionAttempts: "attemptBoth" });
          rawValue = code?.data || "";
        }

        if (!rawValue) return;
        const { orderCode, mode } = parseOrderQrPayload(rawValue);
        if (!orderCode) { setScanError("QR tidak berisi kode order."); return; }
        const normalized = orderCode.toUpperCase();
        const scanMode = normalizeQrMode(mode) || "resi";
        const now = Date.now();
        if (recentScanRef.current.code === normalized && now - recentScanRef.current.at < 1400) return;
        hasScannedRef.current = true;
        recentScanRef.current = { code: normalized, at: now };
        setLastScannedCode(normalized);
        setLastScannedAt(new Date());
        setLastScannedMode(scanMode);
        setScanStatus(`Memproses ${normalized}...`);
        setScanError("");
        playScanBeep();
        triggerHaptic();

        // Find order by code via API
        const { data: searchData } = await api.get("/store/admin/orders", {
          params: { search: normalized, limit: 1 },
        });
        const rows = Array.isArray(searchData?.data) ? searchData.data : [];
        const matched = rows.find((row) => String(row.orderCode || "").toUpperCase() === normalized);
        if (!matched) {
          setScanError("Order tidak ditemukan.");
          setScanStatus("");
          hasScannedRef.current = false;
          return;
        }
        const targetStatus = resolveScanTargetStatus(matched, scanMode);
        const updatedStatus = await updateOrderStatusFromScan(matched.id, normalized, targetStatus);
        setLastScannedStatus(resolveScanStatusLabel(updatedStatus));
        setTimeout(() => { hasScannedRef.current = false; }, 520);
      } catch {
        setScanError("Gagal membaca QR. Coba ulangi.");
        hasScannedRef.current = false;
      }
    };

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        scanStreamRef.current = stream;
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
          await qrVideoRef.current.play();
        }
        const track = stream.getVideoTracks?.()?.[0];
        const capabilities = track?.getCapabilities ? track.getCapabilities() : {};
        setTorchSupported(Boolean(capabilities?.torch));
        hasScannedRef.current = false;
        scanIntervalRef.current = window.setInterval(scanFrame, 360);
      } catch {
        setScanError("Gagal mengakses kamera. Pastikan izin kamera aktif.");
      }
    };

    startScanner();
    return () => { cancelled = true; stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, scanSession]);

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
          <video ref={qrVideoRef} className="h-72 w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-emerald-400/70" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-500 dark:text-brand-400">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            Standby: {isActive ? "Aktif" : "Nonaktif"}
          </span>
          {scanStatus && (
            <span className="rounded-full border border-brand-200 bg-white/80 px-2 py-1 font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {scanStatus}
            </span>
          )}
        </div>
        {scanError && (
          <p className="mt-2 text-xs font-semibold text-rose-500">{scanError}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setScanError(""); setScanStatus(""); setScanSession((prev) => prev + 1); }}
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
            onClick={() => onGoToOrders?.()}
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
