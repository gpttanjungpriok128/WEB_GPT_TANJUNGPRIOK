import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from './storeOrderStatus';

export function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapOrderStatusLabel(status) {
  return ORDER_STATUS_LABEL[status] || String(status || "").toUpperCase();
}

export function statusBadge(status) {
  return (
    ORDER_STATUS_BADGE[status] ||
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  );
}
