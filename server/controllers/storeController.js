const fs = require('fs');
const path = require('path');
const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  StoreProduct,
  StoreOrder,
  StoreOrderItem,
  StoreProductReview,
  StoreSetting,
  User
} = require('../models');
const { isCloudinaryConfigured, uploadLocalImageToCloudinary } = require('../services/cloudinaryService');
const { syncRevenueReportToSheet, isSheetsConfigured } = require('../services/sheetsService');
const { invalidateCache } = require('../middleware/cacheMiddleware');
const {
  ORDER_STATUSES,
  canTransitionOrderStatus,
  isReviewableOrderStatus,
  buildOrderStatusTransitionError
} = require('../utils/storeOrderStatus');

const DEFAULT_SHIPPING_COST = 15000;
const ORDER_CODE_LOCK_KEY = 91327014;
const STORE_WHATSAPP_NUMBER = String(
  process.env.STORE_WHATSAPP_NUMBER || '6282118223784' // Format: +62 821-1822-3784
).replace(/\D/g, '');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const STORE_PRODUCT_CLOUDINARY_FOLDER = process.env.CLOUDINARY_PRODUCT_FOLDER || 'gpt-tanjungpriok/products';
const STORE_REVIEW_CLOUDINARY_FOLDER = process.env.CLOUDINARY_REVIEW_FOLDER || 'gpt-tanjungpriok/reviews';
let storeOrderColumnSetPromise = null;

function toColumnSet(columns = []) {
  if (columns instanceof Set) {
    return columns;
  }

  return new Set(Array.isArray(columns) ? columns : []);
}

function listStoreOrderAttributesForColumns(columns = []) {
  const columnSet = toColumnSet(columns);
  return Object.keys(StoreOrder.rawAttributes).filter((attribute) => columnSet.has(attribute));
}

function pickStoreOrderValuesForColumns(values = {}, columns = []) {
  const columnSet = toColumnSet(columns);

  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => value !== undefined && columnSet.has(key))
  );
}

async function getStoreOrderColumnSet() {
  if (!storeOrderColumnSetPromise) {
    storeOrderColumnSetPromise = sequelize.getQueryInterface()
      .describeTable(StoreOrder.getTableName())
      .then((table) => new Set(Object.keys(table || {})))
      .catch((error) => {
        storeOrderColumnSetPromise = null;
        throw error;
      });
  }

  return storeOrderColumnSetPromise;
}

async function getSafeStoreOrderAttributes(preferredAttributes = null) {
  const columnSet = await getStoreOrderColumnSet();
  const requestedAttributes = Array.isArray(preferredAttributes) && preferredAttributes.length > 0
    ? preferredAttributes
    : Object.keys(StoreOrder.rawAttributes);

  return requestedAttributes.filter((attribute) => columnSet.has(attribute));
}

async function hasStoreOrderColumn(columnName) {
  const columnSet = await getStoreOrderColumnSet();
  return columnSet.has(columnName);
}

async function buildStoreOrderPayload(values = {}) {
  const columnSet = await getStoreOrderColumnSet();
  return pickStoreOrderValuesForColumns(values, columnSet);
}

async function buildStoreOrderMutationOptions(transaction = null, extraOptions = {}) {
  const options = { ...extraOptions };
  if (transaction) {
    options.transaction = transaction;
  }

  const returning = await getSafeStoreOrderAttributes();
  if (returning.length > 0) {
    options.returning = returning;
  }

  return options;
}

function invalidateStoreCatalogCache() {
  invalidateCache((key) => key.includes('/store/products'));
}

function getUploadedFiles(req) {
  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.files && typeof req.files === 'object') {
    const files = [];
    Object.values(req.files).forEach((value) => {
      if (Array.isArray(value)) files.push(...value);
    });
    return files;
  }

  if (req.file) {
    return [req.file];
  }

  return [];
}

function isRemoteUrl(value) {
  return String(value).startsWith('http://') || String(value).startsWith('https://');
}

async function removeTempUpload(file) {
  if (!file?.path || isRemoteUrl(file.path)) {
    return;
  }

  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function discardUploadedFiles(files = []) {
  for (const file of files) {
    try {
      await removeTempUpload(file);
    } catch {
      // ignore temp cleanup errors
    }
  }
}

async function toPublicImagePath(file, folder = STORE_PRODUCT_CLOUDINARY_FOLDER) {
  if (!file) {
    return null;
  }

  if (!isCloudinaryConfigured()) {
    return `/uploads/${file.filename}`;
  }

  try {
    return await uploadLocalImageToCloudinary(file.path, { folder });
  } finally {
    await removeTempUpload(file);
  }
}

async function resolveUploadedImagePaths(files = [], folder) {
  const uploadedPaths = [];
  for (const file of files) {
    const publicPath = await toPublicImagePath(file, folder);
    if (publicPath) {
      uploadedPaths.push(publicPath);
    }
  }
  return uploadedPaths;
}

function normalizeProductImages(product) {
  if (!product) return [];

  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    return product.imageUrls.filter(Boolean);
  }

  if (product.imageUrl) {
    return [product.imageUrl];
  }

  return [];
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getPublicAppUrl(req) {
  const envUrl = normalizeBaseUrl(
    process.env.PUBLIC_APP_URL
      || process.env.APP_PUBLIC_URL
      || process.env.FRONTEND_URL
      || ''
  );
  if (envUrl) return envUrl;
  const origin = normalizeBaseUrl(req?.get?.('origin'));
  if (origin) return origin;
  const referer = req?.get?.('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      const refOrigin = normalizeBaseUrl(url.origin);
      if (refOrigin) return refOrigin;
    } catch {
      // ignore
    }
  }
  const host = req?.get?.('x-forwarded-host') || req?.get?.('host');
  if (!host) return '';
  const proto = req?.get?.('x-forwarded-proto') || req?.protocol || 'https';
  return normalizeBaseUrl(`${proto}://${host}`);
}

function buildInvoiceLink(appUrl, orderCode) {
  if (!appUrl || !orderCode) return '';
  return `${appUrl}/track-order?orderCode=${encodeURIComponent(orderCode)}&mode=invoice`;
}

