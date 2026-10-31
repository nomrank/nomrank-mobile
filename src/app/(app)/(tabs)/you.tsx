import { Redirect } from "expo-router";
import { ProfileScreen } from "@/screens/profile";
import { useSession } from "@/lib/session";

export default function You() {
  const { profile } = useSession();
  if (!profile) return <Redirect href="/login" />;
  return <ProfileScreen handle={profile.username} tab />;
}
