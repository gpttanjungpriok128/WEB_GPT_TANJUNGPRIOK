const DEFAULT_TTL_MS = 30 * 1000;
const MAX_ENTRIES = 500;

const cacheStore = new Map();

function buildCacheKey(req) {
  return `${req.method}:${req.originalUrl}`;
}

function shouldSkipCache(req) {
  if (req.method !== 'GET') return true;
  if (req.headers.authorization) return true;
  if (req.headers.cookie) return true;
  if (req.headers['cache-control']?.includes('no-cache')) return true;
  if (req.user) return true;
  return false;
}

function evictIfNeeded() {
  if (cacheStore.size <= MAX_ENTRIES) return;
  const oldestKey = cacheStore.keys().next().value;
  if (oldestKey) cacheStore.delete(oldestKey);
}

function cacheResponse(options = {}) {
  const ttl = Math.max(0, Number(options.ttlMs ?? DEFAULT_TTL_MS));
  const cacheControl = options.cacheControl || `public, max-age=${Math.floor(ttl / 1000)}, stale-while-revalidate=60`;

  return (req, res, next) => {
    if (ttl === 0 || shouldSkipCache(req)) {
      return next();
    }

    const key = buildCacheKey(req);
    const cached = cacheStore.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader('X-Cache', 'HIT');
      if (cached.contentType) {
        res.setHeader('Content-Type', cached.contentType);
      }
      res.setHeader('Cache-Control', cacheControl);
      return res.status(cached.status).send(cached.body);
    }

    if (cached) {
      cacheStore.delete(key);
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const storePayload = (body) => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const contentType = res.getHeader('Content-Type');
      cacheStore.set(key, {
        status: res.statusCode,
        body,
        contentType,
        expiresAt: Date.now() + ttl
      });
      evictIfNeeded();
    };

    res.json = (body) => {
      storePayload(body);
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    res.send = (body) => {
      storePayload(body);
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('X-Cache', 'MISS');
      return originalSend(body);
    };

    return next();
  };
}

module.exports = { cacheResponse };
