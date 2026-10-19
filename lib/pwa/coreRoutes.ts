/** Routes the service worker precaches. Keep public/sw.js in step with this list. */

export const PWA_CACHE_NAME = "compass-core-v1";

export const PWA_CORE_ROUTES = [
  "/",
  "/camps",
  "/saved",
  "/about",
  "/offline.html",
] as const;

export const OFFLINE_BADGE = "Offline Mode - Displaying cached data";
