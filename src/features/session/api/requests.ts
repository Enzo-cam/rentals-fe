import { unwrap } from "@/api/api-failure";
import { browserApi } from "@/api/browser-client";

import type { SignInValues } from "../types";

export function signIn(values: SignInValues) {
  return unwrap(browserApi.POST("/auth/login", { body: values }));
}

export function getMe() {
  return unwrap(browserApi.GET("/me"));
}

/** openapi-fetch sends no `Content-Type` without a body, and the API answers 415 to a mutation without JSON. */
export function signOut() {
  return unwrap(
    browserApi.POST("/auth/logout", {
      headers: { "content-type": "application/json" },
    }),
  );
}

export function definePassword(values: { token: string; password: string }) {
  return unwrap(browserApi.POST("/auth/password", { body: values }));
}

export function listMyBusinesses() {
  return unwrap(browserApi.GET("/me/businesses"));
}

export function selectBusiness(businessId: string) {
  return unwrap(
    browserApi.POST("/auth/select-business", { body: { businessId } }),
  );
}
