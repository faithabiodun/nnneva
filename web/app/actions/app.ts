"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import type {
  AgentRun,
  Appointment,
  ContactMessage,
  ContactRequests,
  ConversationDetail,
  ConversationSummary,
  Helping,
  MemoryItem,
  Person,
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
  username?: string;
  phone?: string;
  /** Creates the pregnancy profile when there is none yet. */
  due_date?: string;
  care_location?: string;
  clinician?: string;
  help_areas?: string[];
  contact_window?: string;
  retention?: string;
  notifications?: Record<string, boolean>;
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

/* ---- Trusted contacts ----------------------------------------------------- */

export async function listContacts(): Promise<TrustedContactDetail[]> {
  return api.get<TrustedContactDetail[]>("/contacts");
}

export async function addContact(input: {
  name: string;
  relationship: string;
  phone?: string | null;
  email?: string | null;
}): Promise<TrustedContactDetail> {
  const contact = await api.post<TrustedContactDetail>("/contacts", input);
  revalidatePath("/partner");
  revalidatePath("/profile");
  return contact;
}

export async function updateContact(
  id: string,
  patch: {
    name?: string;
    relationship?: string;
    phone?: string | null;
    email?: string | null;
    permissions?: Record<string, boolean>;
  },
): Promise<TrustedContactDetail> {
  const contact = await api.patch<TrustedContactDetail>(`/contacts/${id}`, patch);
  revalidatePath("/partner");
  revalidatePath("/profile");
  return contact;
}

export async function removeContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
  revalidatePath("/partner");
  revalidatePath("/profile");
}

export async function inviteContact(id: string): Promise<TrustedContactDetail> {
  const contact = await api.post<TrustedContactDetail>(`/contacts/${id}/invite`);
  revalidatePath("/partner");
  return contact;
}

export async function revokeInvite(id: string): Promise<void> {
  await api.delete(`/contacts/${id}/invite`);
  revalidatePath("/partner");
}

export async function listContactMessages(id: string): Promise<ContactMessage[]> {
  return api.get<ContactMessage[]>(`/contacts/${id}/messages`);
}

export async function messageContact(id: string, body: string): Promise<ContactMessage> {
  const message = await api.post<ContactMessage>(`/contacts/${id}/messages`, { body });
  revalidatePath("/partner");
  return message;
}

export async function assignTask(contactId: string, taskId: string): Promise<void> {
  await api.post(`/contacts/${contactId}/tasks/${taskId}`);
  revalidatePath("/partner");
  revalidatePath("/tasks");
}

export async function unassignTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}/assign`);
  revalidatePath("/partner");
  revalidatePath("/tasks");
}

/* ---- Finding people, and asking them -------------------------------------- */

export async function searchPeople(q: string): Promise<Person[]> {
  if (q.trim().length < 2) return [];
  return api.get<Person[]>(`/people/search?q=${encodeURIComponent(q.trim())}`);
}

export async function listRequests(): Promise<ContactRequests> {
  return api.get<ContactRequests>("/people/requests");
}

export async function sendRequest(username: string, relationship: string): Promise<void> {
  await api.post("/people/requests", { username, relationship });
  revalidatePath("/partner");
}

export async function answerRequest(id: string, accept: boolean): Promise<void> {
  await api.post(`/people/requests/${id}/${accept ? "accept" : "decline"}`);
  revalidatePath("/partner");
  revalidatePath("/helping");
}

export async function withdrawRequest(id: string): Promise<void> {
  await api.delete(`/people/requests/${id}`);
  revalidatePath("/partner");
}

/* ---- The other side: people this account is helping ----------------------- */

export async function listHelping(): Promise<Helping[]> {
  return api.get<Helping[]>("/people/helping");
}

export async function readHelpingThread(contactId: string): Promise<ContactMessage[]> {
  return api.get<ContactMessage[]>(`/people/helping/${contactId}/messages`);
}

export async function replyToMother(contactId: string, body: string): Promise<ContactMessage> {
  const message = await api.post<ContactMessage>(
    `/people/helping/${contactId}/messages`,
    { body },
  );
  revalidatePath("/helping");
  return message;
}

export async function completeForMother(contactId: string, taskId: string): Promise<void> {
  await api.post(`/people/helping/${contactId}/tasks/${taskId}/done`);
  revalidatePath("/helping");
}
