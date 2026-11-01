import { useEffect } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Tabs, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BellIcon, HomeIcon, PlusIcon, SwordsIcon } from "lucide-react-native";
import { Avatar } from "@/components/marks";
import { Press, T } from "@/components/ui";
import { useActivity } from "@/lib/activity";
import { haptic } from "@/lib/haptics";
import { once } from "@/lib/once";
import { tabPressed } from "@/lib/scroll";
import { useSession } from "@/lib/session";
import { brand, useTheme } from "@/theme";

const LABELS: Record<string, string> = { index: "Home", battles: "Battles", notifications: "Activity", you: "You" };

// The bottom bar: Home, Battles, the big Rate button, Activity and You.
function TabBar({ state }: { state: { index: number; routes: { key: string; name: string }[] } }) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useSession();
  const { unread } = useActivity();
  const router = useRouter();

  const tab = (name: string, active: boolean, icon: React.ReactNode, label: string, a11y = label) => (
    <Pressable
      key={name}
      onPress={() => {
        if (!active) haptic.tap();
        router.navigate((name === "index" ? "/" : `/${name}`) as Href);
        tabPressed(name);
      }}
      accessibilityRole="tab"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, height: 56, alignItems: "center", justifyContent: "center", gap: 2 }}
    >
      {icon}
      <T size={11} weight={600} color={active ? colors.foreground : colors.faint}>
        {label}
      </T>
    </Pressable>
  );

  const current = state.routes[state.index].name;
  // A short line slides to the open tab. The + sits in the middle slot.
  const slots = profile ? 5 : 2;
  const slot = { index: 0, battles: 1, notifications: 3, you: 4 }[current] ?? 0;
  const spot = (width / slots) * (slot + 0.5) - 12;
  const x = useSharedValue(spot);
  useEffect(() => {
    x.value = withTiming(spot, { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) });
  }, [spot, x]);
  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const ink = (name: string) => (current === name ? colors.foreground : colors.faint);
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", paddingBottom: bottom, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.hairline }}>
      {tab("index", current === "index", <HomeIcon size={22} color={ink("index")} />, LABELS.index)}
      {tab("battles", current === "battles", <SwordsIcon size={22} color={ink("battles")} />, LABELS.battles)}
      {profile && (
        <>
          <Press onPress={() => once("go:/rate") && router.push("/rate")} to={0.92} accessibilityRole="button" accessibilityLabel="Rate a dish" style={{ flex: 1, height: 56, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 46, height: 34, borderRadius: 12, backgroundColor: brand.ketchup, alignItems: "center", justifyContent: "center" }}>
              <PlusIcon size={20} color={brand.studio} strokeWidth={2.75} />
            </View>
          </Press>
          {tab(
            "notifications",
            current === "notifications",
            <View>
              <BellIcon size={22} color={ink("notifications")} />
              {unread > 0 && (
                <View style={{ position: "absolute", top: -6, right: -9, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: brand.ketchup, alignItems: "center", justifyContent: "center" }}>
                  <T size={10} weight={700} color={brand.studio} style={{ lineHeight: 12 }}>
                    {unread > 9 ? "9+" : unread}
                  </T>
                </View>
              )}
            </View>,
            LABELS.notifications,
            unread ? `Activity, ${unread} new` : "Activity",
          )}
          {tab("you", current === "you", <Avatar handle={profile.username} code={profile.avatar} photo={profile.avatar_path} size={24} />, LABELS.you)}
        </>
      )}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, width: 24, height: 2, borderRadius: 2, backgroundColor: brand.ketchup }, marker]} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar state={props.state} />} screenOptions={{ headerShown: false, animation: "fade", sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="battles" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
