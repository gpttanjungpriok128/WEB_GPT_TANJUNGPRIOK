import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ShopHero from "../components/ShopHero";
import worshipSmokeImage from "../img/store/made-to-worship.png";
import lightJohnImage from "../img/store/you-are-the-light.png";
import hopePsalmImage from "../img/store/for-all-my-hope-is-in-him.png";
import { normalizeStoreImagePath, resolveStoreImageUrl } from "../utils/storeImage";
import { clampQuantity, getStockForSize, getTotalStock } from "../utils/storeStock";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const PROMO_VIDEO_URL = "https://youtu.be/oOOdw2ulGIg";

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
    imageUrl: worshipSmokeImage,
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
    imageUrl: lightJohnImage,
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
    imageUrl: hopePsalmImage,
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
const PRODUCTS_PER_PAGE = 16;
const PRODUCT_CACHE_KEY = "gpt_tanjungpriok_shop_catalog_v1";
const PRODUCT_CACHE_TTL = 1000 * 60 * 10;
const PREFETCH_IMAGE_COUNT = 6;
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

function getDefaultSize(product) {
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes.filter((size) => normalizeSizeLabel(size) !== "XXL")
    : [];
  if (!sizes.length) return "M";

  const firstAvailable = sizes.find((size) => getStockForSize(product, size) > 0);
  return firstAvailable || sizes[0] || "M";
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
  const [hasBootCache, setHasBootCache] = useState(false);
  const [isCacheStale, setIsCacheStale] = useState(false);
  const deferredSearch = useDeferredValue(searchQuery);
  const prefetchedImagesRef = useRef(new Set());

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

  useEffect(() => {
    if (!filteredProducts.length) return;

    filteredProducts.slice(0, PREFETCH_IMAGE_COUNT).forEach((product) => {
      const imageUrl = resolveStoreImageUrl(product.imageUrl);
      if (!imageUrl || prefetchedImagesRef.current.has(imageUrl)) return;

      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = imageUrl;
      link.setAttribute("data-prefetch", "shop-catalog");
      document.head.appendChild(link);
      prefetchedImagesRef.current.add(imageUrl);
    });
  }, [filteredProducts]);

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
    <div className="page-stack space-y-6 sm:space-y-8">
      <ShopHero />

      {promoVideoSrc && (
        <section className="grid gap-6 rounded-3xl border border-brand-200 bg-white/90 p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/40 sm:p-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
              Video Promo
            </p>
            <h2 className="text-xl font-bold text-brand-900 dark:text-white sm:text-2xl">
              Lihat vibe GTshirt sebelum kamu checkout
            </h2>
            <p className="text-sm leading-relaxed text-brand-600 dark:text-brand-300">
              Cuplikan singkat tentang bahan, detail sablon, dan gaya streetwear rohani terbaru dari GTshirt.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-brand-500 dark:text-brand-400">
              <span className="rounded-full bg-brand-100 px-3 py-1 text-brand-700 dark:bg-brand-800/60 dark:text-brand-200">
                Ready to watch
              </span>
              <span className="rounded-full bg-brand-100 px-3 py-1 text-brand-700 dark:bg-brand-800/60 dark:text-brand-200">
                Official GTshirt
              </span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-black shadow-lg dark:border-brand-700">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-emerald-400/10 to-primary/20 blur-sm pointer-events-none" />
            <div className="relative aspect-video">
              <iframe
                title="Video Promosi GTshirt"
                src={promoVideoSrc}
                className="h-full w-full"
                allowFullScreen
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6">
        <div className="grid gap-4 rounded-3xl border border-brand-200 bg-white/80 p-4 shadow-sm md:grid-cols-[1.2fr_0.8fr] dark:border-brand-700 dark:bg-brand-900/40 sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
              Order Center
            </p>
            <h2 className="mt-2 text-xl font-bold text-brand-900 dark:text-white sm:text-2xl">
              Pantau pesanan langsung dari area toko
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-600 dark:text-brand-300">
              Setelah checkout, pembeli bisa kembali ke halaman toko untuk membuka riwayat order atau melacak status pesanan dengan kode order dan WhatsApp.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3">
            {user && (
              <Link
                to="/my-orders"
                className="btn-primary inline-flex items-center justify-center !rounded-2xl !py-2.5 sm:!py-3"
              >
                Buka Pesanan Saya
              </Link>
            )}
            <Link
              to="/track-order"
              className="btn-outline inline-flex items-center justify-center !rounded-2xl !py-2.5 sm:!py-3"
            >
              Lacak Pesanan
            </Link>
          </div>
        </div>

        <div id="catalog-section" className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-brand-900 dark:text-white sm:text-2xl">
              Katalog Produk
            </h2>
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-400">
              Klik produk untuk melihat detail. Pilih ukuran dan masukkan ke
              keranjang.
            </p>
          </div>
          <Link
            to="/cart"
            className={`group relative inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:px-4 sm:py-2.5 sm:text-sm ${
              totalItems > 0
                ? "border-primary bg-primary text-white shadow-md hover:bg-primary/90"
                : "border-brand-300 bg-white text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/60"
            }`}
            title="Buka keranjang belanja"
            aria-label="Buka keranjang belanja"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
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

        <div className="grid gap-3 sm:hidden">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              Cari Produk
            </span>
            <input
              type="search"
              className="input-modern"
              placeholder="Cari nama, warna, atau tema desain"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <details className="mobile-filter rounded-2xl border border-brand-200 bg-white/85 shadow-sm dark:border-brand-700 dark:bg-brand-900/40">
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
                <select
                  className="input-modern"
                  value={availabilityFilter}
                  onChange={(event) => setAvailabilityFilter(event.target.value)}
                >
                  <option value="all">Semua Produk</option>
                  <option value="ready">Stok Tersedia</option>
                  <option value="promo">Sedang Promo</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                  Urutkan
                </span>
                <select
                  className="input-modern"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="featured">Terbaru</option>
                  <option value="price-low">Harga Termurah</option>
                  <option value="price-high">Harga Tertinggi</option>
                  <option value="stock">Stok Terbanyak</option>
                  <option value="name">Nama A-Z</option>
                </select>
              </label>
            </div>
          </details>
        </div>

        <div className="hidden sm:grid gap-4 rounded-3xl border border-brand-200 bg-white/85 p-4 shadow-sm lg:grid-cols-[1.2fr_0.8fr_0.7fr] dark:border-brand-700 dark:bg-brand-900/40 sm:p-5">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              Cari Produk
            </span>
            <input
              type="search"
              className="input-modern"
              placeholder="Cari nama, warna, atau tema desain"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              Filter
            </span>
            <select
              className="input-modern"
              value={availabilityFilter}
              onChange={(event) => setAvailabilityFilter(event.target.value)}
            >
              <option value="all">Semua Produk</option>
              <option value="ready">Stok Tersedia</option>
              <option value="promo">Sedang Promo</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              Urutkan
            </span>
            <select
              className="input-modern"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="featured">Terbaru</option>
              <option value="price-low">Harga Termurah</option>
              <option value="price-high">Harga Tertinggi</option>
              <option value="stock">Stok Terbanyak</option>
              <option value="name">Nama A-Z</option>
            </select>
          </label>
        </div>

        {isLoadingProducts && products.length === 0 ? (
          <div className="shop-grid grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
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
            <div className="shop-grid grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product, index) => {
              const effectivePrice = Number(
                product.finalPrice ?? product.basePrice ?? 0,
              );
              const totalStock = getTotalStock(product);
              const ratingAverage = Number(product.ratingAverage || 0);
              const ratingCount = Number(product.ratingCount || 0);

              return (
                <Link
                  key={product.id}
                  to={`/shop/${product.slug}`}
                  className="product-card group card-soft flex flex-col overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 dark:border-brand-700 dark:bg-brand-900/40 sm:rounded-3xl"
                >
                  <div className="relative aspect-square overflow-hidden bg-white p-3 dark:bg-brand-900/40 sm:p-4">
                    <img
                      src={resolveStoreImageUrl(product.imageUrl)}
                      alt={product.name}
                      loading={index < PREFETCH_IMAGE_COUNT ? "eager" : "lazy"}
                      fetchPriority={index < PREFETCH_IMAGE_COUNT ? "high" : "low"}
                      decoding="async"
                      className="image-soft h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                      onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                      onError={(event) => event.currentTarget.classList.add("is-loaded")}
                    />
                    <div className="absolute left-3 top-3 flex flex-col gap-1 text-[10px] font-semibold sm:text-xs">
                      {product.promoIsActive && (
                        <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-white shadow-sm">
                          Promo
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-brand-900/10 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                      <span className="translate-y-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-brand-900 shadow-lg transition-all duration-300 group-hover:translate-y-0 dark:bg-brand-800 dark:text-white sm:px-6 sm:py-2.5 sm:text-sm">
                        Lihat Produk
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400 sm:text-xs sm:tracking-[0.2em]">
                        {product.verse || "GTshirt"}
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
                        <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-800 dark:text-brand-300 sm:px-2.5 sm:py-1 sm:text-xs">
                          {product.color || "-"}
                        </span>
                      </div>

                      {product.promoIsActive && (
                        <p className="inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 sm:px-2.5 sm:py-1 sm:text-xs">
                          {product.promoLabel || "Harga Spesial"}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-brand-100 dark:border-brand-800">
                        <span className="text-[11px] font-medium text-brand-500 dark:text-brand-400 sm:text-xs">
                          Stok Tersedia
                        </span>
                        <span
                          className={`text-sm sm:text-base ${
                            totalStock <= 0
                              ? "text-rose-500 font-bold"
                              : "text-brand-700 font-bold dark:text-brand-300"
                          }`}
                        >
                          {totalStock <= 0 ? "Habis" : totalStock}
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
      </section>

      {/* Product detail page and cart page are now separate routes */}

      <section className="glass-card p-5 sm:p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Produksi Berkala",
              description:
                "Batch produksi setiap minggu agar kualitas sablon dan bahan tetap konsisten.",
            },
            {
              title: "Support Pelayanan",
              description:
                "Setiap pembelian mendukung kegiatan pemuda, multimedia, dan pelayanan gereja.",
            },
            {
              title: "Brand GTshirt",
              description:
                "Brand apparel rohani dari komunitas gereja dengan karakter minimalist streetwear.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-brand-200/80 bg-white/70 p-3 sm:p-4 dark:border-brand-700/80 dark:bg-brand-900/50"
            >
              <h3 className="text-sm font-bold uppercase tracking-[0.13em] text-brand-700 dark:text-brand-200">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-600 dark:text-brand-300">
                {item.description}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/contact"
            className="btn-outline !rounded-xl !px-5 !py-2.5 text-sm"
          >
            Tanya Tim Toko
          </Link>
          <Link
            to="/schedules"
            className="rounded-xl border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-800/40"
          >
            Cek Jadwal Ibadah
          </Link>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500 dark:text-brand-400">
            Ikuti GTshirtwear
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {GTSHIRT_SOCIALS.map(({ key, label, handle, href, accent, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-brand-200 bg-white/70 px-4 py-3 text-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white dark:border-brand-700 dark:bg-brand-900/40 dark:hover:bg-brand-900/60"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${accent}`}>
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
                <span className="ml-auto text-[11px] font-semibold text-brand-500 dark:text-brand-400">
                  Buka
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ShopPage;
