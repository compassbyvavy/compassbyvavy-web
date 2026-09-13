/**
 * Registration platform labels.
 *
 * `RegistrationPlatform` is an open string, not a vendor enum — a provider may
 * use a platform Compass has never seen, or their own form. Detection is by
 * registration-host first (a link to the platform is hard evidence), then by an
 * explicit name in the page text. Anything else stays `null`: "unknown platform"
 * is a fact, and guessing one produces bad filters downstream.
 */

import type { RegistrationPlatform } from "@/data/camps/ingestion/types";

type PlatformRule = {
  label: string;
  hostPattern: RegExp;
  textPattern: RegExp;
};

const PLATFORM_RULES: readonly PlatformRule[] = [
  {
    label: "Activity Messenger",
    hostPattern: /(^|\.)activitymessenger\.com$/i,
    textPattern: /\bactivity messenger\b/i,
  },
  {
    label: "Amilia",
    hostPattern: /(^|\.)amilia\.com$/i,
    textPattern: /\bamilia\b/i,
  },
  {
    label: "CampBrain",
    hostPattern: /(^|\.)campbrain\.com$/i,
    textPattern: /\bcampbrain\b/i,
  },
  {
    label: "ACTIVE Network",
    hostPattern: /(^|\.)(activenet(work)?|active)\.com$|activecommunities\.com$/i,
    textPattern: /\bactive net(work)?\b|\bactivenet\b/i,
  },
  {
    label: "Jumbula",
    hostPattern: /(^|\.)jumbula\.com$/i,
    textPattern: /\bjumbula\b/i,
  },
  {
    label: "Sawyer",
    hostPattern: /(^|\.)hisawyer\.com$/i,
    textPattern: /\bhi ?sawyer\b/i,
  },
  {
    label: "Eventbrite",
    hostPattern: /(^|\.)eventbrite\.(com|ca)$/i,
    textPattern: /\beventbrite\b/i,
  },
  {
    label: "Google Forms",
    hostPattern: /(^|\.)(forms\.gle|docs\.google\.com)$/i,
    textPattern: /\bgoogle form\b/i,
  },
];

export type RegistrationPlatformSignals = {
  links?: ReadonlyArray<{ href: string }>;
  text?: string;
};

export function normalizeRegistrationPlatform(
  signals: RegistrationPlatformSignals,
): RegistrationPlatform {
  for (const link of signals.links ?? []) {
    const host = hostOf(link.href);
    if (!host) continue;
    const rule = PLATFORM_RULES.find((candidate) => candidate.hostPattern.test(host));
    if (rule) return rule.label;
  }

  const text = signals.text ?? "";
  if (text !== "") {
    const rule = PLATFORM_RULES.find((candidate) => candidate.textPattern.test(text));
    if (rule) return rule.label;
  }
  return null;
}

/** The most likely registration link on a page, or null. */
export function findRegistrationLink(
  links: ReadonlyArray<{ href: string; text: string }>,
): { href: string; text: string } | null {
  const byPlatformHost = links.find((link) => {
    const host = hostOf(link.href);
    return Boolean(host) && PLATFORM_RULES.some((rule) => rule.hostPattern.test(host as string));
  });
  if (byPlatformHost) return byPlatformHost;

  const byLabel = links.find((link) =>
    /\bregist(er|ration)\b|\benrol|\bsign up\b|\bbook now\b/i.test(link.text),
  );
  if (byLabel && /^https?:/i.test(byLabel.href)) return byLabel;

  const byHref = links.find((link) => /regist|enrol|signup|booking/i.test(link.href));
  return byHref && /^https?:/i.test(byHref.href) ? byHref : null;
}

function hostOf(href: string): string | null {
  try {
    return new URL(href).hostname.toLowerCase();
  } catch {
    return null;
  }
}
