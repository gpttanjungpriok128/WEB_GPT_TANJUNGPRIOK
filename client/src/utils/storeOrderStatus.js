export const ORDER_STATUS_LABEL = {
  new: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  packed: "Sedang Dikemas",
  ready_pickup: "Pesanan Siap Diambil",
  shipping: "Dalam Pengiriman",
  picked_up: "Pesanan Sudah Diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const ORDER_STATUS_BADGE = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  packed: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  ready_pickup: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  shipping: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  picked_up: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const SHIPPING_STEPS = [
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
    key: "shipping",
    title: "Dalam Pengiriman",
    description: "Pesanan sedang dikirim menuju alamat tujuan.",
  },
  {
    key: "completed",
    title: "Selesai",
    description: "Pesanan sudah selesai diterima atau diambil pembeli.",
  },
];

const PICKUP_STEPS = [
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
    description: "Pesanan sedang dipersiapkan untuk diambil di gereja.",
  },
  {
    key: "ready_pickup",
    title: "Siap Diambil",
    description: "Pesanan siap diambil di gereja sesuai jadwal.",
  },
  {
    key: "picked_up",
    title: "Sudah Diambil",
    description: "Pesanan sudah diambil oleh pembeli.",
  },
];

const PICKUP_STATUSES = new Set(["ready_pickup", "picked_up"]);

function isPickupShippingMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("ambil") ||
    normalized.includes("pickup") ||
    normalized.includes("pick up") ||
    normalized.includes("pick-up")
  );
}

export function buildOrderProgress(status, shippingMethod = "") {
  if (status === "cancelled") {
    return SHIPPING_STEPS.map((step) => ({
      ...step,
      state: step.key === "new" ? "done" : "pending",
    }));
  }

  const isPickupFlow = PICKUP_STATUSES.has(status) || isPickupShippingMethod(shippingMethod);
  const steps = isPickupFlow ? PICKUP_STEPS : SHIPPING_STEPS;
  const activeIndex = steps.findIndex((step) => step.key === status);
  const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;

  return steps.map((step, index) => ({
    ...step,
    state: index < resolvedIndex ? "done" : index === resolvedIndex ? "current" : "pending",
  }));
}
