import Link from "next/link";

import { IconArrow, Wordmark } from "@/components/ui";

export const metadata = { title: "Mother's view" };

/**
 * The mother's surface sits outside the console shell on purpose.
 *
 * She is not a user of the health worker's product and should never see its
 * chrome — no sidebar, no queue, no cohort. What is left is a thin bar that
 * exists only so a judge can get back to the console.
 */
export default function ChatLayout({ children }: LayoutProps<"/chat">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:px-10">
        <Link href="/" aria-label="Nnneva overview">
          <Wordmark />
        </Link>
        <p className="hidden text-caption text-text-3 sm:block">The mother&rsquo;s side</p>
        <Link href="/queue" className="ml-auto btn btn-quiet">
          Open the console
          <IconArrow className="size-3.5" />
        </Link>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
