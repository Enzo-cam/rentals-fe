import { z } from "zod";

/** Only the shape: the API decides whether the credentials are right (INV-FE-01). */
export const signInSchema = z.object({
  email: z.string().trim().min(1, "Escribí tu email."),
  password: z.string().min(1, "Escribí tu contraseña."),
});

export type SignInValues = z.infer<typeof signInSchema>;
