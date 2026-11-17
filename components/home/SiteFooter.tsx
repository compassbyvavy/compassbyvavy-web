import Link from "next/link";
import { UNBUILT_LINKS } from "@/lib/home/home";

const unbuilt = Object.fromEntries(UNBUILT_LINKS.map((link) => [link.label, link.href]));

export function SiteFooter() {
  return (
    <footer className="home-footer">
      <div className="container home-footer-grid">
        <div>
          <Link className="home-footer-brand" href="/">
            <img src="/brand/mark.svg" alt="" width={40} height={42} />
            <span>Compass by Vavy</span>
          </Link>
          <p>Family fun, found and checked by a parent. Made in Mississauga.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <a href="/#discover">Discover</a>
          <a href="/#plan">Plan</a>
          <Link href="/learn">Learn</Link>
          <a href={unbuilt.Shop}>Shop</a>
        </div>
        <div>
          <h2>Compass</h2>
          <Link href="/about">About</Link>
          <a href="/#trust">Vavy-checked</a>
          <a href="mailto:hello@compassbyvavy.ca">Contact</a>
        </div>
        <div>
          <h2>For camps and venues</h2>
          <a href={unbuilt["List your camp for free"]}>List your camp for free</a>
          <a href={unbuilt["Update your listing"]}>Update your listing</a>
        </div>
        <div>
          <h2>Follow</h2>
          <a href="https://www.instagram.com/compassbyvavy/">Instagram @compassbyvavy</a>
        </div>
      </div>
      <div className="container home-footer-base">
        <span>© 2026 Compass by Vavy</span>
        <span aria-hidden="true">·</span>
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">Terms</Link>
      </div>
    </footer>
  );
}
