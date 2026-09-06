import {
  listContactMessages,
  listContacts,
  listRequests,
} from "@/app/actions/app";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";
import { PartnerView } from "@/components/app/views/PartnerView";

export const metadata = { title: "Partner" };

/**
 * `?c=<id>` opens one conversation. With no `c`, the screen is about finding
 * someone rather than talking to them — which is the right first thing for an
 * account that has nobody yet, and a reasonable one for an account that does.
 */
export default async function PartnerPage({ searchParams }: PageProps<"/partner">) {
  const { c } = await searchParams;
  const wanted = typeof c === "string" ? c : null;

  const [contacts, requests] = await Promise.all([listContacts(), listRequests()]);
  const open = contacts.find((x) => x.id === wanted) ?? null;

  if (!open) {
    return (
      <PartnerView contacts={contacts} open={null} messages={[]} tasks={[]} requests={requests} />
    );
  }

  const [messages, tasks] = await Promise.all([
    listContactMessages(open.id),
    api.get<Task[]>("/tasks"),
  ]);

  return (
    <PartnerView
      contacts={contacts}
      open={open}
      messages={messages}
      tasks={tasks}
      requests={requests}
    />
  );
}
