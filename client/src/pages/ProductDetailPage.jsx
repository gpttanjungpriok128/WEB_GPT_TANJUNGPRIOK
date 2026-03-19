import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import storePlaceholderImage from "../img/logo1.png";
import { normalizeStoreImagePath, resolveStoreImageUrl } from "../utils/storeImage";
import {
  clampQuantity,
  getStockForSize,
  getTotalStock,
  normalizeSizeKey,
} from "../utils/storeStock";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const REVIEW_IMAGE_LIMIT = 3;
const REVIEW_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
    imageUrls: [storePlaceholderImage],
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
    imageUrls: [storePlaceholderImage],
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
    imageUrls: [storePlaceholderImage],
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

const normalizeSizeLabel = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");

const isAboveXL = (value) => {
  const normalized = normalizeSizeLabel(value);
  if (!normalized) return false;
  if (["XXL", "XXXL", "XXXXL"].includes(normalized)) return true;
  const match = normalized.match(/^(\d+)XL$/);
  if (match) return Number(match[1]) >= 2;
  return false;
};

const OrderCodeFieldIcon = ({ className = "h-4 w-4" }) => (
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
    <rect x="4" y="5" width="16" height="14" rx="3" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </svg>
);

const PhoneReviewFieldIcon = ({ className = "h-4 w-4" }) => (
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
    <path d="M6.8 3.8h2.5l1.4 3.8-1.8 1.8a14.2 14.2 0 0 0 5.7 5.7l1.8-1.8 3.8 1.4v2.5a1.8 1.8 0 0 1-1.9 1.8A15.5 15.5 0 0 1 5 5.7a1.8 1.8 0 0 1 1.8-1.9Z" />
  </svg>
);

const StarFieldIcon = ({ className = "h-4 w-4" }) => (
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
    <path d="m12 3 2.8 5.68 6.27.91-4.54 4.43 1.07 6.25L12 17.32 6.4 20.27l1.07-6.25L2.93 9.6l6.27-.91L12 3Z" />
  </svg>
);

const ReviewTextIcon = ({ className = "h-4 w-4" }) => (
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
    <path d="M8 7h8" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
    <path d="M6 4h12a2 2 0 0 1 2 2v12l-4-3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
  </svg>
);

const UploadImageIcon = ({ className = "h-4 w-4" }) => (
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
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="m8 13 2.5 2.5L16 10l3 4" />
    <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

const SelectChevronIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
  </svg>
);

function getImageWithFallback(product, fallbackProducts) {
  if (!product) return storePlaceholderImage;

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

  return imageUrls.length > 0 ? imageUrls : [storePlaceholderImage];
}