async function removeImageFile(publicPath) {
  if (!publicPath) return;

  if (isRemoteUrl(publicPath)) {
    return;
  }

  // Only remove local disk storage files
  const fileName = path.basename(String(publicPath));
  if (!fileName) return;

  const filePath = path.join(uploadsDir, fileName);
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function removeImageFiles(paths = []) {
  for (const publicPath of paths) {
    // ignore remove errors so product operation still succeeds
    try {
      await removeImageFile(publicPath);
    } catch {
      // noop
    }
  }
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizePhone(value = '') {
  return String(value).replace(/[^\d+]/g, '').trim();
}

function normalizeSizes(value) {
  const fallback = ['S', 'M', 'L', 'XL', 'XXL'];
  const source = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const unique = [...new Set(source.map((item) => item.toUpperCase()))];
  return unique.length ? unique : fallback;
}

function parseStockBySizeInput(value) {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return null;
}

function parsePriceBySizeInput(value) {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return null;
}

function distributeStockBySize(totalStock, sizes) {
  const safeSizes = normalizeSizes(sizes);
  const safeTotal = Math.max(0, Number(totalStock) || 0);
  const perSize = safeSizes.length > 0 ? Math.floor(safeTotal / safeSizes.length) : 0;
  let remainder = safeSizes.length > 0 ? safeTotal % safeSizes.length : 0;

  return safeSizes.reduce((accumulator, size) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    accumulator[size] = perSize + extra;
    return accumulator;
  }, {});
}

function normalizeStockBySize(stockBySizeValue, sizes, fallbackStock = 0) {
  const safeSizes = normalizeSizes(sizes);
  const source = parseStockBySizeInput(stockBySizeValue);

  if (!source) {
    return distributeStockBySize(fallbackStock, safeSizes);
  }

  const normalized = {};
  for (const size of safeSizes) {
    const matchedKey = Object.keys(source).find((key) => key.toUpperCase() === size);
    normalized[size] = Math.max(0, toInteger(matchedKey ? source[matchedKey] : 0, 0));
  }

  return normalized;
}

function normalizePriceBySize(priceBySizeValue, sizes, fallbackPrice = 0) {
  const safeSizes = normalizeSizes(sizes);
  const safeFallbackPrice = Math.max(0, toInteger(fallbackPrice, 0));
  const source = parsePriceBySizeInput(priceBySizeValue);

  if (!source) {
    return safeSizes.reduce((accumulator, size) => {
      accumulator[size] = safeFallbackPrice;
      return accumulator;
    }, {});
  }

  const normalized = {};
  for (const size of safeSizes) {
    const matchedKey = Object.keys(source).find((key) => key.toUpperCase() === size);
    normalized[size] = Math.max(
      0,
      toInteger(matchedKey ? source[matchedKey] : safeFallbackPrice, safeFallbackPrice)
    );
  }

  return normalized;
}

function compactPriceBySize(priceBySizeValue, sizes, fallbackPrice = 0) {
  const safeSizes = normalizeSizes(sizes);
  const safeFallbackPrice = Math.max(0, toInteger(fallbackPrice, 0));
  const normalized = normalizePriceBySize(priceBySizeValue, safeSizes, safeFallbackPrice);

  return safeSizes.reduce((accumulator, size) => {
    const price = Math.max(0, toInteger(normalized[size], safeFallbackPrice));
    if (price !== safeFallbackPrice) {
      accumulator[size] = price;
    }
    return accumulator;
  }, {});
}

function totalStockFromMap(stockBySize = {}) {
  return Object.values(stockBySize).reduce(
    (total, qty) => total + Math.max(0, toInteger(qty, 0)),
    0
  );
}

function getProductStockInfo(product) {
  const sizes = normalizeSizes(product?.sizes);
  const stockBySize = normalizeStockBySize(
    product?.stockBySize,
    sizes,
    Number(product?.stock) || 0
  );
  const totalStock = totalStockFromMap(stockBySize);

  return { sizes, stockBySize, totalStock };
}

function getProductPriceInfo(product, now = new Date()) {
  const sizes = normalizeSizes(product?.sizes);
  const fallbackBasePrice = Math.max(0, toInteger(product?.basePrice, 0));
  const priceBySize = normalizePriceBySize(
    product?.priceBySize,
    sizes,
    fallbackBasePrice
  );
  const finalPriceBySize = {};
  const basePriceValues = [];
  const finalPriceValues = [];

  for (const size of sizes) {
    const basePrice = Math.max(0, toInteger(priceBySize[size], fallbackBasePrice));
    const pricing = calculatePricingFromBasePrice(basePrice, product, now);
    finalPriceBySize[size] = pricing.finalPrice;
    basePriceValues.push(basePrice);
    finalPriceValues.push(pricing.finalPrice);
  }

  const minBasePrice = basePriceValues.length > 0
    ? Math.min(...basePriceValues)
    : fallbackBasePrice;
  const maxBasePrice = basePriceValues.length > 0
    ? Math.max(...basePriceValues)
    : fallbackBasePrice;
  const defaultPricing = calculatePricingFromBasePrice(fallbackBasePrice, product, now);
  const minFinalPrice = finalPriceValues.length > 0
    ? Math.min(...finalPriceValues)
    : defaultPricing.finalPrice;
  const maxFinalPrice = finalPriceValues.length > 0
    ? Math.max(...finalPriceValues)
    : defaultPricing.finalPrice;

  return {
    sizes,
    priceBySize,
    finalPriceBySize,
    minBasePrice,
    maxBasePrice,
    minFinalPrice,
    maxFinalPrice,
    hasPriceBySizeVariation: new Set(basePriceValues).size > 1
  };
}

function normalizeItemSize(value = '') {
  return String(value || '').trim().toUpperCase();
}

function buildClientError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function buildStockError(message) {
  return buildClientError(message);
}

function buildProductQuantityMap(items = []) {
  const quantityMap = {};

  for (const item of items) {
    const productId = Number(item?.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      continue;
    }

    if (!quantityMap[productId]) {
      quantityMap[productId] = {};
    }

    const size = normalizeItemSize(item.size);
    quantityMap[productId][size] = (quantityMap[productId][size] || 0) + Math.max(0, toInteger(item.quantity, 0));
  }

  return quantityMap;
}

function restoreStockBySize(currentStockBySize, additionsBySize, sizes) {
  const safeSizes = normalizeSizes(sizes);
  const nextStockBySize = { ...currentStockBySize };
  let unmatchedQuantity = 0;

  for (const [rawSize, rawQty] of Object.entries(additionsBySize || {})) {
    const additionQty = Math.max(0, toInteger(rawQty, 0));
    if (additionQty <= 0) {
      continue;
    }

    const size = normalizeItemSize(rawSize);
    if (size && safeSizes.includes(size)) {
      nextStockBySize[size] = Math.max(0, toInteger(nextStockBySize[size], 0)) + additionQty;
      continue;
    }

    unmatchedQuantity += additionQty;
  }

  if (unmatchedQuantity > 0 && safeSizes.length > 0) {
    const distributedAdditions = distributeStockBySize(unmatchedQuantity, safeSizes);
    for (const size of safeSizes) {
      nextStockBySize[size] = Math.max(0, toInteger(nextStockBySize[size], 0))
        + Math.max(0, toInteger(distributedAdditions[size], 0));
    }
  }

  return {
    stockBySize: nextStockBySize,
    stock: totalStockFromMap(nextStockBySize)
  };
}

function subtractStockBySize(currentStockBySize, deductionsBySize, sizes) {
  const safeSizes = normalizeSizes(sizes);
  const nextStockBySize = { ...currentStockBySize };

  for (const size of safeSizes) {
    const currentQty = Math.max(0, toInteger(nextStockBySize[size], 0));
    const deductionQty = Math.max(0, toInteger(deductionsBySize[size], 0));
    nextStockBySize[size] = Math.max(0, currentQty - deductionQty);
  }

  return {
    stockBySize: nextStockBySize,
    stock: totalStockFromMap(nextStockBySize)
  };
}

function reserveStockBySize(product, deductionsBySize = {}) {
  const { sizes, stockBySize, totalStock } = getProductStockInfo(product);
  const nextStockBySize = { ...stockBySize };
  const unknownDeductions = [];
  let knownDeductionTotal = 0;

  for (const [rawSize, rawQty] of Object.entries(deductionsBySize || {})) {
    const size = normalizeItemSize(rawSize);
    const deductionQty = Math.max(0, toInteger(rawQty, 0));

    if (deductionQty <= 0) {
      continue;
    }

    if (!size || !sizes.includes(size)) {
      unknownDeductions.push({ size, qty: deductionQty });
      continue;
    }

    const currentSizeStock = Math.max(0, toInteger(nextStockBySize[size], 0));
    if (deductionQty > currentSizeStock) {
      throw buildStockError(`Stok ${product.name} ukuran ${size} tidak mencukupi untuk pesanan ini`);
    }

    nextStockBySize[size] = Math.max(0, currentSizeStock - deductionQty);
    knownDeductionTotal += deductionQty;
  }

  if (unknownDeductions.length > 0) {
    const unknownTotal = unknownDeductions.reduce((sum, item) => sum + item.qty, 0);
    const remainingStock = Math.max(0, totalStock - knownDeductionTotal);
    if (unknownTotal > remainingStock) {
      throw buildStockError(`Stok ${product.name} tidak mencukupi untuk pesanan ini`);
    }

    const sizeEntries = sizes
      .map((size) => ({
        size,
        stock: Math.max(0, toInteger(nextStockBySize[size], 0))
      }))
      .sort((a, b) => b.stock - a.stock);

    let remaining = unknownTotal;
    for (const entry of sizeEntries) {
      if (remaining <= 0) break;
      const available = Math.max(0, toInteger(nextStockBySize[entry.size], 0));
      const deduction = Math.min(available, remaining);
      nextStockBySize[entry.size] = Math.max(0, available - deduction);
      remaining -= deduction;
    }

    if (remaining > 0) {
      throw buildStockError(`Stok ${product.name} tidak mencukupi untuk pesanan ini`);
    }
  }

  return {
    stockBySize: nextStockBySize,
    stock: totalStockFromMap(nextStockBySize)
  };
}

async function reserveStockForOrderItems(items = [], transaction) {
  const deductionsByProduct = buildProductQuantityMap(items);
  const productIds = Object.keys(deductionsByProduct)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (productIds.length === 0) {
    return false;
  }

  const products = await StoreProduct.findAll({
    where: { id: productIds },
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const [productIdText, deductionsBySize] of Object.entries(deductionsByProduct)) {
    const product = productMap.get(Number(productIdText));
    if (!product) {
      throw buildStockError('Produk pada order sudah tidak ditemukan');
    }

    const reservedStock = reserveStockBySize(product, deductionsBySize);
    await product.update(
      {
        stockBySize: reservedStock.stockBySize,
        stock: reservedStock.stock
      },
      { transaction }
    );
  }

  return true;
}

async function restoreStockForOrderItems(items = [], transaction, options = {}) {
  const { allowMissingProducts = false } = options;
  const additionsByProduct = buildProductQuantityMap(items);
  const productIds = Object.keys(additionsByProduct)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (productIds.length === 0) {
    return false;
  }

  const products = await StoreProduct.findAll({
    where: { id: productIds },
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
  let didMutateCatalog = false;

  for (const [productIdText, additionsBySize] of Object.entries(additionsByProduct)) {
    const product = productMap.get(Number(productIdText));
    if (!product) {
      if (allowMissingProducts) {
        continue;
      }
      throw buildStockError('Produk pada order sudah tidak ditemukan');
    }

    const { sizes, stockBySize } = getProductStockInfo(product);
    const restoredStock = restoreStockBySize(stockBySize, additionsBySize, sizes);
    await product.update(
      {
        stockBySize: restoredStock.stockBySize,
        stock: restoredStock.stock
      },
      { transaction }
    );
    didMutateCatalog = true;
  }

  return didMutateCatalog;
}

function toInteger(value, defaultValue = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function toBoolean(value, defaultValue = true) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRevenueFilters(source = {}) {
  const status = String(source.status || 'all').trim().toLowerCase();
  const channel = String(source.channel || 'all').trim().toLowerCase();
  const startDate = parseDateValue(source.startDate);
  const endDateRaw = parseDateValue(source.endDate);
  const endDate = endDateRaw
    ? new Date(
      endDateRaw.getFullYear(),
      endDateRaw.getMonth(),
      endDateRaw.getDate(),
      23,
      59,
      59,
      999
    )
    : null;

  return { status, channel, startDate, endDate };
}

function buildRevenueReportWhere(filters = {}) {
  const { status, channel, startDate, endDate } = filters;
  const where = {};

  if (!status || status === 'all') {
    where.status = { [Op.ne]: 'cancelled' };
  } else {
    if (!ORDER_STATUSES.includes(status)) {
      const error = new Error('Status laporan tidak valid');
      error.statusCode = 400;
      throw error;
    }
    where.status = status;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = startDate;
    if (endDate) where.createdAt[Op.lte] = endDate;
  }

  if (channel && channel !== 'all') {
    where.channel = channel;
  }

  return where;
}

async function buildRevenueReport(filters = {}) {
  const where = buildRevenueReportWhere(filters);

  const orders = await StoreOrder.findAll({
    attributes: await getSafeStoreOrderAttributes(),
    where,
    include: [{ model: StoreOrderItem, as: 'items' }],
    order: [['createdAt', 'ASC']]
  });

  const rows = orders.map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    const itemsSummary = items.map((item) => (
      `${item.productName} (${item.size} x${item.quantity})`
    )).join(', ');

    return {
      id: order.id,
      orderCode: order.orderCode,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      channel: order.channel,
      shippingMethod: order.shippingMethod,
      paymentMethod: order.paymentMethod,
      cashierName: order.cashierName || '',
      subtotal: Number(order.subtotal) || 0,
      shippingCost: Number(order.shippingCost) || 0,
      totalAmount: Number(order.totalAmount) || 0,
      amountPaid: getOrderAmountPaid(order),
      changeAmount: getOrderChangeAmount(order),
      itemCount,
      itemsSummary,
      reversedAt: order.reversedAt,
      reversalType: order.reversalType || '',
      reversalReason: order.reversalReason || ''
    };
  });

  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.totalRevenue += row.totalAmount;
      accumulator.totalOrders += 1;
      accumulator.totalItems += row.itemCount;
      accumulator.totalShipping += row.shippingCost;
      accumulator.totalSubtotal += row.subtotal;
      return accumulator;
    },
    {
      totalRevenue: 0,
      totalOrders: 0,
      totalItems: 0,
      totalShipping: 0,
      totalSubtotal: 0
    }
  );

  const averageOrderValue = totals.totalOrders > 0
    ? Math.round(totals.totalRevenue / totals.totalOrders)
    : 0;

  return {
    rows,
    meta: {
      ...totals,
      averageOrderValue
    }
  };
}

function shouldAutoSyncSheets() {
  return String(process.env.GOOGLE_SHEETS_AUTO_SYNC || '').toLowerCase() === 'true';
}

function triggerRevenueSheetSync(filters = {}) {
  if (!shouldAutoSyncSheets() || !isSheetsConfigured()) return;

  setImmediate(async () => {
    try {
      const report = await buildRevenueReport(filters);
      await syncRevenueReportToSheet({
        rows: report.rows,
        meta: report.meta,
        filters
      });
    } catch (error) {
      console.error('Sheets sync failed:', error.message);
    }
  });
}

function isPromoActive(product, now = new Date()) {
  if (!product || product.promoType === 'none' || Number(product.promoValue) <= 0) {
    return false;
  }

  if (product.promoStartAt && new Date(product.promoStartAt) > now) {
    return false;
  }

  if (product.promoEndAt && new Date(product.promoEndAt) < now) {
    return false;
  }

  return true;
}

function calculatePricingFromBasePrice(basePriceValue, product, now = new Date()) {
  const basePrice = Math.max(0, Number(basePriceValue) || 0);
  const promoIsActive = isPromoActive(product, now);

  if (!promoIsActive) {
    return {
      basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      promoIsActive: false,
      promoLabel: ''
    };
  }

  let discountAmount = 0;
  if (product.promoType === 'percentage') {
    discountAmount = Math.round((basePrice * Math.max(0, Number(product.promoValue) || 0)) / 100);
  } else if (product.promoType === 'fixed') {
    discountAmount = Math.max(0, Number(product.promoValue) || 0);
  }

  discountAmount = Math.min(basePrice, discountAmount);
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const promoLabel = product.promoType === 'percentage'
    ? `${product.promoValue}% OFF`
    : `Diskon ${formatRupiah(discountAmount)}`;

  return {
    basePrice,
    finalPrice,
    discountAmount,
    promoIsActive: true,
    promoLabel
  };
}

function calculateProductPricing(product, options = {}) {
  const { size = '', now = new Date(), priceInfo = null } = options;
  const normalizedSize = normalizeItemSize(size);
  const resolvedPriceInfo = priceInfo || getProductPriceInfo(product, now);
  const fallbackBasePrice = Math.max(0, Number(product?.basePrice) || 0);
  const hasSizePrice = normalizedSize
    && Object.prototype.hasOwnProperty.call(resolvedPriceInfo.priceBySize, normalizedSize);
  const basePrice = hasSizePrice
    ? Math.max(0, Number(resolvedPriceInfo.priceBySize[normalizedSize]) || 0)
    : fallbackBasePrice;

  return calculatePricingFromBasePrice(basePrice, product, now);
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function isCashPaymentMethod(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;

  return normalized.includes('tunai') || normalized.includes('cash');
}

function isOfflineStoreChannel(value = '') {
  return String(value || '').trim().toLowerCase() === 'offline_store';
}

function resolveAdminPosPayment(paymentMethodValue, totalAmount, amountPaidValue) {
  const paymentMethod = String(paymentMethodValue || 'Tunai').trim() || 'Tunai';
  const safeTotalAmount = Math.max(0, toInteger(totalAmount, 0));

  if (!isCashPaymentMethod(paymentMethod)) {
    return {
      paymentMethod,
      amountPaid: safeTotalAmount,
      changeAmount: 0,
      isCash: false
    };
  }

  const amountPaid = Math.max(0, toInteger(amountPaidValue, safeTotalAmount));
  if (amountPaid < safeTotalAmount) {
    throw buildClientError('Nominal dibayar kurang dari total transaksi');
  }

  return {
    paymentMethod,
    amountPaid,
    changeAmount: Math.max(0, amountPaid - safeTotalAmount),
    isCash: true
  };
}

function normalizeReversalType(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'return') return 'return';
  return 'void';
}

function getOrderAmountPaid(order) {
  if (order?.amountPaid === null || order?.amountPaid === undefined) {
    return Number(order?.totalAmount) || 0;
  }

  return Number(order.amountPaid) || 0;
}

function getOrderChangeAmount(order) {
  return Number(order?.changeAmount) || 0;
}

function serializeProduct(product) {
  const pricing = calculateProductPricing(product);
  const priceInfo = getProductPriceInfo(product);
  const imageUrls = normalizeProductImages(product);
  const { sizes, stockBySize, totalStock } = getProductStockInfo(product);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    verse: product.verse || '',
    color: product.color || '',
    imageUrl: imageUrls[0] || '',
    imageUrls,
    basePrice: pricing.basePrice,
    finalPrice: pricing.finalPrice,
    discountAmount: pricing.discountAmount,
    promoType: product.promoType,
    promoValue: Number(product.promoValue) || 0,
    promoStartAt: product.promoStartAt,
    promoEndAt: product.promoEndAt,
    promoIsActive: pricing.promoIsActive,
    promoLabel: pricing.promoLabel,
    sizes,
    priceBySize: priceInfo.priceBySize,
    finalPriceBySize: priceInfo.finalPriceBySize,
    minBasePrice: priceInfo.minBasePrice,
    maxBasePrice: priceInfo.maxBasePrice,
    minFinalPrice: priceInfo.minFinalPrice,
    maxFinalPrice: priceInfo.maxFinalPrice,
    hasPriceBySizeVariation: priceInfo.hasPriceBySizeVariation,
    stockBySize,
    stock: totalStock,
    isActive: Boolean(product.isActive),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function normalizeReviewerName(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return 'Pembeli';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].slice(0, 1)}.`;
}

function serializeReview(review) {
  return {
    id: review.id,
    rating: Number(review.rating) || 0,
    reviewText: review.reviewText || '',
    imageUrls: Array.isArray(review.imageUrls) ? review.imageUrls.filter(Boolean) : [],
    reviewerName: normalizeReviewerName(review.reviewerName),
    createdAt: review.createdAt
  };
}

async function getReviewSummaryMap(productIds = []) {
  if (!productIds.length) return new Map();

  const rows = await StoreProductReview.findAll({
    attributes: [
      'productId',
      [fn('AVG', col('rating')), 'avgRating'],
      [fn('COUNT', col('id')), 'reviewCount']
    ],
    where: {
      productId: productIds,
      isApproved: true
    },
    group: ['productId'],
    raw: true
  });

  return new Map(
    rows.map((row) => [
      Number(row.productId),
      {
        average: Number(row.avgRating) || 0,
        count: Number(row.reviewCount) || 0
      }
    ])
  );
}

function serializeCustomerOrder(order) {
  const whatsappMessage = getOrderWhatsappMessage(order);

  return {
    id: order.id,
    orderCode: order.orderCode,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    cashierName: order.cashierName || '',
    notes: order.notes || '',
    subtotal: Number(order.subtotal) || 0,
    shippingCost: Number(order.shippingCost) || 0,
    totalAmount: Number(order.totalAmount) || 0,
    amountPaid: getOrderAmountPaid(order),
    changeAmount: getOrderChangeAmount(order),
    status: order.status,
    channel: order.channel,
    stockDeductedAt: order.stockDeductedAt,
    reversedAt: order.reversedAt,
    reversedBy: order.reversedBy || null,
    reversalType: order.reversalType || '',
    reversalReason: order.reversalReason || '',
    whatsappLink: buildWhatsappLink(whatsappMessage),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        size: item.size,
        color: item.color || '',
        unitPrice: Number(item.unitPrice) || 0,
        quantity: Number(item.quantity) || 0,
        lineTotal: Number(item.lineTotal) || 0,
        promoLabel: item.promoLabel || ''
      }))
      : []
  };
}

function buildProductPayload(body = {}, userId, options = {}) {
  const { partial = false } = options;
  const payload = {};

  if (!partial || body.name !== undefined) {
    payload.name = String(body.name || '').trim();
  }

  if (!partial || body.slug !== undefined || body.name !== undefined) {
    const slugSource = body.slug !== undefined ? body.slug : body.name;
    const generatedSlug = slugify(slugSource);
    if (generatedSlug) {
      payload.slug = generatedSlug;
    }
  }

  if (!partial || body.description !== undefined) {
    payload.description = body.description ? String(body.description).trim() : null;
  }

  if (!partial || body.verse !== undefined) {
    payload.verse = body.verse ? String(body.verse).trim() : null;
  }

  if (!partial || body.color !== undefined) {
    payload.color = body.color ? String(body.color).trim() : null;
  }

  if (!partial || body.basePrice !== undefined) {
    payload.basePrice = Math.max(0, toInteger(body.basePrice, 0));
  }

  if (!partial || body.promoType !== undefined) {
    payload.promoType = ['none', 'percentage', 'fixed'].includes(body.promoType)
      ? body.promoType
      : 'none';
  }

  if (!partial || body.promoValue !== undefined) {
    payload.promoValue = Math.max(0, toInteger(body.promoValue, 0));
  }

  if (!partial || body.promoStartAt !== undefined) {
    payload.promoStartAt = parseDateValue(body.promoStartAt);
  }

  if (!partial || body.promoEndAt !== undefined) {
    payload.promoEndAt = parseDateValue(body.promoEndAt);
  }

  if (!partial || body.sizes !== undefined) {
    payload.sizes = normalizeSizes(body.sizes);
  }

  if (!partial || body.stock !== undefined) {
    payload.stock = Math.max(0, toInteger(body.stock, 0));
  }

  if (!partial || body.isActive !== undefined) {
    payload.isActive = toBoolean(body.isActive, true);
  }

  if (payload.promoType === 'none') {
    payload.promoValue = 0;
    payload.promoStartAt = null;
    payload.promoEndAt = null;
  }

  if (!partial) {
    payload.createdBy = userId;
  }
  payload.updatedBy = userId;

  return payload;
}

function applyPriceConfiguration(payload, body = {}, existingProduct = null) {
  const sizes = normalizeSizes(payload.sizes ?? existingProduct?.sizes);
  const fallbackBasePrice = payload.basePrice !== undefined
    ? payload.basePrice
    : Math.max(0, toInteger(existingProduct?.basePrice, 0));
  const hasPriceBySize = body.priceBySize !== undefined;

  let priceBySize = null;

  if (hasPriceBySize) {
    priceBySize = compactPriceBySize(body.priceBySize, sizes, fallbackBasePrice);
  } else if (existingProduct) {
    priceBySize = compactPriceBySize(existingProduct.priceBySize, sizes, fallbackBasePrice);
  } else {
    priceBySize = compactPriceBySize(null, sizes, fallbackBasePrice);
  }

  payload.sizes = sizes;
  payload.priceBySize = priceBySize;
}

function applyStockConfiguration(payload, body = {}, existingProduct = null) {
  const sizes = normalizeSizes(payload.sizes ?? existingProduct?.sizes);
  const hasStockBySize = body.stockBySize !== undefined;
  const hasStock = payload.stock !== undefined;

  let stockBySize = null;

  if (hasStockBySize) {
    stockBySize = normalizeStockBySize(body.stockBySize, sizes, 0);
  } else if (hasStock) {
    stockBySize = distributeStockBySize(payload.stock, sizes);
  } else if (existingProduct) {
    stockBySize = normalizeStockBySize(
      existingProduct.stockBySize,
      sizes,
      Number(existingProduct.stock) || 0
    );
  } else {
    stockBySize = distributeStockBySize(0, sizes);
  }

  payload.sizes = sizes;
  payload.stockBySize = stockBySize;
  payload.stock = totalStockFromMap(stockBySize);
}

async function ensureUniqueSlug(slug, excludeId = null) {
  if (!slug) return false;

  const where = { slug };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const existing = await StoreProduct.findOne({ where, attributes: ['id'] });
  return !existing;
}

async function getOrCreateStoreSettings(transaction = null) {
  const [setting] = await StoreSetting.findOrCreate({
    where: { id: 1 },
    defaults: {
      id: 1,
      shippingCost: DEFAULT_SHIPPING_COST
    },
    transaction
  });

  return setting;
}

async function acquireOrderCodeLock(transaction) {
  if (!transaction || sequelize.getDialect() !== 'postgres') {
    return;
  }

  await sequelize.query('SELECT pg_advisory_xact_lock(:lockKey)', {
    transaction,
    replacements: { lockKey: ORDER_CODE_LOCK_KEY }
  });
}

async function generateOrderCode(transaction, options = {}) {
  const now = new Date();
  const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefixBase = String(options.prefixBase || 'GTS')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') || 'GTS';
  const prefix = `${prefixBase}-${dateCode}-`;
  await acquireOrderCodeLock(transaction);
  const latest = await StoreOrder.findOne({
    attributes: await getSafeStoreOrderAttributes(['id', 'orderCode', 'createdAt']),
    where: { orderCode: { [Op.like]: `${prefix}%` } },
    order: [['createdAt', 'DESC']],
    transaction
  });

  let sequence = 1;
  if (latest?.orderCode) {
    const lastPart = latest.orderCode.split('-').pop();
    const parsed = Number.parseInt(lastPart, 10);
    if (Number.isFinite(parsed)) {
      sequence = parsed + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

function buildWhatsappMessage(order, items, options = {}) {
  const invoiceUrl = options.invoiceUrl || '';
  const itemLines = items
    .map((item, index) => (
      `${index + 1}. ${item.productName} | Size ${item.size} | Qty ${item.quantity} | ${formatRupiah(item.lineTotal)}`
    ))
    .join('\n');

  const lines = [
    'Shalom GTshirt, saya ingin konfirmasi pesanan:',
    `Kode Pesanan: ${order.orderCode}`,
    '',
    itemLines,
    '',
    `Subtotal: ${formatRupiah(order.subtotal)}`,
    `Ongkir: ${formatRupiah(order.shippingCost)}`,
    `Total: ${formatRupiah(order.totalAmount)}`,
    ...(invoiceUrl ? ['', `Invoice: ${invoiceUrl}`] : []),
    '',
    'Data Pemesan:',
    `Nama: ${order.customerName}`,
    `No. WhatsApp: ${order.customerPhone}`,
    `Alamat: ${order.customerAddress}`,
    `Pengiriman: ${order.shippingMethod}`,
    `Pembayaran: ${order.paymentMethod}`,
    `Catatan: ${order.notes || '-'}`
  ];

  return lines.join('\n');
}

function buildWhatsappLink(message = '') {
  const safeMessage = String(message || '').trim();
  if (!safeMessage) return '';
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(safeMessage)}`;
}

