"use server";

import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { endSession, startSession } from "@/lib/session";
import type { Token } from "@/lib/types";

/**
 * Form state for the auth screens. `null` means nothing has been submitted yet;
 * a string is the message to show under the form.
 */
export type AuthState = { error: string } | null;

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const full_name = String(form.get("full_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!full_name || !email || !password) {
    return { error: "Please fill in every field." };
  }
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  let token: Token;
  try {
    token = await api.post<Token>("/auth/signup", { full_name, email, password }, true);
  } catch (error) {
    return { error: messageFor(error) };
  }

  await startSession(token.access_token);
  redirect("/onboarding");
}

export async function logIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  let token: Token;
  try {
    token = await api.post<Token>("/auth/login", { email, password }, true);
  } catch (error) {
    return { error: messageFor(error) };
  }

  await startSession(token.access_token);
  // Someone who signed up but never finished setup lands back where they left.
  redirect(token.onboarded ? "/home" : "/onboarding");
}

export async function logOut(): Promise<void> {
  await endSession();
  redirect("/");
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    // 500s and connection failures should not put server internals on screen.
    return error.status >= 500 || error.status === 0
      ? "Nnneva is not reachable right now. Please try again in a moment."
      : error.message;
  }
  throw error;
}
