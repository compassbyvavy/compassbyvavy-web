/**
 * Private Camp Buddies link.
 * The key lives in the URL fragment, so the ciphertext is not a server log.
 * The payload is titles and dates only — no family name and no address.
 */

export type BuddyItem = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
};

export type BuddyPlan = {
  v: 1;
  items: BuddyItem[];
};

function asBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlToBytes(value: string): Uint8Array {
  const pad = (4 - (value.length % 4)) % 4;
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function sanitizeBuddyPlan(plan: BuddyPlan): BuddyPlan {
  return {
    v: 1,
    items: plan.items.map((item) => ({
      id: String(item.id),
      title: String(item.title),
      startDate: item.startDate,
      endDate: item.endDate,
    })),
  };
}

export function eachPlanDate(start: string | null, end: string | null): string[] {
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  const finish = end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : start;
  const out: string[] = [];
  let cursor = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${finish}T00:00:00Z`);
  if (!Number.isFinite(cursor) || !Number.isFinite(last) || cursor > last) return [];
  while (cursor <= last && out.length < 40) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 24 * 60 * 60 * 1000;
  }
  return out;
}

/** Dates shared by at least two items. */
export function overlappingDates(items: BuddyItem[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const date of new Set(eachPlanDate(item.startDate, item.endDate))) {
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([date]) => date)
    .sort();
}

export async function sealBuddyPlan(
  plan: BuddyPlan,
): Promise<{ data: string; key: string }> {
  const clean = sanitizeBuddyPlan(plan);
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  );
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: asBuffer(iv) },
      key,
      asBuffer(new TextEncoder().encode(JSON.stringify(clean))),
    ),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return { data: bytesToB64url(packed), key: bytesToB64url(raw) };
}

export function buddyLink(origin: string, sealed: { data: string; key: string }): string {
  return `${origin}/share/plan#d=${sealed.data}&k=${sealed.key}`;
}

export async function openBuddyPlan(data: string, key: string): Promise<BuddyPlan> {
  const packed = b64urlToBytes(data);
  const iv = asBuffer(packed.slice(0, 12));
  const cipher = asBuffer(packed.slice(12));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    asBuffer(b64urlToBytes(key)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, cipher);
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as BuddyPlan;
  return sanitizeBuddyPlan(parsed);
}

export function readBuddyHash(hash: string): { data: string; key: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const data = params.get("d");
  const key = params.get("k");
  if (!data || !key) return null;
  return { data, key };
}
