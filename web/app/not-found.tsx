import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <section className="max-w-[460px] text-center">
        <h1 className="font-display text-[26px] text-ink">That page does not exist</h1>
        <p className="mt-2.5 text-small text-muted">
          The link may be old, or the thing it pointed at may have been removed.
        </p>
        <Link href="/home" className="btn btn-ink mt-6 inline-flex">
          Back to home
        </Link>
      </section>
    </main>
  );
}
