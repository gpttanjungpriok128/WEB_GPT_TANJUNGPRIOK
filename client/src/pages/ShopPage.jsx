import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ShopHero from "../components/ShopHero";
import storePlaceholderImage from "../img/logo1.png";
import { normalizeStoreImagePath, resolveStoreImageUrl } from "../utils/storeImage";
import { clampQuantity, getStockForSize, getTotalStock } from "../utils/storeStock";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";
import {
  STORE_CATALOG_INVALIDATION_EVENT,
  STORE_CATALOG_SYNC_KEY,
  writeStoreCatalogSnapshot,
} from "../utils/storeCatalogCache";
import {
  readStoreWishlist,
  STORE_WISHLIST_STORAGE_KEY,
  STORE_WISHLIST_UPDATED_EVENT,
  toggleStoreWishlist,
} from "../utils/storeWishlist";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const PROMO_VIDEO_URL = "https://youtu.be/oOOdw2ulGIg";
const INITIAL_EAGER_PRODUCT_IMAGE_COUNT = 1;

const FALLBACK_PRODUCTS = [
  {
    id: 1001,
    name: "Worship Smoke Tee",
    slug: "worship-smoke-tee",
    basePrice: 189000,
    finalPrice: 189000,
    discountAmount: 0,
    promoIsActive: false,
    promoLabel: "",
    color: "Jet Black",
    verse: "Mazmur 95:1",
    description:
      "Desain minimalist streetwear dengan nuansa worship modern. Nyaman untuk ibadah, youth service, dan kegiatan komunitas.",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: storePlaceholderImage,
    stock: 20,
    isActive: true,
    ratingAverage: 0,
    ratingCount: 0,
  },
  {
    id: 1002,
    name: "Light of The World Tee",
    slug: "light-of-the-world-tee",
    basePrice: 195000,
    finalPrice: 195000,
    discountAmount: 0,
    promoIsActive: false,
    promoLabel: "",
    color: "Off White",
    verse: "Yohanes 8:12",
    description:
      "Visual clean dan kuat dengan statement LIGHT. Cocok untuk look casual harian dengan pesan iman yang jelas.",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: storePlaceholderImage,
    stock: 20,
    isActive: true,
    ratingAverage: 0,
    ratingCount: 0,
  },
  {
    id: 1003,
    name: "Hope in Him Tee",
    slug: "hope-in-him-tee",
    basePrice: 199000,
    finalPrice: 199000,
    discountAmount: 0,
    promoIsActive: false,
    promoLabel: "",
    color: "Jet Black",
    verse: "Mazmur 42:11",
    description:
      "Potongan basic oversize dengan artwork belakang bertema HOPE. Karakter streetwear simple dan tetap rohani.",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: storePlaceholderImage,
    stock: 20,
    isActive: true,
    ratingAverage: 0,
    ratingCount: 0,
  },
];

const formatRupiah = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const renderStars = (value, className = "text-xs") => {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  const filledCount = Math.round(safeValue);
  return [...Array(5)].map((_, index) => (
    <span
      key={index}
      className={`${className} ${index < filledCount ? "text-amber-400" : "text-brand-200 dark:text-brand-700"}`}
    >
      ★
    </span>
  ));
};

const InstagramIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const TikTokIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 4v9.5a3.5 3.5 0 1 1-2-3.15V6.5c2 .9 3.5 1.2 5 1.3V5.6c-1.2-.1-2.3-.6-3-1.6Z" />
  </svg>
);

const ShopeeIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 8h12l-1.2 11H7.2L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

const SearchFieldIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

const FilterFieldIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 7h16" />
    <path d="M7 12h10" />
    <path d="M10 17h4" />
  </svg>
);

const SortFieldIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 6v12" />
    <path d="m5 9 3-3 3 3" />
    <path d="M16 18V6" />
    <path d="m13 15 3 3 3-3" />
  </svg>
);

const ArrowUpRightSmallIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 17 17 7" />
    <path d="M9 7h8v8" />
  </svg>
);

const GTSHIRT_SOCIALS = [
  {
    key: "instagram",
    label: "Instagram",
    handle: "@gtshirtwear",
    href: "https://www.instagram.com/gtshirtwear?igsh=dzFvM2N4bHFyNTV5&utm_source=qr",
    accent: "bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400",
    Icon: InstagramIcon,
  },
  {
    key: "tiktok",
    label: "TikTok",
    handle: "@gtshirt3",
    href: "https://www.tiktok.com/@gtshirt3?_r=1&_t=ZS-94QeyHn8jRc",
    accent: "bg-neutral-900",
    Icon: TikTokIcon,
  },
  {
    key: "shopee",
    label: "Shopee",
    handle: "GTshirtwear",
    href: "https://shopee.co.id/gtshirtwear",
    accent: "bg-orange-500",
    Icon: ShopeeIcon,
  },
];

const STORE_PILLARS = [
  {
    key: "production",
    label: "Pilar 01",
    title: "Produksi Berkala",
    description:
      "Batch produksi setiap minggu agar kualitas sablon dan bahan tetap konsisten.",
    glow: "from-emerald-400/20 via-emerald-400/5 to-transparent",
  },
  {
    key: "support",
    label: "Pilar 02",
    title: "Support Pelayanan",
    description:
      "Setiap pembelian mendukung kegiatan pemuda, multimedia, dan pelayanan gereja.",
    glow: "from-amber-400/20 via-amber-400/5 to-transparent",
  },
  {
    key: "brand",
    label: "Pilar 03",
    title: "Koleksi Jemaat",
    description:
      "GTshirt hadir dari kebersamaan komunitas gereja untuk dipakai dalam berbagai kegiatan.",
    glow: "from-sky-400/20 via-sky-400/5 to-transparent",
  },
];

const AVAILABILITY_LABELS = {
  all: "Semua Produk",
  ready: "Stok Tersedia",
  promo: "Sedang Promo",
};

