"use client";

import { useEffect, useState, useTransition } from "react";

import { checkUsername, completeWelcome } from "@/app/actions/welcome";
import { Mark } from "@/components/Brand";

/**
 * First run, in two steps: who you are, then what people call you here.
 *
 * The role is asked first because it decides what the rest of the app is
 * allowed to assume. Nnneva is built around a pregnancy, and a supporter does
 * not have one — sending them through a due-date wizard would ask for
 * something they cannot answer and then nag them forever for not answering it.
 *
 * The handle comes second, pre-filled with the one already allocated at
 * sign-up. Someone who does not care presses Continue; someone who does gets
 * an answer as they type rather than after submitting.
 */
const ROLES = [
  {
    key: "expecting" as const,
    title: "I'm pregnant",
    detail: "Nnneva tracks your week, prepares for appointments and times reminders.",
  },
  {
    key: "postpartum" as const,
    title: "I've given birth",
    detail: "No due date to track. Tasks, reminders and your trusted contacts still work.",
  },
  {
    key: "supporter" as const,
    title: "I'm supporting someone",
    detail: "A partner, friend or family member. You'll see what they choose to share.",
  },
];

type Role = (typeof ROLES)[number]["key"];

export function WelcomeSetup({ name, username }: { name: string; username: string }) {
  const [step, setStep] = useState<"role" | "username">("role");
  const [role, setRole] = useState<Role | null>(null);
  const [handle, setHandle] = useState(username);
  /* The answer is stored against the handle it was asked about, so a reply
     that lands after the box has moved on is ignored rather than shown for
     the wrong name. */
  const [check, setCheck] = useState<
    { for: string; available: boolean; problem: string | null } | null
  >(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const candidate = handle.trim().toLowerCase();
  const mine = candidate === username;
  const status = mine
    ? { available: true, problem: null }
    : check?.for === candidate
      ? check
      : null;

  /* Debounced so a fast typist does not fire a request per keystroke. The
     unchanged handle is already theirs, so it needs no round trip. */
  useEffect(() => {
    const asking = handle.trim().toLowerCase();
    if (!asking || asking === username) return;
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(asking);
        setCheck({ for: asking, available: result.available, problem: result.problem });
      } catch {
        // Leave it unanswered: Continue stays disabled rather than promising
        // a name we could not confirm.
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [handle, username]);

  const submit = () => {
    if (!role || pending || !status?.available) return;
    setFailed(null);
    startTransition(async () => {
      try {
        await completeWelcome(role, handle);
      } catch (error) {
        // redirect() throws by design; anything else is a real failure.
        if (error && typeof error === "object" && "digest" in error) throw error;
        setFailed("That did not save. Please try again.");
      }
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[620px] flex-col justify-center px-5 py-12">
      <Mark size={44} className="mb-6" />

      {step === "role" ? (
        <>
          <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-[1.15] font-semibold tracking-[-0.02em] text-ink">
            Welcome, {name.split(" ")[0]}.
          </h1>
          <p className="mt-2.5 text-body text-muted">
            Which of these is you? It decides what Nnneva asks for and what it never
            will.
          </p>

          <div className="mt-7 flex flex-col gap-2.5" role="radiogroup" aria-label="Which of these is you">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={role === r.key}
                onClick={() => setRole(r.key)}
                className={`rounded-[14px] border px-5 py-4 text-left transition-colors ${
                  role === r.key
                    ? "border-green bg-green-tint"
                    : "border-line bg-white hover:border-green-mid"
                }`}
              >
                <span className="block text-[16px] font-medium text-ink">{r.title}</span>
                <span className="mt-1 block text-caption text-muted">{r.detail}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!role}
            onClick={() => setStep("username")}
            className="btn btn-ink mt-7 self-start disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <h1 className="font-display text-[clamp(26px,4vw,34px)] leading-[1.15] font-semibold tracking-[-0.02em] text-ink">
            Pick your username
          </h1>
          <p className="mt-2.5 text-body text-muted">
            This is how someone finds you to connect. We&rsquo;ve suggested one — change it
            if you&rsquo;d rather.
          </p>

          <div className="mt-7">
            <label htmlFor="handle" className="mb-1.5 block text-caption text-muted">
              Username
            </label>
            <div className="flex items-center gap-2 rounded-md border border-line bg-white px-4 focus-within:ring-2 focus-within:ring-green">
              <span aria-hidden className="text-body text-faint">
                @
              </span>
              <input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="handle-status"
                className="min-w-0 flex-1 bg-transparent py-3 text-body text-ink outline-none"
              />
            </div>
            <p
              id="handle-status"
              aria-live="polite"
              className={`mt-2 text-caption ${
                status?.problem ? "text-danger" : status?.available ? "text-green" : "text-faint"
              }`}
            >
              {status?.problem
                ? status.problem
                : status?.available
                  ? mine
                    ? "This one is yours already."
                    : "Available."
                  : "Lowercase letters, numbers, dots and underscores."}
            </p>
          </div>

          {failed && <p className="mt-3 text-caption text-danger">{failed}</p>}

          <div className="mt-7 flex items-center gap-4">
            <button
              type="button"
              disabled={pending || !status?.available}
              onClick={submit}
              className="btn btn-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="text-caption text-muted transition-colors hover:text-ink"
            >
              Back
            </button>
          </div>
        </>
      )}
    </main>
  );
}
