import type { Metadata } from "next";
import Link from "next/link";
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" href="/" aria-label="Compass by Vavy home">
              <span className="brand-mark" aria-hidden="true">✦</span>
              <span>Compass by Vavy</span>
            </Link>
            <nav className="nav" aria-label="Main navigation">
              <a href="/#discover">Discover</a>
              <a href="/#how-it-works">How it works</a>
              <Link href="/about">About</Link>
              <a className="nav-cta" href="mailto:hello@compassbyvavy.ca?subject=Join%20the%20Compass%20by%20Vavy%20waitlist">
                Join waitlist
              </a>
            </nav>
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
      </body>
    </html>
  );
}
