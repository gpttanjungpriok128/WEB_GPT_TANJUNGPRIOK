export const ORDER_STATUS_LABEL = {
  new: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  packed: "Sedang Dikemas",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const ORDER_STATUS_BADGE = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  packed: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const BASE_STEPS = [
  {
    key: "new",
    title: "Order Masuk",
    description: "Pesanan berhasil dibuat dan menunggu pengecekan admin.",
  },
  {
    key: "confirmed",
    title: "Dikonfirmasi",
    description: "Admin sudah memverifikasi pesanan dan proses produksi dimulai.",
  },
  {
    key: "packed",
    title: "Dikemas",
    description: "Pesanan sedang dipersiapkan untuk dikirim atau diambil.",
  },
  {
    key: "completed",
    title: "Selesai",
    description: "Pesanan sudah selesai diterima atau diambil pembeli.",
  },
];

export function buildOrderProgress(status) {
  if (status === "cancelled") {
    return BASE_STEPS.map((step) => ({
      ...step,
      state: step.key === "new" ? "done" : "pending",
    }));
  }

  const activeIndex = BASE_STEPS.findIndex((step) => step.key === status);
  const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;

  return BASE_STEPS.map((step, index) => ({
    ...step,
    state: index < resolvedIndex ? "done" : index === resolvedIndex ? "current" : "pending",
  }));
}
