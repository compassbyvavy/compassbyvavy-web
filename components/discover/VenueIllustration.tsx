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

const BIRCH = "#E2C9A0";
const BIRCH_EDGE = "#C9A877";

/** A calm, Montessori-style playroom: open wooden shelves, a low table with stools, an easel and a rug. */
function Playroom() {
  return (
    <svg viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="1200" height="675" fill="#EFEAE0" />
      {/* Ring lights */}
      <line x1="560" y1="0" x2="560" y2="58" stroke="#26241F" strokeOpacity="0.3" strokeWidth="2" />
      <ellipse cx="560" cy="70" rx="90" ry="16" fill="none" stroke={CREAM} strokeWidth="12" />
      <ellipse cx="560" cy="70" rx="90" ry="16" fill="none" stroke="#E3DCCB" strokeWidth="3" />
      <line x1="790" y1="0" x2="790" y2="48" stroke="#26241F" strokeOpacity="0.3" strokeWidth="2" />
      <ellipse cx="790" cy="58" rx="60" ry="11" fill="none" stroke={CREAM} strokeWidth="10" />
      <ellipse cx="790" cy="58" rx="60" ry="11" fill="none" stroke="#E3DCCB" strokeWidth="3" />
      {/* Window */}
      <path d="M880 330 V200 A70 70 0 0 1 1020 200 V330 Z" fill={CREAM} stroke="#E3DCCB" strokeWidth="8" />
      <line x1="950" y1="132" x2="950" y2="330" stroke="#E3DCCB" strokeWidth="5" />
      {/* Floor and rug */}
      <rect y="560" width="1200" height="115" fill="#E3DCCB" />
      <rect y="560" width="1200" height="12" fill="#D8CFBB" />
      <ellipse cx="700" cy="610" rx="250" ry="40" fill={SAGE} opacity="0.45" />
      {/* Open shelves */}
      <rect x="90" y="240" width="380" height="322" rx="10" fill={BIRCH} />
      <rect x="104" y="254" width="352" height="294" rx="6" fill="#F3E6CF" />
      {[330, 420, 500].map((y) => (
        <rect key={y} x="98" y={y} width="364" height="12" rx="4" fill={BIRCH_EDGE} />
      ))}
      <rect x="276" y="254" width="8" height="294" fill={BIRCH} />
      {/* Top shelf: a rainbow stacker and paint pots */}
      {[[60, ACCENT], [46, AMBER], [32, SAND], [18, SAGE]].map(([r, c]) => (
        <path key={String(r)} d={`M${190 - Number(r)} 330 A${r} ${r} 0 0 1 ${190 + Number(r)} 330`} fill="none" stroke={String(c)} strokeWidth="13" />
      ))}
      {[[300, ACCENT], [336, PINE], [372, AMBER], [408, SAGE]].map(([x, c]) => (
        <g key={String(x)}>
          <rect x={Number(x)} y="282" width="26" height="48" rx="6" fill={String(c)} />
          <rect x={Number(x) + 4} y="274" width="18" height="10" rx="3" fill={CREAM} />
        </g>
      ))}
      {/* Middle shelf: blocks and baskets */}
      <rect x="130" y="380" width="40" height="40" rx="4" fill={AMBER} />
      <rect x="174" y="380" width="40" height="40" rx="4" fill={PINE} />
      <rect x="152" y="342" width="40" height="38" rx="4" fill={ACCENT} />
      <rect x="300" y="372" width="140" height="48" rx="10" fill={SAND} />
      {[316, 346, 376, 406].map((x) => (
        <line key={x} x1={x} y1="378" x2={x + 14} y2="414" stroke={BIRCH_EDGE} strokeWidth="3" />
      ))}
      {/* Bottom shelf: books and a plant */}
      {[[124, PINE], [146, AMBER], [168, ACCENT], [190, SAGE]].map(([x, c]) => (
        <rect key={String(x)} x={Number(x)} y="440" width="18" height="60" rx="3" fill={String(c)} />
      ))}
      <rect x="340" y="462" width="56" height="38" rx="8" fill={CREAM} stroke="#D8CFBB" strokeWidth="2" />
      <path d="M368 462 C350 430 330 430 324 420 M368 462 C372 425 392 418 404 410 M368 462 C362 436 368 420 366 404" fill="none" stroke={PINE} strokeWidth="6" strokeLinecap="round" />
      {/* Low table, stools and a tray */}
      <rect x="540" y="452" width="330" height="18" rx="9" fill={BIRCH_EDGE} />
      <rect x="560" y="470" width="14" height="90" rx="4" fill={BIRCH_EDGE} />
      <rect x="836" y="470" width="14" height="90" rx="4" fill={BIRCH_EDGE} />
      <rect x="640" y="430" width="150" height="22" rx="6" fill={BIRCH} />
      {[[668, ACCENT], [700, SAGE], [732, AMBER], [764, PINE]].map(([x, c]) => (
        <circle key={String(x)} cx={Number(x)} cy="441" r="8" fill={String(c)} />
      ))}
      <rect x="480" y="500" width="70" height="14" rx="7" fill={AMBER} />
      <rect x="490" y="514" width="10" height="46" fill={AMBER} />
      <rect x="530" y="514" width="10" height="46" fill={AMBER} />
      <rect x="880" y="500" width="70" height="14" rx="7" fill={AMBER} />
      <rect x="890" y="514" width="10" height="46" fill={AMBER} />
      <rect x="930" y="514" width="10" height="46" fill={AMBER} />
      {/* Easel with a painting */}
      <line x1="1060" y1="300" x2="1010" y2="560" stroke={BIRCH_EDGE} strokeWidth="10" strokeLinecap="round" />
      <line x1="1060" y1="300" x2="1110" y2="560" stroke={BIRCH_EDGE} strokeWidth="10" strokeLinecap="round" />
      <rect x="1000" y="330" width="120" height="140" rx="4" fill={CREAM} stroke="#D8CFBB" strokeWidth="3" />
      <circle cx="1040" cy="372" r="18" fill={AMBER} />
      <path d="M1012 452 C1040 410 1070 430 1108 400" fill="none" stroke={SAGE} strokeWidth="10" strokeLinecap="round" />
      <path d="M1020 430 C1050 440 1080 420 1100 440" fill="none" stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      <rect x="1000" y="470" width="120" height="10" rx="4" fill={BIRCH} />
    </svg>
  );
}

