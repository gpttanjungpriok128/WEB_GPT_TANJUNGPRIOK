import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import storePlaceholderImage from "../img/logo1.png";
import imgHope from "../img/store/for-all-my-hope-is-in-him.png";
import imgLight from "../img/store/you-are-the-light.png";
import imgWorship from "../img/store/made-to-worship.png";

import { normalizeStoreImagePath, resolveStoreImageUrl } from "../utils/storeImage";
import {
  clampQuantity,
  getStockForSize,
  getTotalStock,
  normalizeSizeKey,
} from "../utils/storeStock";
import {
  readStoreWishlist,
  STORE_WISHLIST_STORAGE_KEY,
  STORE_WISHLIST_UPDATED_EVENT,
  toggleStoreWishlist,
} from "../utils/storeWishlist";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const REVIEW_IMAGE_LIMIT = 3;
const REVIEW_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const FALLBACK_PRODUCTS = [
  {
    id: 1001,
    name: "He Left The 99 For You - White Edition",
    slug: "he-left-the-99-for-you-white-edition",
    basePrice: 130000,
    finalPrice: 130000,
    discountAmount: 0,
    promoIsActive: false,
    promoLabel: "",
    color: "White Edition",
    verse: "Lukas 15:4",
    description: "Desain streetwear dengan pesan kasih dan pencarian. Nyaman untuk ibadah dan kegiatan komunitas.",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: imgWorship,
    imageUrls: [imgWorship],
    stock: 20,
    isActive: true,
    ratingAverage: 0,
    ratingCount: 0,
  },
  {
    id: 1002,
    name: "YOU ARE THE LIGHT",
    slug: "you-are-the-light",
    basePrice: 130000,
    finalPrice: 130000,
    discountAmount: 0,
    promoIsActive: false,
    promoLabel: "",
    color: "Off White",
    verse: "Matius 5:14",
    description: "Visual clean dan kuat dengan statement LIGHT. Cocok untuk look casual harian dengan pesan iman yang jelas.",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: imgLight,
    imageUrls: [imgLight],
    stock: 20,
    isActive: true,
    ratingAverage: 0,
    ratingCount: 0,
  },
  {
    id: 1003,
    name: "FOR ALL MY HOPE IS IN HIM",
    slug: "for-all-my-hope-is-in-him",
    basePrice: 130000,
    finalPrice: 130000,
    discountAmount: 0,
    promoIsActive: false,
    promoLabel: "",
    color: "Jet Black",
    verse: "Mazmur 62:5",
    description: "Potongan basic oversize dengan artwork bertema HOPE. Karakter streetwear simple dan bermakna.",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: imgHope,
    imageUrls: [imgHope],
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

const PremiumBadgeIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3.75 14.5 8l4.75.75-3.25 3.4.75 4.85L12 14.9 7.25 17l.75-4.85-3.25-3.4L9.5 8 12 3.75Z" />
  </svg>
);

const CommunityBadgeIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20s-6.5-3.8-6.5-9.25A3.75 3.75 0 0 1 12 8a3.75 3.75 0 0 1 6.5 2.75C18.5 16.2 12 20 12 20Z" />
    <path d="M12 8V4.75" />
    <path d="M10.5 6.25h3" />
  </svg>
);

const DeliveryBadgeIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3.5 7.5h11v7.5h-11z" />
    <path d="M14.5 10h3l2 2.25v2.75h-5" />
    <path d="M7.25 18.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
    <path d="M17.5 18.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
  </svg>
);

