import { notFound } from "next/navigation";

import { listConversations, readConversation } from "@/app/actions/app";
import { ApiError } from "@/lib/api";
import { ChatHistoryView } from "@/components/app/views/ChatHistoryView";

export const metadata = { title: "Chat" };

export default async function ChatPage({ params }: PageProps<"/chats/[id]">) {
  const { id } = await params;

  // Both together: the list stays beside the open thread, so picking up an old
  // conversation does not mean losing sight of the others.
  const [conversations, conversation] = await Promise.all([
    listConversations(),
    readConversation(id).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
  ]);

  return <ChatHistoryView conversations={conversations} conversation={conversation} />;
}
