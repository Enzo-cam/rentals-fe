import { z } from "zod";

/** Only the shape: the API decides whether the credentials are right (INV-FE-01). */
export const signInSchema = z.object({
  email: z.string().trim().min(1, "Escribí tu email."),
  password: z.string().min(1, "Escribí tu contraseña."),
});

export type SignInValues = z.infer<typeof signInSchema>;

/** Only that both fields are filled and equal: the password policy is the API's (INV-FE-01). */
export const definePasswordSchema = z
  .object({
    password: z.string().min(1, "Escribí la contraseña nueva."),
    repeated: z.string().min(1, "Repetí la contraseña."),
  })
  .refine((values) => values.password === values.repeated, {
    message: "Las dos contraseñas no coinciden.",
    path: ["repeated"],
  });

export type DefinePasswordValues = z.infer<typeof definePasswordSchema>;
