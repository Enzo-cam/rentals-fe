import { expect, test } from "@playwright/test";

import { E2E_ORIGIN_SECRET, FAKE_API_URL } from "../support/env";
import {
  lastApiRequest,
  resetFakeApi,
  setHealthMode,
  type HealthMode,
} from "../support/fake-api-control";

const UNREACHABLE = "No pudimos conectar con la API.";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

test("AC-1: with /health 200, / says the API answers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Rentals" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("La API responde.");
});

test("AC-2: with /health 503, / says the API is down", async ({
  page,
  request,
}) => {
  await setHealthMode(request, "down");
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("status")).toHaveText(
    "La API está caída. Probá de nuevo en unos minutos.",
  );
});

for (const mode of ["reset", "hang", "notfound", "badbody"] as HealthMode[]) {
  test(`AC-3: with /health in mode "${mode}", / says it could not connect and answers 200`, async ({
    page,
    request,
  }) => {
    await setHealthMode(request, mode);
    const started = Date.now();
    const response = await page.goto("/");
    const elapsed = Date.now() - started;

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("status")).toHaveText(UNREACHABLE);
    if (mode === "hang") {
      expect(elapsed).toBeGreaterThanOrEqual(3000);
      expect(elapsed).toBeLessThan(8000);
    }
  });
}

test("/ sends the baseline security headers", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response?.headers() ?? {};
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("AC-4: / has lang, title, description, noindex and no horizontal scroll at 360 px", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");

  const title = await page.title();
  expect(title).toBe("Rentals: estado del sistema");
  expect(title.length).toBeLessThanOrEqual(60);

  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(description).toBeTruthy();
  expect(description!.length).toBeLessThanOrEqual(155);

  const robots = await page
    .locator('meta[name="robots"]')
    .getAttribute("content");
  expect(robots).toContain("noindex");
  expect(robots).toContain("nofollow");

  expect(page.viewportSize()?.width).toBe(360);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("AC-5: the API receives X-Origin-Secret and neither the secret nor API_URL reach the HTML", async ({
  page,
  request,
}) => {
  const response = await page.goto("/");

  const received = await lastApiRequest(request);
  expect(received?.path).toBe("/health");
  expect(received?.headers["x-origin-secret"]).toBe(E2E_ORIGIN_SECRET);

  const html = (await response?.text()) ?? "";
  expect(html).toContain("La API responde.");
  expect(html).not.toContain(E2E_ORIGIN_SECRET);
  expect(html).not.toContain(new URL(FAKE_API_URL).host);
});
