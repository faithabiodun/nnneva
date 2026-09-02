import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";
import { ProfileView } from "@/components/app/views/ProfileView";

export const metadata = { title: "Profile and preferences" };

export default async function ProfilePage() {
  const profile = await api.get<Profile>("/profile");
  return <ProfileView profile={profile} />;
}
