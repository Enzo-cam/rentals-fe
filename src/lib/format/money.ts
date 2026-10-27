import { parseWholeNumber } from "./whole-number";

const MAX_PESOS = 100_000_000;

const WHOLE = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function centsPart(cents: number): string {
  return String(cents % 100).padStart(2, "0");
}

/**
 * The only place that turns cents into text (INV-FE-05). Pesos and cents are split with integer arithmetic: the pesos
 * go through Intl and the cents are appended after the comma, only when there are cents (`$ 1.500` or
 * `$ 1.500,50`, never one decimal).
 */
export function formatCents(cents: number): string {
  const pesos = Math.floor(cents / 100);
  if (cents % 100 === 0) return WHOLE.format(pesos);
  return `${WHOLE.format(pesos)},${centsPart(cents)}`;
}

/**
 * Whole pesos as a person types them (`1500`, `1.500`, `$ 1.500`), in cents. Any comma is an error of shape, and so
 * is more than 100.000.000 pesos: the API still decides what a price may be.
 */
export function parsePesos(text: string): number | null {
  const trimmed = text.trim();
  const pesos = parseWholeNumber(
    trimmed.startsWith("$") ? trimmed.slice(1) : trimmed,
    MAX_PESOS,
  );
  return pesos === null ? null : pesos * 100;
}

/** The text a form shows for a price that comes from the API: `1.500` or `1.500,50`. */
export function pesosTextOf(cents: number): string {
  const grouped = String(Math.floor(cents / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return cents % 100 === 0 ? grouped : `${grouped},${centsPart(cents)}`;
}