/** A glow-in-the-dark play park: light-up floor, ride-on car, coaster track, play wall, stage and ball pit. */
function GlowPlay() {
  return (
      <svg viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="1200" height="675" fill="#1C2A22" />
      <ellipse cx="40" cy="30" rx="170" ry="52" transform="rotate(28 40 30)" fill="#33503E" />
      <ellipse cx="150" cy="-10" rx="150" ry="44" transform="rotate(8 150 -10)" fill="#2A4234" />
      <ellipse cx="10" cy="150" rx="120" ry="38" transform="rotate(62 10 150)" fill="#2A4234" />
      <ellipse cx="1170" cy="30" rx="170" ry="52" transform="rotate(-28 1170 30)" fill="#33503E" />
      <ellipse cx="1050" cy="-10" rx="150" ry="44" transform="rotate(-8 1050 -10)" fill="#2A4234" />
      <ellipse cx="1195" cy="160" rx="120" ry="38" transform="rotate(-62 1195 160)" fill="#2A4234" />
      <line x1="390" y1="0" x2="390" y2="190" stroke="#33503E" strokeWidth="5" />
      <ellipse cx="402" cy="80" rx="18" ry="8" transform="rotate(30 402 80)" fill="#8FA594" />
      <ellipse cx="378" cy="140" rx="18" ry="8" transform="rotate(-30 378 140)" fill="#8FA594" />
      <line x1="800" y1="0" x2="800" y2="160" stroke="#33503E" strokeWidth="5" />
      <ellipse cx="812" cy="70" rx="18" ry="8" transform="rotate(30 812 70)" fill="#8FA594" />
      <ellipse cx="788" cy="120" rx="18" ry="8" transform="rotate(-30 788 120)" fill="#8FA594" />
      <rect x="470" y="160" width="300" height="160" rx="14" fill="#8FA594" opacity="0.18" />
      <rect x="482" y="172" width="276" height="136" rx="10" fill="#2E4A3A" />
      <circle cx="520" cy="210" r="10" fill={ACCENT} />
      <circle cx="560" cy="252" r="14" fill="#E9D9A6" />
      <circle cx="612" cy="200" r="8" fill="#8FA594" />
      <circle cx="664" cy="262" r="12" fill="#A8763A" />
      <circle cx="712" cy="206" r="10" fill="#E9D9A6" />
      <circle cx="736" cy="276" r="7" fill={ACCENT} />
      <circle cx="592" cy="288" r="6" fill="#D9B98A" />
      <path d="M0 380 C200 300 300 420 450 340 S700 200 820 300 S1050 380 1200 290" fill="none" stroke="#8FA594" strokeOpacity="0.18" strokeWidth="26" />
      <path d="M0 380 C200 300 300 420 450 340 S700 200 820 300 S1050 380 1200 290" fill="none" stroke="#8FA594" strokeWidth="6" />
      <path d="M0 396 C200 316 300 436 450 356 S700 216 820 316 S1050 396 1200 306" fill="none" stroke="#8FA594" strokeOpacity="0.6" strokeWidth="4" />
      <rect x="600" y="236" width="70" height="30" rx="12" transform="rotate(-22 635 251)" fill="#D9B98A" />
      <circle cx="618" cy="270" r="6" fill="#142019" />
      <circle cx="656" cy="255" r="6" fill="#142019" />
      <circle cx="560" cy="150" r="16" fill="#D9B98A" opacity="0.25" /><circle cx="560" cy="150" r="5" fill="#E9D9A6" />
      <circle cx="980" cy="200" r="16" fill="#D9B98A" opacity="0.25" /><circle cx="980" cy="200" r="5" fill="#E9D9A6" />
      <circle cx="240" cy="230" r="16" fill="#D9B98A" opacity="0.25" /><circle cx="240" cy="230" r="5" fill="#E9D9A6" />
      <circle cx="700" cy="410" r="14" fill={ACCENT} opacity="0.3" /><circle cx="700" cy="410" r="4" fill={ACCENT} />
      <circle cx="1100" cy="420" r="14" fill="#D9B98A" opacity="0.25" /><circle cx="1100" cy="420" r="4" fill="#E9D9A6" />
      <ellipse cx="555" cy="440" rx="110" ry="20" fill="#D9B98A" opacity="0.18" />
      <rect x="470" y="440" width="170" height="30" rx="8" fill="#33503E" />
      <line x1="555" y1="440" x2="555" y2="378" stroke="#E9D9A6" strokeWidth="4" strokeLinecap="round" />
      <line x1="538" y1="440" x2="572" y2="440" stroke="#E9D9A6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="555" cy="372" r="14" fill="#E9D9A6" opacity="0.3" />
      <circle cx="555" cy="372" r="7" fill="#E9D9A6" />
      <rect x="0" y="470" width="1200" height="205" fill="#142019" />
      <rect x="112" y="492" width="116" height="50" rx="12" fill="#A8763A" opacity="0.25" /><rect x="120" y="500" width="100" height="34" rx="8" fill="#A8763A" />
      <rect x="232" y="492" width="116" height="50" rx="12" fill="#8FA594" opacity="0.25" /><rect x="240" y="500" width="100" height="34" rx="8" fill="#8FA594" />
      <rect x="352" y="492" width="116" height="50" rx="12" fill={ACCENT} opacity="0.25" /><rect x="360" y="500" width="100" height="34" rx="8" fill={ACCENT} />
      <rect x="472" y="492" width="116" height="50" rx="12" fill="#E9D9A6" opacity="0.2" /><rect x="480" y="500" width="100" height="34" rx="8" fill="#E9D9A6" />
      <rect x="592" y="492" width="116" height="50" rx="12" fill="#A8763A" opacity="0.25" /><rect x="600" y="500" width="100" height="34" rx="8" fill="#A8763A" />
      <rect x="712" y="492" width="116" height="50" rx="12" fill="#8FA594" opacity="0.25" /><rect x="720" y="500" width="100" height="34" rx="8" fill="#8FA594" />
      <rect x="52" y="540" width="136" height="58" rx="12" fill={ACCENT} opacity="0.25" /><rect x="60" y="548" width="120" height="42" rx="8" fill={ACCENT} />
      <rect x="192" y="540" width="136" height="58" rx="12" fill="#E9D9A6" opacity="0.2" /><rect x="200" y="548" width="120" height="42" rx="8" fill="#E9D9A6" />
      <rect x="332" y="540" width="136" height="58" rx="12" fill="#A8763A" opacity="0.25" /><rect x="340" y="548" width="120" height="42" rx="8" fill="#A8763A" />
      <rect x="472" y="540" width="136" height="58" rx="12" fill="#8FA594" opacity="0.25" /><rect x="480" y="548" width="120" height="42" rx="8" fill="#8FA594" />
      <rect x="612" y="540" width="136" height="58" rx="12" fill={ACCENT} opacity="0.25" /><rect x="620" y="548" width="120" height="42" rx="8" fill={ACCENT} />
      <rect x="752" y="540" width="136" height="58" rx="12" fill="#E9D9A6" opacity="0.2" /><rect x="760" y="548" width="120" height="42" rx="8" fill="#E9D9A6" />
      <rect x="892" y="540" width="136" height="58" rx="12" fill="#A8763A" opacity="0.25" /><rect x="900" y="548" width="120" height="42" rx="8" fill="#A8763A" />
      <rect x="1032" y="540" width="136" height="58" rx="12" fill="#8FA594" opacity="0.25" /><rect x="1040" y="548" width="120" height="42" rx="8" fill="#8FA594" />
      <rect x="-8" y="596" width="156" height="68" rx="12" fill="#8FA594" opacity="0.25" /><rect x="0" y="604" width="140" height="52" rx="8" fill="#8FA594" />
      <rect x="152" y="596" width="156" height="68" rx="12" fill="#A8763A" opacity="0.25" /><rect x="160" y="604" width="140" height="52" rx="8" fill="#A8763A" />
      <rect x="312" y="596" width="156" height="68" rx="12" fill="#E9D9A6" opacity="0.2" /><rect x="320" y="604" width="140" height="52" rx="8" fill="#E9D9A6" />
      <rect x="472" y="596" width="156" height="68" rx="12" fill={ACCENT} opacity="0.25" /><rect x="480" y="604" width="140" height="52" rx="8" fill={ACCENT} />
      <rect x="632" y="596" width="156" height="68" rx="12" fill="#8FA594" opacity="0.25" /><rect x="640" y="604" width="140" height="52" rx="8" fill="#8FA594" />
      <rect x="792" y="596" width="156" height="68" rx="12" fill="#A8763A" opacity="0.25" /><rect x="800" y="604" width="140" height="52" rx="8" fill="#A8763A" />
      <rect x="952" y="596" width="156" height="68" rx="12" fill="#E9D9A6" opacity="0.2" /><rect x="960" y="604" width="140" height="52" rx="8" fill="#E9D9A6" />
      <rect x="1112" y="596" width="156" height="68" rx="12" fill={ACCENT} opacity="0.25" /><rect x="1120" y="604" width="140" height="52" rx="8" fill={ACCENT} />
      <rect x="122" y="440" width="216" height="98" rx="34" fill="none" stroke="#D9B98A" strokeOpacity="0.35" strokeWidth="8" />
      <rect x="175" y="430" width="110" height="46" rx="20" fill="#E9D9A6" opacity="0.92" />
      <rect x="130" y="466" width="200" height="56" rx="24" fill={ACCENT} />
      <circle cx="334" cy="488" r="24" fill="#E9D9A6" opacity="0.3" />
      <circle cx="330" cy="488" r="8" fill="#E9D9A6" />
      <circle cx="178" cy="526" r="19" fill="#142019" stroke="#D9B98A" strokeWidth="4" />
      <circle cx="288" cy="526" r="19" fill="#142019" stroke="#D9B98A" strokeWidth="4" />
      <circle cx="860" cy="446" r="15" fill={ACCENT} />
      <circle cx="892" cy="440" r="15" fill="#E9D9A6" />
      <circle cx="924" cy="446" r="15" fill="#8FA594" />
      <circle cx="956" cy="438" r="15" fill="#A8763A" />
      <circle cx="988" cy="446" r="15" fill={ACCENT} />
      <circle cx="1020" cy="440" r="15" fill="#E9D9A6" />
      <circle cx="1052" cy="446" r="15" fill="#8FA594" />
      <circle cx="1084" cy="442" r="15" fill="#A8763A" />
      <circle cx="876" cy="420" r="15" fill="#A8763A" />
      <circle cx="940" cy="418" r="15" fill={ACCENT} />
      <circle cx="1004" cy="420" r="15" fill="#E9D9A6" />
      <circle cx="1068" cy="418" r="15" fill="#8FA594" />
      <rect x="830" y="452" width="290" height="70" rx="20" fill="#142019" stroke="#8FA594" strokeWidth="4" />
      <rect x="822" y="444" width="306" height="86" rx="26" fill="none" stroke="#8FA594" strokeOpacity="0.25" strokeWidth="8" />
      </svg>
  );
}

/** Venue types that have an illustration. */
const ILLUSTRATED = new Set(["Indoor Playgrounds"]);

export function hasVenueIllustration(primaryType: string | null): boolean {
  return primaryType !== null && ILLUSTRATED.has(primaryType);
}

/**
 * glow: for venues whose own description is about glowing play (e.g. a
 * glow-in-the-dark amusement park). playroom: for a calm, Montessori-style
 * playroom rather than a climbing structure. Otherwise the daytime playground.
 */
export function VenueIllustration({
  primaryType,
  glow = false,
  playroom = false,
}: {
  primaryType: string | null;
  glow?: boolean;
  playroom?: boolean;
}) {
  if (!hasVenueIllustration(primaryType)) return null;
  return (
    <figure className={glow ? "venue-hero is-glow" : "venue-hero"}>
      {glow ? <GlowPlay /> : playroom ? <Playroom /> : <IndoorPlayground />}
      <figcaption>Illustration · venue photos coming soon</figcaption>
    </figure>
  );
}
