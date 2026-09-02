"use client";

import { useState, useTransition } from "react";

import { logOut } from "@/app/actions/auth";
import { updateProfile } from "@/app/actions/app";
import { AppShell } from "@/components/app/AppShell";
import { ReadField, ToggleRow } from "@/components/app/Bits";
import type { Profile } from "@/lib/types";

const TABS = [
  "Pregnancy context",
  "Notifications",
  "Privacy",
  "Trusted contact",
  "Account",
] as const;
type Tab = (typeof TABS)[number];

const NOTIFICATIONS = [
  { key: "approvals", label: "Approvals needed" },
  { key: "deadlines", label: "Deadlines within 24 hours" },
  { key: "daily_summary", label: "Daily summary" },
  { key: "safety", label: "Safety alerts" },
];

const PERMISSIONS = [
  { key: "shared_tasks", label: "Can see tasks I share", sub: "Only the individual tasks you send" },
  { key: "appointments", label: "Can see appointment dates", sub: "Date, time and location" },
  {
    key: "forwarded_reminders",
    label: "Gets reminders I forward",
    sub: "Each one still needs your approval",
  },
  { key: "test_results", label: "Can see test results", sub: "Off by default" },
];

const RETENTION = ["3 months", "12 months", "Until I delete it"];

export function ProfileView({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>("Pregnancy context");
  const [current, setCurrent] = useState(profile);
  const [saving, startTransition] = useTransition();

  /** Applies the change locally, then persists it. */
  const save = (patch: Parameters<typeof updateProfile>[0], next: Profile) => {
    setCurrent(next);
    startTransition(async () => {
      const saved = await updateProfile(patch);
      setCurrent(saved);
    });
  };

  const flipNotification = (key: string) => {
    const value = !current.notifications[key];
    save(
      { notifications: { [key]: value } },
      { ...current, notifications: { ...current.notifications, [key]: value } },
    );
  };

  const flipPermission = (key: string) => {
    if (!current.trusted_contact) return;
    const value = !current.trusted_contact.permissions[key];
    save(
      { trusted_contact_permissions: { [key]: value } },
      {
        ...current,
        trusted_contact: {
          ...current.trusted_contact,
          permissions: { ...current.trusted_contact.permissions, [key]: value },
        },
      },
    );
  };

  const initial = current.full_name.trim().charAt(0).toUpperCase() || "?";

  return (
    <AppShell title="Profile and preferences" subtitle="Context, privacy and notifications">
      <div className="grid max-w-[1100px] gap-5.5 lg:grid-cols-[236px_1fr] lg:items-start">
        {/* ---- Who, and which section ------------------------------------- */}
        <div className="card min-w-0 p-3.5">
          <div className="flex flex-col items-center px-2 pt-4 pb-5">
            <span className="grid size-19 place-items-center rounded-full bg-green font-display text-[28px] font-semibold text-white">
              {initial}
            </span>
            <p className="mt-3 text-[16px] font-medium text-ink">{current.full_name}</p>
            <p className="mt-0.5 text-caption text-faint">{current.email}</p>
          </div>
          <div className="scroll-x flex gap-0.5 lg:flex-col" role="tablist" aria-label="Settings">
            {TABS.map((t) => (
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
              <h2 className="card-title mb-4.5">Pregnancy context</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Due date" value={current.due_date ?? "Not set"} />
                <ReadField
                  label="Current stage"
                  value={
                    current.gestational_week !== null
                      ? `${current.gestational_week} weeks, ${current.trimester}`
                      : "Not set"
                  }
                />
                <ReadField label="Care location" value={current.care_location ?? "Not set"} />
                <ReadField label="Usual clinician" value={current.clinician ?? "Not set"} />
              </dl>
              {current.help_areas.length > 0 && (
                <>
                  <h3 className="mt-6 mb-2.5 text-caption text-muted">
                    What Nnneva handles for you
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {current.help_areas.map((area) => (
                      <li key={area} className="pill bg-green-wash text-caption text-green">
                        {area}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {tab === "Notifications" && (
            <section className="card p-6.5">
              <h2 className="card-title mb-4">Notifications</h2>
              <div className="flex flex-wrap gap-2.5">
                {NOTIFICATIONS.map((n) => {
                  const on = Boolean(current.notifications[n.key]);
                  return (
                    <button
                      key={n.key}
                      type="button"
                      aria-pressed={on}
                      disabled={saving}
                      onClick={() => flipNotification(n.key)}
                      className={`rounded-pill px-4 py-2.5 text-caption transition-colors disabled:opacity-60 ${
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
              <p className="mt-3 text-caption text-faint">
                Reaching you: <span className="text-muted">{current.contact_window}</span>
              </p>
            </section>
          )}

          {tab === "Privacy" && (
            <>
              <section className="card p-6.5">
                <h2 className="card-title mb-1.5">How long it is kept</h2>
                <p className="mb-4 text-small text-muted">
                  After this window, activity records are deleted automatically. Memory stays until
                  you remove it.
                </p>
                <div className="flex flex-wrap gap-2.5" role="group" aria-label="Retention window">
                  {RETENTION.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={current.retention === r}
                      disabled={saving}
                      onClick={() => save({ retention: r }, { ...current, retention: r })}
                      className={`rounded-pill px-4 py-2.5 text-caption transition-colors disabled:opacity-60 ${
                        current.retention === r
                          ? "bg-ink text-white"
                          : "bg-surface text-muted hover:bg-surface-3"
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
                <h2 className="card-title mb-1.5 !text-white">Sharing outside your account</h2>
                <p className="text-small leading-[1.6] text-green-soft">
                  Nothing about your pregnancy leaves Nnneva without an approval from you, and the
                  approval is asked for every single time. Nnneva never sells or trades your data.
                </p>
              </section>
            </>
          )}

          {tab === "Trusted contact" && (
            <section className="card p-6.5">
              {current.trusted_contact ? (
                <>
                  <h2 className="card-title mb-1.5 flex flex-wrap items-center gap-3">
                    Trusted contact
                    <span className="pill bg-green-wash text-micro text-green">
                      {current.trusted_contact.name}
                    </span>
                  </h2>
                  <p className="mb-4 text-small text-muted">
                    {current.trusted_contact.name.split(" ")[0]} sees only what you switch on here,
                    and every individual share is still approved separately.
                  </p>
                  <div className="flex flex-col">
                    {PERMISSIONS.map((p) => (
                      <ToggleRow
                        key={p.key}
                        label={p.label}
                        sub={p.sub}
                        on={Boolean(current.trusted_contact?.permissions[p.key])}
                        onToggle={() => flipPermission(p.key)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="card-title mb-1.5">Trusted contact</h2>
                  <p className="text-small text-muted">
                    You have not added anyone. Nnneva works exactly the same without one — a trusted
                    contact only ever receives what you explicitly approve.
                  </p>
                </>
              )}
            </section>
          )}

          {tab === "Account" && (
            <section className="card p-6.5">
              <h2 className="card-title mb-4.5">Account</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Full name" value={current.full_name} />
                <ReadField label="Email" value={current.email} />
                <ReadField label="Phone" value={current.phone ?? "Not set"} />
                <ReadField label="Due date" value={current.due_date ?? "Not set"} />
              </dl>
              <form action={logOut} className="mt-5">
                <button type="submit" className="btn btn-quiet">
                  Log out
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
