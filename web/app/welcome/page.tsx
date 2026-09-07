import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { WelcomeSetup } from "@/components/WelcomeSetup";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const profile = await api.get<Profile>("/profile");
  // Already answered. Coming back here by hand should not re-ask.
  if (profile.role) redirect("/home");
  return <WelcomeSetup name={profile.full_name} username={profile.username} />;
}
