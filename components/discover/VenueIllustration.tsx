/**
 * Placeholder artwork for a venue page until the venue sends photos we may use.
 * Original Compass illustrations by venue type — no people, logos or mascots —
 * always labelled "Illustration" so parents never mistake them for photos.
 */

const ACCENT = "#B16B42";
const PINE = "#33503E";
const AMBER = "#A8763A";
const SAGE = "#8FA594";
const SAND = "#D9B98A";
const CREAM = "#FAF8F3";

const BUNTING: Array<[number, number, string]> = [
  [100, 66, AMBER], [200, 75, ACCENT], [300, 81, PINE], [400, 86, SAND], [500, 89, AMBER], [600, 90, ACCENT],
  [700, 89, PINE], [800, 86, SAND], [900, 81, AMBER], [1000, 75, ACCENT], [1100, 66, PINE],
];

const BALLS: Array<[number, number, string]> = [
  [800, 464, AMBER], [840, 464, PINE], [880, 464, ACCENT], [920, 464, SAND], [960, 464, SAGE], [1000, 464, AMBER],
  [770, 482, ACCENT], [798, 482, CREAM], [826, 482, AMBER], [854, 482, SAGE], [882, 482, PINE], [910, 482, SAND],
  [938, 482, ACCENT], [966, 482, CREAM], [994, 482, AMBER], [1022, 482, PINE], [1050, 482, SAGE],
  [756, 500, SAND], [786, 500, PINE], [816, 500, ACCENT], [846, 500, AMBER], [876, 500, CREAM], [906, 500, SAGE],
  [936, 500, AMBER], [966, 500, ACCENT], [996, 500, PINE], [1026, 500, SAND], [1056, 500, ACCENT],
];

function IndoorPlayground() {
  return (
    <svg viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="1200" height="675" fill="#EFEAE0" />
      <path d="M640 340 V190 A60 60 0 0 1 760 190 V340 Z" fill={CREAM} stroke="#E3DCCB" strokeWidth="8" />
      <path d="M880 340 V190 A60 60 0 0 1 1000 190 V340 Z" fill={CREAM} stroke="#E3DCCB" strokeWidth="8" />
      <circle cx="700" cy="330" r="46" fill={SAGE} opacity="0.55" />
      <circle cx="955" cy="335" r="52" fill={SAGE} opacity="0.55" />
      <path d="M40 60 Q600 120 1160 60" fill="none" stroke="#26241F" strokeOpacity="0.35" strokeWidth="3" />
      {BUNTING.map(([x, y, c]) => (
        <polygon key={x} points={`${x - 22},${y} ${x + 22},${y} ${x},${y + 40}`} fill={c} />
      ))}
      <rect y="560" width="1200" height="115" fill="#E3DCCB" />
      <rect y="560" width="1200" height="14" fill="#D8CFBB" />
      <line x1="280" y1="312" x2="170" y2="560" stroke={PINE} strokeWidth="6" strokeLinecap="round" />
      {[192, 214, 236, 258].map((x) => (
        <line key={x} x1="280" y1="312" x2={x} y2="560" stroke={SAGE} strokeWidth="3" />
      ))}
      {[[258, 360], [236, 410], [214, 460], [192, 510]].map(([x, y]) => (
        <line key={y} x1={x} y1={y} x2="280" y2={y} stroke={SAGE} strokeWidth="3" />
      ))}
      <rect x="272" y="190" width="16" height="372" rx="6" fill={PINE} />
      <rect x="508" y="190" width="16" height="372" rx="6" fill={PINE} />
      <polygon points="256,198 398,108 540,198" fill={ACCENT} />
      <rect x="288" y="206" width="220" height="94" fill={CREAM} opacity="0.6" />
      {[318, 352, 386, 420, 454, 488].map((x) => (
        <line key={x} x1={x} y1="206" x2={x} y2="300" stroke={SAGE} strokeWidth="3" />
      ))}
      <rect x="264" y="300" width="268" height="24" rx="12" fill={AMBER} />
      <rect x="264" y="420" width="268" height="24" rx="12" fill={AMBER} />
      <path d="M320 562 A78 78 0 0 1 476 562 Z" fill={SAND} />
      <path d="M350 562 A48 48 0 0 1 446 562 Z" fill="#B8AC93" />
      <path d="M526 312 C640 318 630 520 726 548" fill="none" stroke={ACCENT} strokeWidth="36" strokeLinecap="round" />
      <path d="M526 312 C640 318 630 520 726 548" fill="none" stroke={CREAM} strokeOpacity="0.35" strokeWidth="10" strokeLinecap="round" />
      {BALLS.map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="14" fill={c} stroke={c === CREAM ? "#D8CFBB" : undefined} strokeWidth={c === CREAM ? 2 : undefined} />
      ))}
      <rect x="730" y="500" width="350" height="72" rx="20" fill={PINE} />
      <rect x="746" y="512" width="318" height="8" rx="4" fill={SAGE} opacity="0.5" />
      <rect x="56" y="500" width="88" height="62" rx="12" fill={AMBER} />
      <rect x="74" y="448" width="62" height="52" rx="12" fill={SAGE} />
      <circle cx="1120" cy="540" r="22" fill={ACCENT} />
      <circle cx="1150" cy="550" r="12" fill={SAND} />
    </svg>
  );
}

/** Venue types that have an illustration. */
const ILLUSTRATED = new Set(["Indoor Playgrounds"]);

export function hasVenueIllustration(primaryType: string | null): boolean {
  return primaryType !== null && ILLUSTRATED.has(primaryType);
}

export function VenueIllustration({ primaryType }: { primaryType: string | null }) {
  if (!hasVenueIllustration(primaryType)) return null;
  return (
    <figure className="venue-hero">
      <IndoorPlayground />
      <figcaption>Illustration · venue photos coming soon</figcaption>
    </figure>
  );
}
