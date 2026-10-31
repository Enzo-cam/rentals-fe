import { expect, test, type Page } from "@playwright/test";

import {
  availabilityCalls,
  copaRow,
  COPA_ROW,
  FROM,
  FROM_INSTANT,
  LIVING_ROW,
  pageOf,
  PATH,
  PERIOD_TEXT,
  SILLA_ROW,
  sillaRow,
  TABLON_ROW,
  TO,
  TO_INSTANT,
  zocaloRow,
  ZOCALO_ROW,
} from "../support/availability";
import { overrideNext, resetFakeApi } from "../support/fake-api-control";
import { openItemsScreen } from "../support/items";
import { expectPrivatePage } from "../support/private-page";
import { signInThroughProxy, USERS } from "../support/session";

const UNAVAILABLE =
  "El sistema no está respondiendo. Probá de nuevo en unos minutos.";
const COMPLETE_PERIOD = "Elegí desde cuándo y hasta cuándo.";
const INVALID_PERIOD =
  "Revisá el período: «hasta» tiene que ser después de «desde», y como mucho un año después.";
const EMPTY = "No hay artículos activos para esa búsqueda.";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

const rows = (page: Page) => page.getByRole("main").getByRole("listitem");

async function signInAsAna(page: Page) {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
}

/** AC-1 */
test("the period asks the API in Argentina time and each row shows what is free, in the order of the API", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, PATH);
  await expect(page.getByText(PERIOD_TEXT)).toBeVisible();
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(0)).toContainText(COPA_ROW);
  await expect(rows(page).nth(0)).toContainText("1.080 libres");
  await expect(rows(page).nth(0)).toContainText(
    "120 reservados · 0 fuera de servicio · 1.200 en total",
  );
  await expect(rows(page).nth(0).getByText("1.080")).toHaveCSS(
    "font-weight",
    "800",
  );
  await expect(rows(page).nth(1)).toContainText(LIVING_ROW);
  await expect(rows(page).nth(2)).toContainText(SILLA_ROW);
  await expect(rows(page).nth(2)).toContainText("86 libres");
  await expect(rows(page).nth(2)).toContainText(
    "30 reservados · 4 fuera de servicio · 120 en total",
  );

  const calls = await availabilityCalls(request);
  expect(calls).toHaveLength(1);
  expect(calls[0].get("from")).toBe(FROM_INSTANT);
  expect(calls[0].get("to")).toBe(TO_INSTANT);
  expect(calls[0].has("q")).toBe(false);
  expect(calls[0].has("cursor")).toBe(false);
  expect(calls[0].has("limit")).toBe(false);
});

/** AC-2 */
test("an item with a negative available says Faltan in the destructive color instead of libres", async ({
  page,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, PATH);
  const living = rows(page).nth(1);
  await expect(living).toContainText("Faltan 2");
  await expect(living).not.toContainText("libres");
  await expect(living.getByText("Faltan")).toHaveClass(/text-destructive/);
  await expect(living).toContainText(
    "7 reservados · 1 fuera de servicio · 6 en total",
  );
  await expect(rows(page).nth(0)).not.toContainText("Faltan");
});

/** AC-3 */
test("Consultar puts the period and the search in the URL and in the request, and a reload keeps the fields and the list", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/availability",
    query: { q: "silla" },
    times: 2,
    status: 200,
    body: pageOf([sillaRow], null),
  });
  await openItemsScreen(page, "/disponibilidad");
  await page.getByLabel("Desde").fill(FROM);
  await page.getByLabel("Hasta").fill(TO);
  await page.getByLabel("Artículo").fill("silla");
  await page.getByRole("button", { name: "Consultar" }).click();
  await page.waitForURL("**/disponibilidad?*");
  const url = new URL(page.url()).searchParams;
  expect(url.get("from")).toBe(FROM);
  expect(url.get("to")).toBe(TO);
  expect(url.get("q")).toBe("silla");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText(SILLA_ROW);

  await page.reload();
  await expect(page.getByLabel("Desde")).toHaveValue(FROM);
  await expect(page.getByLabel("Hasta")).toHaveValue(TO);
  await expect(page.getByLabel("Artículo")).toHaveValue("silla");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText(SILLA_ROW);

  const calls = await availabilityCalls(request);
  expect(calls).toHaveLength(2);
  for (const call of calls) {
    expect(call.get("from")).toBe(FROM_INSTANT);
    expect(call.get("to")).toBe(TO_INSTANT);
    expect(call.get("q")).toBe("silla");
  }
});

