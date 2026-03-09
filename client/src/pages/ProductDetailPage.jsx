import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import worshipSmokeImage from "../img/store/made-to-worship.png";
import lightJohnImage from "../img/store/you-are-the-light.png";
import hopePsalmImage from "../img/store/for-all-my-hope-is-in-him.png";

const SHOP_WHATSAPP_NUMBER = "6282118223784"; // Format: +62 821-1822-3784
const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const SHIPPING_COST = 15000;
const SERVER_URL = (import.meta.env.VITE_SERVER_URL || "http://localhost:5001").replace(/\/$/, "");

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
    imageUrls: [worshipSmokeImage],
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
    imageUrls: [lightJohnImage],
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
    imageUrls: [hopePsalmImage],
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
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/assets/") || imageUrl.startsWith("/src/")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/")) {
    return SERVER_URL ? `${SERVER_URL}${imageUrl}` : imageUrl;
  }
  return imageUrl;
}

function getImageWithFallback(product, fallbackProducts) {
  if (!product) return worshipSmokeImage;

  const imageUrls =
    Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  // Try to find a fallback product by slug to use its images
  const fallbackProduct = fallbackProducts.find((p) => p.slug === product.slug);
  if (
    fallbackProduct &&
    Array.isArray(fallbackProduct.imageUrls) &&
    fallbackProduct.imageUrls.length > 0
  ) {
    return [...imageUrls, ...fallbackProduct.imageUrls];
  }

  return imageUrls.length > 0 ? imageUrls : [worshipSmokeImage];
}

