import { api } from "@/lib/api";
import type { Goal } from "@/lib/types";
import { TasksView } from "@/components/app/views/TasksView";

export const metadata = { title: "Tasks and plans" };

export default async function TasksPage() {
  const goals = await api.get<Goal[]>("/goals");
  return <TasksView goals={goals} />;
}
