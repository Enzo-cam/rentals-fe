"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { failureOf } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/routes";

import { useDefinePassword } from "../hooks/use-define-password";
import { usePasswordLinkToken } from "../hooks/use-password-link-token";
import { definePasswordSchema, type DefinePasswordValues } from "../types";
import {
  DEFINE_PASSWORD_ERRORS,
  LINK_INCOMPLETE,
  PASSWORD_HINT,
} from "./texts";

/**
 * What the screen shows, by priority: a terminal error of the link, the missing token, or the form.
 * `method="post"` keeps a pre-hydration submit from putting the password in the URL.
 */
export function DefinePasswordForm() {
  const token = usePasswordLinkToken();
  const define = useDefinePassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DefinePasswordValues>({
    resolver: zodResolver(definePasswordSchema),
  });

  if (token === undefined) return null;

  const failure = failureOf(define.error);
  const terminal =
    failure?.kind === "rejected" &&
    (failure.code === "invalid_token" || failure.code === "no_membership");
  const busy = define.isPending || define.isSuccess;

  if (terminal) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert">
          {describeError(define.error, DEFINE_PASSWORD_ERRORS)}
        </p>
        <Link href={ROUTES.signIn} className="underline">
          Entrar con tu email
        </Link>
      </div>
    );
  }
  if (token === null) return <p role="alert">{LINK_INCOMPLETE}</p>;

  return (
    <form
      method="post"
      noValidate
      onSubmit={handleSubmit((values) =>
        define.submitOnce({ token, password: values.password }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-describedby="password-hint"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        <p id="password-hint" className="text-sm text-muted-foreground">
          {PASSWORD_HINT}
        </p>
        {errors.password && (
          <p role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="repeated">Repetí la contraseña</Label>
        <Input
          id="repeated"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.repeated ? true : undefined}
          {...register("repeated")}
        />
        {errors.repeated && (
          <p role="alert" className="text-sm text-destructive">
            {errors.repeated.message}
          </p>
        )}
      </div>
      {define.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(define.error, DEFINE_PASSWORD_ERRORS)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Guardando…" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
