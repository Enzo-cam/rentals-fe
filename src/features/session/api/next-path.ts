import type { components } from "@/api/schema";
import { AFTER_SIGN_IN_PATH, ROUTES } from "@/lib/routes";

/** The API says whether a business is already selected; the front does not guess it from the list (INV-FE-01). */
export function nextPathAfterSignIn(
  result: components["schemas"]["BusinessSignIn"],
): string {
  return result.selectedBusinessId === null
    ? ROUTES.selectBusiness
    : AFTER_SIGN_IN_PATH;
}
