import { useLocalSearchParams } from "expo-router";
import { ProfileScreen } from "@/screens/profile";

export default function Profile() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  return <ProfileScreen handle={decodeURIComponent(handle).toLowerCase()} />;
}
