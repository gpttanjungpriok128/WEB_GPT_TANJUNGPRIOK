import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import api from "../../services/api";
import { formatRupiah, formatDateTime, mapOrderStatusLabel, statusBadge } from "../../utils/storeFormatters";

const REPORT_FILTERS_KEY = "gpt_tanjungpriok_admin_report_filters_v1";
const REPORT_STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "picked_up", label: "Sudah Diambil" },
  { value: "ready_pickup", label: "Siap Diambil" },
  { value: "completed", label: "Selesai" },
  { value: "shipping", label: "Dalam Pengiriman" },
  { value: "packed", label: "Dikemas" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "new", label: "Baru" },
  { value: "cancelled", label: "Dibatalkan" },
];

export default function ReportsTab({ isActive }) {
  const [reportFilters, setReportFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(REPORT_FILTERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      //
    }
    return { startDate: "", endDate: "", status: "all", shippingMethod: "all" };
  });

  const [reportRows, setReportRows] = useState([]);
  const [reportMeta, setReportMeta] = useState({});
  const [loadingReport, setLoadingReport] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [sheetSyncInfo, setSheetSyncInfo] = useState(null);

  useEffect(() => {
    localStorage.setItem(REPORT_FILTERS_KEY, JSON.stringify(reportFilters));
  }, [reportFilters]);

  const fetchRevenueReport = async () => {
    setLoadingReport(true);
    setSheetSyncInfo(null);
    try {
      const params = {
        startDate: reportFilters.startDate,
        endDate: reportFilters.endDate,
        status: reportFilters.status,
      };
      const { data } = await api.get("/store/admin/reports/revenue", { params });
      setReportRows(Array.isArray(data?.data) ? data.data : []);
      setReportMeta(data?.meta || null);
    } catch (error) {
      setReportRows([]);
      setReportMeta(null);
      setSheetSyncInfo({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat laporan pemasukan.",
      });
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSyncReportSheet = async () => {
    setSyncingSheet(true);
    setSheetSyncInfo(null);
    try {
      const payload = {
        startDate: reportFilters.startDate,
        endDate: reportFilters.endDate,
        status: reportFilters.status,
      };
      const { data } = await api.post("/store/admin/reports/revenue/sync", payload);
      setSheetSyncInfo({
        type: "success",
        text: data?.message || "Spreadsheet berhasil diperbarui.",
        sheetUrl: data?.data?.sheetUrl || "",
        sheetName: data?.data?.sheetName || "",
      });
    } catch (error) {
      setSheetSyncInfo({
        type: "error",
        text: error.response?.data?.message || "Gagal sinkron ke spreadsheet.",
      });
    } finally {
      setSyncingSheet(false);
    }
  };

  const handleExportReport = () => {
    if (!reportRows.length) {
      setSheetSyncInfo({ type: "error", text: "Tidak ada data untuk diexport." });
      return;
    }

    const rows = reportRows.map((row, index) => ({
      No: index + 1,
      "Kode Order": row.orderCode,
      Tanggal: formatDateTime(row.createdAt),
      Nama: row.customerName,
      "No. WA": row.customerPhone,
      Status: mapOrderStatusLabel(row.status),
      Pengiriman: row.shippingMethod,
      Pembayaran: row.paymentMethod,
      Subtotal: row.subtotal,
      Ongkir: row.shippingCost,
      Total: row.totalAmount,
      "Jumlah Item": row.itemCount,
      Produk: row.itemsSummary,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pemasukan");

    const startLabel = reportFilters.startDate || "semua";
    const endLabel = reportFilters.endDate || "semua";
    XLSX.writeFile(workbook, `laporan-pemasukan-${startLabel}-${endLabel}.xlsx`);
  };

  useEffect(() => {
    if (isActive) {
      fetchRevenueReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <>
      <section className="grid gap-6 pb-24 sm:pb-0">
        <article className="glass-card dense-card p-6">
          <div className="sm:hidden">
            <details className="admin-report-filter rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/45">
              <summary className="mobile-summary flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-semibold text-brand-900 dark:text-white">
                  Filter Laporan
                </span>
                <svg
                  className="mobile-summary-icon h-5 w-5 text-brand-500 dark:text-brand-300"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                </svg>
              </summary>
              <div className="mt-3 grid gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Mulai
                  </span>
                  <input
                    type="date"
                    className="input-modern"
                    value={reportFilters.startDate}
                    onChange={(event) =>
                      setReportFilters((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Sampai
                  </span>
                  <input
                    type="date"
                    className="input-modern"
                    value={reportFilters.endDate}
                    onChange={(event) =>
                      setReportFilters((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Status
                  </span>
                  <select
                    className="input-modern"
                    value={reportFilters.status}
                    onChange={(event) =>
                      setReportFilters((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    {REPORT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => fetchRevenueReport()}
                  className="btn-primary !px-6 !py-2.5"
                >
                  Terapkan
                </button>
              </div>
            </details>
          </div>

          <div className="admin-filter-card hidden sm:flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Mulai
              </label>
              <input
                type="date"
                className="input-modern"
                value={reportFilters.startDate}
                onChange={(event) =>
                  setReportFilters((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div className="min-w-[180px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Sampai
              </label>
              <input
                type="date"
                className="input-modern"
                value={reportFilters.endDate}
                onChange={(event) =>
                  setReportFilters((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div className="min-w-[180px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Status
              </label>
              <select
                className="input-modern"
                value={reportFilters.status}
                onChange={(event) =>
                  setReportFilters((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {REPORT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => fetchRevenueReport()}
              className="btn-primary !px-6 !py-2.5"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={handleExportReport}
              disabled={!reportRows.length}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={handleSyncReportSheet}
              disabled={syncingSheet}
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:opacity-60 dark:border-sky-900/70 dark:bg-sky-900/20 dark:text-sky-200"
            >
              {syncingSheet ? "Syncing..." : "Sync Spreadsheet"}
            </button>
          </div>

          {sheetSyncInfo && (
            <div
              className={`mt-3 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold ${
                sheetSyncInfo.type === "success"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200"
              }`}
            >
              <span>{sheetSyncInfo.text}</span>
              {sheetSyncInfo.sheetUrl && (
                <a
                  href={sheetSyncInfo.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-current px-3 py-1 text-[11px] font-semibold hover:bg-white/70 dark:hover:bg-black/20"
                >
                  Buka Spreadsheet
                </a>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              {
                label: "Total Pemasukan",
                value: formatRupiah(reportMeta?.totalRevenue ?? 0),
              },
              {
                label: "Total Order",
                value: reportMeta?.totalOrders ?? 0,
              },
              {
                label: "Total Item Terjual",
                value: reportMeta?.totalItems ?? 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-brand-200 bg-white/70 p-4 text-sm dark:border-brand-700 dark:bg-brand-900/45"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-bold text-brand-900 dark:text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-brand-200 dark:border-brand-700">
            {loadingReport ? (
              <div className="flex justify-center py-8">
                <div className="h-9 w-9 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
              </div>
            ) : reportRows.length === 0 ? (
              <div className="p-6 text-center text-sm text-brand-600 dark:text-brand-400">
                Belum ada data pemasukan.
              </div>
            ) : (
              <>
                <div className="sm:hidden space-y-3 p-4">
                  {reportRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-brand-200 bg-white/70 p-4 text-sm dark:border-brand-700 dark:bg-brand-900/45"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-brand-900 dark:text-white">
                            {row.orderCode}
                          </p>
                          <p className="text-xs text-brand-500 dark:text-brand-400">
                            {formatDateTime(row.createdAt)}
                          </p>
                        </div>
                        {statusBadge(row.status)}
                      </div>
                      <div className="mt-2 text-xs text-brand-500 dark:text-brand-400">
                        {row.customerName} • {row.customerPhone}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                        Total: {formatRupiah(row.totalAmount)}
                      </div>
                      <div className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                        {row.itemsSummary}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-brand-50 text-xs uppercase tracking-[0.2em] text-brand-500 dark:bg-brand-900/50 dark:text-brand-400">
                      <tr>
                        <th className="px-4 py-3">Kode</th>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Pelanggan</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Item</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-brand-100 text-brand-700 dark:border-brand-800 dark:text-brand-300"
                        >
                          <td className="px-4 py-3 font-semibold text-brand-900 dark:text-white">
                            {row.orderCode}
                          </td>
                          <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-brand-900 dark:text-white">
                              {row.customerName}
                            </div>
                            <div className="text-xs text-brand-500 dark:text-brand-400">
                              {row.customerPhone}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {statusBadge(row.status)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-brand-900 dark:text-white">
                            {formatRupiah(row.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-brand-500 dark:text-brand-400">
                            {row.itemsSummary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </article>
      </section>
      <div className="admin-report-sticky sm:hidden">
        <div className="admin-report-surface">
          <button
            type="button"
            onClick={handleExportReport}
            disabled={!reportRows.length}
            className="admin-report-btn"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleSyncReportSheet}
            disabled={syncingSheet}
            className="admin-report-btn"
          >
            {syncingSheet ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>
    </>
  );
}
