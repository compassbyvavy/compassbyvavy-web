"use client";

import { useEffect } from "react";
import { rememberView } from "@/lib/account/guestState";

export function ViewHistoryRecorder({
  listingId,
  href,
}: {
  listingId: string;
  href: string;
}) {
  useEffect(() => {
    rememberView(window.localStorage, {
      listingId,
      href,
      viewedAt: new Date().toISOString(),
    });
  }, [listingId, href]);
  return null;
}
