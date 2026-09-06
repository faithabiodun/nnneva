import { listHelping, readHelpingThread } from "@/app/actions/app";
import { HelpingView } from "@/components/app/views/HelpingView";

export const metadata = { title: "Helping" };

export default async function HelpingPage({ searchParams }: PageProps<"/helping">) {
  const { c } = await searchParams;
  const wanted = typeof c === "string" ? c : null;

  const people = await listHelping();
  // With one person there is nothing to choose between, so open them.
  const open =
    people.find((p) => p.contact_id === wanted) ?? (people.length === 1 ? people[0] : null);

  const messages = open ? await readHelpingThread(open.contact_id) : [];
  return <HelpingView people={people} open={open} messages={messages} />;
}
