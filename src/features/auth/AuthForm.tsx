"use client";

import { useActionState, type ReactNode } from "react";
import { Heart, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { login, register } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorText, Field } from "@/components/ui";
import type { AuthDict } from "@/lib/ui-keys";

/** Soft ivory pill with a gold outline; left padding leaves room for the icon badge */
const authInput =
  "w-full rounded-full border border-brand-100 bg-brand-50/60 py-2.5 pl-12 pr-4 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 hover:border-brand-200 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100/70";

/** Small white round badge holding a gold icon, sitting inside the field */
const Badge = ({ children }: { children: ReactNode }) => (
  <span className="flex size-8 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm ring-1 ring-brand-100">
    {children}
  </span>
);

function IconInput({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center">
        <Badge>{icon}</Badge>
      </span>
      <input {...props} className={authInput} />
    </span>
  );
}

export function AuthForm({ mode, t }: { mode: "login" | "register"; t: AuthDict }) {
  const [state, action] = useActionState(mode === "login" ? login : register, undefined);
  return (
    <form action={action} className="space-y-4">
      {mode === "register" && (
        <Field label={t.name} required>
          <IconInput icon={<UserRound className="size-4" />} name="name" required autoComplete="name" />
        </Field>
      )}
      <Field label={t.emailOrPhone} required>
        <IconInput icon={<Mail className="size-4" />} name="login" required autoComplete="username" />
      </Field>
      <Field label={t.passwordLabel} required hint={mode === "register" ? t.passwordHint : undefined}>
        <PasswordInput
          icon={
            <Badge>
              <LockKeyhole className="size-4" />
            </Badge>
          }
          inputClassName={authInput}
          name="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
        />
      </Field>
      <ErrorText>{state?.error}</ErrorText>
      <SubmitButton className="auth-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-brand-400 via-brand-600 to-brand-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 ring-1 ring-white/40 ring-inset transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/25 active:translate-y-0 disabled:opacity-60">
        <Heart className="size-3.5 fill-white transition group-hover:scale-125" />
        {mode === "login" ? t.login : t.register}
        <Sparkles className="size-3 opacity-80" />
      </SubmitButton>
    </form>
  );
}
