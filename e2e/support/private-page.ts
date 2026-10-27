import { expect, type Page } from "@playwright/test";

/** INV-FE-03 and mobile-first at 360 px: Spanish page, not indexable, and nothing wider than the screen. */
export async function expectPrivatePage(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
