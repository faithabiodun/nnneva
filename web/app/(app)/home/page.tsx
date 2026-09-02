import { api } from "@/lib/api";
import type { Home } from "@/lib/types";
import { HomeView } from "@/components/app/views/HomeView";

export const metadata = { title: "Home" };

/** "Good morning" is only true some of the time. */
function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  return hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const home = await api.get<Home>("/home");

  // Formatted on the server: a date computed during a client render is impure
  // and would not match what was sent down.
  const now = new Date();
  const today = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return <HomeView home={home} today={today} greeting={greetingFor(now.getHours())} />;
}