const SORT_LABELS = {
  featured: "Terbaru",
  "price-low": "Harga Termurah",
  "price-high": "Harga Tertinggi",
  stock: "Stok Terbanyak",
  name: "Nama A-Z",
};
const SHOP_SECTION_SHELL = "relative overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,248,0.92))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:border-emerald-900/40 dark:bg-[linear-gradient(180deg,rgba(8,16,12,0.94),rgba(6,12,9,0.92))] sm:p-6";
const SHOP_SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600/80 dark:text-emerald-200/70";
const PRODUCTS_PER_PAGE = 16;
const PRODUCT_CACHE_KEY = "gpt_tanjungpriok_shop_catalog_v1";
const PRODUCT_CACHE_TTL = 1000 * 60 * 10;
const USE_FALLBACK_PRODUCTS = import.meta.env.MODE === "development";

const HeartIcon = ({ filled = false, className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20s-6.5-3.8-6.5-9.25A3.75 3.75 0 0 1 12 8a3.75 3.75 0 0 1 6.5 2.75C18.5 16.2 12 20 12 20Z" />
  </svg>
);

const readShopBootCache = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PRODUCT_CACHE_KEY);
    const cached = raw ? JSON.parse(raw) : null;
    if (!cached?.data || !Array.isArray(cached.data)) return null;
    if (cached.source && cached.source !== "api") return null;

    const meta = cached.meta || {
      page: 1,
      totalPages: 1,
      total: cached.data.length,
    };
    const age = Date.now() - Number(cached.cachedAt || 0);

    return {
      data: cached.data,
      meta,
      page: meta.page || 1,
      isStale: age > PRODUCT_CACHE_TTL,
    };
  } catch {
    return null;
  }
};

const normalizeSizeLabel = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizeYouTubeUrl = (value = "") => {
  const input = value.trim();
  if (!input) return "";
  if (input.includes("/embed/")) return input;
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : input;
    }
    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "shorts" && pathParts[1]) return `https://www.youtube.com/embed/${pathParts[1]}`;
      if (pathParts[0] === "live" && pathParts[1]) return `https://www.youtube.com/embed/${pathParts[1]}`;
    }
  } catch {
    return input;
  }
  return input;
};

