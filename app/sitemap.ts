import type { MetadataRoute } from "next";
import { publicCategories } from "@/lib/taxonomy/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://compassbyvavy.ca";
  const paths = [
    "/",
    "/discover",
    ...publicCategories().map((category) => `/ontario/${category.slug}`),
    "/guides",
    "/guides/printables/space-mission-scavenger-hunt",
    "/plan",
    "/shop",
    "/shop/quebec-city-ages-6-8",
    "/account",
    "/everything",
    "/about",
    "/how-we-check",
    "/for-camps",
    "/contact",
    "/privacy",
    "/terms",
    "/accessibility",
    "/waitlist",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
