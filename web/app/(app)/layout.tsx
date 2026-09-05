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
      <SetupPrompt onboarded={profile.onboarded} />
      {children}
    </ShellProvider>
  );
}
