import { notFound } from "next/navigation";

import { PartnerPortal } from "@/components/partner/PartnerPortal";
import type { PartnerView } from "@/lib/types";

export const metadata = {
  title: "Helping out",
  // A shared link should not turn up in search results.
  robots: { index: false, follow: false },
};

/**
 * The partner's own page. No account, no session — the token in the URL is the
 * whole authorisation, so this is deliberately a thin, read-mostly view.
 */
export default async function PartnerTokenPage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;

  const base = process.env.API_BASE_URL ?? "http://localhost:8000";
  const response = await fetch(`${base}/partner/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (!response.ok) notFound();

  const view: PartnerView = await response.json();
  return <PartnerPortal token={token} view={view} />;
}
