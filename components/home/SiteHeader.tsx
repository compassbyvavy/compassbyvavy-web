import Link from "next/link";
import { Suspense } from "react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteSearchBar, SiteSearchBarShell } from "@/components/site/SiteSearchBar";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/">
          <img src="/brand/mark.svg" alt="" width={38} height={38} />
          <span className="brand-words">
            <span className="brand-compass">Compass</span>{" "}
            <span className="brand-by">by Vavy</span>
          </span>
        </Link>
        <div className="header-search">
          <Suspense fallback={<SiteSearchBarShell />}>
            <SiteSearchBar />
          </Suspense>
        </div>
        <SiteNav />
      </div>
    </header>
  );
}
