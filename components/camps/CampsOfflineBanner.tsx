"use client";

import { useEffect, useState } from "react";

export function CampsOfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <p className="camps-offline-banner" role="status">
      You are offline. Compass is not refreshing directory data — this is not a
      live cache of every camp.
    </p>
  );
}
