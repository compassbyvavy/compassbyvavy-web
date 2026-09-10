"use client";

import Link from "next/link";
import { useShortlist } from "@/components/shortlist/ShortlistProvider";

export function SavedNavLink() {
  const { hydrated, savedCount } = useShortlist();
  return (
    <Link href="/saved" className="nav-saved">
      Saved
      {hydrated && savedCount > 0 ? (
        <span className="nav-count" aria-label={`${savedCount} saved`}>
          {savedCount}
        </span>
      ) : null}
    </Link>
  );
}
