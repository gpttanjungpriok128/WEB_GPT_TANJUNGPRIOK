import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import gtshirtLogo from "../../img/gtshirt-logo.jpeg";
import { useAuth } from "../../context/AuthContext";
import { formatRupiah } from "../../utils/storeFormatters";
import { buildStoreOrderPrintDocument } from "../../utils/storePrint";
import { invalidateStoreCatalogCache } from "../../utils/storeCatalogCache";
import { getPriceForSize, getProductPriceSummary } from "../../utils/storePricing";

const PAYMENT_OPTIONS = ["Tunai", "QRIS", "Transfer Bank", "Kartu Debit"];

function getVariantKey(productId, size) {
  return `${productId}:${String(size || "").trim().toUpperCase()}`;
}

function getDefaultSize(product) {
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  return (
    sizes.find((size) => Number(product?.stockBySize?.[size]) > 0)
    || sizes[0]
    || ""
  );
}

function isCashPaymentMethod(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes("tunai") || normalized.includes("cash");
}

function clampQuantity(value, max) {
  const safeMax = Math.max(1, Number(max) || 1);
  return Math.max(1, Math.min(safeMax, Number(value) || 1));
}

function getProductImageUrl(product) {
  if (product?.imageUrl) {
    return product.imageUrl;
  }

  if (Array.isArray(product?.imageUrls)) {
    return product.imageUrls.find(Boolean) || "";
  }

  return "";
}

