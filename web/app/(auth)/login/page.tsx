import Link from "next/link";

import { AuthShell, Divider, GoogleGlyph } from "@/components/auth/AuthShell";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthShell>
      <div className="rounded-[24px] bg-white px-9 pt-9.5 pb-8.5 shadow-[0_1px_3px_rgba(11,44,34,0.05),0_16px_44px_rgba(11,44,34,0.08)]">
        <h1 className="font-display text-[28px] font-semibold text-ink">Welcome back</h1>
        <p className="mt-2 mb-6.5 text-[14.5px] text-muted-2">Pick up where Nnneva left off.</p>

        <form action="/home" className="flex flex-col gap-3.5">
          <label className="block">
            <span className="mb-[7px] block text-[12.5px] text-[#5E736B]">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@email.com"
              className="w-full rounded-md bg-surface px-4 py-3.5 text-[14.5px] text-ink-2 outline-none placeholder:text-faint"
            />
          </label>

          <label className="block">
            <span className="mb-[7px] block text-[12.5px] text-[#5E736B]">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              className="w-full rounded-md bg-surface px-4 py-3.5 text-[14.5px] text-ink-2 outline-none placeholder:text-faint"
            />
          </label>

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-pink py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-pink-deep"
          >
            Log in
          </button>
        </form>

        <Divider label="or" />

        <Link
          href="/home"
          className="flex w-full items-center justify-center gap-[11px] rounded-md border border-[#EAE3DD] bg-white py-3.5 text-[14.5px] text-ink-2 transition-colors hover:bg-surface"
        >
          <GoogleGlyph />
          Continue with Google
        </Link>

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
