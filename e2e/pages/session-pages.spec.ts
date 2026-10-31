import { expect, test } from "@playwright/test";

import { resetFakeApi } from "../support/fake-api-control";
import { expectPrivatePage } from "../support/private-page";
import {
  N1,
  openScreen,
  passwordLink,
  signInThroughProxy,
  USERS,
} from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-20: INV-FE-03 and mobile-first at 360 px; the long business name is on screen where there is one. */
test.describe("the four screens of the session", () => {
  test("/ingresar", async ({ page }) => {
    await openScreen(page, "/ingresar");
    await expectPrivatePage(page);
  });

  test("/definir-contrasena", async ({ page }) => {
    await openScreen(page, passwordLink("carla"));
    await expect(page.getByLabel("Contraseña nueva")).toBeVisible();
    await expectPrivatePage(page);
  });

  test("/cuenta", async ({ page }) => {
    await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
    await openScreen(page, "/cuenta");
    await expect(page.getByText(N1)).toBeVisible();
    await expectPrivatePage(page);
  });

  test("/elegir-negocio", async ({ page }) => {
    await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
    await openScreen(page, "/elegir-negocio");
    await expect(
      page.getByRole("button", { name: `${N1} · Dueño` }),
    ).toBeVisible();
    await expectPrivatePage(page);
  });
});
