import type { Metadata } from "next";
import Link from "next/link";
import { ShortlistProvider } from "@/components/shortlist/ShortlistProvider";
import { CommandMenu } from "@/components/site/CommandMenu";
import { OfflineCache } from "@/components/site/OfflineCache";
import { OpenSearchButton } from "@/components/site/OpenSearchButton";
import { SiteNav } from "@/components/site/SiteNav";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";
import "./globals.css";

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
  const catalog = await loadCampsCatalogForRequest();
  const providers = new Map((catalog?.providers ?? []).map((provider) => [provider.id, provider.name]));
  return (
    <html lang="en">
      <body>
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
          <header className="site-header">
            <div className="container header-inner">
              <Link className="brand" href="/" aria-label="Compass by Vavy home">
                <span className="brand-mark" aria-hidden="true">✦</span>
                <span>Compass by Vavy</span>
              </Link>
              <OpenSearchButton />
              <SiteNav />
            </div>
          </header>

          <main>{children}</main>

          <footer className="site-footer">
            <div className="container footer-grid">
              <div>
                <div className="brand footer-brand">
                  <span className="brand-mark" aria-hidden="true">✦</span>
                  <span>Compass by Vavy</span>
                </div>
                <p>Helping families discover meaningful adventures.</p>
              </div>
              <div className="footer-links">
                <a href="/#discover">Discover</a>
                <Link href="/camps">Camps</Link>
                <Link href="/saved">Saved</Link>
                <Link href="/saved/tracker">Tracker</Link>
                <Link href="/about">About</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <a href="mailto:hello@compassbyvavy.ca">Contact</a>
              </div>
            </div>
            <div className="container copyright">
              © {new Date().getFullYear()} Compass by Vavy. All rights reserved.
            </div>
          </footer>
        </ShortlistProvider>
      </body>
    </html>
  );
}
