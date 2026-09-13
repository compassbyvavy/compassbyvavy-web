/**
 * SSRF guard for camp source fetching.
 *
 * Registered source URLs are operator data, and operator data can be wrong or
 * hostile: a redirect chain, a typo, or a pasted internal link must never turn
 * the ingestion runner into a proxy for our own network. Every hop is checked
 * before a socket is opened, and again after any redirect.
 *
 * Rules: only `http`/`https`, only ports 80/443, no credentials in the URL, and
 * no loopback / private / link-local / cloud-metadata / internal-suffix hosts.
 * Deny by default — an address we cannot classify as public is refused.
 */

/** Identifies Compass to providers, with a contact path. */
export const COMPASS_CAMP_FETCH_USER_AGENT =
  "CompassByVavyCampsBot/1.0 (+https://compassbyvavy.com; camps ingestion; contact: hello@compassbyvavy.com)";

export const ALLOWED_FETCH_PROTOCOLS: readonly string[] = ["http:", "https:"];
export const ALLOWED_FETCH_PORTS: readonly string[] = ["", "80", "443"];

export type UnsafeFetchReason =
  | "invalid_url"
  | "unsupported_scheme"
  | "missing_host"
  | "embedded_credentials"
  | "blocked_port"
  | "blocked_hostname"
  | "unspecified_address"
  | "loopback_address"
  | "private_address"
  | "link_local_address"
  | "metadata_address"
  | "unique_local_address"
  | "multicast_or_reserved_address";

export class UnsafeFetchTargetError extends Error {
  readonly reason: UnsafeFetchReason;
  readonly target: string;

  constructor(reason: UnsafeFetchReason, target: string, detail?: string) {
    super(`Refused to fetch ${target}: ${reason}${detail ? ` (${detail})` : ""}`);
    this.name = "UnsafeFetchTargetError";
    this.reason = reason;
    this.target = target;
  }
}

/** Hostname suffixes that only ever resolve inside a private network. */
const BLOCKED_HOST_SUFFIXES: readonly string[] = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home.arpa",
];

const BLOCKED_HOST_NAMES: ReadonlySet<string> = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "ip6-localhost",
  "ip6-loopback",
]);

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

function classifyIpv4(octets: readonly number[]): UnsafeFetchReason | null {
  const [a, b] = octets;
  if (a === 0) return "unspecified_address";
  if (a === 127) return "loopback_address";
  if (a === 169 && b === 254) {
    // 169.254.169.254 is the cloud instance metadata endpoint.
    return octets[2] === 169 && octets[3] === 254
      ? "metadata_address"
      : "link_local_address";
  }
  if (a === 10) return "private_address";
  if (a === 172 && b >= 16 && b <= 31) return "private_address";
  if (a === 192 && b === 168) return "private_address";
  if (a === 100 && b >= 64 && b <= 127) return "private_address";
  if (a === 192 && b === 0 && octets[2] === 0) return "private_address";
  if (a === 198 && (b === 18 || b === 19)) return "private_address";
  if (a >= 224) return "multicast_or_reserved_address";
  return null;
}

/** Expand an IPv6 literal into its eight 16-bit groups; null when malformed. */
function parseIpv6(host: string): number[] | null {
  const withoutZone = host.split("%")[0].toLowerCase();
  if (!withoutZone.includes(":")) return null;

  const [headRaw, tailRaw, ...extra] = withoutZone.split("::");
  if (extra.length > 0) return null;

  const toGroups = (segment: string): number[] | null => {
    if (segment === "") return [];
    const groups: number[] = [];
    for (const part of segment.split(":")) {
      const ipv4 = parseIpv4(part);
      if (ipv4) {
        groups.push((ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      groups.push(Number.parseInt(part, 16));
    }
    return groups;
  };

  const head = toGroups(headRaw);
  if (!head) return null;
  if (tailRaw === undefined) {
    return head.length === 8 ? head : null;
  }
  const tail = toGroups(tailRaw);
  if (!tail) return null;
  const fillLength = 8 - head.length - tail.length;
  if (fillLength < 0) return null;
  return [...head, ...Array.from({ length: fillLength }, () => 0), ...tail];
}

function classifyIpv6(groups: readonly number[]): UnsafeFetchReason | null {
  const isAllZero = groups.slice(0, 7).every((group) => group === 0);
  if (isAllZero && groups[7] === 1) return "loopback_address";
  if (isAllZero && groups[7] === 0) return "unspecified_address";

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible addresses.
  const mappedPrefix = groups.slice(0, 5).every((group) => group === 0);
  if (mappedPrefix && (groups[5] === 0xffff || groups[5] === 0)) {
    const embedded = [
      groups[6] >> 8,
      groups[6] & 0xff,
      groups[7] >> 8,
      groups[7] & 0xff,
    ];
    return classifyIpv4(embedded);
  }

  if ((groups[0] & 0xfe00) === 0xfc00) return "unique_local_address";
  if ((groups[0] & 0xffc0) === 0xfe80) return "link_local_address";
  if ((groups[0] & 0xff00) === 0xff00) return "multicast_or_reserved_address";
  return null;
}

/** Classify a hostname or IP literal; null means "no known private range". */
export function classifyFetchHost(hostRaw: string): UnsafeFetchReason | null {
  const host = hostRaw.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "") return "missing_host";

  if (BLOCKED_HOST_NAMES.has(host)) return "blocked_hostname";
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return "blocked_hostname";
  }

  const ipv4 = parseIpv4(host);
  if (ipv4) return classifyIpv4(ipv4);

  const ipv6 = parseIpv6(host);
  if (ipv6) return classifyIpv6(ipv6);

  return null;
}

export function isSafeFetchHost(host: string): boolean {
  return classifyFetchHost(host) === null;
}

/**
 * Validate a URL before fetching it. Returns the parsed URL so callers reuse
 * the normalized form instead of re-parsing the raw string.
 */
export function assertSafeHttpUrl(rawUrl: string): URL {
  const target = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new UnsafeFetchTargetError("invalid_url", target || "(empty)");
  }

  if (!ALLOWED_FETCH_PROTOCOLS.includes(parsed.protocol)) {
    throw new UnsafeFetchTargetError("unsupported_scheme", target, parsed.protocol);
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new UnsafeFetchTargetError("embedded_credentials", target);
  }
  if (!ALLOWED_FETCH_PORTS.includes(parsed.port)) {
    throw new UnsafeFetchTargetError("blocked_port", target, `port ${parsed.port}`);
  }

  const reason = classifyFetchHost(parsed.hostname);
  if (reason) {
    throw new UnsafeFetchTargetError(reason, target, parsed.hostname);
  }
  return parsed;
}

/**
 * Validate a host after DNS resolution (or a redirect target host).
 *
 * DNS is where a public name can point at a private address, so callers that
 * can resolve names should pass every resolved address through here before
 * connecting.
 */
export function assertSafeResolvedHost(host: string, context?: string): void {
  const reason = classifyFetchHost(host);
  if (reason) {
    throw new UnsafeFetchTargetError(reason, context ?? host, host);
  }
}

/** Validate a redirect target, resolving relative `Location` headers. */
export function assertSafeRedirectTarget(fromUrl: string, location: string): URL {
  let absolute: string;
  try {
    absolute = new URL(location, fromUrl).toString();
  } catch {
    throw new UnsafeFetchTargetError("invalid_url", location || "(empty)");
  }
  return assertSafeHttpUrl(absolute);
}
