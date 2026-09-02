"use client";

import { createContext, useContext } from "react";

/** Who is signed in, and what is waiting on them — read by the sidebar. */
export type Shell = {
  fullName: string;
  gestationalWeek: number | null;
  dueDate: string | null;
  pendingApprovals: number;
};

const ShellContext = createContext<Shell | null>(null);

export function ShellProvider({ value, children }: { value: Shell; children: React.ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShell must be used inside the (app) layout");
  return shell;
}
