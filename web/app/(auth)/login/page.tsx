import Link from "next/link";

import { logIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell, Divider, GoogleGlyph } from "@/components/auth/AuthShell";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired } = await searchParams;

  return (
    <AuthShell>
      <div className="rounded-[24px] bg-white px-9 pt-9.5 pb-8.5 shadow-[0_1px_3px_rgba(11,44,34,0.05),0_16px_44px_rgba(11,44,34,0.08)]">
        <h1 className="font-display text-[28px] font-semibold text-ink">Welcome back</h1>
        <p className="mt-2 mb-6.5 text-[14.5px] text-muted-2">Pick up where Nnneva left off.</p>

        {expired && (
          <p className="mb-4 rounded-md bg-surface px-3.5 py-2.5 text-caption text-muted" role="status">
            Your session ended. Sign in to carry on.
          </p>
        )}

        <AuthForm
          action={logIn}
          submitLabel="Log in"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "current-password",
            },
          ]}
        />

        <Divider label="or" />

        {/* Kept in place for when OAuth is wired, but disabled rather than
            linking somewhere that cannot sign anyone in. */}
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-[11px] rounded-md border border-[#EAE3DD] bg-white py-3.5 text-[14.5px] text-muted-2 opacity-60"
        >
          <GoogleGlyph />
          Google sign-in coming soon
        </button>

        <p className="mt-5 text-center text-caption text-muted-2">
          New here?{" "}
          <Link href="/signup" className="text-pink hover:text-pink-deep">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