function getOrderWhatsappMessage(order) {
  const savedMessage = String(order?.whatsappMessage || '').trim();
  if (savedMessage) {
    return savedMessage;
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) {
    return '';
  }

  return buildWhatsappMessage(order, items);
}

async function getPublicProducts(req, res, next) {
  try {
    const page = Math.max(1, toInteger(req.query.page, 1));
    const limit = Math.min(60, Math.max(1, toInteger(req.query.limit, 24)));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    const where = { isActive: true };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { color: { [Op.iLike]: `%${search}%` } },
        { verse: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const [{ rows: products, count }, settings] = await Promise.all([
      StoreProduct.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      }),
      getOrCreateStoreSettings()
    ]);

    const reviewSummaryMap = await getReviewSummaryMap(products.map((product) => product.id));
    const serializedProducts = products.map((product) => {
      const summary = reviewSummaryMap.get(product.id) || { average: 0, count: 0 };
      return {
        ...serializeProduct(product),
        ratingAverage: summary.average,
        ratingCount: summary.count
      };
    });

    return res.status(200).json({
      data: serializedProducts,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        shippingCost: Number(settings.shippingCost) || DEFAULT_SHIPPING_COST
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getPublicProductBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const product = await StoreProduct.findOne({
      where: { slug: String(slug).toLowerCase().trim(), isActive: true }
    });

    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    const [settings, reviewSummaryMap] = await Promise.all([
      getOrCreateStoreSettings(),
      getReviewSummaryMap([product.id])
    ]);
    const summary = reviewSummaryMap.get(product.id) || { average: 0, count: 0 };

    return res.status(200).json({
      data: {
        ...serializeProduct(product),
        ratingAverage: summary.average,
        ratingCount: summary.count
      },
      meta: {
        shippingCost: Number(settings.shippingCost) || DEFAULT_SHIPPING_COST
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getProductReviews(req, res, next) {
  try {
    const { slug } = req.params;
    const product = await StoreProduct.findOne({
      where: { slug: String(slug).toLowerCase().trim(), isActive: true }
    });

    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    const reviews = await StoreProductReview.findAll({
      where: {
        productId: product.id,
        isApproved: true
      },
      order: [['createdAt', 'DESC']]
    });

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const totalReviews = reviews.length;
    const totalScore = reviews.reduce((total, review) => {
      const rating = Math.min(5, Math.max(1, Number(review.rating) || 0));
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
      return total + rating;
    }, 0);
    const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(2)) : 0;

    return res.status(200).json({
      data: reviews.map(serializeReview),
      meta: {
        averageRating,
        totalReviews,
        ratingCounts
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function createProductReview(req, res, next) {
  const uploadedFiles = getUploadedFiles(req);
  let uploadedPaths = [];

  try {
    const { slug } = req.params;
    const product = await StoreProduct.findOne({
      where: { slug: String(slug).toLowerCase().trim(), isActive: true }
    });

    if (!product) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    const orderCode = String(req.body.orderCode || '').trim();
    const customerPhone = normalizePhone(req.body.phone);
    const rating = Math.min(5, Math.max(1, toInteger(req.body.rating, 0)));
    const reviewText = req.body.reviewText ? String(req.body.reviewText).trim() : null;

    const order = await StoreOrder.findOne({
      attributes: await getSafeStoreOrderAttributes([
        'id',
        'userId',
        'orderCode',
        'customerName',
        'customerPhone',
        'status'
      ]),
      where: {
        orderCode: { [Op.iLike]: orderCode },
        customerPhone
      },
      include: [{ model: StoreOrderItem, as: 'items' }]
    });

    if (!order) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(404).json({
        message: 'Order tidak ditemukan. Pastikan kode pesanan dan nomor WhatsApp sesuai.'
      });
    }

    if (order.status === 'cancelled') {
      await discardUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Order dibatalkan dan tidak bisa diberi ulasan.' });
    }

    if (!isReviewableOrderStatus(order.status)) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(400).json({
        message: 'Ulasan baru bisa dikirim setelah pesanan selesai diterima atau diambil.'
      });
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const hasProduct = items.some((item) => Number(item.productId) === Number(product.id));
    if (!hasProduct) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(400).json({
        message: 'Produk ini tidak ada di pesanan yang dimasukkan.'
      });
    }

    const existingReview = await StoreProductReview.findOne({
      where: {
        productId: product.id,
        orderId: order.id
      }
    });

    if (existingReview) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(409).json({ message: 'Ulasan untuk produk ini sudah dikirim.' });
    }

    uploadedPaths = await resolveUploadedImagePaths(uploadedFiles, STORE_REVIEW_CLOUDINARY_FOLDER);
    const review = await StoreProductReview.create({
      productId: product.id,
      orderId: order.id,
      userId: req.user?.id || order.userId || null,
      reviewerName: order.customerName,
      reviewerPhone: order.customerPhone,
      rating,
      reviewText: reviewText || null,
      imageUrls: uploadedPaths,
      isApproved: false
    });
    uploadedPaths = [];
    invalidateStoreCatalogCache();

    return res.status(201).json({
      message: 'Ulasan berhasil dikirim dan menunggu review admin',
      data: serializeReview(review)
    });
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await removeImageFiles(uploadedPaths);
    } else {
      await discardUploadedFiles(uploadedFiles);
    }
    return next(error);
  }
}

async function createOrder(req, res, next) {
  const transaction = await sequelize.transaction();
  let didMutateCatalog = false;

  try {
    const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];
    if (!itemsInput.length) {
      await transaction.rollback();
      return res.status(422).json({ message: 'Item pesanan wajib diisi' });
    }

    const normalizedItems = itemsInput.map((item) => ({
      productId: toInteger(item.productId, 0),
      size: String(item.size || '').trim().toUpperCase(),
      quantity: Math.max(1, toInteger(item.quantity, 1))
    }));

    const productIds = [...new Set(normalizedItems.map((item) => item.productId).filter(Boolean))];
    const [products, settings] = await Promise.all([
      StoreProduct.findAll({
        where: {
          id: productIds,
          isActive: true
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      }),
      getOrCreateStoreSettings(transaction)
    ]);

    const productMap = new Map(products.map((item) => [item.id, item]));
    if (productMap.size !== productIds.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Sebagian produk tidak tersedia atau sudah nonaktif' });
    }

    const qtyByVariant = normalizedItems.reduce((accumulator, item) => {
      const key = `${item.productId}:${item.size}`;
      accumulator[key] = (accumulator[key] || 0) + item.quantity;
      return accumulator;
    }, {});

    let subtotal = 0;
    const orderItems = [];

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const { sizes, stockBySize } = getProductStockInfo(product);
      if (!sizes.includes(item.size)) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Ukuran ${item.size} tidak tersedia untuk ${product.name}`
        });
      }

      const requestedQty = qtyByVariant[`${item.productId}:${item.size}`] || 0;
      const availableSizeStock = Math.max(0, toInteger(stockBySize[item.size], 0));
      if (availableSizeStock <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Stok ${product.name} ukuran ${item.size} sedang habis`
        });
      }
      if (requestedQty > availableSizeStock) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Stok ${product.name} ukuran ${item.size} tidak mencukupi. Tersedia: ${availableSizeStock}`
        });
      }

      const pricing = calculateProductPricing(product, { size: item.size });
      const lineTotal = pricing.finalPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        size: item.size,
        color: product.color || '',
        unitPrice: pricing.finalPrice,
        quantity: item.quantity,
        lineTotal,
        promoLabel: pricing.promoIsActive ? pricing.promoLabel : null
      });
    }

    const reservedAt = new Date();
    didMutateCatalog = await reserveStockForOrderItems(orderItems, transaction);

    const shippingMethod = String(req.body.shippingMethod || 'Kurir').trim();
    const isPickupOrder = shippingMethod.toLowerCase().includes('ambil');
    const baseShippingCost = Number(settings.shippingCost) || DEFAULT_SHIPPING_COST;
    const shippingCost = isPickupOrder
      ? 0
      : baseShippingCost;
    const totalAmount = subtotal + shippingCost;
    const customerAddress = isPickupOrder
      ? String(req.body.address || '').trim() || 'Ambil di Gereja GPT Tanjung Priok'
      : String(req.body.address || '').trim();

    const orderCode = await generateOrderCode(transaction);
    const orderPayload = await buildStoreOrderPayload({
      orderCode,
      userId: req.user?.id || null,
      customerName: String(req.body.name || '').trim(),
      customerPhone: normalizePhone(req.body.phone),
      customerAddress,
      shippingMethod,
      paymentMethod: String(req.body.paymentMethod || 'Transfer Bank').trim(),
      notes: req.body.notes ? String(req.body.notes).trim() : null,
      subtotal,
      shippingCost,
      totalAmount,
      amountPaid: totalAmount,
      changeAmount: 0,
      status: 'new',
      channel: 'whatsapp',
      stockDeductedAt: reservedAt
    });
    const order = await StoreOrder.create(
      orderPayload,
      await buildStoreOrderMutationOptions(transaction)
    );

    await StoreOrderItem.bulkCreate(
      orderItems.map((item) => ({ ...item, orderId: order.id })),
      { transaction }
    );

    const appUrl = getPublicAppUrl(req);
    const invoiceUrl = buildInvoiceLink(appUrl, order.orderCode);
    const whatsappMessage = buildWhatsappMessage(order, orderItems, { invoiceUrl });
    await order.update(
      await buildStoreOrderPayload({ whatsappMessage }),
      await buildStoreOrderMutationOptions(transaction)
    );

    await transaction.commit();
    if (didMutateCatalog) {
      invalidateStoreCatalogCache();
    }
    triggerRevenueSheetSync({ status: 'all' });

    const whatsappLink = buildWhatsappLink(whatsappMessage);
    return res.status(201).json({
      message: 'Pesanan berhasil dibuat',
      data: {
        orderId: order.id,
        orderCode: order.orderCode,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        totalAmount: order.totalAmount,
        status: order.status,
        stockDeductedAt: order.stockDeductedAt,
        whatsappLink
      }
    });
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
}

async function createAdminPosOrder(req, res, next) {
  const transaction = await sequelize.transaction();
  let didMutateCatalog = false;

  try {
    const itemsInput = Array.isArray(req.body.items) ? req.body.items : [];
    if (!itemsInput.length) {
      await transaction.rollback();
      return res.status(422).json({ message: 'Item transaksi kasir wajib diisi' });
    }

    const normalizedItems = itemsInput.map((item) => ({
      productId: toInteger(item.productId, 0),
      size: String(item.size || '').trim().toUpperCase(),
      quantity: Math.max(1, toInteger(item.quantity, 1))
    }));

    const productIds = [...new Set(normalizedItems.map((item) => item.productId).filter(Boolean))];
    const products = await StoreProduct.findAll({
      where: { id: productIds },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const productMap = new Map(products.map((item) => [item.id, item]));
    if (productMap.size !== productIds.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Sebagian produk kasir tidak ditemukan' });
    }

    const qtyByVariant = normalizedItems.reduce((accumulator, item) => {
      const key = `${item.productId}:${item.size}`;
      accumulator[key] = (accumulator[key] || 0) + item.quantity;
      return accumulator;
    }, {});

    let subtotal = 0;
    const orderItems = [];

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const { sizes, stockBySize } = getProductStockInfo(product);
      if (!sizes.includes(item.size)) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Ukuran ${item.size} tidak tersedia untuk ${product.name}`
        });
      }

      const requestedQty = qtyByVariant[`${item.productId}:${item.size}`] || 0;
      const availableSizeStock = Math.max(0, toInteger(stockBySize[item.size], 0));
      if (availableSizeStock <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Stok ${product.name} ukuran ${item.size} sedang habis`
        });
      }
      if (requestedQty > availableSizeStock) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Stok ${product.name} ukuran ${item.size} tidak mencukupi. Tersedia: ${availableSizeStock}`
        });
      }

      const pricing = calculateProductPricing(product, { size: item.size });
      const lineTotal = pricing.finalPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        size: item.size,
        color: product.color || '',
        unitPrice: pricing.finalPrice,
        quantity: item.quantity,
        lineTotal,
        promoLabel: pricing.promoIsActive ? pricing.promoLabel : null
      });
    }

    const payment = resolveAdminPosPayment(
      req.body.paymentMethod,
      subtotal,
      req.body.amountPaid
    );
    const reservedAt = new Date();
    didMutateCatalog = await reserveStockForOrderItems(orderItems, transaction);

    const orderCode = await generateOrderCode(transaction, { prefixBase: 'GTPOS' });
    const cashierName = req.user?.name || '';
    const orderPayload = await buildStoreOrderPayload({
      orderCode,
      userId: req.user?.id || null,
      customerName: String(req.body.name || '').trim() || 'Pembeli Offline',
      customerPhone: normalizePhone(req.body.phone) || '-',
      customerAddress: 'Transaksi langsung di offline store',
      shippingMethod: 'Ambil Langsung di Offline Store',
      paymentMethod: payment.paymentMethod,
      cashierName: cashierName || null,
      notes: req.body.notes ? String(req.body.notes).trim() : null,
      subtotal,
      shippingCost: 0,
      totalAmount: subtotal,
      amountPaid: payment.amountPaid,
      changeAmount: payment.changeAmount,
      status: 'completed',
      channel: 'offline_store',
      stockDeductedAt: reservedAt,
      whatsappMessage: null
    });
    const order = await StoreOrder.create(
      orderPayload,
      await buildStoreOrderMutationOptions(transaction)
    );

    const createdItems = await StoreOrderItem.bulkCreate(
      orderItems.map((item) => ({ ...item, orderId: order.id })),
      { transaction, returning: true }
    );

    await transaction.commit();
    if (didMutateCatalog) {
      invalidateStoreCatalogCache();
    }
    triggerRevenueSheetSync({ status: 'all' });

    return res.status(201).json({
      message: 'Transaksi kasir offline berhasil dibuat',
      data: serializeCustomerOrder({
        ...order.get({ plain: true }),
        items: createdItems
      })
    });
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
}

