export type WaitlistInput = {
  email?: string;
  sourcePage?: string;
  category?: string;
  subcategory?: string;
  /**
   * Shop product id (`winter-pack`, `quebec-book`). Stored in `subcategory`:
   * the waitlist table has no product column, and subcategory already accepts
   * a short id. Discover forms leave this unset and pass subcategory themselves.
   */
  product?: string;
  city?: string;
  consent?: boolean;
  company?: string;
  startedAt?: number;
  now?: number;
};

export type WaitlistRow = {
  email: string;
  source_page: string | null;
  category: string | null;
  subcategory: string | null;
  city: string | null;
  consented_at: string;
};

export type WaitlistValidation =
  | { ok: true; spam: true }
  | { ok: true; spam: false; row: WaitlistRow }
  | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MS = 1000;

function clip(value: string | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function validateWaitlist(input: WaitlistInput): WaitlistValidation {
  if ((input.company ?? "").trim()) return { ok: true, spam: true };

  const now = input.now ?? Date.now();
  const started = input.startedAt;
  if (started == null || !Number.isFinite(started) || now - started < MIN_MS || started > now + 60_000) {
    return { ok: false, error: "Please take a moment and try again." };
  }

  const email = (input.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!input.consent) {
    return { ok: false, error: "Tick the box if you want this email." };
  }

  return {
    ok: true,
    spam: false,
    row: {
      email,
      source_page: clip(input.sourcePage, 200),
      category: clip(input.category, 120),
      subcategory: clip(input.product?.trim() ? input.product : input.subcategory, 120),
      city: clip(input.city, 120),
      consented_at: new Date(now).toISOString(),
    },
  };
}
