import { api } from "@/lib/api";
import type { ActivityDay } from "@/lib/types";
import { ActivityView } from "@/components/app/views/ActivityView";

export const metadata = { title: "Agent activity" };

export default async function ActivityPage() {
  const days = await api.get<ActivityDay[]>("/activity");
  return <ActivityView days={days} />;
}