async function reverseAdminPosOrder(req, res, next) {
  const transaction = await sequelize.transaction();
  let didMutateCatalog = false;

  try {
    const order = await StoreOrder.findByPk(req.params.id, {
      attributes: await getSafeStoreOrderAttributes(),
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    if (!isOfflineStoreChannel(order.channel)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Fitur void/retur hanya untuk transaksi offline store' });
    }

    if (order.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Transaksi ini sudah dibatalkan sebelumnya' });
    }

    if (!order.stockDeductedAt) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Stok transaksi ini sudah pernah dikembalikan' });
    }

    const reversalType = normalizeReversalType(req.body.action);
    const reversalReason = String(req.body.reason || '').trim() || null;
    const orderItems = await StoreOrderItem.findAll({
      where: { orderId: order.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!orderItems.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Order tidak memiliki item untuk dikembalikan' });
    }

    didMutateCatalog = await restoreStockForOrderItems(orderItems, transaction, {
      allowMissingProducts: true
    }) || didMutateCatalog;

    await order.update(await buildStoreOrderPayload({
      status: 'cancelled',
      stockDeductedAt: null,
      reversedAt: new Date(),
      reversedBy: req.user?.id || null,
      reversalType,
      reversalReason
    }), await buildStoreOrderMutationOptions(transaction));

    await transaction.commit();
    if (didMutateCatalog) {
      invalidateStoreCatalogCache();
    }
    triggerRevenueSheetSync({ status: 'all' });

    return res.status(200).json({
      message: reversalType === 'return'
        ? 'Retur transaksi offline berhasil diproses'
        : 'Void transaksi offline berhasil diproses',
      data: serializeCustomerOrder({
        ...order.get({ plain: true }),
        items: orderItems
      })
    });
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
}

async function getAdminProducts(req, res, next) {
  try {
    const where = {};
    const search = String(req.query.search || '').trim();
    const active = String(req.query.active || '').trim().toLowerCase();

    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { slug: { [Op.iLike]: `%${search}%` } },
        { verse: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await StoreProduct.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      data: products.map(serializeProduct),
      meta: { total: products.length }
    });
  } catch (error) {
    return next(error);
  }
}

async function createAdminProduct(req, res, next) {
  const uploadedFiles = getUploadedFiles(req);
  let uploadedPaths = [];

  try {
    if (!uploadedFiles.length) {
      return res.status(400).json({ message: 'Minimal 1 foto produk wajib diupload' });
    }

    const payload = buildProductPayload(req.body, req.user.id);
    applyPriceConfiguration(payload, req.body);
    applyStockConfiguration(payload, req.body);
    if (!payload.slug) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Slug produk tidak valid' });
    }

    const slugUnique = await ensureUniqueSlug(payload.slug);
    if (!slugUnique) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(409).json({ message: 'Slug produk sudah dipakai. Gunakan nama/slug lain.' });
    }

    uploadedPaths = await resolveUploadedImagePaths(uploadedFiles, STORE_PRODUCT_CLOUDINARY_FOLDER);
    payload.imageUrls = uploadedPaths;
    payload.imageUrl = uploadedPaths[0] || null;

    const product = await StoreProduct.create(payload);
    invalidateStoreCatalogCache();
    return res.status(201).json({
      message: 'Produk berhasil ditambahkan',
      data: serializeProduct(product)
    });
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await removeImageFiles(uploadedPaths);
    } else {
      await discardUploadedFiles(uploadedFiles);
    }
    return next(error);
  }
}

