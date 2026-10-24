import { useSyncExternalStore } from "react";

import { readPasswordLinkToken } from "./password-link-token";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** `undefined` until the browser is known: the server cannot see the fragment, so it must not say "missing". */
export function usePasswordLinkToken(): string | null | undefined {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => null,
  );
  return hash === null ? undefined : readPasswordLinkToken(hash);
}
