import { listConversations } from "@/app/actions/app";
import { orFallback } from "@/lib/api";
import { ChatHistoryView } from "@/components/app/views/ChatHistoryView";

export const metadata = { title: "Chat history" };

export default async function ChatsPage() {
  const conversations = await orFallback(listConversations, []);
  return <ChatHistoryView conversations={conversations} />;
}
