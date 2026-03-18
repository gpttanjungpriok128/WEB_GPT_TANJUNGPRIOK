/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const distDir = path.join(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function setMeta(html, key, value, attrName = "property") {
  const safeValue = escapeHtml(value);
  const tag = `<meta ${attrName}="${key}" content="${safeValue}" />`;
  const pattern = new RegExp(`<meta\\s+${attrName}=["']${key}["'][^>]*>`, "i");
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function setTitle(html, value) {
  const safeValue = escapeHtml(value);
  if (/<title>.*<\/title>/i.test(html)) {
    return html.replace(/<title>.*<\/title>/i, `<title>${safeValue}</title>`);
  }
  return html.replace("</head>", `  <title>${safeValue}</title>\n</head>`);
}

function setDescription(html, value) {
  return setMeta(html, "description", value, "name");
}

function setCanonical(html, url) {
  const safeUrl = escapeHtml(url);
  const tag = `<link rel="canonical" href="${safeUrl}" />`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, tag);
  }
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function applyMeta(html, { title, description, url, image, type = "website" }) {
  let output = html;
  output = setTitle(output, title);
  output = setDescription(output, description);
  output = setCanonical(output, url);
  output = setMeta(output, "og:type", type, "property");
  output = setMeta(output, "og:title", title, "property");
  output = setMeta(output, "og:description", description, "property");
  output = setMeta(output, "og:image", image, "property");
  output = setMeta(output, "og:url", url, "property");
  output = setMeta(output, "twitter:card", "summary_large_image", "name");
  output = setMeta(output, "twitter:title", title, "name");
  output = setMeta(output, "twitter:description", description, "name");
  output = setMeta(output, "twitter:image", image, "name");
  return output;
}

function resolveImageUrl(image, apiBase) {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;
  const base = normalizeBaseUrl(apiBase);
  if (!base) return image;
  return `${base}${image.startsWith("/") ? "" : "/"}${image}`;
}

async function fetchAllProducts(apiBase) {
  const products = [];
  const limit = 60;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${apiBase}/store/products`;
    const res = await axios.get(url, {
      params: { limit, page },
      timeout: 15000,
      headers: {
        "User-Agent": "gtshirt-og-generator"
      },
      validateStatus: (status) => status >= 200 && status < 300
    });
    const payload = res.data;
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    products.push(...rows);
    totalPages = Number(payload?.meta?.totalPages) || 1;
    page += 1;
  }

  return products;
}

function buildSitemapXml(entries = []) {
  const urls = entries
    .filter((entry) => entry && entry.loc)
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : "";
      return `  <url><loc>${entry.loc}</loc>${lastmod}</url>`;
    })
    .join("\n");

  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n` +
    `<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n` +
    `${urls}\n` +
    `</urlset>\n`;
}

function toIsoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

async function main() {
  if (!fs.existsSync(indexPath)) {
    console.error("index.html not found, skip OG generation.");
    return;
  }

  const baseHtml = fs.readFileSync(indexPath, "utf8");
  const siteUrl = normalizeBaseUrl(
    process.env.PUBLIC_SITE_URL ||
      process.env.VITE_PUBLIC_URL ||
      "https://gpttanjungpriok.vercel.app"
  );
  const apiBaseRaw = normalizeBaseUrl(
    process.env.VITE_API_URL ||
      process.env.PUBLIC_API_URL ||
      "https://linguistic-alameda-gpttanjungpriok-e69cc92f.koyeb.app/api"
  );
  const apiBase = apiBaseRaw.endsWith("/api") ? apiBaseRaw : `${apiBaseRaw}/api`;
  const apiOrigin = apiBaseRaw.replace(/\/api\/?$/, "");

  const shopHtml = applyMeta(baseHtml, {
    title: "GTshirt Store — GPT Tanjung Priok",
    description: "Belanja koleksi GTshirt terbaru. Pilih ukuran, cek stok, dan pesan langsung via WhatsApp.",
    url: `${siteUrl}/shop`,
    image: `${siteUrl}/img/gtshirt-og.jpg`,
    type: "website"
  });

  const shopDir = path.join(distDir, "shop");
  ensureDir(shopDir);
  fs.writeFileSync(path.join(shopDir, "index.html"), shopHtml);

  let products = [];
  try {
    products = await fetchAllProducts(apiBase);
  } catch (error) {
    console.warn("Skip product OG pages:", error.message);
  }

  const sitemapEntries = [
    { loc: `${siteUrl}/`, lastmod: "" },
    { loc: `${siteUrl}/about`, lastmod: "" },
    { loc: `${siteUrl}/schedules`, lastmod: "" },
    { loc: `${siteUrl}/articles`, lastmod: "" },
    { loc: `${siteUrl}/gallery`, lastmod: "" },
    { loc: `${siteUrl}/shop`, lastmod: "" },
    { loc: `${siteUrl}/contact`, lastmod: "" },
    { loc: `${siteUrl}/track-order`, lastmod: "" }
  ];

  products.forEach((product) => {
    const slug = String(product.slug || "").trim();
    if (!slug) return;
    const imageUrl = resolveImageUrl(product.imageUrl || product.imageUrls?.[0], apiOrigin);
    const title = product.name ? `${product.name} — GTshirt` : "Produk GTshirt";
    const description = product.description || product.verse || "Koleksi GTshirt terbaru dari GPT Tanjung Priok.";
    const url = `${siteUrl}/shop/${encodeURIComponent(slug)}`;
    sitemapEntries.push({ loc: url, lastmod: toIsoDate(product.updatedAt) });
    const html = applyMeta(baseHtml, {
      title,
      description,
      url,
      image: imageUrl || `${siteUrl}/img/gtshirt-og.jpg`,
      type: "product"
    });
    const productDir = path.join(distDir, "shop", slug);
    ensureDir(productDir);
    fs.writeFileSync(path.join(productDir, "index.html"), html);
  });

  const sitemapXml = buildSitemapXml(sitemapEntries);
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemapXml);

  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
  fs.writeFileSync(path.join(distDir, "robots.txt"), robotsTxt);

  console.log(`OG pages generated: shop (${products.length} products)`);
}

main().catch((error) => {
  console.error("OG generator failed:", error);
  process.exit(1);
});
