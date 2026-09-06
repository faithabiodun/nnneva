import { listContactMessages, readContact } from "@/app/actions/app";
import { api, ApiError } from "@/lib/api";
import type { Task } from "@/lib/types";
import { PartnerView } from "@/components/app/views/PartnerView";

export const metadata = { title: "Partner" };

export default async function PartnerPage() {
  // A missing contact is an ordinary state, not an error: plenty of people are
  // doing this alone, and the screen should say so rather than break.
  const contact = await readContact().catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });

  if (!contact) return <PartnerView contact={null} messages={[]} tasks={[]} />;

  const [messages, tasks] = await Promise.all([
    listContactMessages(),
    api.get<Task[]>("/tasks"),
  ]);

  return <PartnerView contact={contact} messages={messages} tasks={tasks} />;
}
