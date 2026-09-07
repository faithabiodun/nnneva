"use server";

import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";

/** Whether a handle is free, checked as someone types. */
export async function checkUsername(
  u: string,
): Promise<{ username: string; available: boolean; problem: string | null }> {
  const handle = u.trim().toLowerCase();
  if (!handle) return { username: "", available: false, problem: null };
  return api.get(`/people/username-available?u=${encodeURIComponent(handle)}`);
}

/**
 * Saves the first-run answers, then sends the person where their answer says.
 *
 * The routing is the point of asking. A supporter has no due date and should
 * never meet the pregnancy wizard; someone who has already given birth should
 * not be asked when they are due.
 */
export async function completeWelcome(
  role: "expecting" | "postpartum" | "supporter",
  username: string,
): Promise<void> {
  await api.patch<Profile>("/profile", { role, username: username.trim().toLowerCase() });
  redirect(role === "expecting" ? "/onboarding" : role === "supporter" ? "/helping" : "/home");
}
