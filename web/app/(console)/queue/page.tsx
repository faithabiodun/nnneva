import { Suspense } from "react";

import QueueView from "./QueueView";

export const metadata = { title: "Review queue" };

/**
 * The view reads ?item= so the overview can deep-link into a specific mother,
 * and useSearchParams needs a Suspense boundary above it during prerender.
 */
export default function QueuePage() {
  return (
    <Suspense fallback={<div className="px-5 py-10 text-caption text-text-3 lg:px-10">Loading the queue…</div>}>
      <QueueView />
    </Suspense>
  );
}
