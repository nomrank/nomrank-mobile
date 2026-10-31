import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { describe, getNotifications } from "@/core/notifications";
import { supabase } from "./supabase";

const SEEN_KEY = "nomrank-notified-until";
const TASK = "nomrank-activity-check";

// Shows a phone notification for anything new since the last check. The first check on a phone only sets the mark, so a
// backlog doesn't arrive as a burst.
export async function notifyNew(userId: string) {
  if (Platform.OS === "web") return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;
  const latest = await getNotifications(supabase, userId);
  if (!latest.length) return;
  const until = await AsyncStorage.getItem(SEEN_KEY);
  await AsyncStorage.setItem(SEEN_KEY, latest[0].created_at);
  if (!until) return;
  await Notifications.setNotificationChannelAsync("default", { name: "Activity", importance: Notifications.AndroidImportance.DEFAULT });
  for (const n of latest.filter((x) => !x.read_at && x.created_at > until).slice(0, 3)) {
    const d = describe(n);
    await Notifications.scheduleNotificationAsync({ content: { title: "Nomrank", body: `${d.who ? `${d.who} ` : ""}${d.text}`, data: { href: d.href ?? "/notifications" } }, trigger: null });
  }
}

// shortcut: Android runs this about every 15 minutes while the app is closed, later on battery saver, and never after a force
// stop. Instant alerts need Firebase Cloud Messaging and a server-side sender.
TaskManager.defineTask(TASK, async () => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) await notifyNew(data.session.user.id);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function watchInBackground() {
  if (Platform.OS === "web" || (await TaskManager.isTaskRegisteredAsync(TASK))) return;
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
}
