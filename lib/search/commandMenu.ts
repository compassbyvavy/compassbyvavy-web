/**
 * Cmd-K groups. Geographic folders are browse labels, not a coverage claim.
 */

import { DISCOVER_CATEGORIES } from "@/lib/discover/categories";

export type CommandGroupId =
  | "categories"
  | "places"
  | "guides"
  | "camps";

export type CommandItem = {
  id: string;
  group: CommandGroupId;
  groupLabel: string;
  label: string;
  href: string;
  hint?: string;
};

export const GEOGRAPHIC_FOLDERS = [
  "Mississauga",
  "Toronto",
  "Brampton",
  "Oakville",
  "Burlington",
  "Vaughan",
  "Markham",
  "Richmond Hill",
  "Pickering",
  "Ajax",
  "Oshawa",
] as const;

const GUIDES: CommandItem[] = [
  {
    id: "guide-about",
    group: "guides",
    groupLabel: "Editorial guides",
    label: "About Compass",
    href: "/about",
  },
  {
    id: "guide-how",
    group: "guides",
    groupLabel: "Editorial guides",
    label: "How it works",
    href: "/#how-it-works",
  },
  {
    id: "guide-privacy",
    group: "guides",
    groupLabel: "Editorial guides",
    label: "Privacy",
    href: "/privacy",
  },
  {
    id: "guide-terms",
    group: "guides",
    groupLabel: "Editorial guides",
    label: "Terms",
    href: "/terms",
  },
];

export function buildCommandItems(input: {
  camps: { id: string; slug: string; name: string; providerName: string | null }[];
}): CommandItem[] {
  const categories: CommandItem[] = DISCOVER_CATEGORIES.map((category) => ({
    id: `cat-${category.slug}`,
    group: "categories",
    groupLabel: "Categories",
    label: category.title,
    href: category.href,
    hint: category.status === "available" ? "Open" : "Coming soon",
  }));
  const places: CommandItem[] = GEOGRAPHIC_FOLDERS.map((name) => ({
    id: `place-${name}`,
    group: "places",
    groupLabel: "Geographic folders",
    label: name,
    href: `/camps?q=${encodeURIComponent(name)}`,
    hint: "Folder — not a claim that this city is fully listed",
  }));
  const camps: CommandItem[] = input.camps.map((camp) => ({
    id: `camp-${camp.id}`,
    group: "camps",
    groupLabel: "Camps",
    label: camp.name,
    href: `/camps/${camp.slug}`,
    hint: camp.providerName ?? undefined,
  }));
  return [...categories, ...places, ...GUIDES, ...camps];
}

export function filterCommandItems(
  items: CommandItem[],
  query: string,
): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    `${item.label} ${item.hint ?? ""} ${item.groupLabel}`.toLowerCase().includes(q),
  );
}

export const COMMAND_GROUP_ORDER: { id: CommandGroupId; label: string }[] = [
  { id: "categories", label: "Categories" },
  { id: "places", label: "Geographic folders" },
  { id: "guides", label: "Editorial guides" },
  { id: "camps", label: "Camps" },
];
