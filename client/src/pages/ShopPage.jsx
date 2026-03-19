import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ShopHero from "../components/ShopHero";
import storePlaceholderImage from "../img/logo1.png";
import { normalizeStoreImagePath, resolveStoreImageUrl } from "../utils/storeImage";
import { clampQuantity, getStockForSize, getTotalStock } from "../utils/storeStock";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const PROMO_VIDEO_URL = "https://youtu.be/oOOdw2ulGIg";
const INITIAL_EAGER_PRODUCT_IMAGE_COUNT = 2;

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
    title: "Brand GTshirt",
    description:
      "Brand apparel rohani dari komunitas gereja dengan karakter minimalist streetwear.",
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
const SHOP_SECTION_SHELL = "relative overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,248,0.92))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:border-emerald-900/40 dark:bg-[linear-gradient(180deg,rgba(8,16,12,0.94),rgba(6,12,9,0.92))] sm:p-6";
const SHOP_SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600/80 dark:text-emerald-200/70";
const PRODUCTS_PER_PAGE = 16;
const PRODUCT_CACHE_KEY = "gpt_tanjungpriok_shop_catalog_v1";
const PRODUCT_CACHE_TTL = 1000 * 60 * 10;
const USE_FALLBACK_PRODUCTS = import.meta.env.MODE === "development";

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
  const [products, setProducts] = useState(USE_FALLBACK_PRODUCTS ? FALLBACK_PRODUCTS : []);
  const [selections, setSelections] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [productLoadError, setProductLoadError] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productMeta, setProductMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const promoVideoSrc = normalizeYouTubeUrl(PROMO_VIDEO_URL);
  const [isPromoVideoActive, setIsPromoVideoActive] = useState(false);
  const [hasBootCache, setHasBootCache] = useState(false);
  const [isCacheStale, setIsCacheStale] = useState(false);
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
  }, [cartItems, isCartHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PRODUCT_CACHE_KEY);
      const cached = raw ? JSON.parse(raw) : null;
      if (!cached?.data || !Array.isArray(cached.data)) return;
      if (cached.source && cached.source !== "api") return;
      const age = Date.now() - Number(cached.cachedAt || 0);
      setIsCacheStale(age > PRODUCT_CACHE_TTL);
      setProducts(cached.data);
      setProductMeta(cached.meta || { page: 1, totalPages: 1, total: cached.data.length });
      setProductPage(cached.meta?.page || 1);
      setHasBootCache(true);
      setIsLoadingProducts(false);
    } catch {
      // ignore cache read
    }
  }, []);

  useEffect(() => {
    setSelections((previous) => {
      const next = { ...previous };
      for (const product of products) {
        if (!next[product.id]) {
          next[product.id] = {
            size: getDefaultSize(product),
            quantity: 1,
          };
        }
      }
      return next;
    });
  }, [products]);

  const fetchProducts = async ({ page = 1, append = false } = {}) => {
    const params = {
      page,
      limit: PRODUCTS_PER_PAGE,
      search: debouncedSearch || undefined
    };
    const cacheKey = buildCacheKey("/store/products", { params });
    const cached = append ? null : getCacheSnapshot(cacheKey);
    if (cached?.data?.data && !append) {
      setProducts(cached.data.data);
      setProductMeta(cached.data.meta || { page, totalPages: 1, total: cached.data.data.length });
      setProductPage(page);
    }
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingProducts(!cached && !hasBootCache);
      setProductLoadError(false);
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
        setIsCacheStale(false);
      }
      if (!append && apiProducts.length > 0 && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            PRODUCT_CACHE_KEY,
            JSON.stringify({
              cachedAt: Date.now(),
              data: apiProducts,
              source: "api",
              meta: data?.meta || { page, totalPages: 1, total: apiProducts.length },
            }),
          );
          setHasBootCache(true);
        } catch {
          // ignore cache write
        }
      }
    } catch {
      if (!append) {
        setProductLoadError(true);
        if (!products.length && !hasBootCache && !cached) {
          setProducts(USE_FALLBACK_PRODUCTS ? FALLBACK_PRODUCTS : []);
          setProductMeta({ page: 1, totalPages: 1, total: 0 });
        }
      }
    } finally {
      setIsLoadingProducts(false);
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
  const availabilityLabel = AVAILABILITY_LABELS[availabilityFilter] || "Semua Produk";
  const sortLabel = SORT_LABELS[sortBy] || "Terbaru";
  const activeSearchLabel = deferredSearch.trim();

  const updateSelection = (productId, key, value) => {
    setSelections((previous) => ({
      ...previous,
      [productId]: {
        ...previous[productId],
        [key]: value,
      },
    }));
  };

  const addToCart = (product) => {
    const selection = selections[product.id] || {
      size: getDefaultSize(product),
      quantity: 1,
    };

    const size = selection.size || getDefaultSize(product);
    const sizeStock = getStockForSize(product, size);
    if (sizeStock <= 0) return;

    const quantity = clampQuantity(selection.quantity, sizeStock);
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
      <div className="page-stack space-y-6 sm:space-y-8 relative">
        <ShopHero />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.26fr)_minmax(320px,0.74fr)]">
          {promoVideoSrc && (
            <section className={`${SHOP_SECTION_SHELL} lg:grid lg:grid-cols-[0.72fr_1.28fr] lg:gap-7 lg:items-center`}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.1),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.03),transparent_58%)]" />
              <div className="relative space-y-4">
                <p className={SHOP_SECTION_LABEL}>Highlight GTshirt</p>
                <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2.15rem]">
                  Rasakan vibe GTshirt sebelum kamu checkout.
                </h2>
                <p className="max-w-xl text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                  Cuplikan singkat tentang bahan, detail sablon, dan gaya streetwear rohani terbaru dari GTshirt.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-brand-500 dark:text-brand-400">
                  <span className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                    Siap ditonton
                  </span>
                  <span className="rounded-full border border-zinc-200/80 bg-white/90 px-3 py-1.5 font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
                    Official GTshirt
                  </span>
                </div>
              </div>
              <div className="relative mt-5 overflow-hidden rounded-[1.9rem] border border-emerald-950/[0.15] bg-black shadow-[0_28px_70px_rgba(2,12,8,0.2)] dark:border-emerald-900/40 lg:mt-0">
                <div className="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-r from-emerald-400/[0.12] via-transparent to-emerald-300/[0.12] blur-sm pointer-events-none" />
                <div className="relative aspect-[16/10]">
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
                      className="group relative flex h-full w-full flex-col items-center justify-end overflow-hidden px-6 py-6 text-left text-white transition hover:brightness-110"
                      aria-label="Putar video GTshirt"
                    >
                      {promoVideoThumbnailSrc ? (
                        <img
                          src={promoVideoThumbnailSrc}
                          alt="Thumbnail video GTshirt"
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[linear-gradient(145deg,#06110c,#102117_58%,#1c3f28)]" />
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,12,9,0.04),rgba(5,12,9,0.58)_68%,rgba(5,12,9,0.9))]" />
                      <div className="absolute left-5 top-5 inline-flex items-center rounded-full border border-white/20 bg-[rgba(8,18,13,0.48)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
                        GTshirt Preview
                      </div>
                      <div className="relative z-[1] flex w-full items-end justify-between gap-4">
                        <div className="max-w-md space-y-1.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/75">
                            Official Highlight
                          </p>
                          <p className="text-lg font-semibold tracking-[-0.03em] text-white sm:text-xl">
                            Preview bahan, detail sablon, dan vibe GTshirt terbaru.
                          </p>
                          <p className="text-xs leading-6 text-white/75 sm:text-sm">
                            Thumbnail tampil langsung, video baru dimuat saat kamu play.
                          </p>
                        </div>
                        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-brand-900 shadow-[0_18px_36px_rgba(0,0,0,0.24)] transition-transform duration-300 group-hover:scale-105">
                          <svg
                            className="ml-1 h-7 w-7"
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
              <p className={SHOP_SECTION_LABEL}>Store Direction</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                Fondasi visual dan ritme GTshirt.
              </h2>
              <p className="text-sm leading-7 text-brand-600 dark:text-brand-300">
                Pilar ini menjaga GTshirt tetap clean, relevan, dan terasa seperti extension dari komunitas yang membangunnya.
              </p>
            </div>
            <div className="mt-5 grid gap-3">
              {STORE_PILLARS.map((item) => (
                <article
                  key={item.key}
                  className="group relative overflow-hidden rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.72] p-4 shadow-[0_18px_36px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] dark:border-emerald-900/30 dark:bg-white/[0.03]"
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

        <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
          <section className={`${SHOP_SECTION_SHELL} flex flex-col justify-between`}>
            <div className="space-y-3">
              <p className={SHOP_SECTION_LABEL}>Order Center</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2rem]">
                Pantau pesanan langsung dari area toko.
              </h2>
              <p className="text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                Setelah checkout, pembeli bisa kembali ke halaman toko untuk membuka riwayat order atau melacak status pesanan dengan kode order dan WhatsApp.
              </p>
            </div>
            <div className="mt-5 grid gap-3">
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

          <section id="catalog-section" className={`${SHOP_SECTION_SHELL} space-y-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className={SHOP_SECTION_LABEL}>Catalog</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white sm:text-[2rem]">
                  Katalog produk yang lebih lapang dan enak dijelajahi.
                </h2>
                <p className="mt-2 text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                  Klik produk untuk melihat detail, pilih ukuran, lalu tambahkan ke keranjang dengan alur yang tetap ringan.
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

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                {filteredProducts.length} produk tampil
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                {availabilityLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                {sortLabel}
              </span>
              {activeSearchLabel && (
                <span className="inline-flex items-center rounded-full border border-brand-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-brand-600 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  "{activeSearchLabel}"
                </span>
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
          </section>
        </div>

        {isLoadingProducts && products.length === 0 ? (
          <div className="shop-grid grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
            {isCacheStale && !isLoadingProducts && filteredProducts.length > 0 && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
                Menampilkan data terakhir. Sedang memperbarui katalog.
              </div>
            )}
            {productLoadError && filteredProducts.length > 0 && (
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
            <div className="shop-grid grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                : "Restock";
              const stockToneClass = totalStock <= 0
                ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                : totalStock < 6
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

              return (
                <Link
                  key={product.id}
                  to={`/shop/${product.slug}`}
                  className="product-card group card-soft flex flex-col overflow-hidden rounded-[1.6rem] border border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,248,0.96))] shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] dark:border-emerald-900/30 dark:bg-[linear-gradient(180deg,rgba(10,18,14,0.96),rgba(7,12,10,0.94))] sm:rounded-[1.9rem]"
                >
                  <div className="relative aspect-square overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,245,0.92))] p-3 dark:bg-[linear-gradient(180deg,rgba(14,24,18,0.88),rgba(9,15,11,0.9))] sm:p-4">
                    <div className="pointer-events-none absolute inset-3 rounded-[1.4rem] border border-emerald-950/[0.08] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,248,246,0.84))] dark:border-emerald-900/30 dark:bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.14),transparent_50%),linear-gradient(180deg,rgba(14,24,18,0.78),rgba(9,15,11,0.88))]" />
                    <img
                      src={resolveStoreImageUrl(product.imageUrl)}
                      alt={product.name}
                      loading={index < INITIAL_EAGER_PRODUCT_IMAGE_COUNT ? "eager" : "lazy"}
                      fetchPriority={index < INITIAL_EAGER_PRODUCT_IMAGE_COUNT ? "high" : "low"}
                      decoding="async"
                      className="image-soft relative z-[1] h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                      onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                      onError={(event) => event.currentTarget.classList.add("is-loaded")}
                    />
                    <div className="absolute left-3 top-3 z-[2] flex flex-col gap-1 text-[10px] font-semibold sm:text-xs">
                      {product.verse && (
                        <span className="inline-flex items-center rounded-full border border-white/80 bg-[rgba(255,255,255,0.92)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700 shadow-sm dark:border-white/10 dark:bg-[rgba(8,14,11,0.82)] dark:text-emerald-100">
                          {product.verse}
                        </span>
                      )}
                      {product.promoIsActive && (
                        <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-white shadow-sm">
                          Promo
                        </span>
                      )}
                    </div>
                    <div className="absolute right-3 top-3 z-[2] rounded-full border border-white/80 bg-[rgba(255,255,255,0.92)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700 shadow-sm dark:border-white/10 dark:bg-[rgba(8,14,11,0.82)] dark:text-emerald-100">
                      {product.color || "GTshirt"}
                    </div>
                    <div className="absolute inset-0 hidden items-end justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-brand-900/10 group-hover:opacity-100 sm:flex">
                      <span className="mb-4 inline-flex translate-y-4 items-center gap-2 rounded-full bg-[rgba(255,255,255,0.95)] px-4 py-2 text-xs font-bold text-brand-900 shadow-lg transition-all duration-300 group-hover:translate-y-0 dark:bg-brand-800 dark:text-white sm:px-5 sm:py-2.5 sm:text-sm">
                        Lihat Produk
                        <ArrowUpRightSmallIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400 sm:text-xs sm:tracking-[0.2em]">
                        GTshirt Readywear
                      </p>
                      <h3 className="mt-1 text-sm font-bold text-brand-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors sm:text-lg">
                        {product.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-500 dark:text-brand-400 sm:text-xs">
                      <div className="flex items-center gap-0.5">
                        {renderStars(ratingAverage, "text-[11px] sm:text-xs")}
                      </div>
                      <span>
                        {ratingCount > 0
                          ? `${ratingAverage.toFixed(1)} · ${ratingCount} ulasan`
                          : "Belum ada ulasan"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs">
                      <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50/80 px-2 py-1 font-semibold text-brand-600 dark:border-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                        Ukuran {availableSizePreview}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-1 font-semibold ${stockToneClass}`}>
                        {totalStock <= 0 ? "Restock segera" : totalStock < 6 ? "Stok terbatas" : "Ready stock"}
                      </span>
                    </div>

                    <div className="mt-auto space-y-3">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          {product.promoIsActive &&
                          Number(product.discountAmount) > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] text-brand-500 line-through dark:text-brand-400 sm:text-xs">
                                {formatRupiah(Number(product.basePrice) || 0)}
                              </span>
                              <span className="text-base font-black text-rose-500 sm:text-[1.125rem]">
                                {formatRupiah(effectivePrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base font-black text-brand-900 dark:text-white sm:text-[1.125rem]">
                              {formatRupiah(effectivePrice)}
                            </span>
                          )}
                        </div>
                        <span className="rounded-lg bg-[rgba(16,185,129,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-xs">
                          {product.color || "Signature Tone"}
                        </span>
                      </div>

                      {product.promoIsActive && (
                        <p className="inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 sm:px-2.5 sm:py-1 sm:text-xs">
                          {product.promoLabel || "Harga Spesial"}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-3 border-t border-brand-100 pt-2 dark:border-brand-800">
                        <div>
                          <p className="text-[11px] font-medium text-brand-500 dark:text-brand-400 sm:text-xs">
                            Stok Tersedia
                          </p>
                          <p
                            className={`text-sm font-bold sm:text-base ${
                              totalStock <= 0
                                ? "text-rose-500"
                                : "text-brand-700 dark:text-brand-300"
                            }`}
                          >
                            {totalStock <= 0 ? "Habis" : `${totalStock} pcs`}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700 transition group-hover:bg-brand-100 dark:bg-brand-800/80 dark:text-brand-200 dark:group-hover:bg-brand-800">
                          Detail
                          <ArrowUpRightSmallIcon className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
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
