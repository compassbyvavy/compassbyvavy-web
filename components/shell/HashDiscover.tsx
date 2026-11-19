"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The old homepage used /#discover. Send that to the Discover hub. */
export function HashDiscover() {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash === "#discover") router.replace("/discover");
  }, [router]);
  return null;
}
