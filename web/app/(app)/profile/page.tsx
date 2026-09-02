"use client";

import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/components/app/AppShell";
import { ReadField, ToggleRow } from "@/components/app/Bits";
import {
  ACCOUNT_FIELDS,
  CONTEXT_FIELDS,
  NOTIF_PREFS,
  PERMISSIONS,
  PRIVACY_ROWS,
  PROFILE_TABS,
  RETENTION,
  type ProfileTab,
} from "@/lib/app-data";

/** Turns a list of {id, on} into the set of ids that start switched on. */
const onSet = (rows: { id: string; on: boolean }[]) =>
  new Set(rows.filter((r) => r.on).map((r) => r.id));

export default function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>("Pregnancy context");
  const [privacy, setPrivacy] = useState(() => onSet(PRIVACY_ROWS));
  const [perms, setPerms] = useState(() => onSet(PERMISSIONS));
  const [notif, setNotif] = useState(() => onSet(NOTIF_PREFS));
  const [keep, setKeep] = useState("12 months");

  const flip = (set: (fn: (prev: Set<string>) => Set<string>) => void, id: string) =>
    set((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <AppShell
      title="Profile and preferences"
      subtitle="Context, privacy and notifications"
      aside={<span className="pill bg-green-wash text-green">Week 32 · Due 14 Nov</span>}
    >
      <div className="grid max-w-[1100px] gap-5.5 lg:grid-cols-[236px_1fr] lg:items-start">
        {/* ---- Who, and which section ------------------------------------- */}
        <div className="card min-w-0 p-3.5">
          <div className="flex flex-col items-center px-2 pt-4 pb-5">
            <span className="grid size-19 place-items-center rounded-full bg-green font-display text-[28px] font-semibold text-white">
              F
            </span>
            <p className="mt-3 text-[16px] font-medium text-ink">Faith Adeyemi</p>
            <p className="mt-0.5 text-caption text-faint">faith.adeyemi@email.com</p>
          </div>
          <div className="scroll-x flex gap-0.5 lg:flex-col" role="tablist" aria-label="Settings">
            {PROFILE_TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-md px-3.5 py-2.5 text-left text-small whitespace-nowrap transition-colors ${
                  tab === t ? "bg-surface text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ---- The section itself ------------------------------------------ */}
        <div className="flex min-w-0 flex-col gap-4.5">
          {tab === "Pregnancy context" && (
            <section className="card p-6.5">
              <h2 className="mb-4.5 card-title">Pregnancy context</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {CONTEXT_FIELDS.map((f) => (
                  <ReadField key={f.label} label={f.label} value={f.value} />
                ))}
              </dl>
            </section>
          )}

          {tab === "Notifications" && (
            <section className="card p-6.5">
              <h2 className="mb-4 card-title">Notifications</h2>
              <div className="flex flex-wrap gap-2.5">
                {NOTIF_PREFS.map((n) => {
                  const on = notif.has(n.id);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => flip(setNotif, n.id)}
                      className={`rounded-pill px-4 py-2.5 text-caption transition-colors ${
                        on ? "bg-ink text-white" : "bg-surface text-muted hover:bg-surface-3"
                      }`}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-caption leading-[1.55] text-faint">
                Nnneva only notifies you when something needs a decision or a deadline is close.
                Everything else waits for you in the activity log.
              </p>
            </section>
          )}

          {tab === "Privacy" && (
            <>
              <section className="card p-6.5">
                <h2 className="card-title">What Nnneva stores</h2>
                <p className="mt-1.5 mb-1.5 text-small text-muted">
                  Nnneva keeps only what it needs to do the work. Switch anything off and it stops
                  collecting it.
                </p>
                <div className="flex flex-col">
                  {PRIVACY_ROWS.map((r) => (
                    <ToggleRow
                      key={r.id}
                      label={r.label}
                      sub={r.sub}
                      on={privacy.has(r.id)}
                      onToggle={() => flip(setPrivacy, r.id)}
                    />
                  ))}
                </div>
              </section>

              <section className="card p-6.5">
                <h2 className="mb-1.5 card-title">How long it is kept</h2>
                <p className="mb-4 text-small text-muted">
                  After this window, activity records are deleted automatically. Memory stays until
                  you remove it.
                </p>
                <div className="flex flex-wrap gap-2.5" role="group" aria-label="Retention window">
                  {RETENTION.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={keep === r}
                      onClick={() => setKeep(r)}
                      className={`rounded-pill px-4 py-2.5 text-caption transition-colors ${
                        keep === r ? "bg-ink text-white" : "bg-surface text-muted hover:bg-surface-3"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </section>

              {/* The guarantee is stated on the dark card so it reads as the
                  product's promise rather than another setting. */}
              <section className="rounded-lg bg-ink p-6.5">
                <h2 className="mb-1.5 card-title text-white">
                  Sharing outside your account
                </h2>
                <p className="mb-4.5 text-small leading-[1.6] text-green-soft">
                  Nothing about your pregnancy leaves Nnneva without an approval from you, and the
                  approval is asked for every single time. Nnneva never sells or trades your data.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button type="button" className="btn bg-white text-ink hover:bg-canvas">
                    Download everything
                  </button>
                  <button type="button" className="btn bg-white/12 text-white hover:bg-white/20">
                    See who has access
                  </button>
                  <button type="button" className="btn bg-white/12 text-[#FFC9BF] hover:bg-white/20">
                    Delete my account and data
                  </button>
                </div>
              </section>
            </>
          )}

          {tab === "Trusted contact" && (
            <section className="card p-6.5">
              <h2 className="mb-1.5 flex flex-wrap items-center gap-3 card-title">
                Trusted contact
                <span className="pill bg-green-wash text-micro text-green">Chidi Adeyemi</span>
              </h2>
              <p className="mb-4 text-small text-muted">Chidi sees only what you switch on here.</p>
              <div className="flex flex-col">
                {PERMISSIONS.map((p) => (
                  <ToggleRow
                    key={p.id}
                    label={p.label}
                    sub={p.sub}
                    on={perms.has(p.id)}
                    onToggle={() => flip(setPerms, p.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {tab === "Account" && (
            <section className="card p-6.5">
              <h2 className="mb-4.5 card-title">Account</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {ACCOUNT_FIELDS.map((f) => (
                  <ReadField key={f.label} label={f.label} value={f.value} />
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button type="button" className="btn btn-ink">
                  Change password
                </button>
                <Link href="/" className="btn btn-quiet">
                  Log out
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
