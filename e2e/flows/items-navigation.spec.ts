import { expect, test } from "@playwright/test";

import { resetFakeApi } from "../support/fake-api-control";
import { fillSignIn, openScreen, USERS } from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-21 */
test("Ana signs in and lands on the items, and moves between the items and her account", async ({
  page,
}) => {
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.ana.email, USERS.ana.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/articulos");

  await page.getByRole("link", { name: "Tu cuenta" }).click();
  await page.waitForURL("**/cuenta");
  await expect(page.getByRole("heading", { name: "Tu cuenta" })).toBeVisible();

  await page.getByRole("link", { name: "Artículos" }).click();
  await page.waitForURL("**/articulos");
  await expect(page.getByRole("heading", { name: "Artículos" })).toBeVisible();
});
