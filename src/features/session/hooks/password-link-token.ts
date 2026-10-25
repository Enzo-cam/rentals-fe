/** Only the fragment is read: it never reaches a server, a log or a `Referer` (INV-FE-04). */
export function readPasswordLinkToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token ? token : null;
}
