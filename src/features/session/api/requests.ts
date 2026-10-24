import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";

import type { SignInValues } from "../types";

export function signIn(values: SignInValues) {
  return unwrap(browserApi.POST("/auth/login", { body: values }));
}
