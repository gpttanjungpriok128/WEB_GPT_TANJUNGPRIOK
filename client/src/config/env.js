const DEFAULT_API_URL = import.meta.env.DEV ? "http://localhost:5000/api" : "/api";

function resolveApiUrl() {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || DEFAULT_API_URL;
  }

  // In production we want browser requests to stay same-origin so auth cookies
  // are first-party and work reliably on mobile Safari/in-app browsers.
  return DEFAULT_API_URL;
}

function normalizeUrl(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  return raw.replace(/\/+$/, "");
}

export const API_URL = normalizeUrl(resolveApiUrl(), DEFAULT_API_URL);
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
export const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

export function resolveApiAssetUrl(value) {
  const source = String(value || "").trim();
  if (!source) return "";

  if (
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("data:") ||
    source.startsWith("blob:")
  ) {
    return source;
  }

  if (!source.startsWith("/")) {
    return API_ORIGIN ? `${API_ORIGIN}/${source}` : source;
  }

  return API_ORIGIN ? `${API_ORIGIN}${source}` : source;
}
