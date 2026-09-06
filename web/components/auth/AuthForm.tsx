"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AuthState } from "@/app/actions/auth";

type Action = (state: AuthState, form: FormData) => Promise<AuthState>;

/**
 * The sign-in and sign-up forms. Both post to a server action, so the session
 * token is set as an httpOnly cookie and never touches client JavaScript.
 *
 * `dark` inverts the fields for the sign-up card, which the design renders on
 * ink to mark it as the committing step.
 */
export function AuthForm({
  action,
  fields,
  submitLabel,
  dark = false,
}: {
  action: Action;
  fields: { name: string; label: string; type: string; autoComplete: string }[];
  submitLabel: string;
  dark?: boolean;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  const labelClass = dark ? "text-green-ink-soft" : "text-muted";
  const inputClass = dark
    ? "bg-white/8 text-white placeholder:text-white/35"
    : "bg-surface text-ink-2 placeholder:text-faint";

  return (
    <form action={formAction} className="flex flex-col gap-3.5" noValidate>
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className={`mb-[7px] block text-[12.5px] ${labelClass}`}>{field.label}</span>
          <input
            type={field.type}
            name={field.name}
            autoComplete={field.autoComplete}
            required
            minLength={field.type === "password" ? 8 : undefined}
            aria-describedby={state ? "auth-error" : undefined}
            className={`w-full rounded-md px-4 py-3.5 text-[14.5px] outline-none ${inputClass}`}
          />
        </label>
      ))}

      {state && (
        <p
          id="auth-error"
          role="alert"
          className={`rounded-md px-3.5 py-2.5 text-caption ${
            dark ? "bg-white/10 text-[#FFC9BF]" : "bg-danger-wash text-danger"
          }`}
        >
          {state.error}
        </p>
      )}

      <Submit label={submitLabel} dark={dark} />
    </form>
  );
}

function Submit({ label, dark }: { label: string; dark: boolean }) {
  // useFormStatus reads the parent form, so it must live in its own component.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`mt-2 w-full rounded-md py-3.5 text-[15px] font-medium transition-colors disabled:opacity-60 ${
        dark ? "bg-white text-ink hover:bg-canvas" : "bg-pink text-white hover:bg-pink-deep"
      }`}
    >
      {pending ? "One moment…" : label}
    </button>
  );
}
