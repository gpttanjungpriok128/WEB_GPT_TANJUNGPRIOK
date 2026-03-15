export default function ProductsTab({ ctx }) {
  const {
    editingProductId,
    handleSaveProduct,
    productAccordion,
    toggleAccordion,
    productForm,
    productFieldErrors,
    nameInputRef,
    descriptionInputRef,
    basePriceInputRef,
    sizesInputRef,
    productFormSizes,
    productFormStockBySize,
    productFormTotalStock,
    productFormHasPreorderSizes,
    handleProductFormChange,
    handleStockBySizeChange,
    normalizeSizePayload,
    fileInputRef,
    imageDropRef,
    handleDropFiles,
    handleFileInputChange,
    existingImages,
    imagePreviews,
    removeExistingImage,
    removeNewImage,
    handlePreviewDragStart,
    handlePreviewDragOver,
    handlePreviewDrop,
    handlePreviewDragEnd,
    movePreview,
    savingProduct,
    resetProductForm,
    products,
    loadingProducts,
    productSearch,
    setProductSearch,
    productActiveFilter,
    setProductActiveFilter,
    PRODUCT_ACTIVE_OPTIONS,
    fetchProducts,
    fillProductForm,
    handleToggleProductStatus,
    handleDeleteProduct,
    resolveImageUrl,
    formatRupiah,
    filterOutXXL,
    normalizeSizeLabel,
  } = ctx;

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
      <article className="glass-card dense-card p-6">
        <h2 className="text-xl font-bold text-brand-900 dark:text-white">
          {editingProductId ? "Edit Produk GTshirt" : "Tambah Produk GTshirt"}
        </h2>

        <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 pb-24 sm:pb-0">
          <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
            <button
              type="button"
              onClick={() => toggleAccordion("basic")}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={productAccordion.basic}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  Informasi
                </p>
                <p className="text-sm font-bold text-brand-900 dark:text-white">
                  Detail Produk
                </p>
              </div>
              <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                {productAccordion.basic ? "−" : "+"}
              </span>
            </button>
            {productAccordion.basic && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Nama Produk *
                  </label>
                  <input
                    required
                    ref={nameInputRef}
                    className={`input-modern ${productFieldErrors.name ? "input-error" : ""}`}
                    value={productForm.name}
                    onChange={(event) => handleProductFormChange("name", event.target.value)}
                    placeholder="Contoh: Hope in Him Tee"
                    aria-invalid={Boolean(productFieldErrors.name)}
                  />
                  {productFieldErrors.name && (
                    <p className="text-[11px] font-semibold text-rose-500">
                      {productFieldErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Slug
                  </label>
                  <input
                    className="input-modern"
                    value={productForm.slug}
                    onChange={(event) => handleProductFormChange("slug", event.target.value)}
                    placeholder="auto dari nama jika kosong"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Deskripsi
                  </label>
                  <textarea
                    ref={descriptionInputRef}
                    className={`input-modern min-h-[86px] resize-y ${productFieldErrors.description ? "input-error" : ""}`}
                    value={productForm.description}
                    onChange={(event) => handleProductFormChange("description", event.target.value)}
                    placeholder="Deskripsi produk"
                    aria-invalid={Boolean(productFieldErrors.description)}
                  />
                  {productFieldErrors.description && (
                    <p className="text-[11px] font-semibold text-rose-500">
                      {productFieldErrors.description}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Warna
                  </label>
                  <input
                    className="input-modern"
                    value={productForm.color}
                    onChange={(event) => handleProductFormChange("color", event.target.value)}
                    placeholder="Jet Black"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
            <button
              type="button"
              onClick={() => toggleAccordion("media")}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={productAccordion.media}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  Media
                </p>
                <p className="text-sm font-bold text-brand-900 dark:text-white">
                  Foto Produk
                </p>
              </div>
              <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                {productAccordion.media ? "−" : "+"}
              </span>
            </button>
            {productAccordion.media && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                  📷 Foto Produk * (max 8 file, jpeg/png/webp, maks 2MB per file)
                </label>

                <div
                  ref={imageDropRef}
                  className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-4 transition hover:border-primary hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-900/30 dark:hover:border-primary ${productFieldErrors.images ? "input-error" : ""}`}
                  tabIndex={-1}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropFiles}
                >
                  <svg className="h-8 w-8 text-brand-400 dark:text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                  </svg>
                  <p className="text-sm text-brand-500 dark:text-brand-400">
                    <span className="font-semibold text-primary">Klik untuk pilih file</span> atau drag & drop
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
                {productFieldErrors.images && (
                  <p className="text-[11px] font-semibold text-rose-500">
                    {productFieldErrors.images}
                  </p>
                )}

                {existingImages.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-brand-500 dark:text-brand-400">
                      Gambar saat ini (tidak dikirim ulang jika tidak upload baru):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {existingImages.map((src, index) => (
                        <div key={`existing-${index}`} className="group relative">
                          <img
                            src={resolveImageUrl(src)}
                            alt={`Existing ${index + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-16 w-16 rounded-xl border border-brand-200 object-cover dark:border-brand-700 sm:h-20 sm:w-20"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imagePreviews.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-brand-500 dark:text-brand-400">
                      Foto baru yang akan diupload:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {imagePreviews.map((src, index) => (
                        <div
                          key={`new-${index}`}
                          className="group relative"
                          draggable
                          onDragStart={(event) => handlePreviewDragStart(index, event)}
                          onDragOver={handlePreviewDragOver}
                          onDrop={(event) => {
                            event.preventDefault();
                            handlePreviewDrop(index);
                          }}
                          onDragEnd={handlePreviewDragEnd}
                        >
                          <img
                            src={src}
                            alt={`Preview ${index + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-16 w-16 rounded-xl border border-brand-200 object-cover dark:border-brand-700 sm:h-20 sm:w-20"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(index)}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100"
                          >
                            ✕
                          </button>
                          <div className="image-reorder-controls sm:hidden">
                            <button type="button" onClick={() => movePreview(index, -1)}>◀</button>
                            <button type="button" onClick={() => movePreview(index, 1)}>▶</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
            <button
              type="button"
              onClick={() => toggleAccordion("stock")}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={productAccordion.stock}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  Harga & Stok
                </p>
                <p className="text-sm font-bold text-brand-900 dark:text-white">
                  Pengaturan Stok
                </p>
              </div>
              <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                {productAccordion.stock ? "−" : "+"}
              </span>
            </button>
            {productAccordion.stock && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Harga Dasar
                  </label>
                  <input
                    type="number"
                    min="0"
                    ref={basePriceInputRef}
                    className={`input-modern ${productFieldErrors.basePrice ? "input-error" : ""}`}
                    value={productForm.basePrice}
                    onChange={(event) => handleProductFormChange("basePrice", event.target.value)}
                    aria-invalid={Boolean(productFieldErrors.basePrice)}
                  />
                  {productFieldErrors.basePrice && (
                    <p className="text-[11px] font-semibold text-rose-500">
                      {productFieldErrors.basePrice}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Ukuran (pisahkan koma)
                  </label>
                  <input
                    ref={sizesInputRef}
                    className={`input-modern ${productFieldErrors.sizesText ? "input-error" : ""}`}
                    value={productForm.sizesText}
                    onChange={(event) => handleProductFormChange("sizesText", event.target.value)}
                    onBlur={() => {
                      const sanitized = normalizeSizePayload(productForm.sizesText);
                      handleProductFormChange("sizesText", sanitized.join(", "));
                    }}
                    placeholder="S, M, L, XL"
                    aria-invalid={Boolean(productFieldErrors.sizesText)}
                  />
                  <p className="text-[11px] text-brand-500 dark:text-brand-400">
                    XXL tidak tersedia. Ukuran di atas XL akan masuk preorder.
                  </p>
                  {productFormHasPreorderSizes && (
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                      Ukuran di atas XL terdeteksi — tandai sebagai preorder.
                    </p>
                  )}
                  {productFieldErrors.sizesText && (
                    <p className="text-[11px] font-semibold text-rose-500">
                      {productFieldErrors.sizesText}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                      Stok per Ukuran
                    </label>
                    <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                      Total stok: {productFormTotalStock}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {productFormSizes.map((size) => (
                      <label
                        key={size}
                        className="rounded-xl border border-brand-200 bg-white/70 p-2 text-xs dark:border-brand-700 dark:bg-brand-900/45"
                      >
                        <span className="mb-1 block font-semibold text-brand-700 dark:text-brand-300">
                          {size}
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="input-modern !py-2 !text-sm"
                          value={productFormStockBySize[size] ?? 0}
                          onChange={(event) => handleStockBySizeChange(size, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
            <button
              type="button"
              onClick={() => toggleAccordion("promo")}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={productAccordion.promo}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  Promo
                </p>
                <p className="text-sm font-bold text-brand-900 dark:text-white">
                  Harga Spesial
                </p>
              </div>
              <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                {productAccordion.promo ? "−" : "+"}
              </span>
            </button>
            {productAccordion.promo && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Jenis Promo
                  </label>
                  <select
                    className="input-modern"
                    value={productForm.promoType}
                    onChange={(event) => handleProductFormChange("promoType", event.target.value)}
                  >
                    <option value="none">Tanpa Promo</option>
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Potongan Nominal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Nilai Promo
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-modern"
                    value={productForm.promoValue}
                    onChange={(event) => handleProductFormChange("promoValue", event.target.value)}
                    disabled={productForm.promoType === "none"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Promo Mulai
                  </label>
                  <input
                    type="datetime-local"
                    className="input-modern min-w-0 w-full"
                    value={productForm.promoStartAt}
                    onChange={(event) => handleProductFormChange("promoStartAt", event.target.value)}
                    disabled={productForm.promoType === "none"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
                    Promo Selesai
                  </label>
                  <input
                    type="datetime-local"
                    className="input-modern min-w-0 w-full"
                    value={productForm.promoEndAt}
                    onChange={(event) => handleProductFormChange("promoEndAt", event.target.value)}
                    disabled={productForm.promoType === "none"}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand-200/80 bg-white/70 p-4 dark:border-brand-700/80 dark:bg-brand-900/40">
            <button
              type="button"
              onClick={() => toggleAccordion("status")}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={productAccordion.status}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                  Status
                </p>
                <p className="text-sm font-bold text-brand-900 dark:text-white">
                  Simpan Produk
                </p>
              </div>
              <span className="text-xl font-semibold text-brand-500 dark:text-brand-300">
                {productAccordion.status ? "−" : "+"}
              </span>
            </button>
            {productAccordion.status && (
              <div className="mt-4 space-y-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300">
                  <input
                    type="checkbox"
                    checked={productForm.isActive}
                    onChange={(event) => handleProductFormChange("isActive", event.target.checked)}
                  />
                  Produk aktif ditampilkan di katalog
                </label>

                <div className="admin-action-desktop flex flex-wrap gap-3">
                  <button type="submit" disabled={savingProduct} className="btn-primary !px-6 !py-2.5 disabled:opacity-60">
                    {savingProduct
                      ? "Menyimpan..."
                      : editingProductId
                        ? "Update Produk"
                        : "Tambah Produk"}
                  </button>
                  {editingProductId && (
                    <button type="button" onClick={resetProductForm} className="btn-outline !px-6 !py-2.5">
                      Batal Edit
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="admin-sticky-actions sm:hidden">
            <div className="admin-sticky-surface">
              <button type="submit" disabled={savingProduct} className="btn-primary min-h-[44px] flex-1 !px-4 !py-3 disabled:opacity-60">
                {savingProduct
                  ? "Menyimpan..."
                  : editingProductId
                    ? "Update Produk"
                    : "Tambah Produk"}
              </button>
              {editingProductId && (
                <button type="button" onClick={resetProductForm} className="btn-outline min-h-[44px] !px-4 !py-3">
                  Batal
                </button>
              )}
            </div>
          </div>
        </form>
      </article>

      <article className="glass-card dense-card p-6">
        <div className="admin-filter-card flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Cari Produk
            </label>
            <input
              className="input-modern"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Nama / slug"
            />
          </div>
          <div className="min-w-[180px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Status
            </label>
            <select
              className="input-modern"
              value={productActiveFilter}
              onChange={(event) => setProductActiveFilter(event.target.value)}
            >
              {PRODUCT_ACTIVE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => fetchProducts()}
            className="btn-primary !px-6 !py-2.5"
          >
            Terapkan
          </button>
        </div>

        <div className="admin-scroll-panel mt-4 max-h-[560px] space-y-4 overflow-auto pr-1">
          {loadingProducts && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`product-skeleton-${index}`}
                  className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl skeleton" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded-full skeleton" />
                      <div className="h-3 w-1/3 rounded-full skeleton" />
                    </div>
                    <div className="h-6 w-16 rounded-full skeleton" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="h-3 rounded-full skeleton" />
                    <div className="h-3 rounded-full skeleton" />
                    <div className="h-3 rounded-full skeleton" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingProducts && products.length === 0 && (
            <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
              Belum ada produk GTshirt.
            </div>
          )}
          {!loadingProducts &&
            products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
              >
                <div className="flex items-start gap-3">
                  {product.imageUrl && (
                    <img
                      src={resolveImageUrl(product.imageUrl)}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 flex-shrink-0 rounded-xl border border-brand-200 object-cover dark:border-brand-700"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-brand-900 dark:text-white">
                          {product.name}
                        </p>
                        <p className="text-xs text-brand-500 dark:text-brand-400">
                          {product.slug}
                        </p>
                      </div>
                      <span
                        className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                        }`}
                      >
                        {product.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-600 dark:text-brand-300">
                  <span>Harga: {formatRupiah(product.basePrice)}</span>
                  <span>Final: {formatRupiah(product.finalPrice)}</span>
                  <span>Stok: {product.stock}</span>
                  <span>
                    Size: {Array.isArray(product.sizes)
                      ? filterOutXXL(product.sizes).join("/") || "-"
                      : "-"}
                  </span>
                  <span>Foto: {Array.isArray(product.imageUrls) ? product.imageUrls.length : 0}</span>
                </div>
                {product.stockBySize && (
                  <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                    Stok per ukuran: {Object.entries(product.stockBySize)
                      .filter(([size]) => normalizeSizeLabel(size) !== "XXL")
                      .map(([size, qty]) => `${String(size).toUpperCase()}=${Number(qty) || 0}`)
                      .join(" • ")}
                  </p>
                )}
                {product.promoIsActive && (
                  <p className="mt-1 text-xs font-semibold text-primary">
                    Promo aktif: {product.promoLabel}
                  </p>
                )}
                <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => fillProductForm(product)}
                    className="min-h-[44px] rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleProductStatus(product, !product.isActive)}
                    className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                      product.isActive
                        ? "bg-rose-500 hover:bg-rose-600"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product)}
                    className="min-h-[44px] rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                  >
                    Hapus
                  </button>
                </div>
                <details className="mt-3 sm:hidden">
                  <summary className="admin-action-summary min-h-[44px] cursor-pointer rounded-xl border border-brand-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                    Aksi Produk
                  </summary>
                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      onClick={() => fillProductForm(product)}
                      className="min-h-[44px] rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleProductStatus(product, !product.isActive)}
                      className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                        product.isActive
                          ? "bg-rose-500 hover:bg-rose-600"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product)}
                      className="min-h-[44px] rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                    >
                      Hapus
                    </button>
                  </div>
                </details>
              </div>
            ))}
        </div>
      </article>
    </section>
  );
}