function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [failedImages, setFailedImages] = useState(new Set());
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/store/products/${slug}`);
        if (data?.data) {
          setProduct(data.data);
          setSelectedSize(data.data.sizes?.[0] || "M");
          const imgs = getImageWithFallback(data.data, FALLBACK_PRODUCTS);
          setImages(imgs);
        } else {
          const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
          setProduct(found);
          setSelectedSize(found?.sizes?.[0] || "M");
          if (found) {
            const imgs = getImageWithFallback(found, FALLBACK_PRODUCTS);
            setImages(imgs);
          }
        }
      } catch {
        const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
        setProduct(found);
        setSelectedSize(found?.sizes?.[0] || "M");
        if (found) {
          const imgs = getImageWithFallback(found, FALLBACK_PRODUCTS);
          setImages(imgs);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const addToCart = () => {
    if (!product) return;
    if (!selectedSize) {
      setFeedback("Pilih ukuran terlebih dahulu");
      return;
    }
    if (Number(product.stock) <= 0) {
      setFeedback("Produk ini sedang habis");
      return;
    }

    try {
      const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsedCart = rawCart ? JSON.parse(rawCart) : [];
      const savedCart = Array.isArray(parsedCart) ? parsedCart : [];
      const variantKey = `${product.id}-${selectedSize}`;
      const existingItemIndex = savedCart.findIndex(
        (item) => item.variantKey === variantKey,
      );

      if (existingItemIndex >= 0) {
        const nextQty = Math.min(
          savedCart[existingItemIndex].quantity + quantity,
          Number(product.stock) || 99,
        );
        savedCart[existingItemIndex].quantity = nextQty;
      } else {
        savedCart.push({
          variantKey,
          productId: product.id,
          name: product.name,
          price: Number(product.finalPrice ?? product.basePrice ?? 0),
          image: resolveImageUrl(product.imageUrl),
          size: selectedSize,
          color: product.color || "-",
          quantity: Math.min(quantity, Number(product.stock) || 99),
          stock: Number(product.stock) || 0,
        });
      }

      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(savedCart));
      setFeedback(`${product.name} berhasil ditambahkan ke keranjang!`);
      setQuantity(1);
      setTimeout(() => setFeedback(""), 3000);
    } catch (error) {
      setFeedback("Gagal menambahkan ke keranjang");
    }
  };

  if (isLoading) {
    return (
      <div className="page-stack flex items-center justify-center py-20">
        <div className="h-12 w-12 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-stack space-y-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/70 dark:bg-rose-900/20">
          <p className="text-rose-700 dark:text-rose-300">
            Produk tidak ditemukan
          </p>
          <Link to="/shop" className="btn-primary mt-4 inline-block">
            ← Kembali ke Toko
          </Link>
        </div>
      </div>
    );
  }

  const effectivePrice = Number(product.finalPrice ?? product.basePrice ?? 0);

  const handleImageError = (index) => {
    setFailedImages((prev) => new Set([...prev, index]));
    // Use fallback image
    if (
      !images[index]?.startsWith("http") &&
      !images[index]?.startsWith("data:")
    ) {
      const fallbackIdx = images.findIndex(
        (img, i) =>
          i !== index &&
          !failedImages.has(i) &&
          (img.startsWith("http") || img.startsWith("data:")),
      );
      if (fallbackIdx !== -1) {
        setSelectedImageIndex(fallbackIdx);
      }
    }
  };

  return (
    <div className="page-stack space-y-8">
      {/* ── Breadcrumb ──────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400">
        <Link
          to="/shop"
          className="transition hover:text-brand-900 dark:hover:text-white"
        >
          Toko
        </Link>
        <span>/</span>
        <span className="text-brand-900 dark:text-white font-semibold">
          {product.name}
        </span>
      </nav>

      {/* ── Product Detail Section ──────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* ── Left: Image Gallery ──────────────────────── */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-brand-900/50 aspect-square border border-brand-100 dark:border-brand-800">
            <img
              src={resolveImageUrl(images[selectedImageIndex])}
              alt={product.name}
              onError={() => handleImageError(selectedImageIndex)}
              className="h-full w-full object-contain p-4 mix-blend-multiply dark:mix-blend-normal"
            />
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`overflow-hidden rounded-xl border-2 transition ${
                    selectedImageIndex === index
                      ? "border-primary"
                      : "border-brand-200 dark:border-brand-700 hover:border-brand-300 dark:hover:border-brand-600"
                  }`}
                >
                  <img
                    src={resolveImageUrl(image)}
                    alt={`Foto ${index + 1}`}
                    onError={() => handleImageError(index)}
                    className="h-20 w-full object-contain p-1 bg-white dark:bg-brand-900/50 mix-blend-multiply dark:mix-blend-normal"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Product Info ──────────────────────── */}
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 mb-2">
                  {product.verse || "GTshirt"}
                </p>
                <h1 className="text-3xl font-black text-brand-900 dark:text-white">
                  {product.name}
                </h1>
              </div>
              <button
                onClick={() => navigate("/shop")}
                className="text-2xl transition hover:text-brand-600 dark:hover:text-brand-400"
              >
                ✕
              </button>
            </div>

            {/* Rating & Review */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-lg">
                    ⭐
                  </span>
                ))}
              </div>
              <span className="text-sm text-brand-600 dark:text-brand-300">
                (Produk Pilihan)
              </span>
            </div>
          </div>

          {/* Price & Discount */}
          <div className="space-y-2">
            {product.promoIsActive && Number(product.discountAmount) > 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-brand-500 line-through dark:text-brand-400">
                  {formatRupiah(Number(product.basePrice) || 0)}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-primary">
                    {formatRupiah(effectivePrice)}
                  </span>
                  <span className="inline-block rounded-full bg-rose-500 px-3 py-1 text-sm font-bold text-white">
                    -
                    {Math.round(
                      (Number(product.discountAmount) /
                        Number(product.basePrice)) *
                        100,
                    )}
                    %
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-4xl font-black text-primary">
                {formatRupiah(effectivePrice)}
              </span>
            )}
          </div>

          {/* Promo Badge */}
          {product.promoIsActive && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/70 dark:bg-emerald-900/20">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                🎉 {product.promoLabel || "Promo Spesial!"}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-700 dark:bg-brand-900/30">
            <p className="text-sm leading-relaxed text-brand-700 dark:text-brand-300">
              {product.description}
            </p>
          </div>

          {/* Stock Info */}
          <div className="rounded-lg border border-brand-200 bg-white/70 p-3 dark:border-brand-700 dark:bg-brand-900/50">
            <p className="text-sm">
              <span className="font-semibold text-brand-700 dark:text-brand-300">
                Stok:{" "}
              </span>
              <span
                className={
                  Number(product.stock) <= 0
                    ? "font-bold text-rose-600"
                    : "font-semibold text-emerald-600 dark:text-emerald-400"
                }
              >
                {Number(product.stock) <= 0
                  ? "Habis"
                  : `${product.stock} pcs tersedia`}
              </span>
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-brand-200 dark:bg-brand-700" />

          {/* Color Selection */}
          {product.color && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                🎨 Warna:{" "}
                <span className="text-brand-900 dark:text-white">
                  {product.color}
                </span>
              </p>
            </div>
          )}

          {/* Size Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-brand-700 dark:text-brand-300">
              📏 Pilih Ukuran
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(product.sizes || ["S", "M", "L", "XL"]).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-lg py-2 font-semibold transition ${
                    selectedSize === size
                      ? "bg-primary text-white border-2 border-primary"
                      : "border-2 border-brand-200 bg-white text-brand-700 hover:border-primary dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-brand-700 dark:text-brand-300">
              📦 Jumlah
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-200 bg-white font-bold transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:hover:bg-brand-900"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={Number(product.stock) || 99}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value) || 1))
                }
                className="input-modern w-20 text-center"
              />
              <button
                onClick={() =>
                  setQuantity(
                    Math.min(Number(product.stock) || 99, quantity + 1),
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-200 bg-white font-bold transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:hover:bg-brand-900"
              >
                +
              </button>
              <span className="text-sm text-brand-600 dark:text-brand-400">
                Max: {Number(product.stock) || 0} pcs
              </span>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                feedback.includes("gagal") || feedback.includes("Gagal")
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300"
              }`}
            >
              {feedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={addToCart}
              disabled={Number(product.stock) <= 0}
              className="btn-outline flex flex-1 items-center justify-center gap-2 !py-3 font-semibold disabled:opacity-50"
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
              <span>Tambah ke Keranjang</span>
            </button>
            <Link
              to="/shop"
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white transition hover:bg-primary/90"
            >
              ← Kembali ke Toko
            </Link>
          </div>

          {/* Info Box */}
          <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              ℹ️ Informasi Produk
            </p>
            <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
              <li>✓ Bahan: Cotton Combed 24s Premium</li>
              <li>✓ Fit: Unisex Comfort</li>
              <li>✓ Brand: GTshirt Authentic</li>
              <li>✓ Sablon: High-quality printing</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProductDetailPage;
