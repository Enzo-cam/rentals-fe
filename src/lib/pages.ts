/**
 * The pages in order, with each id once at its first place: if the list moved between two pages, the same entry
 * can come twice and the screen must not repeat it. It does not sort or filter (INV-FE-01).
 */
export function entriesOfPages<T>(
  pages: { items: T[] }[],
  idOf: (entry: T) => string,
): T[] {
  const seen = new Set<string>();
  const entries: T[] = [];
  for (const page of pages) {
    for (const entry of page.items) {
      const id = idOf(entry);
      if (seen.has(id)) continue;
      seen.add(id);
      entries.push(entry);
    }
  }
  return entries;
}