async function updateAdminProduct(req, res, next) {
  const uploadedFiles = getUploadedFiles(req);
  let uploadedPaths = [];

  try {
    const product = await StoreProduct.findByPk(req.params.id);
    if (!product) {
      await discardUploadedFiles(uploadedFiles);
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    const oldImages = normalizeProductImages(product);
    const payload = buildProductPayload(req.body, req.user.id, { partial: true });
    applyPriceConfiguration(payload, req.body, product);
    applyStockConfiguration(payload, req.body, product);

    if (payload.slug) {
      const slugUnique = await ensureUniqueSlug(payload.slug, product.id);
      if (!slugUnique) {
        await discardUploadedFiles(uploadedFiles);
        return res.status(409).json({ message: 'Slug produk sudah dipakai. Gunakan slug lain.' });
      }
    }

    if (uploadedFiles.length > 0) {
      uploadedPaths = await resolveUploadedImagePaths(uploadedFiles, STORE_PRODUCT_CLOUDINARY_FOLDER);
      payload.imageUrls = uploadedPaths;
      payload.imageUrl = uploadedPaths[0] || null;
    }

    await product.update(payload);

    if (uploadedPaths.length > 0) {
      await removeImageFiles(oldImages);
    }
    invalidateStoreCatalogCache();

    return res.status(200).json({
      message: 'Produk berhasil diperbarui',
      data: serializeProduct(product)
    });
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await removeImageFiles(uploadedPaths);
    } else {
      await discardUploadedFiles(uploadedFiles);
    }
    return next(error);
  }
}

