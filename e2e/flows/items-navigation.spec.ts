import { expect, test, type Page } from "@playwright/test";

import { BOOKING_IDS } from "../support/bookings";
import { overrideNext, resetFakeApi } from "../support/fake-api-control";
import { copa, openItemsScreen, pageOf } from "../support/items";
import { expectPrivatePage } from "../support/private-page";
import {
  fillSignIn,
  openScreen,
  signInThroughProxy,
  USERS,
} from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

const sections = (page: Page) =>
  page.getByRole("navigation", { name: "Secciones" });

/** AC-21, AC-4 */
test("Ana signs in and lands on the items, and moves between the items and her account with the bottom navigation", async ({
  page,
}) => {
  await openScreen(page, "/ingresar");
  await expect(sections(page)).toHaveCount(0);
  await fillSignIn(page, USERS.ana.email, USERS.ana.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/articulos");

  const nav = sections(page);
  await expect(nav.getByRole("link")).toHaveText([
    "Artículos",
    "Clientes",
    "Reservas",
    "Cuenta",
  ]);
  await expect(nav.getByRole("link", { name: "Artículos" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Cuenta" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectPrivatePage(page);

  await nav.getByRole("link", { name: "Cuenta" }).click();
  await page.waitForURL("**/cuenta");
  await expect(page.getByRole("heading", { name: "Tu cuenta" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Cuenta" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectPrivatePage(page);

  await nav.getByRole("link", { name: "Artículos" }).click();
  await page.waitForURL("**/articulos");
  await expect(page.getByRole("heading", { name: "Artículos" })).toBeVisible();
});

/** AC-4 */
test("an inner screen of the items keeps Artículos as the current section", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, "/articulos/nuevo");
  await expect(
    sections(page).getByRole("link", { name: "Artículos" }),
  ).toHaveAttribute("aria-current", "page");
});

/** AC-4 */
test("Beto, who is crew, has no Clientes in the navigation", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await openItemsScreen(page, "/articulos");
  await expect(sections(page).getByRole("link")).toHaveText([
    "Artículos",
    "Reservas",
    "Cuenta",
  ]);
});

/** AC-13 */
test("Reservas is the current section in the list, in a detail and in the availability, and Artículos is not", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  for (const path of [
    "/reservas",
    `/reservas/${BOOKING_IDS.lucia}`,
    "/disponibilidad",
  ]) {
    await openItemsScreen(page, path);
    await expect(
      sections(page).getByRole("link", { name: "Reservas" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      sections(page).getByRole("link", { name: "Artículos" }),
    ).not.toHaveAttribute("aria-current", "page");
  }
});

/** AC-13 */
test("Reservas in the navigation goes to the list of bookings", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, "/articulos");
  await sections(page).getByRole("link", { name: "Reservas" }).click();
  await page.waitForURL("**/reservas");
  await expect(page.getByRole("heading", { name: "Reservas" })).toBeVisible();
});

/** AC-4 */
test("the navigation does not cover the end of a long list", async ({
  page,
  request,
}) => {
  const items = Array.from({ length: 14 }, (_, index) => ({
    ...copa,
    id: `bbbbbbbb-0000-4000-8000-0000000002${String(index).padStart(2, "0")}`,
    name: `Copa número ${index + 1}`,
  }));
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageOf(items, "next"),
  });
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, "/articulos");
  const more = page.getByRole("button", { name: "Ver más" });
  await expect(more).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const moreBox = await more.boundingBox();
  const navBox = await sections(page).boundingBox();
  expect(moreBox!.y + moreBox!.height).toBeLessThanOrEqual(navBox!.y);
  expect(navBox!.height).toBeGreaterThanOrEqual(44);
});
