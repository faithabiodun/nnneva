import { AppShell } from "@/components/app/AppShell";
import { MEMORY_COUNT, MEMORY_GROUPS } from "@/lib/app-data";

export const metadata = { title: "Memory" };

export default function MemoryPage() {
  return (
    <AppShell
      title="Memory"
      subtitle="What Nnneva remembers about you"
      aside={<span className="pill bg-green-wash text-green">Week 32 · Due 14 Nov</span>}
    >
      <div className="max-w-[1080px]">
        {/* The count comes first because the honest answer to "what does it know
            about me" is a number, not a category list. */}
        <section className="flex flex-wrap items-center gap-4.5 rounded-lg bg-ink px-6.5 py-5.5">
          <div className="min-w-0">
            <p className="text-[16px] text-white">
              Nnneva remembers {MEMORY_COUNT} things about your pregnancy.
            </p>
            <p className="mt-1.5 text-small text-green-soft">
              Nothing here is shared. Remove anything you would rather it forgot.
            </p>
          </div>
          <button
            type="button"
            className="btn ml-auto shrink-0 bg-white/12 text-white hover:bg-white/20"
          >
            Export my data
          </button>
        </section>

        <div className="mt-5 flex flex-col gap-6">
          {MEMORY_GROUPS.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 flex items-baseline gap-2.5 font-sans">
                <span className="eyebrow text-faint">{group.label}</span>
                <span className="text-caption text-faint">{group.items.length} items</span>
              </h2>
              <ul className="grid gap-3.5 sm:grid-cols-2">
                {group.items.map((m) => (
                  <li key={m.fact} className="card p-5">
                    <p className="text-body leading-[1.5] text-ink">{m.fact}</p>
                    <p className="mt-3 flex items-center gap-2.5">
                      <span className="min-w-0 text-caption text-faint">{m.source}</span>
                      <button
                        type="button"
                        className="ml-auto shrink-0 text-caption font-medium text-pink hover:underline"
                      >
                        Forget
                      </button>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