export default function PosTab({
  isActive,
  onRefreshAnalytics,
  onGoToOrders,
  standalone = false,
}) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [productDrafts, setProductDrafts] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [checkoutResult, setCheckoutResult] = useState(null);

  const openPrintWindow = (html) => {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=420,height=820");
    if (!popup) {
      setFeedback({
        type: "error",
        text: "Popup diblokir browser. Izinkan popup untuk mencetak struk.",
      });
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.onload = () => {
      popup.focus();
      setTimeout(() => popup.print(), 250);
    };
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data } = await api.get("/store/admin/products");
      const nextProducts = Array.isArray(data?.data) ? data.data : [];
      setProducts(nextProducts);
      setCartItems((previous) => previous.flatMap((item) => {
        const product = nextProducts.find((entry) => entry.id === item.productId);
        if (!product) return [];

        const stockAvailable = Math.max(0, Number(product.stockBySize?.[item.size]) || 0);
        if (stockAvailable <= 0) return [];

        return [{
          ...item,
          productName: product.name,
          imageUrl: getProductImageUrl(product),
          unitPrice: getPriceForSize(product, item.size),
          stockAvailable,
          quantity: clampQuantity(item.quantity, stockAvailable),
          isActive: Boolean(product.isActive),
        }];
      }));
    } catch (error) {
      setProducts([]);
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat katalog kasir.",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchProducts();
    }
  }, [isActive]);

  const filteredProducts = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    return products
      .filter((product) => Number(product.stock) > 0)
      .filter((product) => {
        if (!keyword) return true;
        const haystack = [
          product.name,
          product.slug,
          product.color,
          product.verse,
          product.description,
        ].join(" ").toLowerCase();
        return haystack.includes(keyword);
      });
  }, [products, search]);

  const cartSubtotal = useMemo(
    () => cartItems.reduce((total, item) => total + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)), 0),
    [cartItems],
  );

  const totalItems = useMemo(
    () => cartItems.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    [cartItems],
  );

  const isCash = isCashPaymentMethod(paymentMethod);
  const amountPaid = isCash ? Math.max(0, Number(amountPaidInput) || 0) : cartSubtotal;
  const changeAmount = isCash && amountPaid >= cartSubtotal ? amountPaid - cartSubtotal : 0;
  const hasPaymentGap = isCash && cartSubtotal > 0 && amountPaid < cartSubtotal;

  useEffect(() => {
    if (!isCashPaymentMethod(paymentMethod)) {
      const nextValue = cartSubtotal > 0 ? String(cartSubtotal) : "";
      setAmountPaidInput(nextValue);
    }
  }, [paymentMethod, cartSubtotal]);

  const getDraftValue = (product) => {
    const draft = productDrafts[product.id] || {};
    const size = draft.size || getDefaultSize(product);
    const stockAvailable = Math.max(0, Number(product.stockBySize?.[size]) || 0);
    return {
      size,
      quantity: clampQuantity(draft.quantity, stockAvailable || 1),
      stockAvailable,
    };
  };

  const getCartQuantityForVariant = (productId, size) => (
    cartItems
      .filter((item) => item.productId === productId && item.size === size)
      .reduce((total, item) => total + (Number(item.quantity) || 0), 0)
  );

  const updateProductDraft = (productId, patch) => {
    setProductDrafts((previous) => ({
      ...previous,
      [productId]: {
        ...(previous[productId] || {}),
        ...patch,
      },
    }));
  };

  const addToCart = (product) => {
    const draft = getDraftValue(product);
    if (!draft.size) {
      setFeedback({ type: "error", text: `Pilih ukuran untuk ${product.name}.` });
      return;
    }

    const variantKey = getVariantKey(product.id, draft.size);
    const stockAvailable = Math.max(0, Number(product.stockBySize?.[draft.size]) || 0);
    const currentQty = getCartQuantityForVariant(product.id, draft.size);
    const remainingStock = Math.max(0, stockAvailable - currentQty);

    if (remainingStock <= 0) {
      setFeedback({
        type: "error",
        text: `Stok ${product.name} ukuran ${draft.size} sudah habis di keranjang.`,
      });
      return;
    }

    const quantityToAdd = clampQuantity(draft.quantity, remainingStock);
    setCartItems((previous) => {
      const existingIndex = previous.findIndex((item) => item.key === variantKey);
      if (existingIndex === -1) {
        return [
          ...previous,
          {
            key: variantKey,
            productId: product.id,
            productName: product.name,
            imageUrl: getProductImageUrl(product),
            size: draft.size,
            quantity: quantityToAdd,
            unitPrice: getPriceForSize(product, draft.size),
            stockAvailable,
            isActive: Boolean(product.isActive),
          },
        ];
      }

      return previous.map((item, index) => {
        if (index !== existingIndex) return item;
        return {
          ...item,
          quantity: clampQuantity(item.quantity + quantityToAdd, stockAvailable),
          unitPrice: getPriceForSize(product, draft.size),
          stockAvailable,
        };
      });
    });
    setCheckoutResult(null);
    setFeedback({ type: "success", text: `${product.name} ukuran ${draft.size} ditambahkan ke keranjang.` });
  };

  const updateCartItemQuantity = (itemKey, nextQuantity) => {
    setCartItems((previous) => previous.map((item) => {
      if (item.key !== itemKey) return item;
      return {
        ...item,
        quantity: clampQuantity(nextQuantity, item.stockAvailable),
      };
    }));
  };

  const removeCartItem = (itemKey) => {
    setCartItems((previous) => previous.filter((item) => item.key !== itemKey));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setFeedback({ type: "error", text: "Keranjang kasir masih kosong." });
      return;
    }

    if (hasPaymentGap) {
      setFeedback({ type: "error", text: "Nominal dibayar masih kurang dari total transaksi." });
      return;
    }

    setSubmitting(true);
    setCheckoutResult(null);
    try {
      const payload = {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        paymentMethod,
        amountPaid,
        notes: notes.trim(),
        items: cartItems.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        })),
      };

      const { data } = await api.post("/store/admin/pos/orders", payload);
      const createdOrder = data?.data || null;
      setCheckoutResult(createdOrder);
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setAmountPaidInput("");
      invalidateStoreCatalogCache();
      setFeedback({
        type: "success",
        text: data?.message || "Transaksi kasir offline berhasil dibuat.",
      });
      await fetchProducts();
      onRefreshAnalytics?.();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error.response?.data?.message || "Checkout kasir gagal diproses.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintCheckoutReceipt = () => {
    if (!checkoutResult) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    openPrintWindow(buildStoreOrderPrintDocument(checkoutResult, { logoUrl: gtshirtLogo, baseUrl }));
  };

  return (
    <section className={`grid gap-6 ${standalone ? "xl:grid-cols-[1.2fr_0.8fr]" : "xl:grid-cols-[1.15fr_0.85fr]"}`}>
      <article className="glass-card dense-card p-6">
        {feedback.text && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300"
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="admin-filter-card flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Cari Produk Kasir
            </label>
            <input
              className="input-modern"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama produk, warna, ayat, atau slug"
            />
          </div>
          <div className="rounded-2xl border border-brand-200 bg-white/80 px-4 py-3 text-xs text-brand-600 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <p className="font-semibold text-brand-900 dark:text-white">Kasir Aktif</p>
            <p>{user?.name || "Admin Store"}</p>
          </div>
          <button type="button" onClick={() => fetchProducts()} className="btn-primary !px-6 !py-2.5">
            Refresh Stok
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {loadingProducts && Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`pos-product-skeleton-${index}`}
              className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
            >
              <div className="h-4 w-32 rounded-full skeleton" />
              <div className="mt-3 h-3 w-20 rounded-full skeleton" />
              <div className="mt-4 h-10 rounded-2xl skeleton" />
              <div className="mt-3 h-10 rounded-2xl skeleton" />
            </div>
          ))}

          {!loadingProducts && filteredProducts.length === 0 && (
            <div className="md:col-span-2 rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
              Tidak ada produk aktif untuk kasir dengan kata kunci tersebut.
            </div>
          )}

          {!loadingProducts && filteredProducts.map((product) => {
            const draft = getDraftValue(product);
            const priceSummary = getProductPriceSummary(product);
            const displayPrice = getPriceForSize(product, draft.size);
            const inCart = getCartQuantityForVariant(product.id, draft.size);
            const availableToAdd = Math.max(0, draft.stockAvailable - inCart);

            return (
              <article
                key={product.id}
                className="rounded-2xl border border-brand-200 bg-white/75 p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/45"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-brand-200 bg-brand-100/60 dark:border-brand-700 dark:bg-brand-900/60">
                      {getProductImageUrl(product) ? (
                        <img
                          src={getProductImageUrl(product)}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
                          GT
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-bold text-brand-900 dark:text-white">{product.name}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">{formatRupiah(displayPrice)}</p>
                      {priceSummary.hasRange && (
                        <p className="mt-1 text-[11px] text-brand-500 dark:text-brand-400">
                          Mulai {formatRupiah(priceSummary.minPrice)} sampai {formatRupiah(priceSummary.maxPrice)}
                        </p>
                      )}
                      {product.color && (
                        <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">{product.color}</p>
                      )}
                    </div>
                  </div>
                  {!product.isActive && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Offline Friendly
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(Array.isArray(product.sizes) ? product.sizes : []).map((size) => {
                    const stockBySize = Math.max(0, Number(product.stockBySize?.[size]) || 0);
                    const isCurrent = draft.size === size;
                    return (
                      <span
                        key={`${product.id}-${size}`}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isCurrent
                            ? "bg-primary/10 text-primary"
                            : "bg-brand-100 text-brand-600 dark:bg-brand-800/70 dark:text-brand-300"
                        }`}
                      >
                        {size}: {stockBySize}
                      </span>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-brand-500 dark:text-brand-400">
                  Stok total {product.stock} pcs
                  {draft.size ? ` • sisa bisa ditambah ${availableToAdd} pcs untuk size ${draft.size}` : ""}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px_auto]">
                  <select
                    className="input-modern"
                    value={draft.size}
                    onChange={(event) => updateProductDraft(product.id, { size: event.target.value })}
                  >
                    {(Array.isArray(product.sizes) ? product.sizes : []).map((size) => (
                      <option key={`${product.id}-size-${size}`} value={size}>
                        {size} ({Math.max(0, Number(product.stockBySize?.[size]) || 0)} stok)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, availableToAdd || draft.stockAvailable || 1)}
                    className="input-modern"
                    value={draft.quantity}
                    onChange={(event) => updateProductDraft(product.id, { quantity: event.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={availableToAdd <= 0}
                    className="rounded-2xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tambah
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </article>

      <article className={`glass-card dense-card p-6 ${standalone ? "self-start xl:sticky xl:top-24" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-400">
              Offline POS
            </p>
            <h3 className="mt-2 text-xl font-bold text-brand-900 dark:text-white">Keranjang Kasir</h3>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-white/80 px-4 py-3 text-right dark:border-brand-700 dark:bg-brand-900/40">
            <p className="text-[11px] uppercase tracking-wide text-brand-500 dark:text-brand-400">Total Belanja</p>
            <p className="mt-1 text-lg font-bold text-primary">{formatRupiah(cartSubtotal)}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {cartItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-brand-200 p-6 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
              Belum ada item di keranjang kasir.
            </div>
          )}

          {cartItems.map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-brand-200 bg-brand-100/60 dark:border-brand-700 dark:bg-brand-900/60">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-500 dark:text-brand-400">
                        GT
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-900 dark:text-white">{item.productName}</p>
                    <p className="text-xs text-brand-500 dark:text-brand-400">
                      Size {item.size}
                      {!item.isActive ? " • disembunyikan dari katalog online" : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCartItem(item.key)}
                  className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-300"
                >
                  Hapus
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, item.stockAvailable)}
                  className="input-modern"
                  value={item.quantity}
                  onChange={(event) => updateCartItemQuantity(item.key, event.target.value)}
                />
                <p className="text-xs text-brand-500 dark:text-brand-400">
                  {formatRupiah(item.unitPrice)} per pcs • stok varian {item.stockAvailable}
                </p>
                <p className="text-sm font-semibold text-brand-900 dark:text-white">
                  {formatRupiah((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0))}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Nama Pelanggan
              </span>
              <input
                className="input-modern"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Opsional, default pembeli offline"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                WhatsApp
              </span>
              <input
                className="input-modern"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Opsional untuk data pelanggan"
              />
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Catatan Kasir
            </span>
            <textarea
              rows="3"
              className="input-modern"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Contoh: pembelian setelah ibadah minggu pagi"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Metode Bayar
              </span>
              <select
                className="input-modern"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                Nominal Dibayar
              </span>
              <input
                type="number"
                min="0"
                className="input-modern"
                value={isCash ? amountPaidInput : cartSubtotal > 0 ? cartSubtotal : ""}
                onChange={(event) => setAmountPaidInput(event.target.value)}
                readOnly={!isCash}
                placeholder={isCash ? "Masukkan uang diterima" : "Otomatis mengikuti total"}
              />
            </label>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-brand-200 bg-white/80 p-4 dark:border-brand-700 dark:bg-brand-900/40">
          <div className="flex items-center justify-between text-sm text-brand-600 dark:text-brand-300">
            <span>Total item</span>
            <span className="font-semibold text-brand-900 dark:text-white">{totalItems} pcs</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-brand-600 dark:text-brand-300">
            <span>Subtotal</span>
            <span className="font-semibold text-brand-900 dark:text-white">{formatRupiah(cartSubtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-brand-600 dark:text-brand-300">
            <span>Dibayar</span>
            <span className="font-semibold text-brand-900 dark:text-white">
              {formatRupiah(isCash ? amountPaid : cartSubtotal)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-brand-600 dark:text-brand-300">
            <span>Kembalian</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-300">
              {formatRupiah(changeAmount)}
            </span>
          </div>
          {hasPaymentGap && (
            <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-300">
              Nominal dibayar masih kurang untuk transaksi tunai ini.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={submitting || cartItems.length === 0 || hasPaymentGap}
          className="mt-5 btn-primary !w-full !py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Memproses checkout..." : "Checkout Offline Store"}
        </button>

        {checkoutResult && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
              Transaksi Tersimpan
            </p>
            <p className="mt-2 text-lg font-bold text-emerald-800 dark:text-emerald-100">
              {checkoutResult.orderCode}
            </p>
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
              Total {formatRupiah(checkoutResult.totalAmount)} • {checkoutResult.paymentMethod}
            </p>
            {Number(checkoutResult.changeAmount) > 0 && (
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                Kembalian {formatRupiah(checkoutResult.changeAmount)}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrintCheckoutReceipt}
                className="rounded-2xl border border-emerald-500 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200"
              >
                Print Struk
              </button>
              <button
                type="button"
                onClick={() => onGoToOrders?.()}
                className="rounded-2xl border border-emerald-500 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200"
              >
                Buka Daftar Pesanan
              </button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