/** AC-3 */
test("without a complete period no request goes out and the screen asks for it", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/disponibilidad");
  await expect(page.getByText(COMPLETE_PERIOD)).toBeVisible();

  await page.getByLabel("Desde").fill(FROM);
  await page.getByRole("button", { name: "Consultar" }).click();
  await page.waitForURL("**/disponibilidad?*");
  await expect(page.getByLabel("Desde")).toHaveValue(FROM);
  await expect(page.getByText(COMPLETE_PERIOD)).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  expect(await availabilityCalls(request)).toEqual([]);
});

/** AC-3 */
test("garbage in the URL never reaches the API: bad dates ask for the period and a q over 100 characters is dropped", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/disponibilidad?from=2030-02-30T08:00&to=${TO}`);
  await expect(page.getByText(COMPLETE_PERIOD)).toBeVisible();
  await openItemsScreen(page, `/disponibilidad?from=${FROM}&to=mañana`);
  await expect(page.getByText(COMPLETE_PERIOD)).toBeVisible();
  await openItemsScreen(
    page,
    `/disponibilidad?from=2030-03-08&to=2030-03-10T19:00:00-03:00`,
  );
  await expect(page.getByText(COMPLETE_PERIOD)).toBeVisible();
  expect(await availabilityCalls(request)).toEqual([]);

  await openItemsScreen(page, `${PATH}&q=${"x".repeat(101)}`);
  await expect(rows(page)).toHaveCount(3);
  const calls = await availabilityCalls(request);
  expect(calls).toHaveLength(1);
  expect(calls[0].has("q")).toBe(false);
});

/** AC-4 */
test("Ver más asks for the next cursor with the same period and search, and disappears on the last page", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `${PATH}&q=blanc`);
  await expect(rows(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).nth(3)).toContainText(TABLON_ROW);
  await expect(rows(page).nth(4)).toContainText(ZOCALO_ROW);
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);

  const calls = await availabilityCalls(request);
  expect(calls).toHaveLength(2);
  expect(calls[0].has("cursor")).toBe(false);
  expect(calls[1].get("cursor")).toBe("a-3");
  for (const call of calls) {
    expect(call.get("from")).toBe(FROM_INSTANT);
    expect(call.get("to")).toBe(TO_INSTANT);
    expect(call.get("q")).toBe("blanc");
  }
});

/** AC-4 */
test("an item that the next page repeats shows once", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/availability",
    query: { cursor: "a-2" },
    status: 200,
    body: pageOf([sillaRow, zocaloRow], null),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/availability",
    status: 200,
    body: pageOf([copaRow, sillaRow], "a-2"),
  });
  await openItemsScreen(page, PATH);
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText(SILLA_ROW)).toHaveCount(1);
});

/** AC-5 */
test("a 400 invalid_period says what to fix", async ({ page, request }) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/availability",
    status: 400,
    body: { error: "invalid_period" },
  });
  await openItemsScreen(page, PATH);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    INVALID_PERIOD,
  );
  await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  await expect(rows(page)).toHaveCount(0);
});

/** AC-5 */
test("a 502 shows the error and Reintentar asks again", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/availability",
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, PATH);
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText(UNAVAILABLE)).toHaveCount(0);
});

/** AC-5 */
test("an empty result says so and offers no Ver más", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/availability",
    status: 200,
    body: pageOf([], null),
  });
  await openItemsScreen(page, PATH);
  await expect(page.getByText(EMPTY)).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);
});

/** AC-6 */
test("/disponibilidad is Spanish, not indexable and fits in 360 px, with the longest name", async ({
  page,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/disponibilidad");
  await expectPrivatePage(page);
  await page.goto(`${PATH}&q=blanc`);
  await expect(rows(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page).nth(3)).toContainText(TABLON_ROW);
  await expectPrivatePage(page);
  const box = await page.getByLabel("Desde").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

/** AC-6 */
test("the crew sees the availability like everybody", async ({ page }) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await openItemsScreen(page, PATH);
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(0)).toContainText("1.080 libres");
});

/** AC-6 */
test("Olga, whose business is read only, sees the availability of her business", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await openItemsScreen(page, PATH);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Silla plegable negra");
  await expect(rows(page).first()).toContainText("40 libres");
});
