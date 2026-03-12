import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import worshipSmokeImage from "../img/store/made-to-worship.png";
import lightJohnImage from "../img/store/you-are-the-light.png";
import hopePsalmImage from "../img/store/for-all-my-hope-is-in-him.png";
import { normalizeStoreImagePath, resolveStoreImageUrl } from "../utils/storeImage";
import {
  clampQuantity,
  getStockForSize,
  getTotalStock,
  normalizeSizeKey,
} from "../utils/storeStock";

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
    imageUrls: [worshipSmokeImage],
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
    imageUrls: [lightJohnImage],
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
    imageUrls: [hopePsalmImage],
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

const formatReviewDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const renderStars = (value, className = "text-base") => {
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

function getDefaultSize(product) {
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  if (!sizes.length) return "M";

  const firstAvailable = sizes.find((size) => getStockForSize(product, size) > 0);
  return firstAvailable || sizes[0] || "M";
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
  const [cartCount, setCartCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    average: 0,
    count: 0,
    ratingCounts: {},
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    orderCode: "",
    phone: "",
    reviewText: "",
  });
  const [reviewFeedback, setReviewFeedback] = useState({ type: "", text: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchDeltaRef = useRef({ x: 0, y: 0 });

  const syncCartCount = () => {
    try {
      const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsedCart = rawCart ? JSON.parse(rawCart) : [];
      const list = Array.isArray(parsedCart) ? parsedCart : [];
      const count = list.reduce((total, item) => total + (Number(item?.quantity) || 0), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    syncCartCount();
    const handleStorage = () => syncCartCount();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/store/products/${slug}`);
        if (data?.data) {
          setProduct(data.data);
          setSelectedSize(getDefaultSize(data.data));
          const imgs = getImageWithFallback(data.data, FALLBACK_PRODUCTS);
          setImages(imgs);
        } else {
          const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
          setProduct(found);
          setSelectedSize(getDefaultSize(found));
          if (found) {
            const imgs = getImageWithFallback(found, FALLBACK_PRODUCTS);
            setImages(imgs);
          }
        }
      } catch {
        const found = FALLBACK_PRODUCTS.find((p) => p.slug === slug);
        setProduct(found);
        setSelectedSize(getDefaultSize(found));
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

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoadingReviews(true);
      try {
        const { data } = await api.get(`/store/products/${slug}/reviews`);
        const reviewList = Array.isArray(data?.data) ? data.data : [];
        const meta = data?.meta || {};
        setReviews(reviewList);
        setReviewSummary({
          average: Number(meta.averageRating) || 0,
          count: Number(meta.totalReviews) || 0,
          ratingCounts: meta.ratingCounts || {},
        });
      } catch {
        setReviews([]);
        setReviewSummary({ average: 0, count: 0, ratingCounts: {} });
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [slug]);

  useEffect(() => {
    if (!product || !selectedSize) return;
    const maxQty = getStockForSize(product, selectedSize) || 1;
    setQuantity((previous) => clampQuantity(previous, maxQty));
  }, [product, selectedSize]);

  const updateReviewField = (field, value) => {
    setReviewForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const submitReview = async () => {
    if (isSubmittingReview) return;
    if (!canSubmitReview) {
      setReviewFeedback({
        type: "error",
        text: "Lengkapi kode pesanan, nomor WhatsApp, dan rating terlebih dahulu.",
      });
      return;
    }
    setIsSubmittingReview(true);
    setReviewFeedback({ type: "", text: "" });
    try {
      const payload = {
        rating: Number(reviewForm.rating),
        orderCode: reviewForm.orderCode.trim(),
        phone: reviewForm.phone.trim(),
        reviewText: reviewForm.reviewText.trim(),
      };
      await api.post(`/store/products/${slug}/reviews`, payload);
      setReviewFeedback({
        type: "success",
        text: "Terima kasih! Ulasan kamu sudah tercatat.",
      });
      setReviewForm((previous) => ({
        ...previous,
        rating: 5,
        reviewText: "",
      }));
      const { data } = await api.get(`/store/products/${slug}/reviews`);
      const reviewList = Array.isArray(data?.data) ? data.data : [];
      const meta = data?.meta || {};
      setReviews(reviewList);
      setReviewSummary({
        average: Number(meta.averageRating) || 0,
        count: Number(meta.totalReviews) || 0,
        ratingCounts: meta.ratingCounts || {},
      });
    } catch (error) {
      setReviewFeedback({
        type: "error",
        text:
          error.response?.data?.message ||
          "Ulasan gagal dikirim. Cek kembali kode pesanan dan nomor WhatsApp.",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const addToCart = () => {
    if (!product) return;
    if (!selectedSize) {
      setFeedback("Pilih ukuran terlebih dahulu");
      return;
    }
    const sizeStock = getStockForSize(product, selectedSize);
    if (sizeStock <= 0) {
      setFeedback(`Stok ukuran ${normalizeSizeKey(selectedSize)} sedang habis`);
      return;
    }

    try {
      const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsedCart = rawCart ? JSON.parse(rawCart) : [];
      const savedCart = Array.isArray(parsedCart) ? parsedCart : [];
      const variantKey = `${product.id}-${selectedSize}`;
      const normalizedPrimaryImage = normalizeStoreImagePath(product.imageUrl);
      const normalizedImageUrls = Array.isArray(product.imageUrls)
        ? product.imageUrls.map(normalizeStoreImagePath).filter(Boolean)
        : normalizedPrimaryImage
          ? [normalizedPrimaryImage]
          : [];
      const existingItemIndex = savedCart.findIndex(
        (item) => item.variantKey === variantKey,
      );

      if (existingItemIndex >= 0) {
        const nextQty = clampQuantity(
          savedCart[existingItemIndex].quantity + quantity,
          sizeStock,
        );
        savedCart[existingItemIndex].quantity = nextQty;
        savedCart[existingItemIndex].image =
          savedCart[existingItemIndex].image || normalizedPrimaryImage;
        savedCart[existingItemIndex].imageUrls =
          Array.isArray(savedCart[existingItemIndex].imageUrls) &&
          savedCart[existingItemIndex].imageUrls.length > 0
            ? savedCart[existingItemIndex].imageUrls
            : normalizedImageUrls;
        savedCart[existingItemIndex].stock = sizeStock;
        savedCart[existingItemIndex].stockBySize = product.stockBySize || {};
      } else {
        savedCart.push({
          variantKey,
          productId: product.id,
          name: product.name,
          price: Number(product.finalPrice ?? product.basePrice ?? 0),
          image: normalizedPrimaryImage,
          imageUrls: normalizedImageUrls,
          size: selectedSize,
          color: product.color || "-",
          quantity: clampQuantity(quantity, sizeStock),
          stock: sizeStock,
          stockBySize: product.stockBySize || {},
        });
      }

      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(savedCart));
      syncCartCount();
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
  const sizes = Array.isArray(product.sizes) && product.sizes.length > 0
    ? product.sizes
    : ["S", "M", "L", "XL"];
  const totalStock = getTotalStock(product);
  const selectedSizeStock = getStockForSize(product, selectedSize);
  const ratingAverage = Number(
    reviewSummary.average || product.ratingAverage || 0,
  );
  const ratingCount = Number(
    reviewSummary.count || product.ratingCount || 0,
  );
  const ratingSummaryText = ratingCount > 0
    ? `Rata-rata ${ratingAverage.toFixed(1)} / 5 dari ${ratingCount} ulasan`
    : "Belum ada ulasan untuk produk ini.";
  const canSubmitReview =
    reviewForm.orderCode.trim().length > 0 &&
    reviewForm.phone.trim().length > 0 &&
    Number(reviewForm.rating) >= 1;

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

  const goToNextImage = () => {
    if (images.length <= 1) return;
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevImage = () => {
    if (images.length <= 1) return;
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleSwipeStart = (event) => {
    if (images.length <= 1) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchDeltaRef.current = { x: 0, y: 0 };
  };

  const handleSwipeMove = (event) => {
    if (images.length <= 1) return;
    const touch = event.touches[0];
    touchDeltaRef.current = {
      x: touch.clientX - touchStartRef.current.x,
      y: touch.clientY - touchStartRef.current.y,
    };
  };

  const handleSwipeEnd = () => {
    if (images.length <= 1) return;
    const { x, y } = touchDeltaRef.current;
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    if (absX > 50 && absX > absY) {
      if (x < 0) {
        goToNextImage();
      } else {
        goToPrevImage();
      }
    }
    touchDeltaRef.current = { x: 0, y: 0 };
  };

  const openZoom = () => {
    setZoomScale(1);
    setIsZoomOpen(true);
  };

  const closeZoom = () => {
    setIsZoomOpen(false);
    setZoomScale(1);
  };

  const zoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.25, 2.5));
  };

  const zoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.25, 1));
  };

  const reviewHeader = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
          Ulasan Pembeli
        </p>
        <h3 className="mt-2 text-lg font-bold text-brand-900 dark:text-white">
          Rating Produk
        </h3>
        <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
          {ratingSummaryText}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {renderStars(ratingAverage, "text-xl")}
      </div>
    </div>
  );

  const reviewBody = (
    <>
      <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3 sm:p-4 dark:border-brand-700 dark:bg-brand-900/30">
        <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
          Tulis Ulasan
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
              Kode Pesanan
            </span>
            <input
              className="input-modern"
              placeholder="Contoh: GTS-20260310-0001"
              value={reviewForm.orderCode}
              onChange={(event) => updateReviewField("orderCode", event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
              Nomor WhatsApp
            </span>
            <input
              className="input-modern"
              placeholder="08xx atau +62xx"
              value={reviewForm.phone}
              onChange={(event) => updateReviewField("phone", event.target.value)}
            />
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
            Rating
          </span>
          <select
            className="input-modern"
            value={reviewForm.rating}
            onChange={(event) => updateReviewField("rating", event.target.value)}
          >
            <option value={5}>5 - Sangat Suka</option>
            <option value={4}>4 - Suka</option>
            <option value={3}>3 - Cukup</option>
            <option value={2}>2 - Kurang</option>
            <option value={1}>1 - Tidak Suka</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
            Ceritakan pengalamanmu (opsional)
          </span>
          <textarea
            className="input-modern min-h-[110px] resize-none"
            placeholder="Contoh: Bahan adem, ukuran pas, sablon rapi."
            value={reviewForm.reviewText}
            onChange={(event) => updateReviewField("reviewText", event.target.value)}
          />
        </label>
        {reviewFeedback.text && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              reviewFeedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300"
            }`}
          >
            {reviewFeedback.text}
          </div>
        )}
        <button
          onClick={submitReview}
          disabled={!canSubmitReview || isSubmittingReview}
          className="btn-primary w-full !rounded-xl !py-3 disabled:opacity-60"
        >
          {isSubmittingReview ? "Mengirim..." : "Kirim Ulasan"}
        </button>
      </div>

      <div className="space-y-3">
        {isLoadingReviews ? (
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-brand-600 dark:text-brand-300">
            Belum ada ulasan. Jadilah yang pertama memberi ulasan!
          </p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-brand-200 bg-white p-4 dark:border-brand-700 dark:bg-brand-900/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-brand-900 dark:text-white">
                    {review.reviewerName || "Pembeli"}
                  </p>
                  <p className="text-xs text-brand-500 dark:text-brand-400">
                    {formatReviewDate(review.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(review.rating, "text-sm")}
                </div>
              </div>
              {review.reviewText && (
                <p className="mt-3 text-sm leading-relaxed text-brand-700 dark:text-brand-300">
                  {review.reviewText}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="page-stack space-y-8 pb-24 sm:pb-8">
      {/* ── Breadcrumb ──────────────────────── */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-brand-600 dark:text-brand-400">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/shop"
            className="transition hover:text-brand-900 dark:hover:text-white"
          >
            Toko
          </Link>
          <span>/</span>
          <span className="truncate text-brand-900 dark:text-white font-semibold">
            {product.name}
          </span>
        </div>

      </nav>

      {/* ── Product Detail Section ──────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* ── Left: Image Gallery ──────────────────────── */}
        <div className="space-y-4">
          {/* Main Image */}
          <div
            className="image-swipe relative overflow-hidden rounded-2xl bg-white dark:bg-brand-900/50 aspect-square border border-brand-100 dark:border-brand-800"
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            onTouchCancel={handleSwipeEnd}
          >
            <button
              type="button"
              onClick={openZoom}
              className="image-zoom-trigger"
              aria-label="Perbesar foto produk"
            >
              Zoom
            </button>
            <img
              src={resolveStoreImageUrl(images[selectedImageIndex])}
              alt={product.name}
              onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
              onError={(event) => {
                event.currentTarget.classList.add("is-loaded");
                handleImageError(selectedImageIndex);
              }}
              loading="eager"
              decoding="async"
              className="image-soft h-full w-full object-contain p-4 mix-blend-multiply dark:mix-blend-normal"
            />
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
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
                    src={resolveStoreImageUrl(image)}
                    alt={`Foto ${index + 1}`}
                    onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                    onError={(event) => {
                      event.currentTarget.classList.add("is-loaded");
                      handleImageError(index);
                    }}
                    loading="lazy"
                    decoding="async"
                    className="image-soft h-14 w-full object-contain p-1 bg-white dark:bg-brand-900/50 mix-blend-multiply dark:mix-blend-normal sm:h-20"
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {renderStars(ratingAverage, "text-lg")}
              </div>
              <span className="text-sm text-brand-600 dark:text-brand-300">
                {ratingCount > 0
                  ? `${ratingAverage.toFixed(1)} / 5 · ${ratingCount} ulasan`
                  : "Belum ada ulasan"}
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
                  totalStock <= 0
                    ? "font-bold text-rose-600"
                    : "font-semibold text-emerald-600 dark:text-emerald-400"
                }
              >
                {totalStock <= 0
                  ? "Habis"
                  : `${totalStock} pcs tersedia`}
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
              Ukuran {normalizeSizeKey(selectedSize)}: {selectedSizeStock} pcs
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
              {sizes.map((size) => {
                const sizeStock = getStockForSize(product, size);
                const isOutOfStock = sizeStock <= 0;

                return (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      setQuantity((prev) => clampQuantity(prev, getStockForSize(product, size)));
                    }}
                    disabled={isOutOfStock}
                    className={`min-h-[44px] rounded-lg py-2.5 font-semibold transition ${
                      selectedSize === size
                        ? "bg-primary text-white border-2 border-primary"
                        : "border-2 border-brand-200 bg-white text-brand-700 hover:border-primary dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                    } ${isOutOfStock ? "cursor-not-allowed opacity-40" : ""}`}
                    title={isOutOfStock ? `Ukuran ${size} habis` : `${sizeStock} pcs tersedia`}
                  >
                    {size}
                  </button>
                );
              })}
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
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-200 bg-white font-bold transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:hover:bg-brand-900"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={selectedSizeStock || 1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(clampQuantity(e.target.value, selectedSizeStock || 1))
                }
                className="input-modern w-20 text-center"
              />
              <button
                onClick={() =>
                  setQuantity(
                    clampQuantity(quantity + 1, selectedSizeStock || 1),
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-200 bg-white font-bold transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:hover:bg-brand-900"
              >
                +
              </button>
              <span className="text-sm text-brand-600 dark:text-brand-400">
                Max: {selectedSizeStock || 0} pcs
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
          <div className="action-buttons-desktop hidden sm:flex flex-col gap-3 sm:flex-row">
            <button
              onClick={addToCart}
              disabled={selectedSizeStock <= 0}
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
              to="/cart"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-3 text-center font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/60"
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
              <span>Lihat Keranjang</span>
              {cartCount > 0 && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              to="/shop"
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white transition hover:bg-primary/90"
            >
              ← Kembali ke Toko
            </Link>
          </div>
          <Link
            to="/shop"
            className="sm:hidden inline-flex items-center justify-center rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
          >
            ← Kembali ke Toko
          </Link>

          {/* Reviews */}
          <div className="sm:hidden">
            <details className="mobile-review rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
              <summary className="mobile-summary flex cursor-pointer items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Ulasan Pembeli
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-900 dark:text-white">
                    Rating Produk
                  </p>
                  <p className="text-[11px] text-brand-500 dark:text-brand-400">
                    {ratingSummaryText}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {renderStars(ratingAverage, "text-base")}
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
                </div>
              </summary>
              <div className="pt-4 space-y-5">
                {reviewBody}
              </div>
            </details>
          </div>

          <div className="hidden sm:block">
            <div className="space-y-5 rounded-2xl border border-brand-200 bg-white/80 p-4 sm:p-5 dark:border-brand-700 dark:bg-brand-900/40">
              {reviewHeader}
              {reviewBody}
            </div>
          </div>

          {/* Info Box */}
          <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
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

      {/* ── Sticky Mobile CTA ─────────────────────── */}
      <div className="sticky-mobile-bar sm:hidden">
        <div className="sticky-mobile-surface flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
              Harga
            </p>
            <p className="text-base font-bold text-brand-900 dark:text-white">
              {formatRupiah(effectivePrice)}
            </p>
            <p className="text-[11px] text-brand-500 dark:text-brand-400">
              Ukuran {selectedSize ? normalizeSizeKey(selectedSize) : "-"} • Stok {selectedSizeStock ?? 0}
            </p>
          </div>
          <Link
            to="/cart"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-300 bg-white text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-800/60"
            aria-label="Buka keranjang belanja"
            title="Keranjang"
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
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            onClick={addToCart}
            disabled={selectedSizeStock <= 0}
            className="btn-primary min-h-[44px] !px-4 !py-3 text-sm disabled:opacity-60"
          >
            Tambah
          </button>
        </div>
      </div>

      {isZoomOpen && (
        <div className="image-zoom-backdrop" onClick={closeZoom} role="presentation">
          <div className="image-zoom-shell" onClick={(event) => event.stopPropagation()}>
            <div className="image-zoom-toolbar">
              <p className="text-sm font-semibold text-brand-900 dark:text-white">Detail Foto Produk</p>
              <div className="image-zoom-actions">
                <button type="button" onClick={zoomOut} className="image-zoom-btn" aria-label="Perkecil">
                  −
                </button>
                <button type="button" onClick={zoomIn} className="image-zoom-btn" aria-label="Perbesar">
                  +
                </button>
                <button type="button" onClick={closeZoom} className="image-zoom-close" aria-label="Tutup">
                  Tutup
                </button>
              </div>
            </div>
            <div className="image-zoom-body">
              <img
                src={resolveStoreImageUrl(images[selectedImageIndex])}
                alt={product.name}
                className="image-zoom-media"
                style={{ width: `${zoomScale * 100}%` }}
                loading="eager"
                decoding="async"
              />
              <p className="image-zoom-hint">Gunakan tombol + untuk memperbesar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;
