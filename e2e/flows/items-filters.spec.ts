import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import { openItemsScreen, pageOf } from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

test.beforeEach(async ({ page, request }) => {
  await resetFakeApi(request);
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
});

async function lastItemsQuery(request: APIRequestContext) {
  const calls = (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === "/items",
  );
  return new URLSearchParams(calls[calls.length - 1]?.query ?? "");
}

const search = (page: import("@playwright/test").Page) =>
  page.getByLabel("Buscar", { exact: true });
const searchButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Buscar", exact: true });

/** AC-23 */
test("searching puts q in the URL and in the request, and survives a reload", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos");
  await search(page).fill("silla");
  await searchButton(page).click();
  await page.waitForURL(/\/articulos\?q=silla$/);
  await expect
    .poll(async () => (await lastItemsQuery(request)).get("q"))
    .toBe("silla");
  expect((await lastItemsQuery(request)).get("status")).toBe("active");

  await page.reload();
  await expect(search(page)).toHaveValue("silla");
  await expect
    .poll(async () => (await lastItemsQuery(request)).get("q"))
    .toBe("silla");
});

/** AC-23 */
test("searching for blanks takes q out of the URL and of the request", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos?q=silla");
  await expect(search(page)).toHaveValue("silla");
  await search(page).fill("   ");
  await searchButton(page).click();
  await page.waitForURL(/\/articulos$/);
  await expect
    .poll(async () => (await lastItemsQuery(request)).has("q"))
    .toBe(false);
  await expect(search(page)).toHaveValue("");
});

/** AC-23 */
test("a URL with a status that does not exist and an empty q asks for the active items without q", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos?status=borrados&q=");
  await expect(
    page.getByRole("main").getByRole("listitem").first(),
  ).toBeVisible();
  const query = await lastItemsQuery(request);
  expect(query.get("status")).toBe("active");
  expect(query.has("q")).toBe(false);
});

/** AC-24 */
test("Estado changes the URL and the request: Dados de baja, Todos, and Activos takes it out", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos");
  const status = page.getByLabel("Estado", { exact: true });
  await status.selectOption({ label: "Dados de baja" });
  await page.waitForURL(/\/articulos\?status=archived$/);
  await expect
    .poll(async () => (await lastItemsQuery(request)).get("status"))
    .toBe("archived");
  await status.selectOption({ label: "Todos" });
  await page.waitForURL(/\/articulos\?status=all$/);
  await expect
    .poll(async () => (await lastItemsQuery(request)).get("status"))
    .toBe("all");
  await status.selectOption({ label: "Activos" });
  await page.waitForURL(/\/articulos$/);
  await expect
    .poll(async () => (await lastItemsQuery(request)).get("status"))
    .toBe("active");
});

/** AC-24 */
test("Categoría lists the categories, keeps q, and stays chosen after a reload", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos?q=silla");
  const category = page.getByLabel("Categoría", { exact: true });
  await expect(category.getByRole("option")).toHaveText([
    "Todas",
    "Mantelería",
    "Mobiliario",
    "Vajilla",
  ]);
  const categoryCalls = (await apiRequests(request)).filter(
    (call) => call.path === "/item-categories",
  );
  expect(new URLSearchParams(categoryCalls[0].query).get("limit")).toBe("100");

  await category.selectOption({ label: "Vajilla" });
  await page.waitForURL(/\/articulos\?q=silla&category=Vajilla$/);
  await expect
    .poll(async () => (await lastItemsQuery(request)).get("category"))
    .toBe("Vajilla");
  expect((await lastItemsQuery(request)).get("q")).toBe("silla");

  await page.reload();
  await expect(category).toHaveValue("Vajilla");
});

/** AC-24 */
test("a category of the URL that the list does not have shows chosen and is sent as it is", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos?category=Livings");
  await expect(page.getByLabel("Categoría", { exact: true })).toHaveValue(
    "Livings",
  );
  await expect
    .poll(async () => (await lastItemsQuery(request)).get("category"))
    .toBe("Livings");
});

/** AC-24 */
test("no results with filters say so", async ({ page, request }) => {
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageOf([], null),
  });
  await openItemsScreen(page, "/articulos?q=nada");
  await expect(
    page.getByText("No hay artículos con estos filtros."),
  ).toBeVisible();
  await expect(page.getByText("Todavía no cargaste artículos.")).toHaveCount(0);
});

/** AC-24 */
test("more categories load with their button", async ({ page, request }) => {
  await overrideNext(request, {
    method: "GET",
    path: "/item-categories",
    status: 200,
    body: { items: [{ name: "Mantelería" }], nextCursor: "k-2" },
  });
  await overrideNext(request, {
    method: "GET",
    path: "/item-categories",
    query: { cursor: "k-2" },
    status: 200,
    body: { items: [{ name: "Vajilla" }], nextCursor: null },
  });
  await openItemsScreen(page, "/articulos");
  await page.getByRole("button", { name: "Cargar más categorías" }).click();
  await expect(
    page.getByLabel("Categoría", { exact: true }).getByRole("option"),
  ).toHaveText(["Todas", "Mantelería", "Vajilla"]);
  await expect(
    page.getByRole("button", { name: "Cargar más categorías" }),
  ).toHaveCount(0);
});

/** AC-25 */
test("when the categories fail the list is used anyway and the filter says so", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/item-categories",
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/articulos");
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(3);
  await expect(
    page.getByText("No pudimos traer las categorías."),
  ).toBeVisible();
});
