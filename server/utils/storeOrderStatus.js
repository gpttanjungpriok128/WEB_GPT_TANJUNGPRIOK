const ORDER_STATUSES = [
  'new',
  'confirmed',
  'packed',
  'ready_pickup',
  'shipping',
  'picked_up',
  'completed',
  'cancelled'
];

const ORDER_STATUS_LABELS = {
  new: 'Order Masuk',
  confirmed: 'Dikonfirmasi',
  packed: 'Dikemas',
  ready_pickup: 'Siap Diambil',
  shipping: 'Dalam Pengiriman',
  picked_up: 'Sudah Diambil',
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
};

function isPickupShippingMethod(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes('ambil')
    || normalized.includes('pickup')
    || normalized.includes('pick up')
    || normalized.includes('pick-up')
  );
}

function getAllowedNextOrderStatuses(currentStatus, shippingMethod = '') {
  switch (String(currentStatus || '').trim()) {
    case 'new':
      return ['confirmed', 'cancelled'];
    case 'confirmed':
      return ['packed'];
    case 'packed':
      return isPickupShippingMethod(shippingMethod)
        ? ['ready_pickup']
        : ['shipping'];
    case 'ready_pickup':
      return ['picked_up'];
    case 'shipping':
      return ['completed'];
    default:
      return [];
  }
}

function canTransitionOrderStatus(currentStatus, nextStatus, shippingMethod = '') {
  const normalizedCurrent = String(currentStatus || '').trim();
  const normalizedNext = String(nextStatus || '').trim();

  if (!normalizedCurrent || !normalizedNext) return false;
  if (normalizedCurrent === normalizedNext) return true;

  return getAllowedNextOrderStatuses(normalizedCurrent, shippingMethod).includes(normalizedNext);
}

function isReviewableOrderStatus(status) {
  return ['picked_up', 'completed'].includes(String(status || '').trim());
}

function buildAllowedStatusesText(statuses = []) {
  const labels = statuses.map((status) => ORDER_STATUS_LABELS[status] || status);

  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} atau ${labels[1]}`;

  return `${labels.slice(0, -1).join(', ')}, atau ${labels.at(-1)}`;
}

function buildOrderStatusTransitionError(currentStatus, shippingMethod = '') {
  const normalizedCurrent = String(currentStatus || '').trim();
  const currentLabel = ORDER_STATUS_LABELS[normalizedCurrent] || normalizedCurrent;
  const allowedNextStatuses = getAllowedNextOrderStatuses(normalizedCurrent, shippingMethod);

  if (allowedNextStatuses.length === 0) {
    return `Status ${currentLabel} sudah final dan tidak bisa diubah lagi.`;
  }

  return `Status ${currentLabel} hanya bisa diubah ke ${buildAllowedStatusesText(allowedNextStatuses)}.`;
}

module.exports = {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  isPickupShippingMethod,
  getAllowedNextOrderStatuses,
  canTransitionOrderStatus,
  isReviewableOrderStatus,
  buildOrderStatusTransitionError
};
