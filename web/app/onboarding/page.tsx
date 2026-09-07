import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = { title: "Setting up" };

/**
 * Which questions someone sees is decided here, on the server, from the answer
 * they already gave at first run — not guessed in the browser from a query
 * string someone could edit.
 */
export default async function OnboardingPage() {
  const profile = await api.get<Profile>("/profile");
  // No role means they never answered the first-run question. Sending them
  // through a wizard before knowing which wizard applies is the bug this
  // whole change exists to fix.
  if (!profile.role) redirect("/welcome");
  return <OnboardingFlow role={profile.role} />;
}
