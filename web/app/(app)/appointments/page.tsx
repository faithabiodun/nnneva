import { api } from "@/lib/api";
import type { Appointments } from "@/lib/types";
import { AppointmentsView } from "@/components/app/views/AppointmentsView";

export const metadata = { title: "Appointments" };

export default async function AppointmentsPage() {
  // Upcoming and past are split by the API: the server owns the clock, so a
  // device with a wrong date cannot file the next visit under "past".
  const { upcoming, past } = await api.get<Appointments>("/appointments");
  return <AppointmentsView visit={upcoming[0] ?? null} past={past} />;
}
