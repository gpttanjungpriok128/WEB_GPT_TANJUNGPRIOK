import { normalizeSizeKey } from "./storeStock";

export function normalizePriceBySizeMap(priceBySize, sizes = [], fallbackPrice = 0) {
  const source = priceBySize && typeof priceBySize === "object" && !Array.isArray(priceBySize)
    ? priceBySize
    : {};
  const safeFallbackPrice = Math.max(0, Number(fallbackPrice) || 0);
  const normalizedSizes = Array.isArray(sizes)
    ? sizes.map((size) => normalizeSizeKey(size)).filter(Boolean)
    : [];

  if (normalizedSizes.length === 0) {
    return Object.entries(source).reduce((accumulator, [size, price]) => {
      const key = normalizeSizeKey(size);
      if (!key) return accumulator;
      accumulator[key] = Math.max(0, Number(price) || 0);
      return accumulator;
    }, {});
  }

  return normalizedSizes.reduce((accumulator, size) => {
    const matchedKey = Object.keys(source).find((key) => normalizeSizeKey(key) === size);
    const rawValue = matchedKey ? source[matchedKey] : safeFallbackPrice;
    accumulator[size] = Math.max(0, Number(rawValue) || 0);
    return accumulator;
  }, {});
}

export function compactPriceBySizeMap(priceBySize, sizes = [], fallbackPrice = 0) {
  const safeFallbackPrice = Math.max(0, Number(fallbackPrice) || 0);
  const normalized = normalizePriceBySizeMap(priceBySize, sizes, safeFallbackPrice);

  return Object.entries(normalized).reduce((accumulator, [size, price]) => {
    if (price !== safeFallbackPrice) {
      accumulator[size] = price;
    }
    return accumulator;
  }, {});
}

export function getPriceForSize(product, size, options = {}) {
  const { useBasePrice = false } = options;
  const normalizedSize = normalizeSizeKey(size);
  const fallbackPrice = Math.max(
    0,
    Number(useBasePrice ? product?.basePrice : (product?.finalPrice ?? product?.basePrice)) || 0
  );
  const priceMap = normalizePriceBySizeMap(
    useBasePrice ? product?.priceBySize : product?.finalPriceBySize,
    product?.sizes,
    fallbackPrice
  );

  if (normalizedSize && Object.prototype.hasOwnProperty.call(priceMap, normalizedSize)) {
    return Math.max(0, Number(priceMap[normalizedSize]) || 0);
  }

  return fallbackPrice;
}

export function getProductPriceSummary(product, options = {}) {
  const { useBasePrice = false } = options;
  const fallbackPrice = Math.max(
    0,
    Number(useBasePrice ? product?.basePrice : (product?.finalPrice ?? product?.basePrice)) || 0
  );
  const priceMap = normalizePriceBySizeMap(
    useBasePrice ? product?.priceBySize : product?.finalPriceBySize,
    product?.sizes,
    fallbackPrice
  );
  const values = Object.values(priceMap);
  const minPrice = values.length > 0 ? Math.min(...values) : fallbackPrice;
  const maxPrice = values.length > 0 ? Math.max(...values) : fallbackPrice;

  return {
    minPrice,
    maxPrice,
    hasRange: maxPrice > minPrice,
    priceMap,
  };
}