function getDefaultSize(product) {
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes.filter((size) => normalizeSizeLabel(size) !== "XXL")
    : [];
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
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
  const [reviewUploadInputKey, setReviewUploadInputKey] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState({ type: "", text: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const prefetchedDetailImagesRef = useRef(new Set());

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
    if (!reviewImages.length) {
      setReviewImagePreviews([]);
      return undefined;
    }

    const previews = reviewImages.map((file) => ({
      fileName: file.name,
      url: URL.createObjectURL(file),
    }));
    setReviewImagePreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [reviewImages]);

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
    let handle = null;

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

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      handle = window.requestIdleCallback(fetchReviews, { timeout: 1000 });
      return () => window.cancelIdleCallback(handle);
    }

    handle = window.setTimeout(fetchReviews, 300);
    return () => window.clearTimeout(handle);
  }, [slug]);

  useEffect(() => {
    if (!images.length) return;

    const candidates = [
      images[selectedImageIndex],
      images[selectedImageIndex + 1],
      images[selectedImageIndex - 1],
    ].filter(Boolean);

    candidates.forEach((image) => {
      const imageUrl = resolveStoreImageUrl(image);
      if (!imageUrl || prefetchedDetailImagesRef.current.has(imageUrl)) return;

      const prefetchImage = new Image();
      prefetchImage.decoding = "async";
      prefetchImage.src = imageUrl;
      prefetchedDetailImagesRef.current.add(imageUrl);
    });
  }, [images, selectedImageIndex]);

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

  const handleReviewImagesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setReviewUploadInputKey((previous) => previous + 1);

    if (!selectedFiles.length) return;

    const validFiles = selectedFiles.filter((file) => REVIEW_IMAGE_TYPES.has(file.type));
    const invalidCount = selectedFiles.length - validFiles.length;
    const remainingSlots = Math.max(0, REVIEW_IMAGE_LIMIT - reviewImages.length);
    const acceptedFiles = validFiles.slice(0, remainingSlots);

    if (acceptedFiles.length > 0) {
      setReviewImages((previous) => [...previous, ...acceptedFiles]);
    }

    if (invalidCount > 0) {
      setReviewFeedback({
        type: "error",
        text: "Format foto harus JPG, PNG, atau WebP.",
      });
      return;
    }

    if (validFiles.length > remainingSlots) {
      setReviewFeedback({
        type: "error",
        text: `Maksimal ${REVIEW_IMAGE_LIMIT} foto untuk satu ulasan.`,
      });
      return;
    }

    setReviewFeedback((previous) =>
      previous.type === "error" && previous.text.toLowerCase().includes("foto")
        ? { type: "", text: "" }
        : previous,
    );
  };

  const handleRemoveReviewImage = (index) => {
    setReviewImages((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
    setReviewFeedback((previous) =>
      previous.type === "error" && previous.text.toLowerCase().includes("foto")
        ? { type: "", text: "" }
        : previous,
    );
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
      const payload = new FormData();
      payload.append("rating", String(Number(reviewForm.rating)));
      payload.append("orderCode", reviewForm.orderCode.trim());
      payload.append("phone", reviewForm.phone.trim());
      if (reviewForm.reviewText.trim()) {
        payload.append("reviewText", reviewForm.reviewText.trim());
      }
      reviewImages.forEach((file) => {
        payload.append("images", file);
      });

      await api.post(`/store/products/${slug}/reviews`, payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setReviewFeedback({
        type: "success",
        text: "Terima kasih! Ulasan kamu sudah tercatat.",
      });
      setReviewForm((previous) => ({
        ...previous,
        rating: 5,
        reviewText: "",
      }));
      setReviewImages([]);
      setReviewUploadInputKey((previous) => previous + 1);
      const { data } = await api.get(`/store/products/${slug}/reviews`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
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

  const buildShareUrl = () => {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    const safeSlug = product?.slug || slug || "";
    return safeSlug ? `${base}/shop/${safeSlug}` : base;
  };

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = buildShareUrl();
    const shareTitle = product.name || "Produk GTshirt";
    const shareText = `Lihat ${shareTitle} di GTshirt`;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setFeedback("Link produk siap dibagikan.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback("Link produk berhasil disalin.");
      } else {
        window.prompt("Salin link produk:", shareUrl);
      }
    } catch {
      setFeedback("Gagal membagikan link produk.");
    } finally {
      setTimeout(() => setFeedback(""), 2500);
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
      <div className="page-stack space-y-5 sm:space-y-6">
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
  const rawSizes = Array.isArray(product.sizes) && product.sizes.length > 0
    ? product.sizes
    : ["S", "M", "L", "XL"];
  const filteredSizes = rawSizes.filter((size) => normalizeSizeLabel(size) !== "XXL");
  const sizes = filteredSizes.length > 0 ? filteredSizes : ["S", "M", "L", "XL"];
  const hasPreorderSizes = sizes.some(isAboveXL);
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
  const selectedSizeLabel = selectedSize ? normalizeSizeKey(selectedSize) : "-";
  const readySizeCount = sizes.filter((size) => getStockForSize(product, size) > 0).length;
  const sizePreview = sizes.slice(0, 4).map((size) => normalizeSizeKey(size)).join(" / ");
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
            <div className="input-leading-shell">
              <OrderCodeFieldIcon className="input-leading-icon" />
              <input
                className="input-modern"
                placeholder="Contoh: GTS-20260310-0001"
                value={reviewForm.orderCode}
                onChange={(event) => updateReviewField("orderCode", event.target.value.toUpperCase())}
              />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
              Nomor WhatsApp
            </span>
            <div className="input-leading-shell">
              <PhoneReviewFieldIcon className="input-leading-icon" />
              <input
                className="input-modern"
                placeholder="08xx atau +62xx"
                inputMode="tel"
                value={reviewForm.phone}
                onChange={(event) => updateReviewField("phone", event.target.value)}
              />
            </div>
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
            Rating
          </span>
          <div className="input-leading-shell input-select-shell">
            <StarFieldIcon className="input-leading-icon" />
            <select
              className="input-modern appearance-none"
              value={reviewForm.rating}
              onChange={(event) => updateReviewField("rating", event.target.value)}
            >
              <option value={5}>5 - Sangat Suka</option>
              <option value={4}>4 - Suka</option>
              <option value={3}>3 - Cukup</option>
              <option value={2}>2 - Kurang</option>
              <option value={1}>1 - Tidak Suka</option>
            </select>
            <SelectChevronIcon className="input-trailing-icon" />
          </div>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
            Ceritakan pengalamanmu (opsional)
          </span>
          <div className="input-leading-shell input-leading-shell-textarea">
            <ReviewTextIcon className="input-leading-icon" />
            <textarea
              className="input-modern min-h-[110px] resize-none"
              placeholder="Contoh: Bahan adem, ukuran pas, sablon rapi."
              value={reviewForm.reviewText}
              onChange={(event) => updateReviewField("reviewText", event.target.value)}
            />
          </div>
        </label>
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
            Foto Produk (opsional)
          </span>
          <input
            key={reviewUploadInputKey}
            id="review-images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleReviewImagesChange}
          />
          <label
            htmlFor="review-images"
            className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-[1.1rem] border border-dashed border-brand-300 bg-white/80 px-4 py-3 text-sm text-brand-600 transition hover:border-primary hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-900/60"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-800/60 dark:text-brand-200">
                <UploadImageIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-brand-900 dark:text-white">
                  Upload foto produk yang kamu terima
                </p>
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  JPG, PNG, WebP • maks 3 foto • 5MB/foto
                </p>
              </div>
            </div>
            <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:border-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
              Pilih Foto
            </span>
          </label>
          {reviewImagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {reviewImagePreviews.map((preview, index) => (
                <div
                  key={`${preview.fileName}-${index}`}
                  className="relative overflow-hidden rounded-[1rem] border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-900/50"
                >
                  <img
                    src={preview.url}
                    alt={`Preview ulasan ${index + 1}`}
                    className="aspect-square h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveReviewImage(index)}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-sm font-bold text-white transition hover:bg-black/80"
                    aria-label={`Hapus foto ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
              {Array.isArray(review.imageUrls) && review.imageUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {review.imageUrls.map((image, index) => {
                    const resolvedImage = resolveStoreImageUrl(image);
                    return (
                      <a
                        key={`${review.id}-image-${index}`}
                        href={resolvedImage}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-[1rem] border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-900/50"
                      >
                        <img
                          src={resolvedImage}
                          alt={`Foto ulasan ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="aspect-square h-full w-full object-cover"
                        />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="page-stack space-y-6 pb-32 sm:space-y-8 sm:pb-8">
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
            className="image-swipe relative overflow-hidden rounded-2xl bg-white dark:bg-brand-900/50 aspect-[4/5] sm:aspect-square border border-brand-100 dark:border-brand-800"
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
              fetchPriority="high"
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
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                totalStock <= 0
                  ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              }`}>
                {totalStock <= 0 ? "Restock Soon" : "Ready to Order"}
              </span>
              {product.color && (
                <span className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  {product.color}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                {readySizeCount}/{sizes.length} ukuran ready
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
          <div className="rounded-xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              Deskripsi Produk
            </p>
            <p
              className={`mt-2 text-sm sm:text-[15px] leading-relaxed text-brand-700 dark:text-brand-300 ${
                isDescriptionExpanded ? "whitespace-pre-line" : "line-clamp-3 whitespace-normal"
              }`}
            >
              {product.description || "Deskripsi produk akan ditampilkan di sini."}
            </p>
            {product.description && product.description.length > 160 && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                {isDescriptionExpanded ? "Tutup Deskripsi" : "Lihat Selengkapnya"}
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                Stok Total
              </p>
              <p className={`mt-2 text-lg font-bold ${totalStock <= 0 ? "text-rose-600 dark:text-rose-300" : "text-brand-900 dark:text-white"}`}>
                {totalStock <= 0 ? "Habis" : `${totalStock} pcs`}
              </p>
              <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                {totalStock <= 0 ? "Restock sedang disiapkan." : "Siap untuk order harian."}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                Ukuran Aktif
              </p>
              <p className="mt-2 text-lg font-bold text-brand-900 dark:text-white">
                {selectedSizeLabel}
              </p>
              <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                {selectedSizeStock} pcs tersedia untuk pilihan ini.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                Detail Singkat
              </p>
              <p className="mt-2 text-lg font-bold text-brand-900 dark:text-white">
                {product.color || `${readySizeCount} ukuran ready`}
              </p>
              <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                {sizePreview}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-brand-200 dark:bg-brand-700" />

          {/* Size Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-brand-700 dark:text-brand-300">
              Pilih Ukuran
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
            {hasPreorderSizes && (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Ukuran di atas XL tersedia preorder.
              </p>
            )}
          </div>

          {/* Quantity Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-brand-700 dark:text-brand-300">
                Jumlah
              </label>
              <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                Max {selectedSizeStock || 0} pcs
              </span>
            </div>
            <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 rounded-[1.35rem] border border-brand-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,249,0.9))] p-3 shadow-[0_14px_32px_rgba(15,23,42,0.04)] dark:border-brand-700/80 dark:bg-[linear-gradient(180deg,rgba(11,18,14,0.94),rgba(8,13,11,0.92))]">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-brand-200 bg-white font-bold text-brand-800 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-100 dark:hover:bg-brand-900"
                aria-label="Kurangi jumlah"
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
                className="input-modern !h-12 !rounded-[1rem] !px-3 text-center text-base font-semibold"
              />
              <button
                onClick={() =>
                  setQuantity(
                    clampQuantity(quantity + 1, selectedSizeStock || 1),
                  )
                }
                className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-brand-200 bg-white font-bold text-brand-800 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-100 dark:hover:bg-brand-900"
                aria-label="Tambah jumlah"
              >
                +
              </button>
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
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-3 font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/60"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h8v8" />
              </svg>
              <span>Bagikan</span>
            </button>
            <Link
              to="/shop"
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-white transition hover:bg-primary/90"
            >
              ← Kembali ke Toko
            </Link>
          </div>
          <div className="sm:hidden grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h8v8" />
              </svg>
              Bagikan
            </button>
            <Link
              to="/shop"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-brand-300 bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
            >
              ← Kembali
            </Link>
          </div>

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
          <details className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
            <summary className="info-summary flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <span>Informasi Produk</span>
              <svg
                className="info-summary-icon h-4 w-4 text-blue-600 dark:text-blue-200"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
              </svg>
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-300">
              <li>✓ Bahan: Cotton Combed 24s Premium</li>
              <li>✓ Fit: Unisex Comfort</li>
              <li>✓ Brand: GTshirt Authentic</li>
              <li>✓ Sablon: High-quality printing</li>
            </ul>
          </details>
        </div>
      </section>

      {/* ── Sticky Mobile CTA ─────────────────────── */}
      <div className="sticky-mobile-bar sm:hidden">
        <div className="sticky-mobile-surface space-y-3 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
                Harga
              </p>
              <p className="text-lg font-bold tracking-[-0.03em] text-brand-900 dark:text-white">
                {formatRupiah(effectivePrice)}
              </p>
              <p className="text-[11px] leading-5 text-brand-500 dark:text-brand-400">
                Ukuran {selectedSizeLabel} • Qty {quantity} • Stok {selectedSizeStock ?? 0}
              </p>
            </div>
            <div className="shrink-0 rounded-[1rem] border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-right dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                Ready
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-100">
                {selectedSizeStock ?? 0} pcs
              </p>
            </div>
          </div>
          <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
            <Link
              to="/cart"
              className="relative inline-flex h-12 w-full items-center justify-center rounded-[1.05rem] border border-brand-300 bg-white text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-800/60"
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
              className="btn-primary min-h-[48px] w-full !rounded-[1.05rem] !px-4 !py-3 text-sm font-semibold disabled:opacity-60"
            >
              Tambah ke Keranjang
            </button>
          </div>
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
