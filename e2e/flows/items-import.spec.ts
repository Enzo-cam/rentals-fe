import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import {
  COPA,
  IMPORT_TEXT,
  ITEM_IDS,
  markedPreview,
  openItemsScreen,
  rejectedImport,
  validPreview,
  VALID_IMPORT_TEXT,
} from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

const PREVIEW_PATH = "/items/import/preview";
const CONFIRM_PATH = "/items/import";

test.beforeEach(async ({ page, request }) => {
  await resetFakeApi(request);
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
});

async function posts(request: APIRequestContext, path: string) {
  return (await apiRequests(request)).filter(
    (call) => call.method === "POST" && call.path === path,
  );
}

const list = (page: Page) =>
  page.getByLabel("Lista de artículos", { exact: true });

const confirmButton = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name });

async function previewOf(
  page: Page,
  request: APIRequestContext,
  text: string,
  body: unknown,
  viaList = false,
) {
  await overrideNext(request, {
    method: "POST",
    path: PREVIEW_PATH,
    status: 200,
    body,
  });
  if (viaList) {
    await openItemsScreen(page, "/articulos");
    await expect(page.getByRole("listitem").first()).toBeVisible();
    await page.getByRole("link", { name: "Cargar lista" }).click();
  } else {
    await openItemsScreen(page, "/articulos/cargar-lista");
  }
  await list(page).fill(text);
  await page.getByRole("button", { name: "Ver vista previa" }).click();
}

/** AC-31 */
test("the preview sends the text as it is and shows every row with its errors", async ({
  page,
  request,
}) => {
  await previewOf(page, request, IMPORT_TEXT, markedPreview);
  await expect(
    page.getByText("La línea 1 se tomó como encabezado."),
  ).toBeVisible();
  await expect(
    page.getByText("4 filas: 1 bien y 3 con errores."),
  ).toBeVisible();

  const rows = page.getByRole("listitem");
  await expect(rows.nth(0)).toContainText("Línea 2");
  await expect(rows.nth(0)).toContainText("Ya existe: «Silla Tiffany blanca».");
  await expect(rows.nth(0).getByRole("link", { name: "Ver" })).toHaveAttribute(
    "href",
    `/articulos/${ITEM_IDS.silla}`,
  );
  await expect(rows.nth(1)).toContainText("Precio inválido: sin coma.");
  await expect(rows.nth(2)).toContainText("Repetido en la línea 3.");
  await expect(rows.nth(3)).toContainText(
    "Línea 6 · Mantel cuadrado · 20 · $ 2.800",
  );
  await expect(confirmButton(page, /^Cargar \d/)).toHaveCount(0);

  const sent = await posts(request, PREVIEW_PATH);
  expect(sent).toHaveLength(1);
  expect(sent[0].headers["content-type"]).toContain("application/json");
  expect(sent[0].body).toBe(JSON.stringify({ text: IMPORT_TEXT }));
});

/** AC-32 */
test("a valid preview confirms with the same text and says how many were created", async ({
  page,
  request,
}) => {
  await previewOf(page, request, VALID_IMPORT_TEXT, validPreview, true);
  await overrideNext(request, {
    method: "POST",
    path: CONFIRM_PATH,
    status: 201,
    body: { created: 3 },
  });
  const listRequests = async () =>
    (await apiRequests(request)).filter(
      (call) => call.method === "GET" && call.path === "/items",
    ).length;
  const before = await listRequests();
  await confirmButton(page, "Cargar 3 artículos").click();
  await expect(page.getByText("Cargamos 3 artículos.")).toBeVisible();
  await expect(list(page)).toHaveValue("");
  await expect(confirmButton(page, /^Cargar \d/)).toHaveCount(0);
  expect((await posts(request, CONFIRM_PATH))[0].body).toBe(
    JSON.stringify({ text: VALID_IMPORT_TEXT }),
  );

  await page.getByRole("link", { name: "Ver los artículos" }).click();
  await page.waitForURL(/\/articulos$/);
  await expect.poll(listRequests).toBeGreaterThan(before);
});

