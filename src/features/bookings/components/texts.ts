import { formatCents } from "@/lib/format/money";
import { formatWholeNumber } from "@/lib/format/whole-number";

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

export const BOOKING_ACTION_TEXTS = {
  confirm: "Confirmar",
  deliver: "Entregar",
  return: "Registrar la vuelta",
  cancel: "Cancelar reserva",
  keep: "Volver",
  cancelTitle: (customerName: string) =>
    `¿Cancelar la reserva de ${customerName}?`,
  cancelDescription:
    "Se liberan las unidades al instante. La seña queda como está.",
  changed: "Esta reserva cambió mientras tanto. Mirá cómo quedó.",
  pickupInPast: "El retiro ya pasó: cambiale la fecha antes de confirmar.",
  unknownItem: "Un artículo",
  notEnough: (itemName: string, requested: number, available: number) =>
    `${itemName}: pediste ${formatWholeNumber(requested)} y hay ${formatWholeNumber(available)} ${available === 1 ? "libre" : "libres"}.`,
  archivedItem: (itemName: string) => `${itemName}: dado de baja.`,
};
