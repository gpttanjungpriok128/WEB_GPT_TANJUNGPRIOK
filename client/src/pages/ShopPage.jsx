import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import ShopHero from "../components/ShopHero";
import worshipSmokeImage from "../img/store/made-to-worship.png";
import lightJohnImage from "../img/store/you-are-the-light.png";
import hopePsalmImage from "../img/store/for-all-my-hope-is-in-him.png";
import { normalizeStoreImagePath, resolveStoreImageUrl } from "../utils/storeImage";
import { clampQuantity, getStockForSize, getTotalStock } from "../utils/storeStock";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";

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
    sizes: ["S", "M", "L", "XL", "XXL"],
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
    sizes: ["S", "M", "L", "XL", "XXL"],
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
    sizes: ["S", "M", "L", "XL", "XXL"],
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

function getDefaultSize(product) {
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  if (!sizes.length) return "M";

  const firstAvailable = sizes.find((size) => getStockForSize(product, size) > 0);
  return firstAvailable || sizes[0] || "M";
}

function ShopPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [selections, setSelections] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

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

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const { data } = await api.get("/store/products");
        const apiProducts = Array.isArray(data?.data)
          ? data.data.filter((item) => item.isActive !== false)
          : [];

        setProducts(apiProducts);
      } catch {
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
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
  }, [availabilityFilter, products, searchQuery, sortBy]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems],
  );


  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

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
    <div className="page-stack space-y-8">
      <ShopHero />

      <section className="grid gap-6">
        <div className="grid gap-4 rounded-3xl border border-brand-200 bg-white/80 p-5 shadow-sm md:grid-cols-[1.2fr_0.8fr] dark:border-brand-700 dark:bg-brand-900/40">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
              Order Center
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 dark:text-white">
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
                className="btn-primary inline-flex items-center justify-center !rounded-2xl !py-3"
              >
                Buka Pesanan Saya
              </Link>
            )}
            <Link
              to="/track-order"
              className="btn-outline inline-flex items-center justify-center !rounded-2xl !py-3"
            >
              Lacak Pesanan
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-brand-900 dark:text-white">
              Katalog Produk
            </h2>
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-400">
              Klik produk untuk melihat detail. Pilih ukuran dan masukkan ke
              keranjang.
            </p>
          </div>
          <Link
            to="/cart"
            className={`group relative inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
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

        <div className="grid gap-4 rounded-3xl border border-brand-200 bg-white/85 p-4 shadow-sm lg:grid-cols-[1.2fr_0.8fr_0.7fr] dark:border-brand-700 dark:bg-brand-900/40">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              Cari Produk
            </span>
            <input
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

        {isLoadingProducts ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
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
            <h3 className="text-xl font-bold text-brand-900 dark:text-white">
              Produk belum ditemukan
            </h3>
            <p className="mt-2 max-w-sm text-brand-600 dark:text-brand-400">
              Coba ubah kata kunci pencarian atau filter katalog untuk melihat produk lain yang tersedia.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
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
                  className="group flex flex-col overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 dark:border-brand-700 dark:bg-brand-900/40"
                >
                  <div className="relative aspect-square overflow-hidden bg-white p-4 dark:bg-brand-900/40">
                    <img
                      src={resolveStoreImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-brand-900/10 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                      <span className="translate-y-4 rounded-full bg-white/95 px-6 py-2.5 text-sm font-bold text-brand-900 shadow-lg transition-all duration-300 group-hover:translate-y-0 dark:bg-brand-800 dark:text-white">
                        Lihat Produk
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                        {product.verse || "GTshirt"}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-brand-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-brand-500 dark:text-brand-400">
                      <div className="flex items-center gap-0.5">
                        {renderStars(ratingAverage)}
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
                              <span className="text-xs text-brand-500 line-through dark:text-brand-400">
                                {formatRupiah(Number(product.basePrice) || 0)}
                              </span>
                              <span className="text-[1.125rem] font-black text-rose-500">
                                {formatRupiah(effectivePrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[1.125rem] font-black text-brand-900 dark:text-white">
                              {formatRupiah(effectivePrice)}
                            </span>
                          )}
                        </div>
                        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-800 dark:text-brand-300">
                          {product.color || "-"}
                        </span>
                      </div>

                      {product.promoIsActive && (
                        <p className="inline-block rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                          {product.promoLabel || "Harga Spesial"}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-brand-100 dark:border-brand-800">
                        <span className="text-xs font-medium text-brand-500 dark:text-brand-400">
                          Stok Tersedia
                        </span>
                        <span
                          className={`text-sm ${
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
        )}
      </section>

      {/* Product detail page and cart page are now separate routes */}

      <section className="glass-card p-6 md:p-8">
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
              className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/50"
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
      </section>
    </div>
  );
}

export default ShopPage;
