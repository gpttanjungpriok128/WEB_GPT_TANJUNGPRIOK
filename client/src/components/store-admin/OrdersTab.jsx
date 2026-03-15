export default function OrdersTab({ ctx }) {
  const {
    orderSearch,
    setOrderSearch,
    orderStatusFilter,
    setOrderStatusFilter,
    setOrderPage,
    fetchOrders,
    handleClearOrders,
    selectAllOrders,
    clearSelectedOrders,
    bulkStatus,
    setBulkStatus,
    handleBulkStatusUpdate,
    printOrderLabels,
    selectedOrders,
    selectedOrderIds,
    orderListRef,
    setOrderScrollTop,
    loadingOrders,
    orders,
    orderPage,
    orderMeta,
    isLoadingMoreOrders,
    useVirtualOrders,
    orderPaddingTop,
    orderPaddingBottom,
    visibleOrders,
    orderRowMeasureRef,
    toggleOrderSelection,
    handleQuickOrderAction,
    setActiveOrderSheet,
    handleOrderStatusChange,
    printOrderLabel,
    statusBadge,
    mapOrderStatusLabel,
    formatDateTime,
    formatRupiah,
    ORDER_STATUS_OPTIONS,
    getQuickActionForOrder,
    analytics,
    setActiveTab,
    setScanError,
  } = ctx;

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <article className="glass-card dense-card p-6">
        <div className="admin-filter-card flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Cari Order
            </label>
            <input
              className="input-modern"
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Kode order / nama / nomor WA"
            />
          </div>
          <div className="min-w-[180px] space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-400">
              Status
            </label>
            <select
              className="input-modern"
              value={orderStatusFilter}
              onChange={(event) => setOrderStatusFilter(event.target.value)}
            >
              <option value="">Semua Status</option>
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setOrderPage(1);
              fetchOrders({ page: 1 });
            }}
            className="btn-primary !px-6 !py-2.5"
          >
            Terapkan
          </button>
          <button
            type="button"
            onClick={handleClearOrders}
            className="rounded-2xl border border-rose-500 bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:border-rose-600 hover:bg-rose-700 dark:border-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
          >
            Reset Semua Pesanan
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={selectAllOrders}
            className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("scan");
              setScanError("");
            }}
            className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/40"
          >
            Scan QR
          </button>
          <button
            type="button"
            onClick={clearSelectedOrders}
            className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-800/40"
          >
            Bersihkan
          </button>
          <select
            className="input-modern !py-2 text-xs"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value)}
          >
            <option value="">Pilih Status</option>
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkStatusUpdate}
            disabled={!bulkStatus || selectedOrders.length === 0}
            className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            Update Status ({selectedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => printOrderLabels(selectedOrders)}
            disabled={selectedOrders.length === 0}
            className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            Print Resi Terpilih ({selectedOrders.length})
          </button>
        </div>

        <div
          ref={orderListRef}
          onScroll={(event) => setOrderScrollTop(event.currentTarget.scrollTop)}
          className="admin-scroll-panel mt-4 max-h-[560px] space-y-4 overflow-auto pr-1"
        >
          {loadingOrders && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`order-skeleton-${index}`}
                  className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="h-3 w-32 rounded-full skeleton" />
                      <div className="h-3 w-40 rounded-full skeleton" />
                    </div>
                    <div className="h-6 w-20 rounded-full skeleton" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="h-3 rounded-full skeleton" />
                    <div className="h-3 rounded-full skeleton" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingOrders && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-brand-600 dark:border-brand-700 dark:text-brand-400">
              Belum ada order masuk.
            </div>
          )}
          {!loadingOrders && (
            <div style={{ paddingTop: orderPaddingTop, paddingBottom: orderPaddingBottom }}>
              {visibleOrders.map((order, index) => {
                const quickAction = getQuickActionForOrder(order);
                return (
                  <div
                    key={order.id}
                    ref={useVirtualOrders && index === 0 ? orderRowMeasureRef : null}
                    className="rounded-2xl border border-brand-200 bg-white/70 p-4 dark:border-brand-700 dark:bg-brand-900/45"
                  >
                    <div className="sm:hidden">
                      <details className="admin-order-details">
                        <summary className="admin-order-summary mobile-summary flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <label
                              className="flex items-center"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.has(order.id)}
                                onChange={() => toggleOrderSelection(order.id)}
                                className="h-4 w-4 rounded border-brand-300 text-primary"
                              />
                            </label>
                            <div>
                              <p className="text-sm font-bold text-brand-900 dark:text-white">
                                {order.orderCode}
                              </p>
                              <p className="text-[11px] text-brand-500 dark:text-brand-400">
                                {formatDateTime(order.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
                                {mapOrderStatusLabel(order.status)}
                              </span>
                              <p className="mt-1 text-xs font-semibold text-primary">
                                {formatRupiah(order.totalAmount)}
                              </p>
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
                        <div className="mt-3 space-y-2 text-xs text-brand-600 dark:text-brand-300">
                          <p>{order.customerName} • {order.customerPhone}</p>
                          {order.user?.email && (
                            <p className="text-[11px] text-brand-500 dark:text-brand-400">
                              Akun: {order.user.email}
                            </p>
                          )}
                          <p>{order.shippingMethod} • {order.paymentMethod}</p>
                          <p className="text-[11px] text-brand-500 dark:text-brand-400">
                            Potong stok: {order.stockDeductedAt ? `Sudah (${formatDateTime(order.stockDeductedAt)})` : "Belum"}
                          </p>
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <p className="text-[11px] text-brand-500 dark:text-brand-400">
                              {order.items.length} item • {order.items.map((item) => `${item.productName} (${item.size} x${item.quantity})`).join(", ")}
                            </p>
                          )}
                          {quickAction && (
                            <button
                              type="button"
                              onClick={() => handleQuickOrderAction(order, quickAction)}
                              className="btn-primary !w-full !py-2 !text-xs"
                            >
                              {quickAction.label}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveOrderSheet(order)}
                            className="admin-order-action"
                          >
                            Ubah Status
                          </button>
                          <button
                            type="button"
                            onClick={() => printOrderLabel(order)}
                            className="admin-order-action"
                          >
                            Print Resi
                          </button>
                        </div>
                      </details>
                    </div>

                    <div className="hidden sm:block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <label className="flex items-start pt-1">
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="h-4 w-4 rounded border-brand-300 text-primary"
                            />
                          </label>
                          <div>
                            <p className="text-sm font-bold text-brand-900 dark:text-white">
                              {order.orderCode}
                            </p>
                            <p className="text-xs text-brand-500 dark:text-brand-400">
                              {order.customerName} • {order.customerPhone}
                            </p>
                            {order.user?.email && (
                              <p className="text-[11px] text-brand-500 dark:text-brand-400">
                                Akun: {order.user.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
                          {mapOrderStatusLabel(order.status)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-brand-600 dark:text-brand-300">
                        {formatDateTime(order.createdAt)} • {order.shippingMethod} • {order.paymentMethod}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-primary">
                        Total: {formatRupiah(order.totalAmount)}
                      </div>
                      <div className="mt-1 text-[11px] text-brand-500 dark:text-brand-400">
                        Potong stok: {order.stockDeductedAt ? `Sudah (${formatDateTime(order.stockDeductedAt)})` : "Belum"}
                      </div>
                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <p className="mt-1 text-xs text-brand-500 dark:text-brand-400">
                          {order.items.length} item • {order.items.map((item) => `${item.productName} (${item.size} x${item.quantity})`).join(", ")}
                        </p>
                      )}

                      <div className="mt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {quickAction && (
                            <button
                              type="button"
                              onClick={() => handleQuickOrderAction(order, quickAction)}
                              className="rounded-xl border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
                            >
                              {quickAction.label}
                            </button>
                          )}
                          <select
                            className="input-modern !py-2 text-xs"
                            value={order.status}
                            onChange={(event) =>
                              handleOrderStatusChange(order.id, event.target.value)
                            }
                          >
                            {ORDER_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => printOrderLabel(order)}
                            className="rounded-xl border border-brand-200 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-200 dark:hover:bg-brand-800/40"
                          >
                            Print Resi
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loadingOrders && orderPage < orderMeta.totalPages && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fetchOrders({ page: orderPage + 1, append: true })}
                disabled={isLoadingMoreOrders}
                className="btn-outline !px-4 !py-2 text-xs disabled:opacity-60"
              >
                {isLoadingMoreOrders ? "Memuat..." : "Muat Order Lainnya"}
              </button>
            </div>
          )}
        </div>
      </article>

      <article className="glass-card dense-card p-6">
        <h3 className="text-lg font-bold text-brand-900 dark:text-white">
          Top Produk Terlaris
        </h3>
        <div className="mt-4 space-y-2">
          {!analytics?.topProducts?.length && (
            <p className="text-sm text-brand-600 dark:text-brand-400">
              Belum ada data penjualan produk.
            </p>
          )}
          {analytics?.topProducts?.map((item) => (
            <div
              key={item.productName}
              className="rounded-xl border border-brand-200 bg-white/70 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900/45"
            >
              <p className="font-semibold text-brand-900 dark:text-white">{item.productName}</p>
              <p className="text-xs text-brand-500 dark:text-brand-400">
                Terjual: {item.soldQty} • Revenue: {formatRupiah(item.revenue)}
              </p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-lg font-bold text-brand-900 dark:text-white">
          Revenue per Status
        </h3>
        <div className="mt-3 space-y-2">
          {!analytics?.revenueByStatus && (
            <p className="text-sm text-brand-600 dark:text-brand-400">
              Belum ada data revenue.
            </p>
          )}
          {analytics?.revenueByStatus &&
            Object.entries(analytics.revenueByStatus).map(([status, amount]) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-xl border border-brand-200 bg-white/70 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900/45"
              >
                <span className="font-medium text-brand-700 dark:text-brand-300">
                  {mapOrderStatusLabel(status)}
                </span>
                <span className="font-semibold text-brand-900 dark:text-white">
                  {formatRupiah(amount)}
                </span>
              </div>
            ))}
        </div>
      </article>
    </section>
  );
}
