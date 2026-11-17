import type { Metadata } from "next";
import { headers } from "next/headers";
import { ShortlistProvider } from "@/components/shortlist/ShortlistProvider";
import { CommandMenu } from "@/components/site/CommandMenu";
import { OfflineCache } from "@/components/site/OfflineCache";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { loadCampsCatalogForLayout } from "@/lib/camps/catalog";
import { campsFontVariables } from "@/lib/camps/fonts";
import "./globals.css";
import "@/components/home/home.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://compassbyvavy.ca"),
  title: {
    default: "Compass by Vavy | Family Adventures Made Easy",
    template: "%s | Compass by Vavy",
  },
  description:
    "Discover parks, splash pads, indoor play, events, classes, camps and family getaways across Canada.",
  keywords: [
    "family activities",
    "kids activities",
    "parks",
    "splash pads",
    "family events",
    "camps",
    "classes",
    "Ontario families",
  ],
  openGraph: {
    title: "Compass by Vavy",
    description: "Helping families discover amazing adventures.",
    url: "https://compassbyvavy.ca",
    siteName: "Compass by Vavy",
    type: "website",
    locale: "en_CA",
    images: [{ url: "/brand/mark-on-green.png", width: 1080, height: 1080, alt: "Compass by Vavy" }],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const hostname = (await headers()).get("host");
  const catalog = loadCampsCatalogForLayout({ hostname });
  const providers = new Map((catalog?.providers ?? []).map((provider) => [provider.id, provider.name]));
  return (
    <html lang="en">
      <body className={campsFontVariables}>
        <ShortlistProvider>
          <CommandMenu
            camps={(catalog?.programs ?? []).map((program) => ({
              id: program.id,
              slug: program.slug,
              name: program.name,
              providerName: providers.get(program.providerId) ?? null,
            }))}
          />
          <OfflineCache />
          <SiteHeader />

          <main>{children}</main>

          <SiteFooter />
        </ShortlistProvider>
      </body>
    </html>
  );
}
