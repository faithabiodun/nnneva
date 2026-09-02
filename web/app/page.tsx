import { Wordmark } from "@/components/Brand";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <Wordmark size={56} className="justify-center" />
        <p className="mt-6 text-lead text-muted">Landing page in progress.</p>
      </div>
    </main>
  );
}
