"use client";

import { useActionState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { changePassword, updateProfile } from "@/features/auth/account-actions";
import { PasswordInput } from "@/features/auth/PasswordInput";
import { SubmitButton } from "@/components/SubmitButton";
import { card, ErrorText, Field, inputCls } from "@/components/ui";
import type { AccountDict } from "@/lib/ui-keys";

type Profile = { name: string; email: string | null; phone: string | null };

const Done = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{children}</p>
);

export function ProfileForm({ user, t }: { user: Profile; t: AccountDict }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className={`${card} space-y-4`}>
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <UserRound className="size-4 text-brand-600" />
          {t.profileTitle}
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">{t.profileHint}</p>
      </div>
      <Field label={t.name} required>
        <input name="name" required maxLength={120} defaultValue={user.name} autoComplete="name" className={inputCls} />
      </Field>
      <Field label={t.email}>
        <input name="email" type="email" defaultValue={user.email ?? ""} autoComplete="email" className={inputCls} />
      </Field>
      <Field label={t.phone}>
        <input name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" className={inputCls} />
      </Field>
      <ErrorText>{state?.error}</ErrorText>
      {state?.ok && <Done>{t.saved}</Done>}
      <SubmitButton>{t.save}</SubmitButton>
    </form>
  );
}

/** `hasPassword` false: a Google/Telegram account setting its first password (no current one to ask for). */
export function PasswordForm({ t, hasPassword }: { t: AccountDict; hasPassword: boolean }) {
  // React resets the form after the action runs, so the password fields clear on their own
  const [state, action] = useActionState(changePassword, undefined);
  const title = hasPassword ? t.changePassword : t.setPassword;
  const eye = { showLabel: t.showPassword, hideLabel: t.hidePassword };
  return (
    <form action={action} className={`${card} space-y-4`}>
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-brand-600" />
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">{hasPassword ? t.changePasswordHint : t.setPasswordHint}</p>
      </div>
      {hasPassword && (
        <Field label={t.currentPassword} required>
          <PasswordInput name="current" required autoComplete="current-password" {...eye} />
        </Field>
      )}
      <Field label={t.newPassword} required hint={t.passwordHint}>
        <PasswordInput name="password" required minLength={8} autoComplete="new-password" {...eye} />
      </Field>
      <Field label={t.confirmPassword} required>
        <PasswordInput name="confirm" required minLength={8} autoComplete="new-password" {...eye} />
      </Field>
      <ErrorText>{state?.error}</ErrorText>
      {state?.ok && <Done>{t.passwordChanged}</Done>}
      <SubmitButton>{title}</SubmitButton>
    </form>
  );
}