/** AC-33 */
test("a 422 shows the marked rows from its body and no confirmation", async ({
  page,
  request,
}) => {
  await previewOf(page, request, VALID_IMPORT_TEXT, validPreview);
  await overrideNext(request, {
    method: "POST",
    path: CONFIRM_PATH,
    status: 422,
    body: rejectedImport,
  });
  await confirmButton(page, "Cargar 3 artículos").click();
  await expect(
    page.getByText("No se cargó nada: corregí las filas marcadas."),
  ).toBeVisible();
  const second = page.getByRole("listitem").nth(1);
  await expect(second).toContainText(`Ya existe: «${COPA}».`);
  await expect(second.getByRole("link", { name: "Ver" })).toHaveAttribute(
    "href",
    `/articulos/${ITEM_IDS.copa}`,
  );
  await expect(confirmButton(page, /^Cargar \d/)).toHaveCount(0);
});

/** AC-34 */
test("changing the text takes the confirmation away and asks for a new preview", async ({
  page,
  request,
}) => {
  await previewOf(page, request, VALID_IMPORT_TEXT, validPreview);
  await expect(confirmButton(page, "Cargar 3 artículos")).toBeVisible();
  await list(page).fill(`${VALID_IMPORT_TEXT}\nMesa chica;5;900`);
  await expect(confirmButton(page, /^Cargar \d/)).toHaveCount(0);
  await expect(
    page.getByText("Cambiaste la lista: pedí la vista previa de nuevo."),
  ).toBeVisible();
});

/** AC-35 */
test("a list the API turns down says why, and an empty field sends nothing", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos/cargar-lista");
  const ask = page.getByRole("button", { name: "Ver vista previa" });

  await ask.click();
  await expect(page.getByText("Pegá la lista de artículos.")).toBeVisible();
  expect(await posts(request, PREVIEW_PATH)).toHaveLength(0);

  const cases: [number, string, string][] = [
    [400, "empty_list", "La lista está vacía."],
    [400, "too_many_rows", "Más de 500 filas: partila."],
    [413, "payload_too_large", "La lista es muy grande: partila."],
  ];
  await list(page).fill("Mesa;30;1.000");
  for (const [status, error, text] of cases) {
    await overrideNext(request, {
      method: "POST",
      path: PREVIEW_PATH,
      status,
      body: { error },
    });
    await ask.click();
    await expect(page.getByText(text)).toBeVisible();
  }
});

/** AC-36 */
test("two taps in the same tick on the confirmation send one POST", async ({
  page,
  request,
}) => {
  await previewOf(page, request, VALID_IMPORT_TEXT, validPreview);
  await overrideNext(request, {
    method: "POST",
    path: CONFIRM_PATH,
    status: 201,
    body: { created: 3 },
    delayMs: 1500,
  });
  await expect(confirmButton(page, "Cargar 3 artículos")).toBeVisible();
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.startsWith("Cargar 3"),
    );
    button?.click();
    button?.click();
  });
  await expect(confirmButton(page, "Cargando…")).toBeDisabled();
  await expect(page.getByText("Cargamos 3 artículos.")).toBeVisible();
  expect(await posts(request, CONFIRM_PATH)).toHaveLength(1);
});

/** AC-6 */
test("Ana reaches the list loader from Cargar lista", async ({ page }) => {
  await openItemsScreen(page, "/articulos");
  await page.getByRole("link", { name: "Cargar lista" }).click();
  await page.waitForURL(/\/articulos\/cargar-lista$/);
  await expect(
    page.getByRole("heading", { name: "Cargar lista" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Una línea por artículo: nombre; cantidad; precio en pesos enteros (1.500).",
    ),
  ).toBeVisible();
});
