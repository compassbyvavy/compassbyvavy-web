/**
 * Home hero Search target. Discover already uses `q` and `city`.
 * Ages have no existing query name, so they travel as `ages`.
 * All of Ontario is the discover default, so that slug is left off the URL.
 */
export function buildHeroSearchHref(input: {
  citySlug?: string | null;
  ages?: string | null;
  words?: string | null;
}): string {
  const params = new URLSearchParams();
  const city = input.citySlug?.trim() ?? "";
  if (city && city !== "ontario") params.set("city", city);
  const ages = input.ages?.trim() ?? "";
  if (ages) params.set("ages", ages);
  const words = input.words?.trim() ?? "";
  if (words) params.set("q", words);
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}
