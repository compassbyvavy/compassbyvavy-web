import type { DueRef, SpotAdapter, SpotReading } from "../types";

type Variant = {
  soldOut?: boolean;
  unlimited?: boolean;
  qtyInStock?: number;
};

type Product = {
  soldOut?: boolean;
  variants?: Variant[];
};

function productFromHtml(body: string): Product | null {
  const raw = /data-context="([^"]+)"/.exec(body)?.[1];
  if (!raw) return null;
  const decoded = raw
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  try {
    const payload = JSON.parse(decoded) as { product?: Product };
    return payload.product ?? null;
  } catch {
    return null;
  }
}

export const squarespace: SpotAdapter = {
  pageUrl(ref: DueRef): string {
    const url = typeof ref.externalRef.url === "string" ? ref.externalRef.url : "";
    if (/[?&]format=json/i.test(url)) return "";
    return url;
  },

  parse(ref: DueRef, body: string): SpotReading | { error: string } {
    const source = squarespace.pageUrl(ref);
    const availability = /property="product:availability"\s+content="([^"]+)"/i.exec(body)?.[1]?.toLowerCase() ?? "";
    const product = productFromHtml(body);
    if (!product) return { error: "squarespace page had no product" };
    if (product.soldOut === true || availability === "oos" || availability === "outofstock") {
      return { spots_left: null, state: "full", source_url: source };
    }
    const counted = (product.variants ?? []).filter((variant) => variant.unlimited !== true && typeof variant.qtyInStock === "number");
    if (counted.length === 1 && availability === "instock") {
      const qty = counted[0]?.qtyInStock ?? 0;
      if (qty <= 0) return { spots_left: 0, state: "full", source_url: source };
      return { spots_left: qty, state: "available", source_url: source };
    }
    if (availability === "instock" || product.soldOut === false) {
      return { spots_left: null, state: "available", source_url: source };
    }
    return { error: "squarespace page did not say in stock or sold out" };
  },
};
