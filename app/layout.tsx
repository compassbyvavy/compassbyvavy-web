import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter, SiteHeader, type SearchEntry } from "@/components/shell/SiteChrome";
import { OfflineCache } from "@/components/site/OfflineCache";
import { campsFontVariables } from "@/lib/camps/fonts";
import { requestCity } from "@/lib/shell/city";
import { locationOptions, publicCategories, subcategoriesFor } from "@/lib/taxonomy/catalog";
import "./globals.css";
import "./shell.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://compassbyvavy.ca"),
  title: {
    default: "Compass by Vavy",
    template: "%s | Compass by Vavy",
  },
  description: "Family fun across Ontario, checked by a parent.",
  openGraph: {
    title: "Compass by Vavy",
    description: "Family fun across Ontario, checked by a parent.",
    url: "https://compassbyvavy.ca",
    siteName: "Compass by Vavy",
    type: "website",
    locale: "en_CA",
    images: [{ url: "/brand/mark-on-green.png", alt: "Compass by Vavy" }],
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [{ url: "/brand/mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/mark-on-green.png" }],
  },
  manifest: "/manifest.webmanifest",
};

function searchEntries(): SearchEntry[] {
  return publicCategories().flatMap((category) => [
    { name: category.name, kind: "category" as const, categorySlug: category.slug },
    ...subcategoriesFor(category.id).map((row) => ({
      name: row.name,
      kind: "subcategory" as const,
      categorySlug: category.slug,
      subcategorySlug: row.slug,
      parentName: category.name,
    })),
  ]);
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const city = await requestCity();
  return (
    <html lang="en">
      <body className={campsFontVariables}>
        <Suspense fallback={null}>
          <SiteHeader city={city.slug} locations={locationOptions()} entries={searchEntries()} />
        </Suspense>
        <OfflineCache />
        <main>{children}</main>
        <SiteFooter city={city.slug} cityName={city.name} />
      </body>
    </html>
  );
}
