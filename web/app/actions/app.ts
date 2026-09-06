"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import type {
  AgentRun,
  ContactMessage,
  Appointment,
  ConversationDetail,
  ConversationSummary,
  MemoryItem,
  Profile,
  Question,
  Task,
  TrustedContactDetail,
} from "@/lib/types";

/* ---- Onboarding -------------------------------------------------------- */

export type OnboardingAnswers = {
  due_date: string;
  care_location?: string | null;
  clinician?: string | null;
  help_areas: string[];
  contact_name?: string | null;
  contact_relationship?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_can_see_shared_tasks?: boolean;
  contact_window?: string | null;
};

export async function completeOnboarding(answers: OnboardingAnswers): Promise<void> {
  await api.post<Profile>("/onboarding", answers);
  redirect("/home");
}

/* ---- The agent ---------------------------------------------------------- */

export async function askNnneva(
  message: string,
  conversationId?: string,
): Promise<AgentRun> {
  const run = await api.post<AgentRun>("/agent/runs", {
    message,
    // Omitted rather than null when absent: the API treats a missing id as
    // "start a new thread", and it should never be asked to guess.
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });
  // A run creates tasks, appointments, memories and activity, so every screen
  // that reads them is now stale.
  for (const path of ["/home", "/tasks", "/appointments", "/activity", "/chats"]) {
    revalidatePath(path);
  }
  return run;
}

export async function answerApproval(approvalId: string, approve: boolean): Promise<void> {
  await api.post(`/approvals/${approvalId}`, { approve });
  for (const path of ["/home", "/agent", "/tasks", "/activity", "/memory"]) {
    revalidatePath(path);
  }
}

/* ---- Tasks -------------------------------------------------------------- */

export async function setTaskStatus(taskId: string, status: Task["status"]): Promise<Task> {
  const task = await api.patch<Task>(`/tasks/${taskId}`, { status });
  revalidatePath("/tasks");
  revalidatePath("/home");
  return task;
}

/* ---- Appointments -------------------------------------------------------- */

export async function addQuestion(appointmentId: string, text: string): Promise<Question> {
  const question = await api.post<Question>(`/appointments/${appointmentId}/questions`, { text });
  revalidatePath("/appointments");
  return question;
}

export async function togglePreparation(
  appointmentId: string,
  itemId: string,
): Promise<Appointment> {
  const appointment = await api.patch<Appointment>(
    `/appointments/${appointmentId}/preparation/${itemId}`,
  );
  revalidatePath("/appointments");
  return appointment;
}

/* ---- Memory --------------------------------------------------------------- */

export async function forgetMemory(memoryId: string): Promise<void> {
  await api.delete(`/memory/${memoryId}`);
  revalidatePath("/memory");
}

/* ---- Profile -------------------------------------------------------------- */

export type ProfilePatch = {
  full_name?: string;
  phone?: string;
  avatar?: string | null;
  /** Creates the pregnancy profile when there is none yet. */
  due_date?: string;
  care_location?: string;
  clinician?: string;
  help_areas?: string[];
  contact_window?: string;
  retention?: string;
  notifications?: Record<string, boolean>;
  trusted_contact_permissions?: Record<string, boolean>;
};

export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  const profile = await api.patch<Profile>("/profile", patch);
  revalidatePath("/profile");
  // The layout reads the profile for the sidebar and the setup prompt, so a
  // due date entered here has to clear the prompt everywhere, not just on
  // this page.
  revalidatePath("/", "layout");
  return profile;
}

/* ---- Reads used by client components ------------------------------------- */

export async function listMemories(): Promise<MemoryItem[]> {
  return api.get<MemoryItem[]>("/memory");
}

/* ---- Conversations -------------------------------------------------------- */

export async function listConversations(): Promise<ConversationSummary[]> {
  return api.get<ConversationSummary[]>("/agent/conversations");
}

export async function readConversation(id: string): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/agent/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/agent/conversations/${id}`);
  revalidatePath("/chats");
}

/* ---- The trusted contact -------------------------------------------------- */

export async function readContact(): Promise<TrustedContactDetail> {
  return api.get<TrustedContactDetail>("/contact");
}

export async function inviteContact(): Promise<TrustedContactDetail> {
  const contact = await api.post<TrustedContactDetail>("/contact/invite");
  revalidatePath("/partner");
  return contact;
}

export async function revokeInvite(): Promise<void> {
  await api.delete("/contact/invite");
  revalidatePath("/partner");
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  return api.get<ContactMessage[]>("/contact/messages");
}

export async function messageContact(body: string): Promise<ContactMessage> {
  const message = await api.post<ContactMessage>("/contact/messages", { body });
  revalidatePath("/partner");
  return message;
}

export async function assignTask(taskId: string): Promise<void> {
  await api.post(`/tasks/${taskId}/assign`);
  revalidatePath("/partner");
  revalidatePath("/tasks");
}

export async function unassignTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}/assign`);
  revalidatePath("/partner");
  revalidatePath("/tasks");
}
