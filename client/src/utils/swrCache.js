import api from "../services/api";

const cacheStore = new Map();
const pendingStore = new Map();

function stableStringify(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => {
      const val = value[key];
      if (val === undefined) return "";
      return `${JSON.stringify(key)}:${stableStringify(val)}`;
    })
    .filter(Boolean)
    .join(",")}}`;
}

function buildCacheKey(url, config = {}) {
  const params = config?.params ? stableStringify(config.params) : "";
  return `${url}?${params}`;
}

function getCacheSnapshot(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  return {
    data: entry.data,
    isFresh: entry.expiresAt > Date.now()
  };
}

function setCacheData(key, data, ttlMs) {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
}

async function fetchAndCache(key, url, config, ttlMs) {
  if (pendingStore.has(key)) {
    return pendingStore.get(key);
  }
  const request = api
    .get(url, config)
    .then((response) => {
      const data = response?.data;
      setCacheData(key, data, ttlMs);
      return data;
    })
    .finally(() => {
      pendingStore.delete(key);
    });

  pendingStore.set(key, request);
  return request;
}

async function swrGet(url, config = {}, options = {}) {
  const ttlMs = Number(options.ttlMs ?? 30000);
  const key = buildCacheKey(url, config);
  const snapshot = getCacheSnapshot(key);

  if (snapshot) {
    if (!snapshot.isFresh) {
      fetchAndCache(key, url, config, ttlMs)
        .then((data) => options.onUpdate?.(data))
        .catch(() => {});
    }
    return { data: snapshot.data, fromCache: true, isFresh: snapshot.isFresh };
  }

  const data = await fetchAndCache(key, url, config, ttlMs);
  return { data, fromCache: false, isFresh: true };
}

export { buildCacheKey, getCacheSnapshot, setCacheData, swrGet };
