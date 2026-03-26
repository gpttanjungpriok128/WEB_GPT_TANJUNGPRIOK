import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import {
  collectCartImageCandidates,
  normalizeStoreImagePath,
  resolveStoreImageUrl,
} from "../utils/storeImage";
import { clampQuantity, getStockForSize } from "../utils/storeStock";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const TRACKING_STORAGE_KEY = "gpt_tanjungpriok_last_order_tracking_v1";
const CHECKOUT_DRAFT_STORAGE_KEY = "gpt_tanjungpriok_checkout_draft_v1";
const DEFAULT_SHIPPING_COST = 15000;
const CART_SECTION_SHELL = "relative overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,248,0.92))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] dark:border-emerald-900/40 dark:bg-[linear-gradient(180deg,rgba(8,16,12,0.94),rgba(6,12,9,0.92))] sm:p-6";
const CART_LABEL = "text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600/80 dark:text-emerald-200/70";
const DEFAULT_CHECKOUT_FORM = {
  name: "",
  phone: "",
  address: "",
  shippingMethod: "Kurir Jabodetabek",
  paymentMethod: "Transfer Bank",
  notes: "",
};

const formatRupiah = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

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

const NameFieldIcon = ({ className = "h-4 w-4" }) => (
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
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

const PhoneFieldIcon = ({ className = "h-4 w-4" }) => (
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

const AddressFieldIcon = ({ className = "h-4 w-4" }) => (
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
    <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
    <circle cx="12" cy="11" r="2.3" />
  </svg>
);

const ShippingFieldIcon = ({ className = "h-4 w-4" }) => (
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
    <path d="M3 7h11v8H3z" />
    <path d="M14 10h3l3 3v2h-6z" />
    <circle cx="8" cy="18" r="1.8" />
    <circle cx="18" cy="18" r="1.8" />
  </svg>
);

const PaymentFieldIcon = ({ className = "h-4 w-4" }) => (
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
    <rect x="3" y="6" width="18" height="12" rx="2.5" />
    <path d="M3 10h18" />
    <path d="M7 14h3" />
  </svg>
);

const NoteFieldIcon = ({ className = "h-4 w-4" }) => (
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

function readInitialCartItems() {
  if (typeof window === "undefined") return [];

  try {
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.map(normalizeCartItem) : [];
  } catch {
    return [];
  }
}

function normalizeCartItem(item = {}) {
  const normalizedImage = normalizeStoreImagePath(item.image);
  const normalizedImageUrls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map(normalizeStoreImagePath).filter(Boolean)
    : [];
  const primaryImage = normalizedImage || normalizedImageUrls[0] || "";
  const imageUrls = normalizedImageUrls.length > 0
    ? normalizedImageUrls
    : primaryImage
      ? [primaryImage]
      : [];

  const variantStock = getStockForSize(item, item.size);

  return {
    ...item,
    image: primaryImage,
    imageUrls,
    stock: Math.max(0, Number(variantStock) || 0),
  };
}

function readCheckoutDraft() {
  if (typeof window === "undefined") return { ...DEFAULT_CHECKOUT_FORM };

  try {
    const saved = JSON.parse(window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY) || "null");
    return {
      ...DEFAULT_CHECKOUT_FORM,
      ...(saved && typeof saved === "object" ? saved : {}),
    };
  } catch {
    return { ...DEFAULT_CHECKOUT_FORM };
  }
}

function CartPage() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState(() => readInitialCartItems());
  const [selectedItems, setSelectedItems] = useState(() => {
    const initialItems = readInitialCartItems();
    return new Set(initialItems.map((_, i) => i));
  });
  const [failedImageKeys, setFailedImageKeys] = useState(new Set());
  const [imageIndexByKey, setImageIndexByKey] = useState({});
  const [shippingCost, setShippingCost] = useState(DEFAULT_SHIPPING_COST);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutInfo, setCheckoutInfo] = useState("");
  const [latestOrderCode, setLatestOrderCode] = useState("");
  const [latestOrderPhone, setLatestOrderPhone] = useState("");
  const [checkoutFieldErrors, setCheckoutFieldErrors] = useState({});
  const [checkoutForm, setCheckoutForm] = useState(() => readCheckoutDraft());
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);

  useEffect(() => {
    const normalizedItems = readInitialCartItems();
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizedItems));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(checkoutForm));
  }, [checkoutForm]);

  // Load shipping cost from store settings (public meta)
  useEffect(() => {
    const fetchShippingCost = async () => {
      try {
        const { data } = await api.get("/store/products");
        const cost = Number(data?.meta?.shippingCost);
        if (Number.isFinite(cost) && cost >= 0) {
          setShippingCost(cost);
        }
      } catch {
        // keep default shipping cost
      }
    };

    fetchShippingCost();
  }, []);

  // Calculate totals for selected items
  const selectedItemsList = useMemo(() => {
    return cartItems.filter((_, i) => selectedItems.has(i));
  }, [cartItems, selectedItems]);

  const subtotal = useMemo(() => {
    return selectedItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedItemsList]);
  const selectedUnits = useMemo(
    () => selectedItemsList.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [selectedItemsList],
  );

  const isPickupAtChurch = checkoutForm.shippingMethod.toLowerCase().includes("ambil");
  const shipping = selectedItemsList.length > 0 ? (isPickupAtChurch ? 0 : shippingCost) : 0;
  const grandTotal = subtotal + shipping;
  const selectedCount = selectedItemsList.length;
  const checkoutAddressLabel = isPickupAtChurch
    ? "Catatan Pickup"
    : "Alamat Pengiriman";
  const checkoutAddressPlaceholder = isPickupAtChurch
    ? "Opsional: patokan, jadwal hadir, atau nama penerima"
    : "Alamat lengkap pengiriman";
  const checkoutAddressHelper = isPickupAtChurch
    ? "Kosongkan bila langsung ambil di gereja. Sistem akan menandai order ini sebagai pickup."
    : "Tulis alamat yang jelas agar admin mudah menyiapkan pengiriman.";
  const checkoutActionLabel = isPickupAtChurch
    ? "Checkout Pickup & Konfirmasi"
    : "Checkout & Konfirmasi WhatsApp";
  const shippingMethodHelper = isPickupAtChurch
    ? "Pickup di gereja, ongkir gratis."
    : `Kurir Jabodetabek, ongkir ${formatRupiah(shippingCost)}.`;

  useEffect(() => {
    if (!isPickupAtChurch) return;

    setCheckoutFieldErrors((previous) => {
      if (!previous.address) return previous;
      const next = { ...previous };
      delete next.address;
      return next;
    });

    setCheckoutError((previous) =>
      previous === "Alamat wajib diisi" ? "" : previous,
    );
  }, [isPickupAtChurch]);

  // Toggle item selection
  const toggleItemSelect = (index) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  // Toggle all items
  const toggleAllItems = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map((_, i) => i)));
    }
  };

  // Update quantity
  const updateQuantity = (index, newQuantity) => {
    const qty = clampQuantity(newQuantity, cartItems[index].stock || 99);
    const updated = [...cartItems];
    updated[index].quantity = qty;
    setCartItems(updated);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
  };

  // Remove item
  const removeItem = (index) => {
    const removedItem = cartItems[index];
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    if (removedItem?.variantKey) {
      setFailedImageKeys((previous) => {
        const next = new Set(previous);
        next.delete(removedItem.variantKey);
        return next;
      });
      setImageIndexByKey((previous) => {
        const next = { ...previous };
        delete next[removedItem.variantKey];
        return next;
      });
    }
    const newSelected = new Set(selectedItems);
    newSelected.delete(index);
    // Re-map selected indices after removal
    const remappedSelected = new Set();
    newSelected.forEach((selectedIdx) => {
      if (selectedIdx > index) {
        remappedSelected.add(selectedIdx - 1);
      } else if (selectedIdx < index) {
        remappedSelected.add(selectedIdx);
      }
    });
    setSelectedItems(remappedSelected);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
  };

  // Handle checkout form change
  const handleCheckoutField = (field, value) => {
    setCheckoutForm((prev) => ({ ...prev, [field]: value }));
    setCheckoutError("");
    setCheckoutFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Process checkout
  const proceedCheckout = async () => {
    if (selectedItemsList.length === 0) {
      setCheckoutError("Pilih minimal 1 produk untuk checkout");
      setCheckoutFieldErrors({});
      scrollToCheckout();
      return;
    }

    const nextErrors = {};
    const normalizedAddress = checkoutForm.address.trim();
    const fallbackPickupAddress = "Ambil di Gereja GPT Tanjung Priok";
    if (!checkoutForm.name.trim()) {
      nextErrors.name = "Nama lengkap wajib diisi";
    }
    if (!checkoutForm.phone.trim()) {
      nextErrors.phone = "No. WhatsApp wajib diisi";
    }
    if (!isPickupAtChurch && !normalizedAddress) {
      nextErrors.address = "Alamat wajib diisi";
    }
    if (Object.keys(nextErrors).length > 0) {
      setCheckoutFieldErrors(nextErrors);
      const firstErrorKey = ["name", "phone", "address"].find(
        (key) => nextErrors[key],
      );
      if (firstErrorKey === "name") {
        nameInputRef.current?.focus();
      } else if (firstErrorKey === "phone") {
        phoneInputRef.current?.focus();
      } else if (firstErrorKey === "address") {
        addressInputRef.current?.focus();
      }
      setCheckoutError(nextErrors[firstErrorKey] || "Lengkapi data checkout");
      scrollToCheckout();
      return;
    }

    const hasInvalidProduct = selectedItemsList.some(
      (item) => !Number.isInteger(Number(item.productId)) || Number(item.productId) <= 0,
    );
    if (hasInvalidProduct) {
      setCheckoutError("Ada item lama/tidak valid di keranjang. Hapus lalu tambah ulang produk.");
      setCheckoutFieldErrors({});
      scrollToCheckout();
      return;
    }

    setIsSubmittingOrder(true);
    setCheckoutError("");
    setCheckoutInfo("");

    try {
      const payload = {
        name: checkoutForm.name.trim(),
        phone: checkoutForm.phone.trim(),
        address: isPickupAtChurch ? normalizedAddress || fallbackPickupAddress : normalizedAddress,
        shippingMethod: checkoutForm.shippingMethod,
        paymentMethod: checkoutForm.paymentMethod,
        notes: checkoutForm.notes.trim(),
        items: selectedItemsList.map((item) => ({
          productId: Number(item.productId),
          size: String(item.size || "").toUpperCase(),
          quantity: Math.max(1, Number(item.quantity) || 1),
        })),
      };

      const { data } = await api.post("/store/orders", payload);
      const orderCode = data?.data?.orderCode;
      const whatsappLink = data?.data?.whatsappLink;

      const selectedIndexSet = new Set([...selectedItems]);
      const remainingItems = cartItems.filter((_, index) => !selectedIndexSet.has(index));
      setCartItems(remainingItems);
      setSelectedItems(new Set(remainingItems.map((_, i) => i)));
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(remainingItems));

      setCheckoutInfo(
        orderCode
          ? `Pesanan ${orderCode} berhasil dibuat. ${isPickupAtChurch ? "Order ditandai pickup di gereja." : "Order siap lanjut ke konfirmasi via WhatsApp."} Estimasi pre-order 5 hari kerja.`
          : `Pesanan berhasil dibuat. ${isPickupAtChurch ? "Order ditandai pickup di gereja." : "Lanjutkan konfirmasi via WhatsApp."} Estimasi pre-order 5 hari kerja.`,
      );
      setLatestOrderCode(orderCode || "");
      setLatestOrderPhone(checkoutForm.phone.trim());
      window.localStorage.setItem(
        TRACKING_STORAGE_KEY,
        JSON.stringify({
          orderCode: orderCode || "",
          phone: checkoutForm.phone.trim(),
        }),
      );
      setCheckoutForm((previous) => ({
        ...previous,
        address: isPickupAtChurch ? "" : previous.address,
        notes: "",
      }));

      if (whatsappLink) {
        window.open(whatsappLink, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      const message =
        error?.response?.data?.errors?.[0]?.msg
        || error?.response?.data?.message
        || "Checkout gagal. Silakan coba lagi.";
      setCheckoutError(message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const scrollToCheckout = () => {
    const target = document.getElementById("checkout-form");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  if (cartItems.length === 0) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_60%)] blur-2xl" />
        <div className="page-stack space-y-5 sm:space-y-6">
          <PageHero title="Keranjang Belanja" subtitle="Lihat dan kelola pesanan Anda" tone="dense" />
          <section className={CART_SECTION_SHELL}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.06),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.08),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.03),transparent_58%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
              <div>
                <p className={CART_LABEL}>Cart Overview</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-brand-900 dark:text-white sm:text-[2.6rem]">
                  Keranjang masih kosong, tapi kamu bisa mulai pilih produk.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-600 dark:text-brand-300 sm:text-base">
                  Pilih produk GTshirt, tentukan ukuran, lalu kembali ke sini untuk checkout dan lanjut konfirmasi via WhatsApp dengan alur yang tetap ringan.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/shop" className="btn-primary !rounded-[1.2rem] !px-5 !py-3">
                    Lanjut Belanja
                  </Link>
                  <Link to="/track-order" className="btn-outline !rounded-[1.2rem] !px-5 !py-3">
                    Lacak Pesanan
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.72] px-4 py-4 dark:border-emerald-900/30 dark:bg-white/[0.03]">
                  <p className={CART_LABEL}>Step 01</p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">Tambahkan item favorit</p>
                  <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                    Semua produk GTshirt bisa langsung dibawa ke keranjang dari katalog atau detail produk.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.72] px-4 py-4 dark:border-emerald-900/30 dark:bg-white/[0.03]">
                  <p className={CART_LABEL}>Step 02</p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">Isi data checkout</p>
                  <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                    Nama, WhatsApp, alamat, pengiriman, dan catatan akan menyimpan order dengan rapi.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-emerald-950/10 bg-white/[0.72] px-4 py-4 dark:border-emerald-900/30 dark:bg-white/[0.03]">
                  <p className={CART_LABEL}>Step 03</p>
                  <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">Konfirmasi via WhatsApp</p>
                  <p className="mt-2 text-sm leading-6 text-brand-600 dark:text-brand-300">
                    Setelah checkout, kamu akan diarahkan untuk lanjut konfirmasi pesanan dengan cepat.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const mobileStickyBar = (
    <div className="sticky-mobile-bar sm:hidden">
      <div className="sticky-mobile-surface space-y-2.5 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold tracking-[-0.03em] text-brand-900 dark:text-white">
              {formatRupiah(grandTotal)}
            </p>
            <p className="text-[11px] text-brand-500 dark:text-brand-400">
              {selectedUnits} pcs • Ongkir {shipping > 0 ? formatRupiah(shipping) : "Gratis"}
            </p>
          </div>
          <span className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100">
            {selectedCount} item
          </span>
        </div>
        <button
          type="button"
          onClick={proceedCheckout}
          disabled={isSubmittingOrder || selectedCount === 0}
          className="btn-primary min-h-[44px] w-full !rounded-[1rem] !px-4 !py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {isSubmittingOrder ? "Processing..." : checkoutActionLabel}
        </button>
      </div>
    </div>
  );

  return (
    <>
    <div className="relative pb-36 sm:pb-6">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_60%)] blur-2xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-60 w-60 rounded-full bg-emerald-200/30 blur-[120px] dark:bg-emerald-500/10" />
      <PageHero title="Keranjang Belanja" subtitle="Lihat dan kelola pesanan Anda" tone="dense" />

      <div className="page-stack grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)]">
        <section className="space-y-4 sm:space-y-5">
          <article className={`${CART_SECTION_SHELL} !p-4 sm:!p-5`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.1),transparent_34%)]" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                  onChange={toggleAllItems}
                  className="h-5 w-5 rounded-md border-brand-300 text-primary focus:ring-primary"
                />
                <div>
                  <p className={CART_LABEL}>Selection</p>
                  <p className="mt-1 text-sm font-semibold text-brand-900 dark:text-white">
                    Pilih Semua ({selectedItems.size}/{cartItems.length})
                  </p>
                </div>
              </label>
              <button
                onClick={() => {
                  const toRemove = cartItems
                    .map((_, i) => i)
                    .filter((i) => selectedItems.has(i))
                    .reverse();
                  toRemove.forEach((i) => removeItem(i));
                }}
                disabled={selectedItems.size === 0}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[1rem] px-3 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
              >
                Hapus Terpilih
              </button>
            </div>
          </article>

          <div className="space-y-4">
            {cartItems.map((item, index) => {
              const imageCandidates = collectCartImageCandidates(item);
              const activeImageIndex = imageIndexByKey[item.variantKey] || 0;
              const activeImagePath = imageCandidates[activeImageIndex] || "";
              const imageSrc = resolveStoreImageUrl(activeImagePath);
              const isImageBroken = failedImageKeys.has(item.variantKey);

              return (
                <article
                  key={item.variantKey}
                  className={`${CART_SECTION_SHELL} !p-4 sm:!p-5`}
                >
                  <div className="relative">
                    <div className="flex gap-3">
                      <label className="flex cursor-pointer items-start pt-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(index)}
                          onChange={() => toggleItemSelect(index)}
                          className="mt-1 h-5 w-5 rounded-md border-brand-300 text-primary focus:ring-primary"
                        />
                      </label>

                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex gap-3 sm:gap-4">
                            <div className="flex-shrink-0">
                              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.2rem] border border-brand-200 bg-[linear-gradient(180deg,rgba(244,247,246,0.96),rgba(235,243,239,0.96))] dark:border-brand-700 dark:bg-[linear-gradient(180deg,rgba(15,22,18,0.94),rgba(10,15,12,0.92))] sm:h-28 sm:w-28">
                                {imageSrc && !isImageBroken ? (
                                  <img
                                    src={imageSrc}
                                    alt={item.name}
                                    width={320}
                                    height={320}
                                    sizes="(max-width: 640px) 96px, 112px"
                                    onError={(event) => {
                                      event.currentTarget.classList.add("is-loaded");
                                      if (activeImageIndex < imageCandidates.length - 1) {
                                        setImageIndexByKey((previous) => ({
                                          ...previous,
                                          [item.variantKey]: activeImageIndex + 1,
                                        }));
                                        return;
                                      }

                                      setFailedImageKeys((previous) => {
                                        const next = new Set(previous);
                                        next.add(item.variantKey);
                                        return next;
                                      });
                                    }}
                                    loading="lazy"
                                    decoding="async"
                                    className="image-soft h-full w-full object-cover"
                                    onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
                                  />
                                ) : (
                                  <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400 dark:text-brand-500">
                                    No Image
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-lg font-semibold tracking-[-0.03em] text-brand-900 dark:text-white">
                                {item.name}
                              </h3>
                              <p className="mt-2 text-sm text-brand-600 dark:text-brand-300">
                                Size {item.size}{item.color ? ` · ${item.color}` : ""}
                              </p>
                              {isAboveXL(item.size) && (
                                <p className="mt-2 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                                  Ukuran di atas XL preorder.
                                </p>
                              )}
                              <p className="mt-3 text-sm font-bold text-primary">
                                {formatRupiah(item.price)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:min-w-[148px] sm:flex-col sm:items-end sm:text-right">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                                Total
                              </p>
                              <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-brand-900 dark:text-white">
                                {formatRupiah(item.price * item.quantity)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(index)}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-[0.95rem] px-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-brand-200/80 pt-4 dark:border-brand-700/80 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                              Jumlah
                            </p>
                            <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                              Maks {item.stock || 0} pcs
                            </p>
                          </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                                className="min-h-[44px] min-w-[44px] rounded-[1rem] border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-800/40"
                                aria-label={`Kurangi jumlah ${item.name}`}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.stock || 99}
                                className="input-modern !w-[78px] !rounded-[1rem] !px-3 text-center text-sm font-semibold"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, e.target.value)}
                              />
                              <button
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                                className="min-h-[44px] min-w-[44px] rounded-[1rem] border border-brand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-800/40"
                                aria-label={`Tambah jumlah ${item.name}`}
                              >
                                +
                              </button>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <article className={`${CART_SECTION_SHELL} !p-4 sm:!p-5`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%)]" />
            <div className="relative">
              <p className={CART_LABEL}>GTshirt Notes</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-brand-900 dark:text-white">
                Cotton Combed 24s, unisex fit, dan ritme preorder yang rapi.
              </h3>
              <p className="mt-3 text-sm leading-7 text-brand-600 dark:text-brand-300">
                Katalog GTshirt disiapkan dengan bahan nyaman, sablon berkualitas, dan alur konfirmasi yang jelas supaya pembelian tetap terasa ringan dari pilih produk sampai order tersimpan.
              </p>
            </div>
          </article>

          <article id="checkout-form" className={`${CART_SECTION_SHELL} checkout-compact !p-4 sm:!p-5`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.06),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.08),transparent_35%),linear-gradient(145deg,rgba(255,255,255,0.03),transparent_58%)]" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={CART_LABEL}>Checkout Form</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                    Lengkapi data checkout
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-600 dark:text-brand-300">
                    Setelah item di keranjang siap, isi data pemesan untuk menyimpan order lalu lanjut konfirmasi melalui WhatsApp.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                  Ready to Checkout
                </div>
              </div>

              {checkoutError && (
                <p className="mt-5 rounded-[1.1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/80 dark:bg-rose-900/30 dark:text-rose-300">
                  {checkoutError}
                </p>
              )}

              {checkoutInfo && (
                <p className="mt-5 rounded-[1.1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {checkoutInfo}
                </p>
              )}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Nama Lengkap
                  </span>
                  <div className="input-leading-shell">
                    <NameFieldIcon className="input-leading-icon" />
                    <input
                      type="text"
                      placeholder="Nama lengkap"
                      ref={nameInputRef}
                      className={`input-modern ${checkoutFieldErrors.name ? "input-error" : ""}`}
                      value={checkoutForm.name}
                      onChange={(e) => handleCheckoutField("name", e.target.value)}
                      aria-invalid={Boolean(checkoutFieldErrors.name)}
                    />
                  </div>
                  {checkoutFieldErrors.name && (
                    <p className="text-[11px] font-semibold text-rose-500">
                      {checkoutFieldErrors.name}
                    </p>
                  )}
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    WhatsApp
                  </span>
                  <div className="input-leading-shell">
                    <PhoneFieldIcon className="input-leading-icon" />
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="No. WhatsApp"
                      ref={phoneInputRef}
                      className={`input-modern ${checkoutFieldErrors.phone ? "input-error" : ""}`}
                      value={checkoutForm.phone}
                      onChange={(e) => handleCheckoutField("phone", e.target.value)}
                      aria-invalid={Boolean(checkoutFieldErrors.phone)}
                    />
                  </div>
                  {checkoutFieldErrors.phone && (
                    <p className="text-[11px] font-semibold text-rose-500">
                      {checkoutFieldErrors.phone}
                    </p>
                  )}
                </label>

                <label className="space-y-1.5 lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    {checkoutAddressLabel}
                  </span>
                  <div className="input-leading-shell input-leading-shell-textarea">
                    <AddressFieldIcon className="input-leading-icon" />
                    <textarea
                      placeholder={checkoutAddressPlaceholder}
                      ref={addressInputRef}
                      className={`input-modern min-h-[120px] resize-y ${checkoutFieldErrors.address ? "input-error" : ""}`}
                      value={checkoutForm.address}
                      onChange={(e) => handleCheckoutField("address", e.target.value)}
                      aria-invalid={Boolean(checkoutFieldErrors.address)}
                    />
                  </div>
                  <p className="text-[11px] text-brand-500 dark:text-brand-400">
                    {checkoutAddressHelper}
                  </p>
                  {checkoutFieldErrors.address && (
                    <p className="text-[11px] font-semibold text-rose-500">
                      {checkoutFieldErrors.address}
                    </p>
                  )}
                </label>

                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Pengiriman
                    </span>
                    <div className="input-leading-shell input-select-shell">
                      <ShippingFieldIcon className="input-leading-icon" />
                      <select
                        className="input-modern appearance-none"
                        value={checkoutForm.shippingMethod}
                        onChange={(e) => handleCheckoutField("shippingMethod", e.target.value)}
                      >
                        <option>Kurir Jabodetabek</option>
                        <option>Ambil di Gereja</option>
                      </select>
                      <SelectChevronIcon className="input-trailing-icon" />
                    </div>
                    <p className="text-[11px] text-brand-500 dark:text-brand-400">
                      {shippingMethodHelper}
                    </p>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Pembayaran
                    </span>
                    <div className="input-leading-shell input-select-shell">
                      <PaymentFieldIcon className="input-leading-icon" />
                      <select
                        className="input-modern appearance-none"
                        value={checkoutForm.paymentMethod}
                        onChange={(e) => handleCheckoutField("paymentMethod", e.target.value)}
                      >
                        <option>Transfer Bank</option>
                        <option>QRIS</option>
                        <option>Bayar Tunai di Gereja</option>
                      </select>
                      <SelectChevronIcon className="input-trailing-icon" />
                    </div>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
                  <div className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Barang Dipilih
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                      {selectedCount} varian • {selectedUnits} pcs
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Pengiriman
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                      {isPickupAtChurch ? "Pickup di Gereja" : "Kurir Jabodetabek"}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-brand-200/80 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-900/30">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                      Pembayaran
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-900 dark:text-white">
                      {checkoutForm.paymentMethod}
                    </p>
                  </div>
                </div>

                <label className="space-y-1.5 lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                    Catatan Tambahan
                  </span>
                  <div className="input-leading-shell">
                    <NoteFieldIcon className="input-leading-icon" />
                    <input
                      type="text"
                      placeholder="Catatan (opsional)"
                      className="input-modern text-sm"
                      value={checkoutForm.notes}
                      onChange={(e) => handleCheckoutField("notes", e.target.value)}
                    />
                  </div>
                </label>
              </div>

              <button
                onClick={proceedCheckout}
                disabled={isSubmittingOrder || selectedCount === 0}
                className="checkout-desktop btn-primary mt-5 hidden w-full items-center justify-center !rounded-[1.2rem] !px-4 !py-3 text-white disabled:opacity-50 sm:inline-flex"
              >
                {isSubmittingOrder ? "Processing..." : checkoutActionLabel}
              </button>
              <p className="mt-3 text-[11px] text-brand-500 dark:text-brand-400 sm:hidden">
                Gunakan tombol checkout di bar bawah untuk menyimpan order dan lanjut ke WhatsApp.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {user && (
                  <Link
                    to="/my-orders"
                    className="btn-outline inline-flex w-full items-center justify-center !rounded-[1.1rem] !px-4 !py-3 text-sm sm:w-auto"
                  >
                    Lihat Pesanan Saya
                  </Link>
                )}

                {latestOrderCode && (
                  <Link
                    to={`/track-order?orderCode=${encodeURIComponent(latestOrderCode)}&phone=${encodeURIComponent(latestOrderPhone || checkoutForm.phone.trim())}`}
                    className="inline-flex w-full items-center justify-center rounded-[1.1rem] border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/15 sm:w-auto"
                  >
                    Lacak Status Pesanan
                  </Link>
                )}
              </div>
            </div>
          </article>
        </section>

        <aside className="h-fit space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:block xl:space-y-4 xl:sticky xl:top-24">
          <article className={CART_SECTION_SHELL}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.1),transparent_34%)]" />
            <div className="relative space-y-5">
              <div>
                <p className={CART_LABEL}>Order Summary</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-brand-900 dark:text-white">
                  Ringkasan pesanan
                </h3>
              </div>

              <div className="space-y-3 rounded-[1.5rem] border border-brand-200/80 bg-white/[0.72] p-4 dark:border-brand-700 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-600 dark:text-brand-300">Subtotal ({selectedUnits} pcs)</span>
                  <span className="font-semibold text-brand-900 dark:text-white">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-600 dark:text-brand-300">Ongkir</span>
                  <span className="font-semibold text-brand-900 dark:text-white">
                    {shipping > 0 ? formatRupiah(shipping) : "Gratis"}
                  </span>
                </div>
                <div className="h-px bg-brand-200 dark:bg-brand-700" />
                <div className="grid gap-2 rounded-[1.1rem] border border-brand-200/80 bg-brand-50/70 p-3 text-sm dark:border-brand-700 dark:bg-brand-900/30">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-brand-500 dark:text-brand-400">Pengiriman</span>
                    <span className="font-semibold text-brand-900 dark:text-white">
                      {checkoutForm.shippingMethod}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-brand-500 dark:text-brand-400">Pembayaran</span>
                    <span className="font-semibold text-brand-900 dark:text-white">
                      {checkoutForm.paymentMethod}
                    </span>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <span className="text-base font-semibold text-brand-900 dark:text-white">Total</span>
                  <span className="text-[2rem] font-semibold tracking-[-0.04em] text-primary">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="rounded-[1.2rem] border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                  {isPickupAtChurch
                    ? "Pickup diproses tanpa ongkir. Anda tetap akan menerima kode order dan bisa lanjut konfirmasi via WhatsApp."
                    : "Lengkapi data checkout di bawah daftar produk, lalu lanjutkan ke konfirmasi WhatsApp."}
                </p>

                <div className="grid gap-3">
                  <Link
                    to="/shop"
                    className="btn-outline inline-flex w-full items-center justify-center !rounded-[1.15rem] !px-4 !py-3 text-sm"
                  >
                    Lanjut Belanja
                  </Link>
                  <Link
                    to="/track-order"
                    className="inline-flex w-full items-center justify-center rounded-[1.15rem] border border-brand-300 bg-white/[0.78] px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
                  >
                    Buka Lacak Pesanan
                  </Link>
                </div>
              </div>
            </div>
          </article>

          <article className={`${CART_SECTION_SHELL} !p-4 sm:!p-5`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%)]" />
            <div className="relative">
              <p className={CART_LABEL}>Langkah Pesanan</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-brand-900 dark:text-white">
                Selesaikan pesanan dengan urutan yang jelas.
              </h3>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.2rem] border border-brand-200/80 bg-white/[0.72] px-4 py-3 dark:border-brand-700 dark:bg-white/[0.03]">
                  <p className={CART_LABEL}>01</p>
                  <p className="mt-1 text-sm font-semibold text-brand-900 dark:text-white">Periksa item dan jumlah</p>
                </div>
                <div className="rounded-[1.2rem] border border-brand-200/80 bg-white/[0.72] px-4 py-3 dark:border-brand-700 dark:bg-white/[0.03]">
                  <p className={CART_LABEL}>02</p>
                  <p className="mt-1 text-sm font-semibold text-brand-900 dark:text-white">Isi data checkout dengan rapi</p>
                </div>
                <div className="rounded-[1.2rem] border border-brand-200/80 bg-white/[0.72] px-4 py-3 dark:border-brand-700 dark:bg-white/[0.03]">
                  <p className={CART_LABEL}>03</p>
                  <p className="mt-1 text-sm font-semibold text-brand-900 dark:text-white">Konfirmasi dan pantau status order</p>
                </div>
              </div>
            </div>
          </article>
        </aside>
      </div>

    </div>
    {typeof document !== "undefined" ? createPortal(mobileStickyBar, document.body) : mobileStickyBar}
    </>
  );
}

export default CartPage;
