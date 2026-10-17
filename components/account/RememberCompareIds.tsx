"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { COMPARE_IDS_KEY } from "@/lib/account/guestState";

export function RememberCompareIds() {
  const params = useSearchParams();
  useEffect(() => {
    const raw = params.get("sessions");
    if (!raw) return;
    window.sessionStorage.setItem(COMPARE_IDS_KEY, raw);
  }, [params]);
  return null;
}
