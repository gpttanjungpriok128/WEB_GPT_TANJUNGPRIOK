import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import PageHero from "../components/PageHero";
import worshipSmokeImage from "../img/store/made-to-worship.png";
import lightJohnImage from "../img/store/you-are-the-light.png";
import hopePsalmImage from "../img/store/for-all-my-hope-is-in-him.png";
import gtshirtLogo from "../img/gtshirt-logo.jpeg";

const SHOP_WHATSAPP_NUMBER = "6282118223784"; // Format: +62 821-1822-3784
const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const SHIPPING_COST = 15000;
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";

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
  },
];

const formatRupiah = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);



function resolveImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/")) {
    return `${SERVER_URL}${imageUrl}`;
  }
  return imageUrl;
}

function ShopPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [selections, setSelections] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isUsingFallbackProducts, setIsUsingFallbackProducts] = useState(false);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!savedCart) return;
      const parsed = JSON.parse(savedCart);
      if (Array.isArray(parsed)) {
        setCartItems(parsed);
      }
    } catch {
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    setSelections((previous) => {
      const next = { ...previous };
      for (const product of products) {
        if (!next[product.id]) {
          next[product.id] = {
            size: product.sizes?.[2] || product.sizes?.[0] || "M",
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
        // Removed fallback logic completely
        setIsUsingFallbackProducts(false);
      } catch {
        setProducts([]); // Set empty array instead of fallbacks
        setIsUsingFallbackProducts(false);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

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
    if (Number(product.stock) <= 0) {
      return;
    }

    const selection = selections[product.id] || {
      size: product.sizes?.[0] || "M",
      quantity: 1,
    };

    const quantity = Math.max(1, Number(selection.quantity) || 1);
    const size = selection.size || product.sizes?.[0] || "M";
    const variantKey = `${product.id}-${size}`;

    setCartItems((previous) => {
      const existingItemIndex = previous.findIndex(
        (item) => item.variantKey === variantKey,
      );

      if (existingItemIndex >= 0) {
        return previous.map((item, index) => {
          if (index !== existingItemIndex) return item;
          const nextQty = Math.min(
            item.quantity + quantity,
            Number(product.stock) || 99,
          );
          return { ...item, quantity: nextQty };
        });
      }

      return [
        ...previous,
        {
          variantKey,
          productId: product.id,
          name: product.name,
          price: Number(product.finalPrice ?? product.basePrice ?? 0),
          image: resolveImageUrl(product.imageUrl),
          size,
          color: product.color || "-",
          quantity,
          stock: Number(product.stock) || 0,
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
        const boundedQty = Math.min(99, safeQuantity, item.stock || 99);
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
      <PageHero
        image={gtshirtLogo}
        title="GTshirt Official Store"
        titleAccent="Toko Kaos Rohani"
        subtitle="Koleksi kaos minimalist streetwear untuk jemaat. Produk, harga, dan promo dikelola langsung dari dashboard admin GTshirt."
      />

      <section className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
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
            className={`relative rounded-full p-3 transition ${totalItems > 0 ? "bg-primary text-white hover:bg-primary/90 shadow-md" : "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/30 dark:hover:bg-primary/40"}`}
            title="Buka keranjang belanja"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h17.25c.621 0 1.125.504 1.125 1.125v12c0 .621-.504 1.125-1.125 1.125H3.375A1.125 1.125 0 0 1 2.25 19.125V7.125Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm8 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm4 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-brand-900">
                {totalItems}
              </span>
            )}
          </Link>
        </div>

        {isLoadingProducts ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </div>
        ) : products.length === 0 ? (
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
              Belum ada produk terbaru
            </h3>
            <p className="mt-2 max-w-sm text-brand-600 dark:text-brand-400">
              Nantikan koleksi apparel rohani terbaru dari kami. Pastikan kamu
              selalu cek halaman ini secara berkala!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const effectivePrice = Number(
                product.finalPrice ?? product.basePrice ?? 0,
              );

              return (
                <Link
                  key={product.id}
                  to={`/shop/${product.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 dark:border-brand-700 dark:bg-brand-900/40"
                >
                  <div className="relative aspect-square overflow-hidden bg-brand-50 dark:bg-brand-800/30 p-4">
                    <img
                      src={resolveImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 group-hover:scale-110"
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
                            Number(product.stock) <= 0
                              ? "text-rose-500 font-bold"
                              : "text-brand-700 font-bold dark:text-brand-300"
                          }`}
                        >
                          {Number(product.stock) <= 0 ? "Habis" : product.stock}
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
