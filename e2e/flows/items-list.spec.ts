import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import {
  COPA,
  copa,
  LIVING,
  pageOf,
  silla,
  SILLA,
  tablon,
  TABLON,
  openItemsScreen,
} from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

test.beforeEach(async ({ page, request }) => {
  await resetFakeApi(request);
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
});

async function itemCalls(request: APIRequestContext) {
  return (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === "/items",
  );
}

const UNAVAILABLE =
  "El sistema no está respondiendo. Probá de nuevo en unos minutos.";

/** AC-1 */
test("the list shows the active items in the order of the API, with the D3 row", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos");
  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText(SILLA);
  await expect(rows.nth(0)).toContainText("$ 1.500");
  await expect(rows.nth(0)).toContainText("120 en total · 4 fuera de servicio");
  await expect(rows.nth(1)).toContainText(COPA);
  await expect(rows.nth(1)).toContainText("$ 350");
  await expect(rows.nth(1)).toContainText("300 en total");
  await expect(rows.nth(1)).not.toContainText("fuera de servicio");
  await expect(rows.nth(2)).toContainText(TABLON);
  await expect(rows.nth(2)).toContainText("$ 0");
  await expect(page.getByText(LIVING)).toHaveCount(0);

  const calls = await itemCalls(request);
  expect(calls.map((call) => call.query)).toEqual(["?status=active"]);
});

/** AC-2 */
test("Ver más asks for the next cursor and the button goes away on the last page", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageOf([silla, copa], "c-2"),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    query: { cursor: "c-2" },
    status: 200,
    body: pageOf([tablon], null),
  });
  await openItemsScreen(page, "/articulos");
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);

  const calls = await itemCalls(request);
  expect(calls).toHaveLength(2);
  expect(new URLSearchParams(calls[1].query).get("cursor")).toBe("c-2");
  expect(new URLSearchParams(calls[1].query).get("status")).toBe("active");
});

/** AC-2 */
test("an item that the next page repeats shows once", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageOf([silla, copa], "c-2"),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    query: { cursor: "c-2" },
    status: 200,
    body: pageOf([copa, tablon], null),
  });
  await openItemsScreen(page, "/articulos");
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText(COPA)).toHaveCount(1);
});

/** AC-3 */
test("a failed next page keeps the rows, and Reintentar asks for the same cursor", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageOf([silla, copa], "c-2"),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    query: { cursor: "c-2" },
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/articulos");
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);

  await overrideNext(request, {
    method: "GET",
    path: "/items",
    query: { cursor: "c-2" },
    status: 200,
    body: pageOf([tablon], null),
  });
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText(UNAVAILABLE)).toHaveCount(0);

  const calls = await itemCalls(request);
  const last = calls[calls.length - 1];
  expect(new URLSearchParams(last.query).get("cursor")).toBe("c-2");
});

/** AC-4 */
test("an empty list says so, and Ana can start with Nuevo artículo", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageOf([], null),
  });
  await openItemsScreen(page, "/articulos");
  await expect(page.getByText("Todavía no cargaste artículos.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Nuevo artículo" }),
  ).toBeVisible();
});

/** AC-4 */
test("a 502 shows the text of the outage with Reintentar", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/articulos");
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(3);
});

/** AC-20 */
test("a 401 unauthenticated from the list sends to /ingresar", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 401,
    body: { error: "unauthenticated" },
  });
  await page.goto("/articulos");
  await page.waitForURL("**/ingresar");
});
