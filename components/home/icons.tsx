import type { HomeCategory } from "@/lib/home/home";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CategoryIcon({ name }: { name: HomeCategory["icon"] }) {
  return (
    <svg className="home-cat-icon" viewBox="0 0 32 32" aria-hidden="true" width="32" height="32">
      {paths(name)}
    </svg>
  );
}

function paths(name: HomeCategory["icon"]) {
  switch (name) {
    case "play":
      return (
        <>
          <path {...stroke} d="M6 14 L16 6 L26 14 V26 H6 Z" />
          <path {...stroke} d="M13 26 v-7 h6 v7" />
        </>
      );
    case "parks":
      return (
        <>
          <path {...stroke} d="M16 26 V14" />
          <path {...stroke} d="M16 16 C16 10 10 10 10 15 C7 15 6 18 8 20 C10 16 13 16 16 16 Z" />
          <path {...stroke} d="M16 14 C16 8 23 8 23 14 C26 14 27 17 24 19 C22 15 18 15 16 14 Z" />
        </>
      );
    case "camps":
      return (
        <>
          <path {...stroke} d="M6 24 L16 8 L26 24 Z" />
          <path {...stroke} d="M16 24 V16" />
          <path {...stroke} d="M4 24 H28" />
        </>
      );
    case "classes":
      return (
        <>
          <path {...stroke} d="M8 22 l8-4 8 4 -8 4 Z" />
          <path {...stroke} d="M8 22 V12 l8-4 8 4 v10" />
          <path {...stroke} d="M16 18 V8" />
        </>
      );
    case "events":
      return (
        <>
          <rect {...stroke} x="6" y="8" width="20" height="18" rx="2" />
          <path {...stroke} d="M6 13 H26 M11 6 v4 M21 6 v4" />
        </>
      );
    case "learning":
      return (
        <>
          <path {...stroke} d="M6 10 h8 a4 4 0 0 1 4 4 v10 H10 a4 4 0 0 0-4 4 Z" />
          <path {...stroke} d="M26 10 h-8 a4 4 0 0 0-4 4 v10 h8 a4 4 0 0 1 4 4 Z" />
        </>
      );
    case "food":
      return (
        <>
          <path {...stroke} d="M12 8 v6 a4 4 0 0 0 8 0 V8" />
          <path {...stroke} d="M16 18 v8 M12 26 h8" />
          <path {...stroke} d="M12 8 v4 M16 8 v4 M20 8 v4" />
        </>
      );
    case "getaways":
      return (
        <>
          <path {...stroke} d="M4 22 h24" />
          <path {...stroke} d="M7 22 l3-6 h9 l3 6" />
          <circle {...stroke} cx="10" cy="22" r="2" />
          <circle {...stroke} cx="22" cy="22" r="2" />
          <path {...stroke} d="M12 16 l3-4 h4" />
        </>
      );
  }
}
