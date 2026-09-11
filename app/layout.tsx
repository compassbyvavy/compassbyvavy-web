import type { Metadata } from "next";
import Link from "next/link";
import { ShortlistProvider } from "@/components/shortlist/ShortlistProvider";
import { SavedNavLink } from "@/components/site/SavedNavLink";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://compassbyvavy.ca"),
  title: {
    default: "Compass by Vavy | Family Adventures Made Easy",
    template: "%s | Compass by Vavy",
  },
  description:
    "Household intelligence for parents: discover, choose, and organize. Start with Mississauga camps — public browse, no account required.",
  keywords: [
    "family activities",
    "kids activities",
    "parks",
    "splash pads",
    "family events",
    "camps",
    "classes",
    "Ontario families",
    "Mississauga camps",
  ],
  openGraph: {
    title: "Compass by Vavy",
    description:
      "Weekend clarity for parents — starting with Mississauga camps you can actually compare.",
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
        <ShortlistProvider>
          <header className="site-header">
            <div className="container header-inner">
              <Link className="brand" href="/" aria-label="Compass by Vavy home">
                <span className="brand-mark" aria-hidden="true">✦</span>
                <span>Compass by Vavy</span>
              </Link>
              <nav className="nav" aria-label="Main navigation">
                <a className="nav-link" href="/#discover">
                  Discover
                </a>
                <Link className="nav-link" href="/camps">
                  Camps
                </Link>
                <SavedNavLink />
                <Link href="/saved/tracker" className="nav-link">
                  Tracker
                </Link>
                <Link className="nav-link nav-link-secondary" href="/about">
                  About
                </Link>
                <a
                  className="nav-cta"
                  href="mailto:hello@compassbyvavy.ca?subject=Join%20the%20Compass%20by%20Vavy%20waitlist"
                >
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
                <p>Helping families find a clearer weekend — without overclaiming.</p>
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
