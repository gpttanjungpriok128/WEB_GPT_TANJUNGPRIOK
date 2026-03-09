const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

export function normalizeStoreImagePath(value) {
  if (typeof value !== "string") return "";

  const source = value.trim();
  if (!source) return "";

  if (source.startsWith("data:") || source.startsWith("blob:")) {
    return source;
  }

  if (source.startsWith("/assets/") || source.startsWith("/src/")) {
    return source;
  }

  const assetsPathIndex = source.indexOf("/assets/");
  if (assetsPathIndex >= 0) {
    return source.slice(assetsPathIndex);
  }

  const srcPathIndex = source.indexOf("/src/");
  if (srcPathIndex >= 0) {
    return source.slice(srcPathIndex);
  }

  const uploadsPathIndex = source.indexOf("/uploads/");
  if (uploadsPathIndex >= 0) {
    return source.slice(uploadsPathIndex);
  }

  if (isAbsoluteUrl(source)) {
    return source;
  }

  if (source.startsWith("uploads/")) {
    return `/${source}`;
  }

  return source;
}

export function resolveStoreImageUrl(value) {
  const normalized = normalizeStoreImagePath(value);
  if (!normalized) return "";

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  if (normalized.startsWith("/assets/") || normalized.startsWith("/src/")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
  }

  return normalized;
}

export function collectCartImageCandidates(item) {
  const candidates = [];

  const appendCandidate = (source) => {
    const normalized = normalizeStoreImagePath(source);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  appendCandidate(item?.image);

  if (Array.isArray(item?.imageUrls)) {
    item.imageUrls.forEach(appendCandidate);
  }

  return candidates;
}
