const WHOLE_NUMBER = /^(?:[1-9]\d{0,2}(?:\.\d{3})+|\d+)$/;

/**
 * Digits, or thousands groups with a dot (`1.500`). A comma, a sign, a bad group or a group after a leading zero
 * (`0.500`) is not a whole number; plain digits keep their zeros (`007`).
 * Only the shape: the API decides what a quantity means.
 */
export function parseWholeNumber(text: string, max: number): number | null {
  const trimmed = text.trim();
  if (!WHOLE_NUMBER.test(trimmed)) return null;
  const value = Number(trimmed.replaceAll(".", ""));
  return value <= max ? value : null;
}
