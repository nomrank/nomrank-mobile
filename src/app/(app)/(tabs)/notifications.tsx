import { useCallback, useEffect, useRef } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckIcon, MessageCircleIcon, ShieldIcon, UserPlusIcon } from "lucide-react-native";
import { describe, getNotifications, type Notification } from "@/core/notifications";
import { timeAgo } from "@/core/time";
import { AgreeIcon, Avatar } from "@/components/marks";
import { useGo } from "@/components/social";
import { Empty, Failed, Loading, T, useData } from "@/components/ui";
import { markAllRead } from "@/lib/actions";
import { useActivity } from "@/lib/activity";
import { useScrollToTopOnTab } from "@/lib/scroll";
import { useSession } from "@/lib/session";
import { SITE, supabase } from "@/lib/supabase";
import { brand, useTheme } from "@/theme";

function Glyph({ n }: { n: Notification }) {
  const { colors } = useTheme();
  const color = colors.mustardInk;
  if (n.kind === "agree") return <AgreeIcon size={14} color={color} />;
  if (n.kind === "comment" || n.kind === "reply") return <MessageCircleIcon size={14} color={color} />;
  if (n.kind === "follow") return <UserPlusIcon size={14} color={color} />;
  if (n.kind === "dish_approved") return <CheckIcon size={14} color={color} />;
  return <ShieldIcon size={14} color={color} />;
}

function Item({ n }: { n: Notification }) {
  const { colors } = useTheme();
  const go = useGo();
  const d = describe(n);
  const open = () => {
    if (!d.href) return;
    if (d.href.startsWith("/about")) WebBrowser.openBrowserAsync(`${SITE}${d.href}`);
    else go(d.href.replace("#comments", ""));
  };
  return (
    <Pressable onPress={open} disabled={!d.href} accessibilityRole="button" style={{ flexDirection: "row", gap: 12, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.hairline, backgroundColor: n.read_at ? "transparent" : "rgba(255,194,60,0.08)" }}>
      {n.actor ? <Avatar handle={n.actor.username} code={n.actor.avatar} photo={n.actor.avatar_path} size={36} /> : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" }}><Glyph n={n} /></View>}
      <View style={{ flex: 1, gap: 2 }}>
        <T size={14}>
          {d.who && <T size={14} weight={600}>{d.who} </T>}
          {d.text}
        </T>
        {d.quote && (
          <T size={14} color={colors.muted} numberOfLines={2}>
            “{d.quote}”
          </T>
        )}
        <T size={12} color={colors.faint}>
          {timeAgo(n.created_at)}
        </T>
      </View>
      {!n.read_at && <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: brand.ketchup }} accessibilityLabel="New" />}
    </Pressable>
  );
}

// Activity: votes, comments, follows and notices. Opening it marks everything read.
export default function Activity() {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const { userId } = useSession();
  const { refresh } = useActivity();
  const { data, failed, reload } = useData(() => getNotifications(supabase, userId!), [userId]);

  useEffect(() => {
    if (data?.some((n) => !n.read_at) && userId) markAllRead(userId).then(() => refresh());
    Notifications.dismissAllNotificationsAsync().catch(() => {});
  }, [data, userId, refresh]);

  const renderItem = useCallback(({ item }: { item: Notification }) => <Item n={item} />, []);
  const list = useRef<FlatList<Notification>>(null);
  useScrollToTopOnTab("notifications", list);
  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <T size={22} weight={800} accessibilityRole="header" style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        Activity
      </T>
      {failed && !data ? (
        <Failed onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <FlatList
          ref={list}
          data={data}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={brand.mustard} colors={[brand.ketchup]} />}
          ListEmptyComponent={<Empty title="Nothing yet">When people agree with your takes, reply or follow you, it shows up here.</Empty>}
          style={{ borderTopWidth: 1, borderTopColor: colors.hairline }}
        />
      )}
    </View>
  );
}
