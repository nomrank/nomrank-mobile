import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter, type Href } from "expo-router";
import { describe, getNotifications, unreadCount } from "@/core/notifications";
import { useSession } from "./session";
import { supabase } from "./supabase";

const SEEN_KEY = "nomrank-notified-until";
const POLL_MS = 60_000;

const ActivityContext = createContext({ unread: 0, refresh: () => {} });
export const useActivity = () => useContext(ActivityContext);

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

// The Activity badge, and a phone notification for anything new.
// shortcut: this checks while the app is running (a local notification every 60s at most). Notifications with the app
// closed need Firebase and a server-side sender; add those before launch.
export function ActivityProvider({ children }: { children: ReactNode }) {
  const { userId, profile } = useSession();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const signedIn = Boolean(userId && profile);

  const refresh = useCallback(async () => {
    if (!userId || !signedIn) return setUnread(0);
    const count = await unreadCount(supabase, userId).catch(() => null);
    if (count === null) return;
    setUnread(count);
    if (!count || Platform.OS === "web") return;
    const until = await AsyncStorage.getItem(SEEN_KEY);
    const fresh = (await getNotifications(supabase, userId).catch(() => [])).filter((n) => !n.read_at && (!until || n.created_at > until));
    if (!fresh.length) return;
    await AsyncStorage.setItem(SEEN_KEY, fresh[0].created_at);
    if (!until) return; // first run on this phone: the backlog stays in Activity
    for (const n of fresh.slice(0, 3)) {
      const d = describe(n);
      await Notifications.scheduleNotificationAsync({ content: { title: "Nomrank", body: `${d.who ? `${d.who} ` : ""}${d.text}`, data: { href: d.href ?? "/notifications" } }, trigger: null });
    }
  }, [userId, signedIn]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setNotificationChannelAsync("default", { name: "Activity", importance: Notifications.AndroidImportance.DEFAULT });
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const href = r.notification.request.content.data?.href;
      if (typeof href === "string") router.push(href as Href);
    });
    return () => sub.remove();
  }, [router]);

  return <ActivityContext.Provider value={{ unread, refresh }}>{children}</ActivityContext.Provider>;
}
