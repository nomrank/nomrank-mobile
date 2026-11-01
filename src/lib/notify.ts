import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Saves this phone's Firebase token against the signed-in person, so the server can push to it. Skipped without permission.
export async function registerPush(userId: string) {
  if (Platform.OS !== "android") return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;
  await Notifications.setNotificationChannelAsync("default", { name: "Activity", importance: Notifications.AndroidImportance.DEFAULT });
  const { data: token } = await Notifications.getDevicePushTokenAsync();
  if (typeof token === "string") await supabase.from("push_tokens").upsert({ token, user_id: userId, updated_at: new Date().toISOString() });
}

// Drops this phone's token, so the next person to sign in here doesn't inherit the last one's pushes.
export async function forgetPush() {
  if (Platform.OS !== "android") return;
  const { data: token } = await Notifications.getDevicePushTokenAsync().catch(() => ({ data: null }));
  if (typeof token === "string") await supabase.from("push_tokens").delete().eq("token", token);
}
