export const STORE_WISHLIST_STORAGE_KEY = "gpt_tanjungpriok_store_wishlist_v1";
export const STORE_WISHLIST_UPDATED_EVENT = "storeWishlistUpdated";

export function readStoreWishlist() {
  if (typeof window === "undefined") return [];

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(STORE_WISHLIST_STORAGE_KEY) || "[]",
    );
    if (!Array.isArray(saved)) return [];
    return saved
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
}

export function writeStoreWishlist(productIds) {
  if (typeof window === "undefined") return [];

  const uniqueIds = [...new Set(
    (Array.isArray(productIds) ? productIds : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  )];

  window.localStorage.setItem(
    STORE_WISHLIST_STORAGE_KEY,
    JSON.stringify(uniqueIds),
  );
  window.dispatchEvent(new Event(STORE_WISHLIST_UPDATED_EVENT));
  return uniqueIds;
}

export function toggleStoreWishlist(productId) {
  const safeProductId = Number(productId);
  if (!Number.isInteger(safeProductId) || safeProductId <= 0) {
    return [];
  }

  const current = readStoreWishlist();
  const next = current.includes(safeProductId)
    ? current.filter((value) => value !== safeProductId)
    : [...current, safeProductId];

  return writeStoreWishlist(next);
}

export function isProductWishlisted(productId, wishlist = readStoreWishlist()) {
  const safeProductId = Number(productId);
  return Array.isArray(wishlist) && wishlist.includes(safeProductId);
}
