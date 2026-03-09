import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PageHero from "../components/PageHero";
import cartHeroImage from "../img/store/made-to-worship.png";

const CART_STORAGE_KEY = "gpt_tanjungpriok_shop_cart_v2";
const DEFAULT_SHIPPING_COST = 15000;
const SERVER_URL = (import.meta.env.VITE_SERVER_URL || "http://localhost:5001").replace(/\/$/, "");

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

function normalizeStoredImageUrl(imageUrl) {
  if (typeof imageUrl !== "string") return "";

  const assetsPathIndex = imageUrl.indexOf("/assets/");
  if (assetsPathIndex >= 0) {
    return imageUrl.slice(assetsPathIndex);
  }

  const srcPathIndex = imageUrl.indexOf("/src/");
  if (srcPathIndex >= 0) {
    return imageUrl.slice(srcPathIndex);
  }

  return imageUrl;
}

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [failedImageKeys, setFailedImageKeys] = useState(new Set());
  const [shippingCost, setShippingCost] = useState(DEFAULT_SHIPPING_COST);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
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

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
      const normalizedSaved = Array.isArray(saved)
        ? saved.map((item) => ({
            ...item,
            image: normalizeStoredImageUrl(item?.image),
          }))
        : [];
      setCartItems(normalizedSaved);
      setSelectedItems(new Set(normalizedSaved.map((_, i) => i)));
    } catch {
      setCartItems([]);
    }
  }, []);

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

  const isPickupAtChurch = checkoutForm.shippingMethod.toLowerCase().includes("ambil");
  const shipping = selectedItemsList.length > 0 ? (isPickupAtChurch ? 0 : shippingCost) : 0;
  const grandTotal = subtotal + shipping;

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
    const qty = Math.max(1, Math.min(Number(newQuantity) || 1, cartItems[index].stock || 99));
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
  };

  // Process checkout
  const proceedCheckout = () => {
    if (selectedItemsList.length === 0) {
      setCheckoutError("Pilih minimal 1 produk untuk checkout");
      return;
    }
    if (!checkoutForm.name.trim()) {
      setCheckoutError("Nama lengkap wajib diisi");
      return;
    }
    if (!checkoutForm.phone.trim()) {
      setCheckoutError("No. WhatsApp wajib diisi");
      return;
    }
    if (!checkoutForm.address.trim()) {
      setCheckoutError("Alamat wajib diisi");
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const message = [
        "Shalom GTshirt, saya ingin pesan kaos rohani:",
        "",
        ...selectedItemsList.map(
          (item, idx) =>
            `${idx + 1}. ${item.name} | Size ${item.size} | ${item.color} | Qty ${item.quantity} | ${formatRupiah(item.price * item.quantity)}`
        ),
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

      const whatsappUrl = `https://wa.me/6282118223784?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      setCheckoutInfo("✓ Pesanan dikirim ke WhatsApp. Tunggu konfirmasi dari tim.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div>
        <PageHero title="Keranjang Belanja" subtitle="Lihat dan kelola pesanan Anda" image={cartHeroImage} />
        <div className="page-stack space-y-6">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-12 text-center dark:border-brand-700 dark:bg-brand-900/30">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm dark:bg-brand-900 dark:text-brand-300">
              <svg
                className="h-7 w-7"
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
            </div>
            <p className="mt-4 text-lg font-semibold text-brand-600 dark:text-brand-300">
              Keranjang belanja kosong
            </p>
            <p className="mt-2 text-sm text-brand-500 dark:text-brand-400">
              Mulai belanja dan tambahkan produk ke keranjang
            </p>
            <Link to="/shop" className="btn-primary mt-6 inline-block">
              ← Lanjut Belanja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero title="Keranjang Belanja" subtitle="Lihat dan kelola pesanan Anda" image={cartHeroImage} />

      <div className="page-stack grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Left: Cart Items ──────────────────── */}
        <section className="space-y-4">
          {/* Header */}
          <div className="rounded-2xl border border-brand-200 bg-white/90 p-4 dark:border-brand-700 dark:bg-brand-900/50">
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                  onChange={toggleAllItems}
                  className="h-5 w-5 rounded border-brand-300 text-primary"
                />
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                  Pilih Semua ({selectedItems.size}/{cartItems.length})
                </span>
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
                className="text-xs font-semibold text-rose-500 transition hover:text-rose-600 disabled:opacity-50"
              >
                Hapus Terpilih
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="space-y-3">
            {cartItems.map((item, index) => {
              const imageSrc = resolveImageUrl(item.image);
              const isImageBroken = failedImageKeys.has(item.variantKey);

              return (
                <div
                  key={item.variantKey}
                  className="rounded-2xl border border-brand-200 bg-white/90 p-4 dark:border-brand-700 dark:bg-brand-900/50"
                >
                  <div className="flex gap-4">
                    {/* Checkbox */}
                    <label className="flex items-start pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(index)}
                        onChange={() => toggleItemSelect(index)}
                        className="h-5 w-5 rounded border-brand-300 text-primary mt-1"
                      />
                    </label>

                    {/* Image */}
                    <div className="flex-shrink-0">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-800/40">
                        {imageSrc && !isImageBroken ? (
                          <img
                            src={imageSrc}
                            alt={item.name}
                            onError={() =>
                              setFailedImageKeys((previous) => new Set(previous).add(item.variantKey))
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-400 dark:text-brand-500">
                            No Image
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 font-semibold text-brand-900 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                        Size <span className="font-semibold">{item.size}</span> · {item.color}
                      </p>
                      <p className="mt-2 text-sm font-bold text-primary">
                        {formatRupiah(item.price)}
                      </p>
                    </div>

                    {/* Price & Remove */}
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-sm font-bold text-brand-900 dark:text-white">
                        {formatRupiah(item.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="mt-4 flex items-center justify-between border-t border-brand-200 pt-4 dark:border-brand-700">
                    <span className="text-xs text-brand-600 dark:text-brand-400">Jumlah</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="rounded-lg border border-brand-200 px-2 py-1 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-800/40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock || 99}
                        className="input-modern !w-16 !py-1.5 text-center text-sm"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, e.target.value)}
                      />
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="rounded-lg border border-brand-200 px-2 py-1 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-800/40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* GTshirt Info */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              ℹ️ Toko GTshirt Official
            </p>
            <p className="mt-2 text-xs leading-relaxed text-blue-600 dark:text-blue-400">
              Cotton Combed 24s • Unisex fit • High-quality printing • Sistem pre-order • Estimasi 5 hari kerja
            </p>
          </div>

          {/* Checkout Form */}
          <div
            id="checkout-form"
            className="rounded-2xl border border-brand-200 bg-white/90 p-5 dark:border-brand-700 dark:bg-brand-900/50 space-y-4"
          >
            <h4 className="font-bold text-brand-900 dark:text-white">Lengkapi Data Checkout</h4>
            <p className="text-xs text-brand-600 dark:text-brand-400">
              Setelah cek produk di keranjang, isi data pemesan untuk lanjut pesan via WhatsApp.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nama lengkap"
                className="input-modern"
                value={checkoutForm.name}
                onChange={(e) => handleCheckoutField("name", e.target.value)}
              />
              <input
                type="tel"
                placeholder="No. WhatsApp"
                className="input-modern"
                value={checkoutForm.phone}
                onChange={(e) => handleCheckoutField("phone", e.target.value)}
              />
              <textarea
                placeholder="Alamat lengkap pengiriman"
                className="input-modern min-h-[80px] resize-y"
                value={checkoutForm.address}
                onChange={(e) => handleCheckoutField("address", e.target.value)}
              />
              <select
                className="input-modern"
                value={checkoutForm.shippingMethod}
                onChange={(e) => handleCheckoutField("shippingMethod", e.target.value)}
              >
                <option>Kurir Jabodetabek</option>
                <option>Ambil di Gereja</option>
              </select>
              <select
                className="input-modern"
                value={checkoutForm.paymentMethod}
                onChange={(e) => handleCheckoutField("paymentMethod", e.target.value)}
              >
                <option>Transfer Bank</option>
                <option>QRIS</option>
                <option>Bayar Tunai di Gereja</option>
              </select>
              <input
                type="text"
                placeholder="Catatan (opsional)"
                className="input-modern text-sm"
                value={checkoutForm.notes}
                onChange={(e) => handleCheckoutField("notes", e.target.value)}
              />
            </div>

            {checkoutError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/80 dark:bg-rose-900/30 dark:text-rose-300">
                {checkoutError}
              </p>
            )}

            {checkoutInfo && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-900/30 dark:text-emerald-300">
                {checkoutInfo}
              </p>
            )}

            <button
              onClick={proceedCheckout}
              disabled={isSubmittingOrder || selectedItemsList.length === 0}
              className="w-full bg-primary px-4 py-2.5 rounded-lg text-white font-semibold transition hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmittingOrder ? "Processing..." : "Pesan via WhatsApp"}
            </button>
          </div>
        </section>

        {/* ── Right: Checkout Summary ──────────────────── */}
        <aside className="sticky top-24 h-fit">
          {/* Summary Card */}
          <div className="rounded-2xl border border-brand-200 bg-white/90 p-5 dark:border-brand-700 dark:bg-brand-900/50 space-y-4">
            <h3 className="font-bold text-brand-900 dark:text-white">Ringkasan Pesanan</h3>

            <div className="space-y-3 border-b border-brand-200 pb-4 dark:border-brand-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-600 dark:text-brand-300">Subtotal ({selectedItemsList.length} item)</span>
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
            </div>

            <div className="flex items-center justify-between text-base font-bold">
              <span className="text-brand-900 dark:text-white">Total</span>
              <span className="text-2xl text-primary">{formatRupiah(grandTotal)}</span>
            </div>

            <div className="space-y-2">
              <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-600 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                Lengkapi data checkout di bagian bawah daftar produk.
              </p>

              <Link
                to="/shop"
                className="inline-flex w-full items-center justify-center rounded-xl border border-brand-300 bg-white/50 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-800/40"
              >
                ← Lanjut Belanja
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default CartPage;
