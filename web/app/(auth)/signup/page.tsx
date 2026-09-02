import Link from "next/link";

import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
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

        {/* Held for when OAuth is wired. Disabled rather than pointing at a
            route that cannot create an account. */}
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-[11px] rounded-md bg-white py-3.5 text-[14.5px] text-muted-2 opacity-60"
        >
          <GoogleGlyph />
          Google sign-up coming soon
        </button>

        <Divider label="or use your email" dark />

        <AuthForm
          action={signUp}
          submitLabel="Create account"
          dark
          fields={[
            { name: "full_name", label: "Full name", type: "text", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />

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
