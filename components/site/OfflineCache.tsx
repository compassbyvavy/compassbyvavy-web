"use client";

import { useEffect, useState } from "react";
import { OFFLINE_BADGE, PWA_CORE_ROUTES } from "@/lib/pwa/coreRoutes";

export function OfflineCache() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if (navigator.onLine) {
      for (const route of PWA_CORE_ROUTES) {
        if (route.endsWith(".html")) continue;
        fetch(route).catch(() => undefined);
      }
    }

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <p className="offline-badge" role="status">
      {OFFLINE_BADGE}
    </p>
  );
}
