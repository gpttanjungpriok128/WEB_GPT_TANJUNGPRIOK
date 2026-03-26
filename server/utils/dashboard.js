const LOW_STOCK_THRESHOLD = 5;

function normalizeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function getProductAvailableStock(product = {}) {
  const stockBySize = product.stockBySize;

  if (stockBySize && typeof stockBySize === 'object' && !Array.isArray(stockBySize)) {
    return Object.values(stockBySize).reduce((total, current) => total + normalizeNumber(current), 0);
  }

  return normalizeNumber(product.stock);
}

function buildLowStockProducts(products = [], threshold = LOW_STOCK_THRESHOLD) {
  return products
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      color: product.color || '',
      updatedAt: product.updatedAt || null,
      totalStock: getProductAvailableStock(product)
    }))
    .filter((product) => product.totalStock <= threshold)
    .sort((left, right) => {
      if (left.totalStock !== right.totalStock) {
        return left.totalStock - right.totalStock;
      }

      return String(left.name || '').localeCompare(String(right.name || ''));
    });
}

function buildExcerpt(value, maxLength = 96) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

module.exports = {
  LOW_STOCK_THRESHOLD,
  getProductAvailableStock,
  buildLowStockProducts,
  buildExcerpt
};
