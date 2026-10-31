import { formatDateTime, toApiInstant } from "@/lib/format/date-time";
import { formatWholeNumber } from "@/lib/format/whole-number";

/** The local value of a field, shown as the instant it asks for in the business zone. */
function shown(local: string): string {
  return formatDateTime(toApiInstant(local) ?? local);
}

export const AVAILABILITY_TEXTS = {
  loading: "Cargando disponibilidad…",
  completePeriod: "Elegí desde cuándo y hasta cuándo.",
  empty: "No hay artículos activos para esa búsqueda.",
  more: "Ver más",
  retry: "Reintentar",
  from: "Desde",
  to: "Hasta",
  search: "Artículo",
  submit: "Consultar",
  period: (from: string, to: string) => `Del ${shown(from)} al ${shown(to)}`,
};

export const ROW_TEXTS = {
  free: "libres",
  missing: "Faltan",
  detail: (reserved: number, outOfService: number, totalStock: number) =>
    `${formatWholeNumber(reserved)} reservados · ${formatWholeNumber(outOfService)} fuera de servicio · ${formatWholeNumber(totalStock)} en total`,
};

/** Screen texts of the API codes for the availability. */
export const AVAILABILITY_ERRORS = {
  invalid_period:
    "Revisá el período: «hasta» tiene que ser después de «desde», y como mucho un año después.",
};