const getYouTubeThumbnailUrl = (value = "") => {
  const input = value.trim();
  if (!input) return "";
  try {
    const parsed = new URL(input);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const isEmbed = parsed.hostname.includes("youtube.com") && pathParts[0] === "embed" && pathParts[1];
    const videoId = isEmbed ? pathParts[1] : "";
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
};

function getDefaultSize(product) {
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes.filter((size) => normalizeSizeLabel(size) !== "XXL")
    : [];
  if (!sizes.length) return "M";

  const firstAvailable = sizes.find((size) => getStockForSize(product, size) > 0);
  return firstAvailable || sizes[0] || "M";
}

function getAvailableSizes(product) {
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes.filter((size) => normalizeSizeLabel(size) !== "XXL")
    : [];
  return sizes.filter((size) => getStockForSize(product, size) > 0);
}

function ShopPage() {
  const { user } = useAuth();
  const bootCache = useMemo(() => readShopBootCache(), []);
  const [products, setProducts] = useState(() => {
    if (bootCache?.data) return bootCache.data;
    return USE_FALLBACK_PRODUCTS ? FALLBACK_PRODUCTS : [];
  });
  const [cartItems, setCartItems] = useState([]);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(() => !bootCache && !USE_FALLBACK_PRODUCTS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [productLoadError, setProductLoadError] = useState(false);
  const [backgroundRefreshError, setBackgroundRefreshError] = useState(false);
  const [productPage, setProductPage] = useState(() => bootCache?.page || 1);
  const [productMeta, setProductMeta] = useState(() => bootCache?.meta || { page: 1, totalPages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [catalogFeedback, setCatalogFeedback] = useState("");
  const [wishlistIds, setWishlistIds] = useState(() => readStoreWishlist());
  const promoVideoSrc = normalizeYouTubeUrl(PROMO_VIDEO_URL);
  const [isPromoVideoActive, setIsPromoVideoActive] = useState(false);
  const [hasBootCache, setHasBootCache] = useState(() => Boolean(bootCache));
  const [isCacheStale, setIsCacheStale] = useState(() => Boolean(bootCache?.isStale));
  const deferredSearch = useDeferredValue(searchQuery);
  const promoVideoThumbnailSrc = getYouTubeThumbnailUrl(promoVideoSrc);

  useEffect(() => {
    try {
      const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed = rawCart ? JSON.parse(rawCart) : [];
      setCartItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCartItems([]);
    } finally {
      setIsCartHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isCartHydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    window.dispatchEvent(new Event("cartUpdated"));
  }, [cartItems, isCartHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncWishlist = () => setWishlistIds(readStoreWishlist());
    const handleStorage = (event) => {
      if (event.key === STORE_WISHLIST_STORAGE_KEY) {
        syncWishlist();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORE_WISHLIST_UPDATED_EVENT, syncWishlist);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORE_WISHLIST_UPDATED_EVENT, syncWishlist);
    };
  }, []);

  const fetchProducts = async ({ page = 1, append = false, silent = false } = {}) => {
    const params = {
      page,
      limit: PRODUCTS_PER_PAGE,
      search: debouncedSearch || undefined
    };
    const cacheKey = buildCacheKey("/store/products", { params });
    const cached = append ? null : getCacheSnapshot(cacheKey);
    const hasVisibleCatalog = !append && (
      (Array.isArray(cached?.data?.data) && cached.data.data.length > 0) ||
      products.length > 0
    );
    if (cached?.data?.data && !append) {
      setProducts(cached.data.data);
      setProductMeta(cached.data.meta || { page, totalPages: 1, total: cached.data.data.length });
      setProductPage(page);
    }
    if (append) {
      setIsLoadingMore(true);
    } else {
      if (!silent) {
        setIsLoadingProducts(!cached && !hasBootCache);
      }
      setProductLoadError(false);
      setBackgroundRefreshError(false);
    }
    try {
      const { data } = await swrGet("/store/products", { params }, {
        ttlMs: 30 * 1000,
        onUpdate: append
          ? undefined
          : (payload) => {
            const apiProducts = Array.isArray(payload?.data)
              ? payload.data.filter((item) => item.isActive !== false)
              : [];
            setProducts(apiProducts);
            setProductMeta(payload?.meta || { page, totalPages: 1, total: apiProducts.length });
            setProductPage(page);
          }
      });
      const apiProducts = Array.isArray(data?.data)
        ? data.data.filter((item) => item.isActive !== false)
        : [];

      setProducts((prev) => (append ? [...prev, ...apiProducts] : apiProducts));
      setProductMeta(data?.meta || { page, totalPages: 1, total: apiProducts.length });
      setProductPage(page);
      if (!append) {
        setProductLoadError(false);
        setBackgroundRefreshError(false);
        setIsCacheStale(false);
      }
      if (!append && apiProducts.length > 0 && typeof window !== "undefined") {
        writeStoreCatalogSnapshot(
          apiProducts,
          data?.meta || { page, totalPages: 1, total: apiProducts.length },
        );
        setHasBootCache(true);
      }
    } catch {
      if (!append) {
        if (hasVisibleCatalog) {
          setBackgroundRefreshError(true);
          setIsCacheStale(true);
          setProductLoadError(false);
        } else {
          setProductLoadError(true);
          setBackgroundRefreshError(false);
        }
        if (!products.length && !hasBootCache && !cached) {
          setProducts(USE_FALLBACK_PRODUCTS ? FALLBACK_PRODUCTS : []);
          setProductMeta({
            page: 1,
            totalPages: 1,
            total: USE_FALLBACK_PRODUCTS ? FALLBACK_PRODUCTS.length : 0,
          });
        }
      }
    } finally {
      if (!silent || append) {
        setIsLoadingProducts(false);
      }
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts({ page: 1, append: false });
  }, [debouncedSearch]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshCatalog = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      fetchProducts({ page: 1, append: false, silent: true });
    };

    const handleStorage = (event) => {
      if (event.key === STORE_CATALOG_SYNC_KEY) {
        refreshCatalog();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORE_CATALOG_INVALIDATION_EVENT, refreshCatalog);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORE_CATALOG_INVALIDATION_EVENT, refreshCatalog);
    };
  }, [debouncedSearch, hasBootCache, products.length]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    let nextProducts = [...products];

    if (normalizedSearch) {
      nextProducts = nextProducts.filter((product) => {
        const searchTarget = [
          product.name,
          product.color,
          product.description,
          product.verse,
        ].join(" ").toLowerCase();
        return searchTarget.includes(normalizedSearch);
      });
    }

    if (availabilityFilter === "ready") {
      nextProducts = nextProducts.filter((product) => getTotalStock(product) > 0);
    }

    if (availabilityFilter === "promo") {
      nextProducts = nextProducts.filter((product) => Boolean(product.promoIsActive));
    }

    nextProducts.sort((left, right) => {
      if (sortBy === "price-low") {
        return Number(left.finalPrice ?? left.basePrice ?? 0) - Number(right.finalPrice ?? right.basePrice ?? 0);
      }
      if (sortBy === "price-high") {
        return Number(right.finalPrice ?? right.basePrice ?? 0) - Number(left.finalPrice ?? left.basePrice ?? 0);
      }
      if (sortBy === "name") {
        return String(left.name || "").localeCompare(String(right.name || ""), "id");
      }
      if (sortBy === "stock") {
        return getTotalStock(right) - getTotalStock(left);
      }
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });

    return nextProducts;
  }, [availabilityFilter, products, deferredSearch, sortBy]);

  const totalStockAll = useMemo(
    () => products.reduce((sum, product) => sum + getTotalStock(product), 0),
    [products],
  );
  const hasMoreProducts = productPage < productMeta.totalPages;

  const subtotal = useMemo(
    () =>
      cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  );


  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const cartProductIds = useMemo(
    () => new Set(cartItems.map((item) => Number(item.productId)).filter((value) => Number.isInteger(value))),
    [cartItems],
  );
  const wishlistProducts = useMemo(
    () => products.filter((product) => wishlistIds.includes(Number(product.id))),
    [products, wishlistIds],
  );
  const recommendedProducts = useMemo(() => {
    const seedProducts = products.filter(
      (product) =>
        wishlistIds.includes(Number(product.id)) || cartProductIds.has(Number(product.id)),
    );
    const preferredColors = new Set(
      seedProducts
        .map((product) => String(product.color || "").trim().toLowerCase())
        .filter(Boolean),
    );

    return [...products]
      .filter(
        (product) =>
          !wishlistIds.includes(Number(product.id)) &&
          !cartProductIds.has(Number(product.id)),
      )
      .sort((left, right) => {
        const scoreProduct = (product) => {
          const totalStock = getTotalStock(product);
          const isPreferredColor = preferredColors.has(String(product.color || "").trim().toLowerCase());
          return (
            (isPreferredColor ? 25 : 0) +
            (product.promoIsActive ? 18 : 0) +
            (totalStock > 0 ? 12 : -30) +
            Math.min(totalStock, 20) +
            (Number(product.ratingAverage || 0) * 4) +
            Math.min(Number(product.ratingCount || 0), 12)
          );
        };

        return scoreProduct(right) - scoreProduct(left);
      })
      .slice(0, 4);
  }, [cartProductIds, products, wishlistIds]);
  const catalogSummary = useMemo(
    () => ({
      ready: filteredProducts.filter((product) => getTotalStock(product) > 0).length,
      promo: filteredProducts.filter((product) => Boolean(product.promoIsActive)).length,
      lowStock: filteredProducts.filter((product) => {
        const stock = getTotalStock(product);
        return stock > 0 && stock < 6;
      }).length,
    }),
    [filteredProducts],
  );
  const availabilityLabel = AVAILABILITY_LABELS[availabilityFilter] || "Semua Produk";
  const sortLabel = SORT_LABELS[sortBy] || "Terbaru";
  const activeSearchLabel = deferredSearch.trim();

  const addToCart = (product) => {
    const size = getDefaultSize(product);
    const sizeStock = getStockForSize(product, size);
    if (sizeStock <= 0) return;

    const quantity = clampQuantity(1, sizeStock);
    const variantKey = `${product.id}-${size}`;
    const normalizedPrimaryImage = normalizeStoreImagePath(product.imageUrl);
    const normalizedImageUrls = Array.isArray(product.imageUrls)
      ? product.imageUrls.map(normalizeStoreImagePath).filter(Boolean)
      : normalizedPrimaryImage
        ? [normalizedPrimaryImage]
        : [];

    setCartItems((previous) => {
      const existingItemIndex = previous.findIndex(
        (item) => item.variantKey === variantKey,
      );

      if (existingItemIndex >= 0) {
        return previous.map((item, index) => {
          if (index !== existingItemIndex) return item;
          const nextQty = clampQuantity(item.quantity + quantity, sizeStock);
          return {
            ...item,
            quantity: nextQty,
            image: item.image || normalizedPrimaryImage,
            imageUrls: Array.isArray(item.imageUrls) && item.imageUrls.length > 0
              ? item.imageUrls
              : normalizedImageUrls,
            stock: sizeStock,
            stockBySize: product.stockBySize || {},
          };
        });
      }

      return [
        ...previous,
        {
          variantKey,
          productId: product.id,
          name: product.name,
          price: Number(product.finalPrice ?? product.basePrice ?? 0),
          image: normalizedPrimaryImage,
          imageUrls: normalizedImageUrls,
          size,
          color: product.color || "-",
          quantity,
          stock: sizeStock,
          stockBySize: product.stockBySize || {},
        },
      ];
    });
    setCatalogFeedback(`${product.name} size ${normalizeSizeLabel(size)} ditambahkan ke keranjang.`);
    window.setTimeout(() => setCatalogFeedback(""), 2500);
  };

  const handleToggleWishlist = (product, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    const nextWishlist = toggleStoreWishlist(product.id);
    const isSaved = nextWishlist.includes(Number(product.id));
    setWishlistIds(nextWishlist);
    setCatalogFeedback(
      isSaved
        ? `${product.name} disimpan ke wishlist.`
        : `${product.name} dihapus dari wishlist.`,
    );
    window.setTimeout(() => setCatalogFeedback(""), 2500);
  };

  const updateCartQuantity = (variantKey, nextQuantity) => {
    const safeQuantity = Number(nextQuantity);
    if (!Number.isFinite(safeQuantity) || safeQuantity < 1) {
      setCartItems((previous) =>
        previous.filter((item) => item.variantKey !== variantKey),
      );
      return;
    }

    setCartItems((previous) =>
      previous.map((item) => {
        if (item.variantKey !== variantKey) return item;
        const boundedQty = clampQuantity(safeQuantity, item.stock || 99);
        return { ...item, quantity: boundedQty };
      }),
    );
  };

  const removeFromCart = (variantKey) => {
    setCartItems((previous) =>
      previous.filter((item) => item.variantKey !== variantKey),
    );
  };



  // Cart page is now a separate route at /cart

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_60%)] blur-2xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-60 w-60 rounded-full bg-emerald-200/30 blur-[120px] dark:bg-emerald-500/10" />
      <div className="page-stack shop-page-stack relative space-y-5 sm:space-y-8">
        <ShopHero />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.34fr)_minmax(320px,0.66fr)] xl:items-start">
          {promoVideoSrc && (
            <section className={`${SHOP_SECTION_SHELL} flex flex-col items-center text-center`}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.1),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.03),transparent_58%)]" />
              <div className="relative max-w-2xl space-y-3">
                <p className={SHOP_SECTION_LABEL}>Highlight GTshirt</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2.15rem]">
                  Lihat GTshirt lebih dekat.
                </h2>
                <p className="text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                  Cuplikan singkat koleksi GTshirt di tengah komunitas.
                </p>
              </div>
              <div className="relative mt-3 w-full max-w-[74rem] overflow-hidden rounded-[1.9rem] border border-emerald-950/[0.15] bg-black shadow-[0_28px_70px_rgba(2,12,8,0.2)] dark:border-emerald-900/40">
                <div className="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-r from-emerald-400/[0.12] via-transparent to-emerald-300/[0.12] blur-sm pointer-events-none" />
                <div className="relative aspect-video">
                  {isPromoVideoActive ? (
                    <iframe
                      title="Video GTshirt"
                      src={promoVideoSrc}
                      className="h-full w-full"
                      allowFullScreen
                      loading="eager"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsPromoVideoActive(true)}
                      className="group relative block h-full w-full overflow-hidden text-white transition hover:brightness-110"
                      aria-label="Putar video GTshirt"
                    >
                      {promoVideoThumbnailSrc ? (
                        <img
                          src={promoVideoThumbnailSrc}
                          alt="Thumbnail video GTshirt"
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[linear-gradient(145deg,#06110c,#102117_58%,#1c3f28)]" />
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,9,0.02),rgba(5,12,9,0.18)_50%,rgba(5,12,9,0.4))]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-900 shadow-[0_18px_36px_rgba(0,0,0,0.24)] transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20">
                          <svg
                            className="ml-1 h-7 w-7 sm:h-8 sm:w-8"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M8 6.5v11l9-5.5-9-5.5Z" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className={`${SHOP_SECTION_SHELL} flex flex-col`}>
            <div className="space-y-3">
              <p className={SHOP_SECTION_LABEL}>Tentang GTshirt</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                Tiga hal yang kami jaga dalam setiap koleksi GTshirt.
              </h2>
              <p className="text-sm leading-7 text-brand-600 dark:text-brand-300">
                GTshirt lahir dari komunitas gereja dan dipersiapkan untuk kebutuhan jemaat, pelayanan, dan kegiatan bersama.
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              {STORE_PILLARS.map((item) => (
                <article
                  key={item.key}
                  className="group relative overflow-hidden rounded-[1.35rem] border border-emerald-950/10 bg-white/[0.72] p-3.5 shadow-[0_18px_36px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] dark:border-emerald-900/30 dark:bg-white/[0.03] sm:rounded-[1.5rem] sm:p-4"
                >
                  <div
                    className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-br ${item.glow}`}
                  />
                  <p className={SHOP_SECTION_LABEL}>{item.label}</p>
                  <h3 className="mt-2 text-base font-semibold tracking-[-0.02em] text-brand-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-600 dark:text-brand-300">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
          <section className={`${SHOP_SECTION_SHELL} flex flex-col justify-between`}>
            <div className="space-y-3">
              <p className={SHOP_SECTION_LABEL}>Pesanan</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2rem]">
                Pantau pesanan langsung dari area toko.
              </h2>
              <p className="text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                Setelah checkout, pembeli bisa kembali ke halaman toko untuk membuka riwayat order atau melacak status pesanan dengan kode order dan WhatsApp.
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              {user && (
                <Link
                  to="/my-orders"
                  className="btn-primary inline-flex items-center justify-center !rounded-[1.25rem] !py-3"
                >
                  Buka Pesanan Saya
                </Link>
              )}
              <Link
                to="/track-order"
                className="btn-outline inline-flex items-center justify-center !rounded-[1.25rem] !py-3"
              >
                Lacak Pesanan
              </Link>
            </div>
          </section>

          <section id="catalog-section" className={`${SHOP_SECTION_SHELL} space-y-4`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className={SHOP_SECTION_LABEL}>Koleksi</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2rem]">
                  Pilih produk GTshirt yang tersedia untuk jemaat dan komunitas.
                </h2>
                <p className="mt-2 text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                  Klik produk untuk melihat detail, pilih ukuran, lalu tambahkan ke keranjang.
                </p>
              </div>
              <Link
                to="/cart"
                className={`group relative inline-flex items-center gap-2 rounded-[1.25rem] border px-4 py-3 text-sm font-semibold transition ${
                  totalItems > 0
                    ? "border-primary bg-primary text-white shadow-md hover:bg-primary/90"
                    : "border-brand-300 bg-white text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/60"
                }`}
                title="Buka keranjang belanja"
                aria-label="Buka keranjang belanja"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386a1.5 1.5 0 0 1 1.415 1.004l.365 1.093m0 0h13.512a1.5 1.5 0 0 1 1.454 1.869l-1.12 4.48a1.5 1.5 0 0 1-1.454 1.131H8.118a1.5 1.5 0 0 1-1.454-1.131L5.416 5.097Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm9 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                  />
                </svg>
                <span>Keranjang</span>
                {totalItems > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-brand-900">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-500 dark:text-brand-400">
              <span className="font-semibold text-brand-700 dark:text-brand-200">
                {filteredProducts.length} produk
              </span>
              <span className="h-1 w-1 rounded-full bg-brand-300 dark:bg-brand-600" />
              <span>{availabilityLabel}</span>
              <span className="h-1 w-1 rounded-full bg-brand-300 dark:bg-brand-600" />
              <span>{sortLabel}</span>
              {wishlistProducts.length > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-brand-300 dark:bg-brand-600" />
                  <span>Wishlist {wishlistProducts.length}</span>
                </>
              )}
              {activeSearchLabel && (
                <>
                  <span className="h-1 w-1 rounded-full bg-brand-300 dark:bg-brand-600" />
                  <span className="truncate">"{activeSearchLabel}"</span>
                </>
              )}
            </div>

            <div className="grid gap-3 sm:hidden">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                  Cari Produk
                </span>
                <div className="input-leading-shell">
                  <SearchFieldIcon className="input-leading-icon" />
                  <input
                    type="search"
                    className="input-modern"
                    placeholder="Cari nama, warna, atau tema desain"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </label>

              <details className="mobile-filter rounded-[1.5rem] border border-brand-200 bg-[rgba(255,255,255,0.92)] shadow-[0_18px_36px_rgba(15,23,42,0.05)] dark:border-brand-700 dark:bg-[linear-gradient(180deg,rgba(11,18,14,0.94),rgba(8,13,11,0.92))]">
                <summary className="mobile-summary flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Filter & Urutkan
                    </p>
                    <p className="text-sm font-semibold text-brand-900 dark:text-white">
                      {availabilityLabel} • {sortLabel}
                    </p>
                  </div>
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
                <div className="mobile-filter-panel space-y-3 border-t border-brand-100 px-4 pb-4 pt-3 dark:border-brand-800">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Filter
                    </span>
                    <div className="input-leading-shell input-select-shell">
                      <FilterFieldIcon className="input-leading-icon" />
                      <select
                        className="input-modern appearance-none"
                        value={availabilityFilter}
                        onChange={(event) => setAvailabilityFilter(event.target.value)}
                      >
                        <option value="all">Semua Produk</option>
                        <option value="ready">Stok Tersedia</option>
                        <option value="promo">Sedang Promo</option>
                      </select>
                      <svg
                        className="input-trailing-icon"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                      </svg>
                    </div>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Urutkan
                    </span>
                    <div className="input-leading-shell input-select-shell">
                      <SortFieldIcon className="input-leading-icon" />
                      <select
                        className="input-modern appearance-none"
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                      >
                        <option value="featured">Terbaru</option>
                        <option value="price-low">Harga Termurah</option>
                        <option value="price-high">Harga Tertinggi</option>
                        <option value="stock">Stok Terbanyak</option>
                        <option value="name">Nama A-Z</option>
                      </select>
                      <svg
                        className="input-trailing-icon"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                      </svg>
                    </div>
                  </label>
                </div>
              </details>
            </div>

            <div className="hidden sm:grid gap-4 rounded-[1.75rem] border border-brand-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,249,0.84))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:grid-cols-[1.2fr_0.8fr_0.7fr] dark:border-brand-700 dark:bg-[linear-gradient(180deg,rgba(11,18,14,0.94),rgba(8,13,11,0.9))] sm:p-5">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                  Cari Produk
                </span>
                <div className="input-leading-shell">
                  <SearchFieldIcon className="input-leading-icon" />
                  <input
                    type="search"
                    className="input-modern"
                    placeholder="Cari nama, warna, atau tema desain"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                  Filter
                </span>
                <div className="input-leading-shell input-select-shell">
                  <FilterFieldIcon className="input-leading-icon" />
                  <select
                    className="input-modern appearance-none"
                    value={availabilityFilter}
                    onChange={(event) => setAvailabilityFilter(event.target.value)}
                  >
                    <option value="all">Semua Produk</option>
                    <option value="ready">Stok Tersedia</option>
                    <option value="promo">Sedang Promo</option>
                  </select>
                  <svg
                    className="input-trailing-icon"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                  </svg>
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                  Urutkan
                </span>
                <div className="input-leading-shell input-select-shell">
                  <SortFieldIcon className="input-leading-icon" />
                  <select
                    className="input-modern appearance-none"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    <option value="featured">Terbaru</option>
                    <option value="price-low">Harga Termurah</option>
                    <option value="price-high">Harga Tertinggi</option>
                    <option value="stock">Stok Terbanyak</option>
                    <option value="name">Nama A-Z</option>
                  </select>
                  <svg
                    className="input-trailing-icon"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                  </svg>
                </div>
              </label>
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-brand-200/80 bg-white/[0.82] p-4 dark:border-brand-700 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Ringkasan Katalog
                  </p>
                  <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
                    Fokus ke produk siap, promo aktif, dan stok yang mulai menipis.
                  </p>
                </div>
                {wishlistProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("wishlist-section")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                  >
                    Wishlist {wishlistProducts.length}
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "Produk Siap",
                    value: String(catalogSummary.ready),
                    helper: "Masih ada stok aktif",
                  },
                  {
                    label: "Sedang Promo",
                    value: String(catalogSummary.promo),
                    helper: "Harga spesial yang sedang berjalan",
                  },
                  {
                    label: "Stok Menipis",
                    value: String(catalogSummary.lowStock),
                    helper: "Produk dengan stok kurang dari 6 pcs",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      {card.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-brand-900 dark:text-white">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                      {card.helper}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {catalogFeedback && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300">
            {catalogFeedback}
          </section>
        )}

        {(wishlistProducts.length > 0 || recommendedProducts.length > 0) && (
          <section className="grid gap-4 xl:grid-cols-2">
            {wishlistProducts.length > 0 && (
              <article
                id="wishlist-section"
                className={`${SHOP_SECTION_SHELL} space-y-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={SHOP_SECTION_LABEL}>Wishlist</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                      Produk yang Anda simpan
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-brand-600 dark:text-brand-300">
                      Simpan produk untuk dibeli nanti tanpa kehilangan fokus saat memilih.
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {wishlistProducts.length} item
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {wishlistProducts.slice(0, 4).map((product) => (
                    <Link
                      key={`wishlist-${product.id}`}
                      to={`/shop/${product.slug}`}
                      className="group rounded-[1.35rem] border border-brand-200/80 bg-white/90 p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-brand-700 dark:bg-brand-900/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-brand-50 dark:bg-brand-900/50">
                          <img
                            src={resolveStoreImageUrl(product.imageUrl) || storePlaceholderImage}
                            alt={product.name}
                            className="image-soft h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-brand-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                            {product.color || "GTshirt collection"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-primary">
                            {formatRupiah(Number(product.finalPrice ?? product.basePrice ?? 0))}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </article>
            )}

            {recommendedProducts.length > 0 && (
              <article className={`${SHOP_SECTION_SHELL} space-y-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={SHOP_SECTION_LABEL}>Rekomendasi</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                      Produk yang layak dilihat berikutnya
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-brand-600 dark:text-brand-300">
                      Rekomendasi diambil dari produk yang Anda simpan, item di keranjang, promo aktif, dan stok yang masih sehat.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recommendedProducts.map((product) => (
                    <Link
                      key={`recommended-${product.id}`}
                      to={`/shop/${product.slug}`}
                      className="group rounded-[1.35rem] border border-brand-200/80 bg-white/90 p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-brand-700 dark:bg-brand-900/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-brand-50 dark:bg-brand-900/50">
                          <img
                            src={resolveStoreImageUrl(product.imageUrl) || storePlaceholderImage}
                            alt={product.name}
                            className="image-soft h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-1.5">
                            {product.promoIsActive && (
                              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                Promo
                              </span>
                            )}
                            {getTotalStock(product) > 0 && getTotalStock(product) < 6 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                Stok Tipis
                              </span>
                            )}
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold text-brand-900 dark:text-white">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                            {product.color || "GTshirt collection"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-primary">
                            {formatRupiah(Number(product.finalPrice ?? product.basePrice ?? 0))}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </article>
            )}
          </section>
        )}

        {isLoadingProducts && products.length === 0 ? (
          <div className="shop-grid grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm dark:border-brand-700 dark:bg-brand-900/40 sm:rounded-3xl"
              >
                <div className="aspect-square bg-brand-50/80 p-3 dark:bg-brand-900/60 sm:p-4">
                  <div className="h-full w-full rounded-2xl skeleton" />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                  <div className="h-3 w-1/2 rounded-full skeleton" />
                  <div className="h-4 w-4/5 rounded-full skeleton" />
                  <div className="mt-auto space-y-2">
                    <div className="h-4 w-2/3 rounded-full skeleton" />
                    <div className="h-3 w-1/2 rounded-full skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-full bg-brand-50 p-6 dark:bg-brand-900/30">
              <svg
                className="h-12 w-12 text-brand-400 dark:text-brand-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a2.25 2.25 0 0 0 2.25-2.25v-.75a2.25 2.25 0 0 0-2.25-2.25H15m0-3h-3m-3 0H6a2.25 2.25 0 0 0-2.25 2.25v.75A2.25 2.25 0 0 0 6 12h3m0 0v7.5a.75.75 0 0 1-.75.75h-3A2.25 2.25 0 0 1 0 18v-7.5"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 21v-4.5"
                />
              </svg>
            </div>
            {products.length === 0 ? (
              <>
                <h3 className="text-xl font-bold text-brand-900 dark:text-white">
                  Katalog belum tersedia
                </h3>
                <p className="mt-2 max-w-sm text-brand-600 dark:text-brand-400">
                  Produk sedang disiapkan. Silakan cek kembali sebentar lagi.
                </p>
              </>
            ) : totalStockAll === 0 && !searchQuery.trim() && availabilityFilter === "all" ? (
              <>
                <h3 className="text-xl font-bold text-brand-900 dark:text-white">
                  Stok sedang habis
                </h3>
                <p className="mt-2 max-w-sm text-brand-600 dark:text-brand-400">
                  Semua produk sedang kosong. Pantau terus, kami akan restock segera.
                </p>
              </>
            ) : availabilityFilter !== "all" && !searchQuery.trim() ? (
              <>
                <h3 className="text-xl font-bold text-brand-900 dark:text-white">
                  Tidak ada produk sesuai filter
                </h3>
                <p className="mt-2 max-w-sm text-brand-600 dark:text-brand-400">
                  Coba ubah filter katalog untuk melihat produk lainnya.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-brand-900 dark:text-white">
                  Produk belum ditemukan
                </h3>
                <p className="mt-2 max-w-sm text-brand-600 dark:text-brand-400">
                  Coba ubah kata kunci pencarian atau filter katalog untuk melihat produk lain yang tersedia.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {backgroundRefreshError && filteredProducts.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
                Koneksi katalog sedang tidak stabil. Menampilkan data terakhir.
                <button
                  type="button"
                  onClick={() => fetchProducts({ page: 1, append: false })}
                  className="ml-2 font-semibold text-amber-700 underline underline-offset-2 dark:text-amber-200"
                >
                  Muat ulang
                </button>
              </div>
            ) : isCacheStale && !isLoadingProducts && filteredProducts.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
                Menampilkan data terakhir. Sedang memperbarui katalog.
              </div>
            ) : null}
            {productLoadError && !backgroundRefreshError && filteredProducts.length > 0 && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/20 dark:text-rose-200">
                Gagal memperbarui katalog. Menampilkan data terakhir.
                <button
                  type="button"
                  onClick={() => fetchProducts({ page: 1, append: false })}
                  className="ml-2 font-semibold text-rose-700 underline underline-offset-2 dark:text-rose-200"
                >
                  Muat ulang
                </button>
              </div>
            )}
            <div className="shop-grid grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product, index) => {
                const effectivePrice = Number(
                  product.finalPrice ?? product.basePrice ?? 0,
                );
                const totalStock = getTotalStock(product);
                const ratingAverage = Number(product.ratingAverage || 0);
                const ratingCount = Number(product.ratingCount || 0);
                const availableSizes = getAvailableSizes(product).map((size) => normalizeSizeLabel(size));
                const availableSizePreview = availableSizes.length > 0
                  ? availableSizes.slice(0, 3).join(" / ")
                  : "Akan hadir";
                const stockToneClass = totalStock <= 0
                  ? "text-rose-600 dark:text-rose-300"
                  : totalStock < 6
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-emerald-700 dark:text-emerald-300";
                const stockLabel = totalStock <= 0
                  ? "Habis"
                  : totalStock < 6
                    ? `Sisa ${totalStock}`
                    : `${totalStock} pcs`;
                const compactMeta = `${availableSizes.length > 0 ? `Ukuran ${availableSizePreview}` : "Ukuran menyusul"}${product.color ? ` · ${product.color}` : ""}`;
                const defaultSize = getDefaultSize(product);
                const defaultSizeStock = getStockForSize(product, defaultSize);
                const isWishlisted = wishlistIds.includes(Number(product.id));
                const sizeSummary = availableSizes.length > 0
                  ? availableSizePreview
                  : "Cek detail produk";

                return (
                  <article
                    key={product.id}
                    className="product-card group card-soft relative flex flex-col overflow-hidden rounded-[1.45rem] border border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,248,0.96))] shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] dark:border-emerald-900/30 dark:bg-[linear-gradient(180deg,rgba(10,18,14,0.96),rgba(7,12,10,0.94))] sm:rounded-[1.8rem]"
                  >
                    <button
                      type="button"
                      onClick={(event) => handleToggleWishlist(product, event)}
                      className={`absolute right-3 top-3 z-[3] inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition ${
                        isWishlisted
                          ? "border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300"
                          : "border-white/80 bg-white/90 text-brand-500 hover:text-rose-500 dark:border-brand-700 dark:bg-brand-950/70 dark:text-brand-300"
                      }`}
                      aria-label={isWishlisted ? "Hapus dari wishlist" : "Simpan ke wishlist"}
                    >
                      <HeartIcon filled={isWishlisted} className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/shop/${product.slug}`}
                      className="flex flex-1 flex-col"
                    >
                      <div className="relative aspect-square overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,245,0.92))] p-2.5 dark:bg-[linear-gradient(180deg,rgba(14,24,18,0.88),rgba(9,15,11,0.9))] sm:p-3">
                        <div className="pointer-events-none absolute inset-2.5 rounded-[1.2rem] border border-emerald-950/[0.08] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,248,246,0.84))] dark:border-emerald-900/30 dark:bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.14),transparent_50%),linear-gradient(180deg,rgba(14,24,18,0.78),rgba(9,15,11,0.88))]" />
                        <div className="absolute left-4 top-4 z-[2] flex max-w-[calc(100%-4.75rem)] flex-wrap gap-2">
                          {product.promoIsActive && (
                            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                              Promo
                            </span>
                          )}
                          {totalStock > 0 && totalStock < 6 && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              Hampir Habis
                            </span>
                          )}
                        </div>
                        <img
                          src={resolveStoreImageUrl(product.imageUrl)}
                          alt={product.name}
                          width="800"
                          height="800"
                          sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 50vw"
                          loading={index < INITIAL_EAGER_PRODUCT_IMAGE_COUNT ? "eager" : "lazy"}
                          fetchPriority={index < INITIAL_EAGER_PRODUCT_IMAGE_COUNT ? "high" : "low"}
                          decoding="async"
                          className="image-soft relative z-[1] h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                          onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                          onError={(event) => event.currentTarget.classList.add("is-loaded")}
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-4.5">
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-bold leading-snug text-brand-900 transition-colors group-hover:text-primary dark:text-white sm:text-base">
                            {product.name}
                          </h3>
                          <p className="line-clamp-1 text-[11px] leading-5 text-brand-500 dark:text-brand-400 sm:line-clamp-2 sm:text-xs">
                            {compactMeta}
                          </p>
                        </div>
                        {ratingCount > 0 && (
                          <div className="hidden items-center gap-1.5 text-[11px] text-brand-500 dark:text-brand-400 sm:flex sm:text-xs">
                            <div className="flex items-center gap-0.5">
                              {renderStars(ratingAverage, "text-[10px]")}
                            </div>
                            <span>{ratingAverage.toFixed(1)} ({ratingCount})</span>
                          </div>
                        )}

                        <div className="mt-auto flex items-end justify-between gap-3 border-t border-brand-100 pt-3 dark:border-brand-800">
                          <div className="min-w-0">
                            {product.verse && (
                              <p className="mb-1 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400 sm:block">
                                {product.verse}
                              </p>
                            )}
                            <div>
                              {product.promoIsActive &&
                              Number(product.discountAmount) > 0 ? (
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-brand-500 line-through dark:text-brand-400 sm:text-xs">
                                    {formatRupiah(Number(product.basePrice) || 0)}
                                  </span>
                                  <span className="text-base font-black text-rose-500 sm:text-[1.05rem]">
                                    {formatRupiah(effectivePrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-base font-black text-brand-900 dark:text-white sm:text-[1.05rem]">
                                  {formatRupiah(effectivePrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
                              Stok
                            </p>
                            <p className={`mt-1 text-sm font-semibold ${stockToneClass}`}>
                              {stockLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="border-t border-brand-100 px-3.5 pb-3.5 pt-3 dark:border-brand-800 sm:px-4.5 sm:pb-4.5">
                      <div className="rounded-[1.05rem] border border-brand-200/80 bg-brand-50/80 px-3 py-2.5 dark:border-brand-700 dark:bg-brand-900/30">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
                          Ukuran Siap
                        </p>
                        <p className="mt-1 text-sm font-semibold text-brand-900 dark:text-white">
                          {sizeSummary}
                        </p>
                        <p className="mt-1 text-[11px] text-brand-500 dark:text-brand-400">
                          {defaultSizeStock > 0
                            ? `Tambah cepat akan memakai size ${defaultSize}. Pilihan lengkap ada di detail produk.`
                            : "Lihat detail produk untuk cek batch berikutnya."}
                        </p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          disabled={defaultSizeStock <= 0}
                          className="inline-flex min-h-[42px] w-full items-center justify-center rounded-[1rem] bg-primary px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-primary/90 disabled:opacity-50"
                        >
                          Tambah
                        </button>
                        <Link
                          to={`/shop/${product.slug}`}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-[1rem] border border-brand-200 bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                        >
                          Detail
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {productLoadError && filteredProducts.length === 0 && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/20 dark:text-rose-200">
                Gagal memuat katalog. Coba muat ulang.
                <button
                  type="button"
                  onClick={() => fetchProducts({ page: 1, append: false })}
                  className="ml-2 font-semibold text-rose-700 underline underline-offset-2 dark:text-rose-200"
                >
                  Muat ulang
                </button>
              </div>
            )}
            {!isLoadingProducts && filteredProducts.length > 0 && hasMoreProducts && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => fetchProducts({ page: productPage + 1, append: true })}
                  disabled={isLoadingMore}
                  className="btn-outline !px-6 !py-2.5 text-sm disabled:opacity-60"
                >
                  {isLoadingMore ? "Memuat..." : "Muat Produk Lainnya"}
                </button>
              </div>
            )}
          </>
        )}
        {/* Product detail page and cart page are now separate routes */}

        <section className={`${SHOP_SECTION_SHELL} sm:p-6 md:p-8`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.1),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.03),transparent_60%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-5">
              <div>
                <p className={SHOP_SECTION_LABEL}>Support Desk</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2rem]">
                  Tim GTshirt siap bantu ukuran, promo, dan kebutuhan event komunitas.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                  Konsultasikan size chart, ketersediaan stok, atau order untuk momen pelayanan langsung ke tim kami supaya prosesnya tetap cepat dan jelas.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.72] px-4 py-4 dark:border-emerald-900/30 dark:bg-white/[0.03]">
                  <p className={SHOP_SECTION_LABEL}>Guide</p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">Bantu pilih ukuran</p>
                </div>
                <div className="rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.72] px-4 py-4 dark:border-emerald-900/30 dark:bg-white/[0.03]">
                  <p className={SHOP_SECTION_LABEL}>Promo</p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">Info drop & harga spesial</p>
                </div>
                <div className="rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.72] px-4 py-4 dark:border-emerald-900/30 dark:bg-white/[0.03]">
                  <p className={SHOP_SECTION_LABEL}>Event</p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">Koordinasi kebutuhan komunitas</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/contact"
                  className="btn-primary !rounded-[1.2rem] !px-5 !py-3 text-sm"
                >
                  Tanya Tim Toko
                </Link>
                <Link
                  to="/schedules"
                  className="btn-outline !rounded-[1.2rem] !px-5 !py-3 text-sm"
                >
                  Cek Jadwal Ibadah
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={SHOP_SECTION_LABEL}>Ikuti GTshirtwear</p>
                  <p className="mt-2 max-w-md text-sm leading-7 text-brand-600 dark:text-brand-300">
                    Update drop terbaru, behind the scenes, dan channel order resmi GTshirt ada di sini.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                  Official Channels
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {GTSHIRT_SOCIALS.map(({ key, label, handle, href, accent, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.74] px-4 py-4 text-sm shadow-[0_16px_32px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_22px_44px_rgba(15,23,42,0.08)] dark:border-emerald-900/30 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)] ${accent}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                        {label}
                      </p>
                      <p className="truncate text-sm font-semibold text-brand-900 dark:text-white">
                        {handle}
                      </p>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
                      Buka
                      <ArrowUpRightSmallIcon className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ShopPage;
