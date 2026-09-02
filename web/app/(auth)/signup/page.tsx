import Link from "next/link";

import { AuthShell, Divider, GoogleGlyph } from "@/components/auth/AuthShell";

export const metadata = { title: "Create your account" };

/**
 * The signup card inverts to the dark canvas while login stays white — the
 * design's way of marking this as the start of something rather than a return.
 */
export default function SignUpPage() {
  return (
    <AuthShell>
      <div className="rounded-[24px] bg-ink px-9 pt-9.5 pb-8.5 shadow-[0_16px_44px_rgba(11,44,34,0.16)]">
        <h1 className="font-display text-[28px] font-semibold text-white">Create your account</h1>
        <p className="mt-2 mb-6.5 text-[14.5px] text-green-soft">
          Two minutes of setup, then Nnneva remembers.
        </p>

        <Link
          href="/onboarding"
          className="flex w-full items-center justify-center gap-[11px] rounded-md bg-white py-3.5 text-[14.5px] text-ink-2 transition-colors hover:bg-surface"
        >
          <GoogleGlyph />
          Sign up with Google
        </Link>

        <Divider label="or use your email" dark />

        <form action="/onboarding" className="flex flex-col gap-3.5">
          {[
            { label: "Full name", name: "name", type: "text", placeholder: "Faith Adeyemi", autoComplete: "name" },
            { label: "Email", name: "email", type: "email", placeholder: "you@email.com", autoComplete: "email" },
            {
              label: "Password",
              name: "password",
              type: "password",
              placeholder: "At least 8 characters",
              autoComplete: "new-password",
            },
          ].map((f) => (
            <label key={f.name} className="block">
              <span className="mb-[7px] block text-[12.5px] text-green-soft">{f.label}</span>
              <input
                type={f.type}
                name={f.name}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete}
                className="w-full rounded-md bg-white/8 px-4 py-3.5 text-[14.5px] text-white outline-none placeholder:text-green-mid"
              />
            </label>
          ))}

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-pink py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-pink-deep"
          >
            Create account
          </button>
        </form>

        <p className="mt-5 text-caption leading-relaxed text-green-mid">
          Nnneva stores only what it needs to help you coordinate. Health details are never shared
          with anyone unless you allow it.
        </p>

        <p className="mt-5 text-center text-caption text-green-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:text-green-soft">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
