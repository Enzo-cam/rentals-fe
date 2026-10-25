export const ROUTES = {
  signIn: "/ingresar",
  definePassword: "/definir-contrasena",
  selectBusiness: "/elegir-negocio",
  account: "/cuenta",
} as const;

/** The screen a user lands on after signing in with a business selected. */
export const AFTER_SIGN_IN_PATH = ROUTES.account;
