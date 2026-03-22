import { invalidateCacheByPrefix } from "./swrCache";

const PRODUCT_CACHE_KEY = "gpt_tanjungpriok_shop_catalog_v1";
const STORE_CATALOG_SYNC_KEY = "gpt_tanjungpriok_store_catalog_sync_v1";
const STORE_CATALOG_INVALIDATION_EVENT = "gpt-tanjungpriok:store-catalog-invalidated";

function readStoreCatalogSnapshot() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PRODUCT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoreCatalogSnapshot(products, meta = null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PRODUCT_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        data: Array.isArray(products) ? products : [],
        meta: meta || {
          page: 1,
          totalPages: 1,
          total: Array.isArray(products) ? products.length : 0,
        },
      }),
    );
  } catch {
    // ignore cache write failures
  }
}

function clearStoreCatalogSnapshot() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(PRODUCT_CACHE_KEY);
  } catch {
    // ignore cache clear failures
  }
}

function updateStoreCatalogProduct(product) {
  if (typeof window === "undefined" || !product?.slug) return;

  const snapshot = readStoreCatalogSnapshot();
  const currentProducts = Array.isArray(snapshot?.data) ? snapshot.data : [];
  if (!currentProducts.length) return;

  const nextProducts = currentProducts.map((item) => (
    item?.slug === product.slug || item?.id === product.id
      ? { ...item, ...product }
      : item
  ));

  writeStoreCatalogSnapshot(nextProducts, snapshot?.meta);
}

function invalidateStoreCatalogCache() {
  invalidateCacheByPrefix("/store/products");

  if (typeof window === "undefined") return;

  clearStoreCatalogSnapshot();

  const timestamp = String(Date.now());
  try {
    window.localStorage.setItem(STORE_CATALOG_SYNC_KEY, timestamp);
  } catch {
    // ignore sync marker write failures
  }

  window.dispatchEvent(
    new CustomEvent(STORE_CATALOG_INVALIDATION_EVENT, {
      detail: { timestamp },
    }),
  );
}

export {
  PRODUCT_CACHE_KEY,
  STORE_CATALOG_INVALIDATION_EVENT,
  STORE_CATALOG_SYNC_KEY,
  clearStoreCatalogSnapshot,
  invalidateStoreCatalogCache,
  readStoreCatalogSnapshot,
  updateStoreCatalogProduct,
  writeStoreCatalogSnapshot,
};
