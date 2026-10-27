export const ITEMS_TEXTS = {
  loading: "Cargando artículos…",
  empty: "Todavía no cargaste artículos.",
  newItem: "Nuevo artículo",
  account: "Tu cuenta",
  more: "Ver más",
  retry: "Reintentar",
  archived: "Dado de baja",
};

export const DETAIL_TEXTS = {
  loading: "Cargando el artículo…",
  missing: "Este artículo no existe o no es de tu negocio.",
  back: "Volver a los artículos",
  edit: "Editar",
  totalStock: "Stock total",
  outOfService: "Fuera de servicio",
  price: "Precio de lista",
  category: "Categoría",
  code: "Código",
  description: "Descripción",
  noCategory: "Sin categoría",
  noCode: "Sin código",
  noDescription: "Sin descripción",
};

export const FORM_TEXTS = {
  name: "Nombre",
  totalStock: "Stock total",
  outOfService: "Fuera de servicio",
  price: "Precio de lista",
  category: "Categoría",
  code: "Código",
  description: "Descripción",
  save: "Guardar",
  saving: "Guardando…",
  loading: "Cargando…",
  unchanged: "No cambiaste nada.",
};

/** Screen texts of the API codes for the item form. */
export const FORM_ERRORS = {
  invalid_request: "Revisá los datos e intentá de nuevo.",
};

export const OUT_OF_SERVICE_EXCEEDED =
  "No puede haber más unidades fuera de servicio que el stock total.";

export const FILTER_TEXTS = {
  search: "Buscar",
  status: "Estado",
  active: "Activos",
  archived: "Dados de baja",
  all: "Todos",
  category: "Categoría",
  allCategories: "Todas",
  moreCategories: "Cargar más categorías",
  categoriesFailed: "No pudimos traer las categorías.",
  emptyFiltered: "No hay artículos con estos filtros.",
};

export const ARCHIVE_TEXTS = {
  archive: "Dar de baja",
  reactivate: "Reactivar",
  cancel: "Cancelar",
  title: (name: string) => `¿Dar de baja «${name}»?`,
  description: "No se borra: lo podés reactivar cuando quieras.",
};
