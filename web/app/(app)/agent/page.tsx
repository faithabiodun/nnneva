import { api } from "@/lib/api";
import type { AgentRun, Home } from "@/lib/types";
import { AgentView } from "@/components/app/views/AgentView";

export const metadata = { title: "Nnneva" };

export default async function AgentPage() {
  // The most recent run is what the screen opens on, so returning to the page
  // continues the conversation instead of resetting it.
  const [runs, home] = await Promise.all([
    api.get<AgentRun[]>("/agent/runs?limit=1"),
    api.get<Home>("/home"),
  ]);

  return <AgentView initialRun={runs[0] ?? null} greetingName={home.greeting_name} />;
}
