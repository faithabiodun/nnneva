import { api } from "@/lib/api";
import type { MemoryItem } from "@/lib/types";
import { MemoryView } from "@/components/app/views/MemoryView";

export const metadata = { title: "Memory" };

export default async function MemoryPage() {
  const memories = await api.get<MemoryItem[]>("/memory");
  return <MemoryView memories={memories} />;
}
