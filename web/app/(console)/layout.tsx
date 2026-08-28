import AppShell from "@/components/AppShell";

/**
 * Everything the health worker sees sits inside the console shell. The mother's
 * conversation deliberately does not — it has its own pearl canvas and its own
 * chrome, because it is a different product for a different person.
 */
export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
