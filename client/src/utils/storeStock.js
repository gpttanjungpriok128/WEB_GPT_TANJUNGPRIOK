export function normalizeSizeKey(size) {
  return String(size || "").trim().toUpperCase();
}

export function normalizeStockBySizeMap(stockBySize) {
  if (!stockBySize || typeof stockBySize !== "object" || Array.isArray(stockBySize)) {
    return {};
  }

  return Object.entries(stockBySize).reduce((accumulator, [size, qty]) => {
    const key = normalizeSizeKey(size);
    if (!key) return accumulator;
    const safeQty = Math.max(0, Number(qty) || 0);
    accumulator[key] = safeQty;
    return accumulator;
  }, {});
}

export function getStockForSize(product, size) {
  const normalizedSize = normalizeSizeKey(size);
  const stockBySize = normalizeStockBySizeMap(product?.stockBySize);

  if (normalizedSize && Number.isFinite(stockBySize[normalizedSize])) {
    return Math.max(0, Number(stockBySize[normalizedSize]) || 0);
  }

  return Math.max(0, Number(product?.stock) || 0);
}

export function getTotalStock(product) {
  const stockBySize = normalizeStockBySizeMap(product?.stockBySize);
  const sizeValues = Object.values(stockBySize);

  if (sizeValues.length > 0) {
    return sizeValues.reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  }

  return Math.max(0, Number(product?.stock) || 0);
}

export function clampQuantity(quantity, maxStock = 99) {
  const safeMax = Math.max(1, Number(maxStock) || 1);
  return Math.max(1, Math.min(Number(quantity) || 1, safeMax));
}