const ArrowRightTinyIcon = ({ className = "h-4 w-4" }) => (
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
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const ShoppingCartIcon = ({ className = "h-4 w-4" }) => (
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
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const WishlistIcon = ({ filled = false, className = "h-4 w-4" }) => (
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

const DETAIL_HERO_SHELL = "relative overflow-hidden rounded-[2rem] border border-brand-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,249,0.93))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:border-brand-800 dark:bg-[linear-gradient(180deg,rgba(10,14,12,0.98),rgba(8,11,10,0.94))] sm:p-5 lg:p-6";

const DETAIL_BENEFITS = [
  {
    key: "premium",
    title: "Premium Quality",
    description: "Cotton nyaman untuk dipakai harian.",
    Icon: PremiumBadgeIcon,
  },
  {
    key: "community",
    title: "Supporting Community",
    description: "Setiap pembelian mendukung pelayanan GPT.",
    Icon: CommunityBadgeIcon,
  },
  {
    key: "delivery",
    title: "Fast Delivery",
    description: "Siap dikirim atau pickup dengan rapi.",
    Icon: DeliveryBadgeIcon,
  },
];
const DETAIL_PURCHASE_POINTS = [
  {
    key: "pickup",
    label: "Pickup",
    title: "Bisa ambil di gereja",
    description: "Tidak kena ongkir dan order tetap punya kode tracking.",
  },
  {
    key: "shipping",
    label: "Kurir",
    title: "Kurir Jabodetabek",
    description: "Ongkir dihitung saat checkout dan tetap bisa dipantau statusnya.",
  },
  {
    key: "timeline",
    label: "Proses",
    title: "Estimasi 5 hari kerja",
    description: "Batch produksi dan packing berjalan setelah order dikonfirmasi.",
  },
];
const DETAIL_FAQS = [
  {
    key: "size",
    question: "Kalau ukuran yang dipilih habis bagaimana?",
    answer: "Pilih size lain yang masih tersedia. Jika butuh ukuran tertentu, cek kembali batch berikutnya atau pantau katalog dari halaman shop.",
  },
  {
    key: "pickup",
    question: "Bisa pickup tanpa isi alamat detail?",
    answer: "Bisa. Saat checkout pilih `Ambil di Gereja`, lalu alamat bisa dikosongkan atau diisi catatan pickup seperlunya.",
  },
  {
    key: "tracking",
    question: "Setelah checkout saya cek status di mana?",
    answer: "Setelah order dibuat, Anda dapat buka `Pesanan Saya` atau halaman `Lacak Pesanan` memakai kode order dan nomor WhatsApp.",
  },
];

const SkeletonBlock = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-[1rem] bg-brand-100/85 dark:bg-brand-800/70 ${className}`}
  />
);

const ReviewListSkeleton = () => (
  <div className="space-y-3" aria-hidden="true">
    {[0, 1].map((item) => (
      <div
        key={item}
        className="rounded-xl border border-brand-200 bg-white p-4 dark:border-brand-700 dark:bg-brand-900/50"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-3 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="h-4 w-24 rounded-full" />
        </div>
        <div className="mt-3 space-y-2">
          <SkeletonBlock className="h-3.5 w-full" />
          <SkeletonBlock className="h-3.5 w-[88%]" />
          <SkeletonBlock className="h-3.5 w-[72%]" />
        </div>
      </div>
    ))}
  </div>
);

const ProductDetailSkeleton = () => (
  <div className="page-stack space-y-6 pb-32 sm:space-y-8 sm:pb-8">
    <div className="flex items-center gap-2">
      <SkeletonBlock className="h-4 w-12 rounded-full" />
      <SkeletonBlock className="h-4 w-4 rounded-full" />
      <SkeletonBlock className="h-4 w-40 rounded-full" />
    </div>

    <section className={`${DETAIL_HERO_SHELL} grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] xl:gap-8`}>
      <div className="relative space-y-4">
        <div className="overflow-hidden rounded-[1.75rem] border border-brand-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,245,0.94))] shadow-[0_18px_40px_rgba(15,23,42,0.05)] dark:border-brand-800 dark:bg-[linear-gradient(180deg,rgba(12,18,15,0.96),rgba(9,13,11,0.92))] aspect-[4/5] sm:aspect-square">
          <div className="h-full w-full p-4">
            <SkeletonBlock className="h-full w-full rounded-[1.4rem]" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="h-14 rounded-xl sm:h-20" />
          ))}
        </div>
      </div>

      <div className="relative space-y-6">
        <div className="space-y-4">
          <SkeletonBlock className="h-8 w-32 rounded-full" />
          <div className="space-y-3">
            <SkeletonBlock className="h-11 w-full max-w-[30rem]" />
            <SkeletonBlock className="h-11 w-[82%] max-w-[24rem]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-6 w-28 rounded-full" />
            <SkeletonBlock className="h-6 w-32 rounded-full" />
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-brand-200/80 bg-white/[0.76] p-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)] dark:border-brand-700 dark:bg-white/[0.03]">
          <SkeletonBlock className="h-12 w-44" />
          <SkeletonBlock className="mt-3 h-4 w-28 rounded-full" />
        </div>

        <div className="rounded-[1.6rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <div className="mt-3 space-y-2">
            <SkeletonBlock className="h-3.5 w-full" />
            <SkeletonBlock className="h-3.5 w-[92%]" />
            <SkeletonBlock className="h-3.5 w-[74%]" />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
          <SkeletonBlock className="h-3 w-20 rounded-full" />
          <SkeletonBlock className="mt-3 h-6 w-24" />
          <SkeletonBlock className="mt-2 h-3.5 w-36 rounded-full" />
        </div>

        <div className="h-px bg-brand-200 dark:bg-brand-700" />

        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-11 rounded-[0.95rem]" />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SkeletonBlock className="h-4 w-20 rounded-full" />
            <SkeletonBlock className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 rounded-[1.35rem] border border-brand-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,249,0.9))] p-3 shadow-[0_14px_32px_rgba(15,23,42,0.04)] dark:border-brand-700/80 dark:bg-[linear-gradient(180deg,rgba(11,18,14,0.94),rgba(8,13,11,0.92))]">
            <SkeletonBlock className="h-12 rounded-[1rem]" />
            <SkeletonBlock className="h-12 rounded-[1rem]" />
            <SkeletonBlock className="h-12 rounded-[1rem]" />
          </div>
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="h-12 rounded-xl" />
          ))}
        </div>

        <div className="sm:hidden grid grid-cols-2 gap-2">
          <SkeletonBlock className="h-11 rounded-xl" />
          <SkeletonBlock className="h-11 rounded-xl" />
        </div>

        <div className="space-y-5 rounded-2xl border border-brand-200 bg-white/80 p-4 sm:p-5 dark:border-brand-700 dark:bg-brand-900/40">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-28 rounded-full" />
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-4 w-48 rounded-full" />
            </div>
            <SkeletonBlock className="h-5 w-28 rounded-full" />
          </div>
          <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3 sm:p-4 dark:border-brand-700 dark:bg-brand-900/30">
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <div className="grid gap-3 md:grid-cols-2">
              <SkeletonBlock className="h-14 rounded-[1.1rem]" />
              <SkeletonBlock className="h-14 rounded-[1.1rem]" />
            </div>
            <SkeletonBlock className="h-14 rounded-[1.1rem]" />
            <SkeletonBlock className="min-h-[110px] rounded-[1.1rem]" />
            <SkeletonBlock className="h-14 rounded-[1.1rem]" />
          </div>
          <ReviewListSkeleton />
        </div>
      </div>
    </section>
  </div>
);

function getImageWithFallback(product, fallbackProducts) {
  if (!product) return [storePlaceholderImage];

  // Get raw image URLs from product
  const rawUrls =
    Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  // Filter to only valid, non-empty strings
  const validUrls = rawUrls.filter((url) => 
    typeof url === "string" && url.trim() !== "" && url.trim() !== "null"
  );

  // Return valid URLs if they exist
  if (validUrls.length > 0) {
    return validUrls;
  }

  // Try to find a fallback product by exact slug match
  if (fallbackProducts && Array.isArray(fallbackProducts) && fallbackProducts.length > 0) {
    if (product.slug) {
      const exactSlugMatch = fallbackProducts.find((p) => 
        p && p.slug && p.slug.toLowerCase() === String(product.slug).toLowerCase()
      );
      if (
        exactSlugMatch &&
        Array.isArray(exactSlugMatch.imageUrls) &&
        exactSlugMatch.imageUrls.length > 0
      ) {
        return exactSlugMatch.imageUrls;
      }
    }
    
    // Try to find by exact name match
    if (product.name) {
      const exactNameMatch = fallbackProducts.find((p) => 
        p && p.name && p.name.toLowerCase() === String(product.name).toLowerCase()
      );
      if (
        exactNameMatch &&
        Array.isArray(exactNameMatch.imageUrls) &&
        exactNameMatch.imageUrls.length > 0
      ) {
        return exactNameMatch.imageUrls;
      }
    }
    
    // Try to find by partial name match as last resort
    if (product.name) {
      const productNameLower = String(product.name).toLowerCase();
      const partialMatch = fallbackProducts.find((p) => 
        p && p.name && productNameLower.includes(p.name.toLowerCase().split("-")[0].trim())
      );
      if (
        partialMatch &&
        Array.isArray(partialMatch.imageUrls) &&
        partialMatch.imageUrls.length > 0
      ) {
        return partialMatch.imageUrls;
      }
    }
  }

  // Last resort: use placeholder
  return [storePlaceholderImage];
}

function getDefaultSize(product) {
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes.filter((size) => normalizeSizeLabel(size) !== "XXL")
    : [];
  if (!sizes.length) return "M";

  const firstAvailable = sizes.find((size) => getStockForSize(product, size) > 0);
  return firstAvailable || sizes[0] || "M";
}

function ensureValidImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") {
    return storePlaceholderImage;
  }
  
  const resolved = resolveStoreImageUrl(imageUrl);
  
  // If resolved is empty or doesn't look like a valid URL/path, use placeholder
  if (!resolved || !resolved.trim() || resolved === imageUrl && !imageUrl.includes("/")) {
    return storePlaceholderImage;
  }
  
  return resolved;
}

function buildRelatedProductPool(currentSlug, candidates = []) {
  const seen = new Set();

  return candidates
    .filter((item) => item && item.slug && item.slug !== currentSlug && item.isActive !== false)
    .filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    })
    .slice(0, 3);
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
  const [relatedProducts, setRelatedProducts] = useState(() => buildRelatedProductPool(slug, FALLBACK_PRODUCTS));
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
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const prefetchedDetailImagesRef = useRef(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState(() => readStoreWishlist());

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
        if (rawCart) {
          const parsed = JSON.parse(rawCart);
          if (Array.isArray(parsed)) {
            setCartCount(parsed.reduce((sum, item) => sum + (item.quantity || 0), 0));
            return;
          }
        }
      } catch {
        // ignore
      }
      setCartCount(0);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cartUpdated", updateCartCount);
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

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
    let isCancelled = false;

    const hydrateRelatedProducts = async () => {
      try {
        const { data } = await api.get("/store/products", {
          params: { page: 1, limit: 8 },
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        const primaryPool = buildRelatedProductPool(slug, rows);

        if (!isCancelled) {
          if (primaryPool.length >= 3) {
            setRelatedProducts(primaryPool);
            return;
          }

          const fallbackPool = buildRelatedProductPool(slug, [
            ...primaryPool,
            ...FALLBACK_PRODUCTS,
          ]);
          setRelatedProducts(fallbackPool);
        }
      } catch {
        if (!isCancelled) {
          setRelatedProducts(buildRelatedProductPool(slug, FALLBACK_PRODUCTS));
        }
      }
    };

    hydrateRelatedProducts();

    return () => {
      isCancelled = true;
    };
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

  const saveCartItem = () => {
    if (!product) return;
    if (!selectedSize) {
      setFeedback("Pilih ukuran terlebih dahulu");
      return false;
    }
    const sizeStock = getStockForSize(product, selectedSize);
    if (sizeStock <= 0) {
      setFeedback(`Stok ukuran ${normalizeSizeKey(selectedSize)} sedang habis`);
      return false;
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
      window.dispatchEvent(new Event("cartUpdated"));
      setQuantity(1);
      return true;
    } catch (error) {
      setFeedback("Gagal menambahkan ke keranjang");
      return false;
    }
  };

  const addToCart = () => {
    if (saveCartItem()) {
      setFeedback(`${product.name} berhasil ditambahkan ke keranjang!`);
      setTimeout(() => setFeedback(""), 3000);
    }
  };

  const handleBuyNow = () => {
    if (saveCartItem()) {
      navigate("/cart");
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

  const handleToggleWishlist = () => {
    if (!product) return;

    const nextWishlist = toggleStoreWishlist(product.id);
    const isSaved = nextWishlist.includes(Number(product.id));
    setWishlistIds(nextWishlist);
    setFeedback(
      isSaved
        ? `${product.name} disimpan ke wishlist.`
        : `${product.name} dihapus dari wishlist.`,
    );
    setTimeout(() => setFeedback(""), 2500);
  };

  const scrollToSizeGuide = () => {
    if (typeof document === "undefined") return;
    document.getElementById("size-guide-info")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (isLoading) {
    return <ProductDetailSkeleton />;
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
  const curatedLabel = product.color
    ? `${product.color} Edition`
    : "The Curator Series";
  const showcaseProducts = relatedProducts.length > 0
    ? relatedProducts
    : buildRelatedProductPool(slug, FALLBACK_PRODUCTS);
  const canSubmitReview =
    reviewForm.orderCode.trim().length > 0 &&
    reviewForm.phone.trim().length > 0 &&
    Number(reviewForm.rating) >= 1;
  const isWishlisted = wishlistIds.includes(Number(product.id));

  const handleImageError = (index) => {
    setFailedImages((prev) => new Set([...prev, index]));
    
    // Try to find the next valid image to display
    const validIndices = images
      .map((_, i) => i)
      .filter(i => !failedImages.has(i) && i !== index);
    
    if (validIndices.length > 0) {
      // Pick the first valid image or the one closest to current
      const nextIndex = validIndices.includes(0) ? 0 : validIndices[0];
      setSelectedImageIndex(nextIndex);
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
          <ReviewListSkeleton />
        ) : reviews.length === 0 ? (
          <div className="flex min-h-[8.5rem] items-center rounded-xl border border-brand-200 bg-white p-4 text-sm text-brand-600 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            Belum ada ulasan. Jadilah yang pertama memberi ulasan!
          </div>
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
                          width={400}
                          height={400}
                          sizes="(max-width: 640px) 28vw, 120px"
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

  const mobileStickyBar = (
    <div className="sticky-mobile-bar sm:hidden">
      <div className="sticky-mobile-surface space-y-2.5 p-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
              {formatRupiah(effectivePrice)}
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
              {curatedLabel}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            {selectedSizeLabel} • {quantity}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={addToCart}
            disabled={selectedSizeStock <= 0}
            className="btn-primary min-h-[44px] w-full !rounded-[1rem] !px-4 !py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            Add to Cart
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={selectedSizeStock <= 0}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[1rem] border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-50 disabled:opacity-60 dark:border-brand-700 dark:bg-brand-900/50 dark:text-white dark:hover:bg-brand-800/60"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-stack space-y-12 pb-36 sm:space-y-16 sm:pb-12">
        <nav className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-brand-500 dark:text-brand-400">
          <div className="flex items-center gap-2">
            <Link to="/shop" className="transition hover:text-brand-900 dark:hover:text-white">
              Shop
            </Link>
            <span>/</span>
            <span className="max-w-[16rem] truncate text-brand-900 dark:text-white">
              {product.name}
            </span>
          </div>
          <div className="flex items-center gap-4 normal-case tracking-normal">
            <Link
              to="/cart"
              className="relative inline-flex items-center gap-2 text-xs font-medium text-brand-600 transition hover:text-brand-900 dark:text-brand-300 dark:hover:text-white"
              title="Lihat Keranjang"
            >
              <div className="relative">
                <ShoppingCartIcon className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:bg-emerald-500 dark:ring-brand-950">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Keranjang</span>
            </Link>
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`inline-flex items-center gap-2 text-xs font-medium transition ${
                isWishlisted
                  ? "text-rose-500 dark:text-rose-300"
                  : "text-brand-600 hover:text-brand-900 dark:text-brand-300 dark:hover:text-white"
              }`}
            >
              <WishlistIcon filled={isWishlisted} className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">
                {isWishlisted ? "Wishlisted" : "Wishlist"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="text-xs font-medium text-brand-600 transition hover:text-brand-900 dark:text-brand-300 dark:hover:text-white"
            >
              Bagikan
            </button>
            <Link
              to="/shop"
              className="hidden md:inline-flex items-center gap-2 text-xs font-medium text-brand-600 transition hover:text-brand-900 dark:text-brand-300 dark:hover:text-white"
            >
              Koleksi Lainnya
              <ArrowRightTinyIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        <section className="grid gap-8 xl:grid-cols-[76px_minmax(0,1.08fr)_minmax(350px,0.82fr)] xl:items-start">
          <div className="hidden xl:flex xl:flex-col xl:gap-3 xl:pt-3">
            {images.map((image, index) => (
              <button
                key={`thumb-desktop-${index}`}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                className={`group overflow-hidden rounded-[1rem] p-1.5 transition ${
                  selectedImageIndex === index
                    ? "opacity-100 ring-2 ring-primary ring-offset-2 dark:ring-offset-brand-950"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={resolveStoreImageUrl(image) || storePlaceholderImage}
                  alt={`Foto ${index + 1}`}
                  width={140}
                  height={140}
                  loading="lazy"
                  decoding="async"
                  onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                  onError={(event) => {
                    event.currentTarget.classList.add("is-loaded");
                    event.currentTarget.src = storePlaceholderImage;
                    handleImageError(index);
                  }}
                  className="image-soft h-16 w-full rounded-[0.8rem] bg-white object-cover dark:bg-brand-900/80"
                />
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div
              className="image-swipe relative overflow-hidden rounded-[2rem] p-2 sm:p-4"
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
                src={resolveStoreImageUrl(images[selectedImageIndex]) || storePlaceholderImage}
                alt={product.name}
                width={1200}
                height={1500}
                sizes="(max-width: 1280px) 100vw, 48vw"
                onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                onError={(event) => {
                  event.currentTarget.classList.add("is-loaded");
                  event.currentTarget.src = storePlaceholderImage;
                  handleImageError(selectedImageIndex);
                }}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="image-soft mx-auto aspect-[4/5] w-full max-w-[44rem] object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 xl:hidden">
                {images.map((image, index) => (
                  <button
                    key={`thumb-mobile-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-[1rem] p-1.5 transition ${
                      selectedImageIndex === index
                        ? "opacity-100 ring-2 ring-primary ring-offset-2 dark:ring-offset-brand-950"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={resolveStoreImageUrl(image) || storePlaceholderImage}
                      alt={`Foto ${index + 1}`}
                      width={180}
                      height={180}
                      loading="lazy"
                      decoding="async"
                      onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                      onError={(event) => {
                        event.currentTarget.classList.add("is-loaded");
                        event.currentTarget.src = storePlaceholderImage;
                        handleImageError(index);
                      }}
                      className="image-soft h-16 w-full rounded-[0.8rem] bg-white object-cover dark:bg-brand-900/80"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6 xl:pt-1">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-500 dark:text-brand-400">
                  The Curator Series
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-[0.95] tracking-[-0.06em] text-brand-950 dark:text-white sm:text-[3.4rem]">
                  {product.name}
                </h1>
              </div>

              <div className="space-y-2">
                <p className="text-[2rem] font-semibold tracking-[-0.05em] text-brand-950 dark:text-white">
                  {formatRupiah(effectivePrice)}
                </p>
                {product.promoIsActive && Number(product.discountAmount) > 0 && (
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Promo aktif: {product.promoLabel || "Harga spesial tersedia sekarang"}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Rating
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-950 dark:text-white">
                    {ratingCount > 0 ? `${ratingAverage.toFixed(1)} / 5` : "Belum ada ulasan"}
                  </p>
                  <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                    {ratingCount > 0 ? `${ratingCount} ulasan pembeli` : "Jadilah pembeli pertama yang menilai"}
                  </p>
                </div>
                <div className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Stok Aktif
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-950 dark:text-white">
                    {totalStock > 0 ? `${totalStock} pcs ready` : "Stok sedang habis"}
                  </p>
                  <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                    {readySizeCount} dari {sizes.length} ukuran masih tersedia
                  </p>
                </div>
              </div>

              <div className="max-w-xl pb-4">
                <button
                  type="button"
                  onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                  className="flex w-full items-center justify-between text-left font-semibold text-brand-950 dark:text-white"
                >
                  <span className="text-[15px]">Product Description</span>
                  <span className="text-xl leading-none text-brand-500 hover:text-brand-900 dark:hover:text-white transition">{isDescriptionOpen ? "−" : "+"}</span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isDescriptionOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-4 pt-4 text-[15px] leading-8 text-brand-700 dark:text-brand-300">
                      <p>
                        {product.description || "GTshirt hadir sebagai apparel komunitas yang rapi, nyaman, dan siap dipakai bertumbuh bersama."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 border-t border-brand-200/70 pt-5 dark:border-brand-800">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                  Select Size
                </p>
                <button
                  type="button"
                  onClick={scrollToSizeGuide}
                  className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-500 underline underline-offset-4 transition hover:text-brand-900 dark:text-brand-400 dark:hover:text-white"
                >
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {sizes.map((size) => {
                  const sizeStock = getStockForSize(product, size);
                  const isOutOfStock = sizeStock <= 0;

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setQuantity((prev) => clampQuantity(prev, getStockForSize(product, size)));
                      }}
                      disabled={isOutOfStock}
                      title={isOutOfStock ? `Ukuran ${size} habis` : `${sizeStock} pcs tersedia`}
                      className={`relative flex min-w-[4rem] flex-col items-center justify-center rounded-[0.9rem] border px-4 py-2 transition ${
                        selectedSize === size
                          ? "border-primary bg-primary text-white shadow-[0_14px_26px_rgba(9,89,76,0.22)]"
                          : "border-brand-200 bg-white hover:border-brand-400 dark:border-brand-700 dark:bg-brand-900/40"
                      } ${isOutOfStock ? "cursor-not-allowed opacity-35" : ""}`}
                    >
                      <span className="text-sm font-semibold">{normalizeSizeKey(size)}</span>
                      <span
                        className={`mt-0.5 text-[10px] font-normal ${
                          selectedSize === size
                            ? "text-white/90"
                            : "text-brand-500 dark:text-brand-400"
                        }`}
                      >
                        {sizeStock > 0 ? `Sisa ${sizeStock}` : "Habis"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 border-t border-brand-200/70 pt-5 dark:border-brand-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                Quantity
              </p>
              <div className="inline-grid grid-cols-[52px_72px_52px] items-center rounded-[1rem] bg-[#f3f5fb] p-1.5 dark:bg-brand-900/70">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-11 items-center justify-center rounded-[0.85rem] text-lg font-semibold text-brand-700 transition hover:bg-white dark:text-brand-200 dark:hover:bg-brand-800"
                  aria-label="Kurangi jumlah"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedSizeStock || 1}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(clampQuantity(event.target.value, selectedSizeStock || 1))
                  }
                  className="border-0 bg-transparent px-2 text-center text-base font-semibold text-brand-900 focus:outline-none focus:ring-0 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(clampQuantity(quantity + 1, selectedSizeStock || 1))}
                  className="flex h-11 items-center justify-center rounded-[0.85rem] text-lg font-semibold text-brand-700 transition hover:bg-white dark:text-brand-200 dark:hover:bg-brand-800"
                  aria-label="Tambah jumlah"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-t border-brand-200/70 pt-5 dark:border-brand-800 sm:grid-cols-3">
              {DETAIL_PURCHASE_POINTS.map((item) => (
                <article
                  key={item.key}
                  className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-brand-950 dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-brand-500 dark:text-brand-400">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            {feedback && (
              <div
                className={`rounded-[1rem] border px-4 py-3 text-sm font-medium ${
                  feedback.toLowerCase().includes("gagal")
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-900/20 dark:text-rose-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/20 dark:text-emerald-300"
                }`}
              >
                {feedback}
              </div>
            )}

            <div className="action-buttons-desktop space-y-3 border-t border-brand-200/70 pt-6 dark:border-brand-800">
              <button
                type="button"
                onClick={addToCart}
                disabled={selectedSizeStock <= 0}
                className="btn-primary min-h-[54px] w-full !rounded-[1rem] !px-4 text-base font-semibold disabled:opacity-60"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={selectedSizeStock <= 0}
                className="inline-flex min-h-[54px] w-full items-center justify-center rounded-[1rem] bg-[#dfe4f2] px-4 text-base font-semibold text-brand-950 transition hover:bg-[#d4dbed] disabled:opacity-60 dark:bg-brand-800 dark:text-white dark:hover:bg-brand-700"
              >
                Buy Now
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {DETAIL_BENEFITS.map(({ key, title, description, Icon }) => (
                <div
                  key={key}
                  className="rounded-[1.25rem] bg-[#f2f4fb] px-3 py-4 text-center dark:bg-brand-900/60"
                >
                  <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-sm dark:bg-brand-800">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-200">
                    {title}
                  </p>
                  <p className="mt-1 hidden text-[11px] leading-5 text-brand-500 dark:text-brand-400 lg:block">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] xl:gap-8">
          <article
            id="size-guide-info"
            className="rounded-[2rem] border border-brand-200/80 bg-white/82 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)] dark:border-brand-800 dark:bg-brand-900/40 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                  Product Notes
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-brand-950 dark:text-white">
                  Size guide, stock, dan detail koleksi
                </h2>
              </div>
              <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                {curatedLabel}
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-[#f2f4fb] p-4 dark:bg-brand-900/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  Size spread
                </p>
                <p className="mt-2 text-lg font-semibold text-brand-950 dark:text-white">
                  {sizePreview}
                </p>
                <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                  Pilih ukuran yang tersedia. Varian di atas XL tetap bisa diproses sebagai preorder jika dicantumkan di katalog.
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-[#f2f4fb] p-4 dark:bg-brand-900/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  Stock status
                </p>
                <p className="mt-2 text-lg font-semibold text-brand-950 dark:text-white">
                  {totalStock <= 0 ? "Currently sold out" : `${totalStock} pcs ready`}
                </p>
                <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                  {totalStock <= 0
                    ? "Produk ini sedang habis. Pantau katalog untuk batch berikutnya."
                    : `${readySizeCount} dari ${sizes.length} ukuran saat ini masih tersedia.`}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-brand-600 dark:text-brand-300">
              <p>Material utama: cotton combed dengan feel ringan dan rapi untuk ibadah, komunitas, dan aktivitas harian.</p>
              <p>Colorway: {product.color || "Signature GTshirt palette"}.</p>
              {hasPreorderSizes && (
                <p className="font-medium text-amber-600 dark:text-amber-300">
                  Ukuran di atas XL tersedia dengan alur preorder.
                </p>
              )}
            </div>

            <div className="mt-6 space-y-3 border-t border-brand-200/70 pt-5 dark:border-brand-800">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
                  FAQ Singkat
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-brand-950 dark:text-white">
                  Pertanyaan yang paling sering muncul sebelum checkout
                </h3>
              </div>
              <div className="grid gap-3">
                {DETAIL_FAQS.map((item) => (
                  <article
                    key={item.key}
                    className="rounded-[1.15rem] border border-brand-200/80 bg-white/90 p-4 dark:border-brand-700 dark:bg-brand-950/20"
                  >
                    <p className="text-sm font-semibold text-brand-950 dark:text-white">
                      {item.question}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                      {item.answer}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </article>

          <article className="space-y-5 rounded-[2rem] border border-brand-200/80 bg-white/82 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)] dark:border-brand-800 dark:bg-brand-900/40 sm:p-6">
            {reviewHeader}
            {reviewBody}
          </article>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-brand-500 dark:text-brand-400">
                Complete the look
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-brand-950 dark:text-white">
                You Might Also Like
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-700 transition hover:text-brand-950 dark:text-brand-300 dark:hover:text-white"
            >
              Explore all collection
              <ArrowRightTinyIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
            {showcaseProducts.map((item) => {
              if (!item || !item.id) return null;
              
              const relatedPrice = Number(item.finalPrice ?? item.basePrice ?? 0);
              const relatedImages = getImageWithFallback(item, FALLBACK_PRODUCTS);
              const relatedImage = relatedImages && relatedImages.length > 0 ? relatedImages[0] : storePlaceholderImage;
              const finalImageUrl = ensureValidImageUrl(relatedImage);

              return (
                <Link
                  key={item.id}
                  to={`/shop/${item.slug}`}
                  className="group block w-[13.5rem] shrink-0 snap-start sm:w-[15rem] md:w-auto"
                >
                  <article className="overflow-hidden rounded-[1.45rem] border border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,248,0.96))] shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_24px_50px_rgba(15,23,42,0.1)] dark:border-emerald-900/30 dark:bg-[linear-gradient(180deg,rgba(10,18,14,0.96),rgba(7,12,10,0.94))] sm:rounded-[1.8rem]">
                    <div className="relative aspect-square overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,245,0.92))] p-2.5 dark:bg-[linear-gradient(180deg,rgba(14,24,18,0.88),rgba(9,15,11,0.9))] sm:p-3">
                      <div className="pointer-events-none absolute inset-2.5 rounded-[1.2rem] border border-emerald-950/[0.08] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,248,246,0.84))] dark:border-emerald-900/30 dark:bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.14),transparent_50%),linear-gradient(180deg,rgba(14,24,18,0.78),rgba(9,15,11,0.88))]" />
                      <img
                        src={finalImageUrl}
                        alt={item.name}
                        width={720}
                        height={860}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = storePlaceholderImage;
                          event.currentTarget.classList.add("is-loaded");
                        }}
                        onLoad={(event) => {
                          event.currentTarget.classList.add("is-loaded");
                        }}
                        className="image-soft relative z-[1] h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col gap-3 border-t border-brand-100 px-3.5 py-4 dark:border-brand-800 sm:px-4.5 sm:py-4.5">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-[-0.02em] text-brand-900 dark:text-white sm:text-base">
                        {item.name}
                      </h3>
                      <div className="border-t border-brand-100 pt-3 dark:border-brand-800">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-500 dark:text-brand-400">
                          Harga
                        </p>
                        <p className="mt-1 text-base font-black text-brand-900 dark:text-white sm:text-[1.05rem]">
                          {formatRupiah(relatedPrice)}
                        </p>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>

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
                src={resolveStoreImageUrl(images[selectedImageIndex]) || storePlaceholderImage}
                alt={product.name}
                className="image-zoom-media"
                style={{ width: `${zoomScale * 100}%` }}
                loading="eager"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = storePlaceholderImage;
                }}
              />
              <p className="image-zoom-hint">Gunakan tombol + untuk memperbesar.</p>
            </div>
          </div>
        </div>
      )}
      </div>
      {typeof document !== "undefined" ? createPortal(mobileStickyBar, document.body) : mobileStickyBar}
    </>
  );
}

export default ProductDetailPage;
