import type { ItemPage, ListedItem } from "../types";

/**
 * The pages in order, with each id once at its first place: if the list moved between two pages, the same item
 * can come twice and the screen must not repeat it. It does not sort or filter (INV-FE-01).
 */
export function itemsOfPages(pages: ItemPage[]): ListedItem[] {
  const seen = new Set<string>();
  const items: ListedItem[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}
