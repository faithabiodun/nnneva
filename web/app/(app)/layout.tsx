import { redirect } from "next/navigation";

import { SetupPrompt } from "@/components/app/SetupPrompt";
import { ShellProvider } from "@/components/app/ShellContext";
import { api } from "@/lib/api";
import type { Approval, Profile } from "@/lib/types";

/**
 * Fetched once for the whole signed-in area rather than per page, so the
 * sidebar shows the same person and the same pending count on every screen.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, approvals] = await Promise.all([
    api.get<Profile>("/profile"),
    api.get<Approval[]>("/approvals"),
  ]);

  // No role means the first-run step has not been answered, and everything
  // below assumes an answer — the sidebar shows a week count, the prompt asks
  // for a due date. Ask before assuming.
  if (!profile.role) redirect("/welcome");

  return (
    <ShellProvider
      value={{
        fullName: profile.full_name,
        gestationalWeek: profile.gestational_week,
        dueDate: profile.due_date,
        pendingApprovals: approvals.length,
        onboarded: profile.onboarded,
      }}
    >
      {/* Only someone expecting is missing something by having no due date.
          A supporter has none, and someone postpartum is past it. */}
      <SetupPrompt onboarded={profile.onboarded || profile.role !== "expecting"} />
      {children}
    </ShellProvider>
  );
}
