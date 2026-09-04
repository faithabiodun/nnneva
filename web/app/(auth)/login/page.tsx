import Link from "next/link";

import { logIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell, Divider, GoogleGlyph } from "@/components/auth/AuthShell";

export const metadata = { title: "Log in" };

/**
 * What went wrong on the way back from Google. The callback route redirects
 * here with `?google=<reason>`; anything unrecognised reads as the generic
 * message rather than showing a raw code.
 */
const GOOGLE_ERRORS: Record<string, string> = {
  unavailable: "Google sign-in is not set up on this server yet. Use your email and password.",
  cancelled: "Google sign-in was cancelled. Nothing has changed.",
  state: "That sign-in link expired or did not match. Please try again.",
  exchange: "Google could not confirm that sign-in. Please try again.",
  api: "Nnneva could not complete that sign-in. Please try again in a moment.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired, google, next } = await searchParams;
  // Repeated query parameters arrive as arrays; take the first value.
  const reason = one(google);
  const googleError = reason ? GOOGLE_ERRORS[reason] ?? GOOGLE_ERRORS.api : null;
  const nextPath = one(next);

  return (
    <AuthShell>
      <div className="rounded-[24px] bg-white px-9 pt-9.5 pb-8.5 shadow-[0_1px_3px_rgba(11,44,34,0.05),0_16px_44px_rgba(11,44,34,0.08)]">
        <h1 className="font-display text-[28px] font-semibold text-ink">Welcome back</h1>
        <p className="mt-2 mb-6.5 text-[14.5px] text-muted-2">Pick up where Nnneva left off.</p>

        {googleError && (
          <p className="mb-4 rounded-md bg-surface px-3.5 py-2.5 text-caption text-muted" role="alert">
            {googleError}
          </p>
        )}

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

        {/* A plain link, not a fetch: OAuth is a full-page redirect to Google
            and back, so there is nothing for client JavaScript to do. */}
        <a
          href={nextPath ? `/auth/google?next=${encodeURIComponent(nextPath)}` : "/auth/google"}
          className="flex w-full items-center justify-center gap-[11px] rounded-md border border-[#EAE3DD] bg-white py-3.5 text-[14.5px] text-ink transition-colors hover:bg-surface"
        >
          <GoogleGlyph />
          Continue with Google
        </a>

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

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
