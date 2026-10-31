import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter, type Href } from "expo-router";
import { unreadCount } from "@/core/notifications";
import { notifyNew, watchInBackground } from "./notify";
import { useSession } from "./session";
import { supabase } from "./supabase";

const POLL_MS = 30_000;

const ActivityContext = createContext({ unread: 0, refresh: () => {} });
export const useActivity = () => useContext(ActivityContext);

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

// The Activity badge, and a phone notification for anything new. While the app is open it checks every 30 seconds; when
// it's closed, the background check in notify.ts takes over.
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
    notifyNew(userId).catch(() => {});
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
    watchInBackground().catch(() => {});
    const open = (r: Notifications.NotificationResponse | null) => {
      const href = r?.notification.request.content.data?.href;
      if (typeof href === "string") router.push(href as Href);
    };
    // Tapped while the app was closed. Cleared after use, or it would reopen on every launch.
    Notifications.getLastNotificationResponseAsync().then((r) => {
      open(r);
      if (r) Notifications.clearLastNotificationResponseAsync();
    });
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);

  return <ActivityContext.Provider value={{ unread, refresh }}>{children}</ActivityContext.Provider>;
}
