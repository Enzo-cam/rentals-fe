import { formatCents } from "@/lib/format/money";

import type { BookingStatus } from "../types";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  hold: "Bloqueo",
  confirmed: "Confirmada",
  delivered: "Entregada",
  returned: "Devuelta",
  cancelled: "Cancelada",
};

export const HOLD_EXPIRED_LABEL = "Bloqueo vencido";

export const BOOKING_REF_TEXTS = {
  hasMore: "Y hay más reservas.",
};

export const BOOKINGS_TEXTS = {
  loading: "Cargando reservas…",
  empty: "Todavía no hay reservas.",
  emptyFiltered: "No hay reservas con este estado.",
  more: "Ver más",
  retry: "Reintentar",
  checkAvailability: "Consultar disponibilidad",
  status: "Estado",
  allStatuses: "Todas",
  balance: (cents: number) => `Saldo ${formatCents(cents)}`,
};

export const BOOKING_DETAIL_TEXTS = {
  loading: "Cargando la reserva…",
  missing: "Esta reserva no existe o no es de tu negocio.",
  back: "Volver a las reservas",
  delivery: "Entrega",
  pickup: "Retiro",
  holdExpires: "Vence el bloqueo",
  delivered: "Entregada",
  returnRecorded: "Vuelta registrada",
  cancelled: "Cancelada",
  address: "Dirección",
  note: "Nota",
  freight: "Flete",
  deposit: "Seña",
  balanceDue: "Saldo a cobrar",
  each: "c/u",
  depositOn: (amount: string, date: string) => `${amount} el ${date}`,
};