async function deleteAdminProduct(req, res, next) {
  try {
    const product = await StoreProduct.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    const oldImages = normalizeProductImages(product);
    await product.destroy();
    await removeImageFiles(oldImages);
    invalidateStoreCatalogCache();

    return res.status(200).json({ message: 'Produk berhasil dihapus permanen' });
  } catch (error) {
    return next(error);
  }
}

async function getAdminOrders(req, res, next) {
  try {
    const page = Math.max(1, toInteger(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, toInteger(req.query.limit, 12)));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const where = {};

    if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
      where.status = req.query.status;
    }
    if (req.query.channel) {
      const channel = String(req.query.channel).trim().toLowerCase();
      if (channel && channel !== 'all') {
        where.channel = channel;
      }
    }

    if (search) {
      where[Op.or] = [
        { orderCode: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } },
        { customerPhone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows, count } = await StoreOrder.findAndCountAll({
      attributes: await getSafeStoreOrderAttributes(),
      where,
      include: [
        { model: StoreOrderItem, as: 'items' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        ...((await hasStoreOrderColumn('reversedBy'))
          ? [{ model: User, as: 'reversalActor', attributes: ['id', 'name', 'email', 'role'] }]
          : [])
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json({
      data: rows,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getAdminRevenueReport(req, res, next) {
  try {
    const filters = parseRevenueFilters(req.query);
    const report = await buildRevenueReport(filters);
    return res.status(200).json({
      data: report.rows,
      meta: report.meta
    });
  } catch (error) {
    return next(error);
  }
}

async function syncAdminRevenueReport(req, res, next) {
  try {
    const filters = parseRevenueFilters({ ...req.body, ...req.query });
    const report = await buildRevenueReport(filters);
    const syncResult = await syncRevenueReportToSheet({
      rows: report.rows,
      meta: report.meta,
      filters
    });

    return res.status(200).json({
      message: 'Spreadsheet berhasil diperbarui',
      data: {
        ...syncResult,
        totalRows: report.rows.length
      }
    });
  } catch (error) {
    if (error.code === 'SHEETS_NOT_CONFIGURED') {
      return res.status(503).json({
        message:
          'Integrasi spreadsheet belum dikonfigurasi. Tambahkan GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, dan GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
      });
    }
    return next(error);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const page = Math.max(1, toInteger(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, toInteger(req.query.limit, 12)));
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    const search = String(req.query.search || '').trim();

    if (search) {
      where[Op.or] = [
        { orderCode: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } },
        { customerPhone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows, count } = await StoreOrder.findAndCountAll({
      attributes: await getSafeStoreOrderAttributes(),
      where,
      include: [{ model: StoreOrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json({
      data: rows.map(serializeCustomerOrder),
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function trackPublicOrder(req, res, next) {
  try {
    const orderCode = String(req.query.orderCode || '').trim();
    const customerPhone = normalizePhone(req.query.phone);

    if (!orderCode) {
      return res.status(400).json({ message: 'Kode pesanan wajib diisi' });
    }

    if (!customerPhone) {
      return res.status(400).json({ message: 'Nomor WhatsApp wajib diisi' });
    }

    const order = await StoreOrder.findOne({
      attributes: await getSafeStoreOrderAttributes(),
      where: {
        orderCode: { [Op.iLike]: orderCode },
        customerPhone
      },
      include: [{ model: StoreOrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({
        message: 'Pesanan tidak ditemukan. Pastikan kode pesanan dan nomor WhatsApp sesuai.'
      });
    }

    return res.status(200).json({
      data: serializeCustomerOrder(order)
    });
  } catch (error) {
    return next(error);
  }
}

async function getAdminReviews(req, res, next) {
  try {
    const page = Math.max(1, toInteger(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, toInteger(req.query.limit, 12)));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase();

    const where = {};
    if (status === 'approved') where.isApproved = true;
    if (status === 'pending') where.isApproved = false;

    if (search) {
      where[Op.or] = [
        { reviewerName: { [Op.iLike]: `%${search}%` } },
        { reviewerPhone: { [Op.iLike]: `%${search}%` } },
        { reviewText: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows, count } = await StoreProductReview.findAndCountAll({
      where,
      include: [
        { model: StoreProduct, as: 'product', attributes: ['id', 'name', 'slug'] },
        { model: StoreOrder, as: 'order', attributes: ['id', 'orderCode'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return res.status(200).json({
      data: rows,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAdminReviewStatus(req, res, next) {
  try {
    const review = await StoreProductReview.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Ulasan tidak ditemukan' });
    }

    const isApproved = toBoolean(req.body.isApproved, review.isApproved);
    await review.update({ isApproved });
    invalidateStoreCatalogCache();

    return res.status(200).json({
      message: 'Status ulasan berhasil diperbarui',
      data: review
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAdminReview(req, res, next) {
  try {
    const review = await StoreProductReview.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Ulasan tidak ditemukan' });
    }

    const oldImages = Array.isArray(review.imageUrls) ? review.imageUrls.filter(Boolean) : [];
    await review.destroy();
    await removeImageFiles(oldImages);
    invalidateStoreCatalogCache();
    return res.status(200).json({ message: 'Ulasan berhasil dihapus' });
  } catch (error) {
    return next(error);
  }
}

async function resetAdminOrders(req, res, next) {
  const transaction = await sequelize.transaction();
  let didMutateCatalog = false;

  try {
    const deductedOrders = await StoreOrder.findAll({
      attributes: ['id'],
      where: {
        stockDeductedAt: { [Op.ne]: null }
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const deductedOrderIds = deductedOrders.map((order) => order.id);
    if (deductedOrderIds.length > 0) {
      const deductedItems = await StoreOrderItem.findAll({
        where: { orderId: deductedOrderIds },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const additionsByProduct = buildProductQuantityMap(deductedItems);
      const productIds = Object.keys(additionsByProduct)
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);

      if (productIds.length > 0) {
        const products = await StoreProduct.findAll({
          where: { id: productIds },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        const productMap = new Map(products.map((product) => [product.id, product]));

        for (const [productIdText, additionsBySize] of Object.entries(additionsByProduct)) {
          const product = productMap.get(Number(productIdText));
          if (!product) {
            continue;
          }

          const { sizes, stockBySize } = getProductStockInfo(product);
          const restoredStock = restoreStockBySize(stockBySize, additionsBySize, sizes);
          await product.update(
            {
              stockBySize: restoredStock.stockBySize,
              stock: restoredStock.stock
            },
            { transaction }
          );
          didMutateCatalog = true;
        }
      }
    }

    const deletedItems = await StoreOrderItem.destroy({ where: {}, transaction });
    const deletedOrders = await StoreOrder.destroy({ where: {}, transaction });

    await transaction.commit();
    if (didMutateCatalog) {
      invalidateStoreCatalogCache();
    }
    triggerRevenueSheetSync({ status: 'all' });
    return res.status(200).json({
      message: 'Semua pesanan berhasil dihapus',
      meta: {
        deletedOrders,
        deletedItems
      }
    });
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
}

async function updateAdminOrderStatus(req, res, next) {
  const transaction = await sequelize.transaction();
  let didMutateCatalog = false;

  try {
    const order = await StoreOrder.findByPk(req.params.id, {
      attributes: await getSafeStoreOrderAttributes(),
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }

    const status = String(req.body.status || '').trim();
    if (!ORDER_STATUSES.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Status order tidak valid' });
    }

    if (status === order.status) {
      await transaction.commit();
      return res.status(200).json({
        message: 'Status order tidak berubah',
        data: order
      });
    }

    if (!canTransitionOrderStatus(order.status, status, order.shippingMethod)) {
      await transaction.rollback();
      return res.status(400).json({
        message: buildOrderStatusTransitionError(order.status, order.shippingMethod)
      });
    }

    const updatePayload = { status };

    if (status === 'confirmed' && !order.stockDeductedAt) {
      const orderItems = await StoreOrderItem.findAll({
        where: { orderId: order.id },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!orderItems.length) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Order tidak memiliki item untuk dikonfirmasi' });
      }

      await reserveStockForOrderItems(orderItems, transaction);

      updatePayload.stockDeductedAt = new Date();
      didMutateCatalog = true;
    }

    if (status === 'cancelled' && order.stockDeductedAt) {
      const orderItems = await StoreOrderItem.findAll({
        where: { orderId: order.id },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (orderItems.length > 0) {
        didMutateCatalog = await restoreStockForOrderItems(orderItems, transaction, {
          allowMissingProducts: true
        }) || didMutateCatalog;
      }

      updatePayload.stockDeductedAt = null;
    }

    await order.update(
      await buildStoreOrderPayload(updatePayload),
      await buildStoreOrderMutationOptions(transaction)
    );
    await transaction.commit();
    if (didMutateCatalog) {
      invalidateStoreCatalogCache();
    }
    triggerRevenueSheetSync({ status: 'all' });

    return res.status(200).json({
      message: 'Status order berhasil diperbarui',
      data: order
    });
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
}

async function getAdminSettings(req, res, next) {
  try {
    const settings = await getOrCreateStoreSettings();
    return res.status(200).json({
      data: {
        shippingCost: Number(settings.shippingCost) || DEFAULT_SHIPPING_COST
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAdminSettings(req, res, next) {
  try {
    const settings = await getOrCreateStoreSettings();
    const shippingCost = Math.max(0, toInteger(req.body.shippingCost, DEFAULT_SHIPPING_COST));
    await settings.update({ shippingCost });
    invalidateStoreCatalogCache();

    return res.status(200).json({
      message: 'Pengaturan ongkir berhasil diperbarui',
      data: {
        shippingCost: Number(settings.shippingCost) || DEFAULT_SHIPPING_COST
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getAdminAnalytics(req, res, next) {
  try {
    const [
      totalProducts,
      activeProducts,
      productsWithPromo,
      totalOrders,
      newOrders,
      completedOrders,
      cancelledOrders,
      revenueRows,
      recentOrders,
      soldItems,
      settings,
      ratingSummary,
      totalReviews,
      pendingReviews
    ] = await Promise.all([
      StoreProduct.count(),
      StoreProduct.count({ where: { isActive: true } }),
      StoreProduct.findAll({
        where: {
          isActive: true,
          promoType: { [Op.ne]: 'none' },
          promoValue: { [Op.gt]: 0 }
        }
      }),
      StoreOrder.count(),
      StoreOrder.count({ where: { status: 'new' } }),
      StoreOrder.count({ where: { status: { [Op.in]: ['completed', 'picked_up'] } } }),
      StoreOrder.count({ where: { status: 'cancelled' } }),
      StoreOrder.findAll({
        attributes: ['status', [fn('SUM', col('totalAmount')), 'total']],
        group: ['status'],
        raw: true
      }),
      StoreOrder.findAll({
        attributes: await getSafeStoreOrderAttributes(),
        limit: 8,
        include: [{ model: StoreOrderItem, as: 'items' }],
        order: [['createdAt', 'DESC']]
      }),
      StoreOrderItem.findAll({
        attributes: ['productName', 'quantity', 'lineTotal'],
        include: [
          {
            model: StoreOrder,
            as: 'order',
            attributes: ['status'],
            where: { status: { [Op.ne]: 'cancelled' } }
          }
        ]
      }),
      getOrCreateStoreSettings(),
      StoreProductReview.findOne({
        attributes: [[fn('AVG', col('rating')), 'averageRating']],
        where: { isApproved: true },
        raw: true
      }),
      StoreProductReview.count(),
      StoreProductReview.count({ where: { isApproved: false } })
    ]);

    const activePromoCount = productsWithPromo.filter((product) => isPromoActive(product)).length;
    const revenueByStatus = revenueRows.reduce((accumulator, item) => {
      accumulator[item.status] = Number(item.total) || 0;
      return accumulator;
    }, {});

    const grossRevenue = Object.entries(revenueByStatus).reduce((total, [status, amount]) => (
      status === 'cancelled' ? total : total + amount
    ), 0);

    const nonCancelledOrders = Math.max(0, totalOrders - cancelledOrders);
    const averageOrderValue = nonCancelledOrders > 0
      ? Math.round(grossRevenue / nonCancelledOrders)
      : 0;
    const averageRating = Number(ratingSummary?.averageRating) || 0;

    const topProductMap = soldItems.reduce((accumulator, item) => {
      const key = item.productName || 'Produk';
      if (!accumulator[key]) {
        accumulator[key] = {
          productName: key,
          soldQty: 0,
          revenue: 0
        };
      }
      accumulator[key].soldQty += Number(item.quantity) || 0;
      accumulator[key].revenue += Number(item.lineTotal) || 0;
      return accumulator;
    }, {});

    const topProducts = Object.values(topProductMap)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 5);

    return res.status(200).json({
      metrics: {
        totalProducts,
        activeProducts,
        activePromoCount,
        totalOrders,
        newOrders,
        completedOrders,
        cancelledOrders,
        grossRevenue,
        averageOrderValue,
        averageRating,
        totalReviews,
        pendingReviews
      },
      settings: {
        shippingCost: Number(settings.shippingCost) || DEFAULT_SHIPPING_COST
      },
      revenueByStatus,
      topProducts,
      recentOrders
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPublicProducts,
  getPublicProductBySlug,
  getProductReviews,
  createProductReview,
  createOrder,
  createAdminPosOrder,
  reverseAdminPosOrder,
  getMyOrders,
  trackPublicOrder,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  getAdminRevenueReport,
  syncAdminRevenueReport,
  resetAdminOrders,
  updateAdminOrderStatus,
  getAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview,
  getAdminSettings,
  updateAdminSettings,
  getAdminAnalytics,
  __testHooks: {
    reserveStockBySize,
    normalizePriceBySize,
    compactPriceBySize,
    getProductPriceInfo,
    calculateProductPricing,
    buildRevenueReportWhere,
    resolveAdminPosPayment,
    isCashPaymentMethod,
    isOfflineStoreChannel,
    normalizeReversalType,
    listStoreOrderAttributesForColumns,
    pickStoreOrderValuesForColumns,
    getOrderAmountPaid,
    getOrderChangeAmount
  }
};
