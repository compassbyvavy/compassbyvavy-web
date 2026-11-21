export type RedirectResult = {
  destination: string;
  status: 301 | 302;
};

const CATEGORY_REDIRECTS: Record<string, RedirectResult> = {
  parks: { destination: "/ontario/parks-nature", status: 301 },
  play: { destination: "/ontario/play-fun", status: 301 },
  learning: { destination: "/ontario/learning-culture", status: 301 },
  events: { destination: "/ontario/events", status: 301 },
  classes: { destination: "/ontario/classes-programs", status: 301 },
  food: { destination: "/ontario/food-treats", status: 301 },
  travel: { destination: "/ontario/day-trips-getaways", status: 301 },
  camps: { destination: "/ontario/camps", status: 301 },
  shopping: { destination: "/discover", status: 302 },
  services: { destination: "/discover", status: 302 },
};

/** Camp program slug → subcategory, from each program's primary_category. */
const CAMP_SUBCATEGORY: Record<string, string> = {
  "cooksmart-winter-holiday-cooking-camp": "/ontario/camps/language-leadership-cooking",
  "futures-gymnastics-winter-camp": "/ontario/camps/sports",
  "gymnastics-mississauga-holiday-camp": "/ontario/camps/sports",
  "magnitude-holiday-camp": "/ontario/camps/multi-activity",
  "ymca-mississauga-winter-break-day-camp": "/ontario/camps/winter-break",
};

/** Published or seeded indoor-play venue slug → its subcategory. */
const VENUE_SUBCATEGORY: Record<string, string> = {
  "amazing-fun-park": "/ontario/play-fun/indoor-playgrounds",
  "boogles-playhouse-square-one": "/ontario/play-fun/indoor-playgrounds",
  "sky-zone-mississauga": "/ontario/play-fun/trampoline-ninja",
};

function clean(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function redirectFor(pathname: string): RedirectResult | null {
  const path = clean(pathname);
  if (path === "/camps") return { destination: "/ontario/camps", status: 301 };
  if (path === "/camps/admin" || path.startsWith("/camps/admin/")) return null;
  // COOKSMART Format C only — every other /camps path keeps main's redirect behaviour.
  if (path === "/camps/cooksmart-winter" || path === "/camps/preview/cooksmart-winter") return null;
  if (path === "/camps/preview") return { destination: "/ontario/camps", status: 302 };
  if (path.startsWith("/camps/")) {
    const slug = path.slice("/camps/".length).split("/")[0];
    return {
      destination: CAMP_SUBCATEGORY[slug] ?? "/ontario/camps",
      status: 302,
    };
  }

  if (path === "/learn") return { destination: "/guides", status: 301 };
  if (path === "/learn/space-mission-scavenger-hunt") {
    return { destination: "/guides/printables/space-mission-scavenger-hunt", status: 301 };
  }
  if (path.startsWith("/learn/")) return { destination: "/guides", status: 301 };

  if (path === "/saved") return { destination: "/plan/saved", status: 301 };
  if (path === "/saved/tracker") return { destination: "/plan", status: 301 };
  if (path === "/saved/compare") return { destination: "/plan", status: 302 };
  if (path.startsWith("/saved/")) return { destination: "/plan/saved", status: 301 };

  if (path === "/calendar") return { destination: "/plan", status: 302 };
  if (path === "/sign-in") return { destination: "/waitlist", status: 302 };

  if (path === "/discover/access" || path === "/discover/ages") {
    return { destination: "/discover", status: 302 };
  }
  if (path.startsWith("/discover/access/") || path.startsWith("/discover/ages/")) {
    return { destination: "/discover", status: 302 };
  }

  if (path === "/discover" || path === "/") return null;
  if (!path.startsWith("/discover/")) return null;

  const rest = path.slice("/discover/".length);
  const [category, ...more] = rest.split("/");
  const mapped = CATEGORY_REDIRECTS[category];
  if (!mapped) return { destination: "/discover", status: 302 };
  if (more.length === 0) return mapped;

  const venue = more[more.length - 1];
  if (VENUE_SUBCATEGORY[venue]) {
    return { destination: VENUE_SUBCATEGORY[venue], status: 302 };
  }
  if (category === "play" && more[0] === "indoor") {
    return { destination: "/ontario/play-fun/indoor-playgrounds", status: 302 };
  }
  return { destination: mapped.destination, status: 302 };
}

export function campRedirects(): Record<string, string> {
  return { ...CAMP_SUBCATEGORY };
}

export function venueRedirects(): Record<string, string> {
  return { ...VENUE_SUBCATEGORY };
}
