/**
 * Kid bag-check state. Completion lives in the view only —
 * callers must not write it to localStorage.
 */

export function toggleBagItem(checked: readonly string[], text: string): string[] {
  return checked.includes(text)
    ? checked.filter((item) => item !== text)
    : [...checked, text];
}

export function bagProgress(total: number, checked: number): string {
  if (total <= 0) return "Nothing to check";
  if (checked >= total) return "Bag is ready";
  return `${checked} of ${total} in the bag`;
}
