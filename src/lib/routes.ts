export const ROUTES = {
  signIn: "/ingresar",
  definePassword: "/definir-contrasena",
  selectBusiness: "/elegir-negocio",
  account: "/cuenta",
  items: "/articulos",
  newItem: "/articulos/nuevo",
  item: (id: string) => `/articulos/${id}`,
  editItem: (id: string) => `/articulos/${id}/editar`,
  importItems: "/articulos/cargar-lista",
} as const;

/** The screen a user lands on after signing in with a business selected. */
export const AFTER_SIGN_IN_PATH = ROUTES.account;
