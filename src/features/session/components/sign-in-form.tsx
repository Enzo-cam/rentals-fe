"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSignIn } from "../hooks/use-sign-in";
import { signInSchema, type SignInValues } from "../types";
import { SIGN_IN_ERRORS } from "./texts";

/**
 * `method="post"` is a net for a submit before hydration: a native GET would put the password in the URL.
 * `isSuccess` keeps the button off while the navigation happens, so a second click cannot send it again.
 */
export function SignInForm() {
  const signIn = useSignIn();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });
  const busy = signIn.isPending || signIn.isSuccess;

  return (
    <form
      method="post"
      noValidate
      onSubmit={handleSubmit((values) => signIn.submitOnce(values))}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      {signIn.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(signIn.error, SIGN_IN_ERRORS)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
