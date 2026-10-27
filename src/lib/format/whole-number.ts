const WHOLE_NUMBER = /^(?:\d{1,3}(?:\.\d{3})+|\d+)$/;

/**
 * Digits, or thousands groups with a dot (`1.500`). A comma, a sign or a bad group is not a whole number.
 * Only the shape: the API decides what a quantity means.
 */
export function parseWholeNumber(text: string, max: number): number | null {
  const trimmed = text.trim();
  if (!WHOLE_NUMBER.test(trimmed)) return null;
  const value = Number(trimmed.replaceAll(".", ""));
  return value <= max ? value : null;
}
