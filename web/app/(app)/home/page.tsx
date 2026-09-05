import { api } from "@/lib/api";
import type { Home, Profile } from "@/lib/types";
import { HomeView } from "@/components/app/views/HomeView";

export const metadata = { title: "Home" };

/** "Good morning" is only true some of the time. */
function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  return hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  // Both in one round trip: the agent panel needs to know whether there is any
  // pregnancy context to reason from.
  const [home, profile] = await Promise.all([
    api.get<Home>("/home"),
    api.get<Profile>("/profile"),
  ]);

  // Formatted on the server: a date computed during a client render is impure
  // and would not match what was sent down.
  const now = new Date();
  const today = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <HomeView
      home={home}
      today={today}
      greeting={greetingFor(now.getHours())}
      onboarded={profile.onboarded}
    />
  );
}
