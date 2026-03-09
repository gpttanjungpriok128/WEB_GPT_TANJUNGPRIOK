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

function buildFallbackWhatsappMessage({
  cartItems,
  subtotal,
  shipping,
  grandTotal,
  checkoutForm,
}) {
  const itemLines = cartItems
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} | Size ${item.size} | ${item.color} | Qty ${item.quantity} | ${formatRupiah(item.price * item.quantity)}`,
    )
    .join("\n");

  return [
    "Shalom GTshirt, saya ingin pesan kaos rohani:",
    "",
    itemLines,
    "",
    `Subtotal: ${formatRupiah(subtotal)}`,
    `Ongkir Estimasi: ${formatRupiah(shipping)}`,
    `Total: ${formatRupiah(grandTotal)}`,
    "",
    "Data Pemesan:",
    `Nama: ${checkoutForm.name}`,
    `No. WhatsApp: ${checkoutForm.phone}`,
    `Alamat: ${checkoutForm.address}`,
    `Pengiriman: ${checkoutForm.shippingMethod}`,
    `Pembayaran: ${checkoutForm.paymentMethod}`,
    `Catatan: ${checkoutForm.notes || "-"}`,
  ].join("\n");
}

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
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isUsingFallbackProducts, setIsUsingFallbackProducts] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutInfo, setCheckoutInfo] = useState("");
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    phone: "",
    address: "",
    shippingMethod: "Kurir Jabodetabek",
    paymentMethod: "Transfer Bank",
    notes: "",
  });

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

        if (apiProducts.length > 0) {
          setProducts(apiProducts);
          setIsUsingFallbackProducts(false);
        } else {
          setProducts(FALLBACK_PRODUCTS);
          setIsUsingFallbackProducts(true);
        }
      } catch {
        setProducts(FALLBACK_PRODUCTS);
        setIsUsingFallbackProducts(true);
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

  const shipping =
    cartItems.length > 0
      ? checkoutForm.shippingMethod.toLowerCase().includes("ambil")
        ? 0
        : SHIPPING_COST
      : 0;
  const grandTotal = subtotal + shipping;
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
      setCheckoutError("Produk ini sedang habis.");
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

    setLastAddedProduct(product.name);
    setCheckoutError("");
    setCheckoutInfo("");
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

  const clearCart = () => {
    setCartItems([]);
    setLastAddedProduct("");
  };

  const handleCheckoutField = (field, value) => {
    setCheckoutForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const proceedCheckout = async () => {
    if (cartItems.length === 0) {
      setCheckoutError("Keranjang masih kosong. Tambahkan produk dulu ya.");
      return;
    }
    if (
      !checkoutForm.name.trim() ||
      !checkoutForm.phone.trim() ||
      !checkoutForm.address.trim()
    ) {
      setCheckoutError("Lengkapi nama, nomor WhatsApp, dan alamat pengiriman.");
      return;
    }

    setIsSubmittingOrder(true);
    setCheckoutError("");
    setCheckoutInfo("");

    const payload = {
      name: checkoutForm.name.trim(),
      phone: checkoutForm.phone.trim(),
      address: checkoutForm.address.trim(),
      shippingMethod: checkoutForm.shippingMethod,
      paymentMethod: checkoutForm.paymentMethod,
      notes: checkoutForm.notes.trim(),
      items: cartItems.map((item) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
      })),
    };

    try {
      const { data } = await api.post("/store/orders", payload);
      const whatsappLink = data?.data?.whatsappLink;
      const orderCode = data?.data?.orderCode;

      if (whatsappLink) {
        window.open(whatsappLink, "_blank", "noopener,noreferrer");
      } else {
        const fallbackMessage = buildFallbackWhatsappMessage({
          cartItems,
          subtotal,
          shipping,
          grandTotal,
          checkoutForm,
        });
        const fallbackLink = `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(fallbackMessage)}`;
        window.open(fallbackLink, "_blank", "noopener,noreferrer");
      }

      setCheckoutInfo(
        orderCode
          ? `Pesanan berhasil dibuat dengan kode ${orderCode}. Silakan lanjutkan konfirmasi via WhatsApp.`
          : "Pesanan berhasil dibuat. Silakan lanjutkan konfirmasi via WhatsApp.",
      );
      setCartItems([]);
      setLastAddedProduct("");
    } catch (error) {
      if (isUsingFallbackProducts) {
        const fallbackMessage = buildFallbackWhatsappMessage({
          cartItems,
          subtotal,
          shipping,
          grandTotal,
          checkoutForm,
        });
        const fallbackLink = `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${encodeURIComponent(fallbackMessage)}`;
        window.open(fallbackLink, "_blank", "noopener,noreferrer");
        setCheckoutInfo("Pesanan dikirim via WhatsApp (mode katalog lokal).");
        setCartItems([]);
        setLastAddedProduct("");
        return;
      }

      const firstValidationError = error.response?.data?.errors?.[0]?.msg;
      setCheckoutError(
        firstValidationError ||
          error.response?.data?.message ||
          "Checkout gagal. Silakan coba lagi.",
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="page-stack space-y-8">
      <PageHero
        image={gtshirtLogo}
        title="GTshirt Official Store"
        titleAccent="Toko Kaos Rohani"
        subtitle="Koleksi kaos minimalist streetwear untuk jemaat. Produk, harga, dan promo dikelola langsung dari dashboard admin GTshirt."
      />

      {isUsingFallbackProducts && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-300">
          Data produk API belum tersedia, sehingga sementara menampilkan katalog
          lokal. Produk dari dashboard admin akan tampil otomatis setelah data
          toko tersedia.
        </section>
      )}

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
          <button
            className="relative rounded-full bg-primary/20 p-3 text-primary transition hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40"
            title="Buka keranjang belanja"
            disabled={true}
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
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {isLoadingProducts ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const effectivePrice = Number(
                product.finalPrice ?? product.basePrice ?? 0,
              );

              return (
                <Link
                  key={product.id}
                  to={`/shop/${product.slug}`}
                  className="group overflow-hidden rounded-3xl border border-brand-200 bg-white/90 shadow-sm transition hover:shadow-lg hover:border-primary dark:border-brand-700 dark:bg-brand-900/70"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-brand-100/60 dark:bg-brand-800/30 relative">
                    <img
                      src={resolveImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20 flex items-center justify-center">
                      <span className="text-white/0 transition group-hover:text-white/100 text-lg font-bold">
                        👁️ Lihat Detail
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                        {product.verse || "GTshirt"}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-brand-900 dark:text-white line-clamp-2">
                        {product.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {product.promoIsActive &&
                        Number(product.discountAmount) > 0 ? (
                          <>
                            <p className="text-xs text-brand-500 line-through dark:text-brand-400">
                              {formatRupiah(Number(product.basePrice) || 0)}
                            </p>
                            <span className="text-lg font-black text-primary">
                              {formatRupiah(effectivePrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-black text-primary">
                            {formatRupiah(effectivePrice)}
                          </span>
                        )}
                      </div>
                      <span className="rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-600 dark:border-brand-700 dark:text-brand-300">
                        {product.color || "-"}
                      </span>
                    </div>

                    {product.promoIsActive && (
                      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {product.promoLabel || "Promo aktif"}
                      </p>
                    )}

                    <p className="text-xs text-brand-500 dark:text-brand-400">
                      Stok:{" "}
                      <span
                        className={
                          Number(product.stock) <= 0
                            ? "text-rose-500 font-bold"
                            : "font-semibold"
                        }
                      >
                        {product.stock ?? 0}
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Product Detail Page via Navigation ──────────────────── */}
      {/* Detail produk sekarang ditampilkan di halaman terpisah: /shop/:slug */}

      {/* ── Cart Drawer Modal ──────────────────── */}
      {/* Cart Drawer modal has been removed. Cart functionality is now handled */}
      {/* through the Checkout section below for a cleaner checkout flow. */}

      {/* ── Checkout Section ──────────────────── */}
      {cartItems.length > 0 && (
        <section className="glass-card p-6 md:p-8 sticky bottom-0">
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
                Lengkapi Data Checkout
              </h3>
              {cartItems.length === 0 ? (
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  Tambahkan produk terlebih dahulu
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input
                    className="input-modern"
                    placeholder="Nama lengkap"
                    value={checkoutForm.name}
                    onChange={(event) =>
                      handleCheckoutField("name", event.target.value)
                    }
                  />
                  <input
                    className="input-modern"
                    placeholder="No. WhatsApp"
                    value={checkoutForm.phone}
                    onChange={(event) =>
                      handleCheckoutField("phone", event.target.value)
                    }
                  />
                  <select
                    className="input-modern"
                    value={checkoutForm.shippingMethod}
                    onChange={(event) =>
                      handleCheckoutField("shippingMethod", event.target.value)
                    }
                  >
                    <option>Kurir Jabodetabek</option>
                    <option>Ambil di Gereja</option>
                  </select>
                  <select
                    className="input-modern"
                    value={checkoutForm.paymentMethod}
                    onChange={(event) =>
                      handleCheckoutField("paymentMethod", event.target.value)
                    }
                  >
                    <option>Transfer Bank</option>
                    <option>QRIS</option>
                    <option>Bayar Tunai di Gereja</option>
                  </select>
                </div>
              )}
              <textarea
                className="input-modern min-h-[60px] resize-y"
                placeholder="Alamat lengkap pengiriman (opsional: catatan tambahan)"
                value={checkoutForm.address}
                onChange={(event) =>
                  handleCheckoutField("address", event.target.value)
                }
              />

              {checkoutError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-900/30 dark:text-rose-300">
                  {checkoutError}
                </p>
              )}

              {checkoutInfo && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {checkoutInfo}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={proceedCheckout}
                disabled={isSubmittingOrder}
                className="btn-primary !rounded-xl !px-6 !py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
              >
                {isSubmittingOrder ? "Processing..." : "Checkout"}
              </button>
            </div>
          </div>
        </section>
      )}

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
