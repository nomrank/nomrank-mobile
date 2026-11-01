import { Pressable, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BellIcon, HomeIcon, PlusIcon, SwordsIcon } from "lucide-react-native";
import { Avatar } from "@/components/marks";
import { T } from "@/components/ui";
import { useActivity } from "@/lib/activity";
import { useSession } from "@/lib/session";
import { brand, useTheme } from "@/theme";

const LABELS: Record<string, string> = { index: "Home", battles: "Battles", notifications: "Activity", you: "You" };

// The bottom bar: Home, Battles, the big Rate button, Activity and You.
function TabBar({ state, navigation }: { state: { index: number; routes: { key: string; name: string }[] }; navigation: { navigate: (name: string) => void; emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean } } }) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { profile } = useSession();
  const { unread } = useActivity();
  const router = useRouter();

  const tab = (name: string, active: boolean, icon: React.ReactNode, label: string, a11y = label) => (
    <Pressable
      key={name}
      onPress={() => {
        const target = state.routes.find((r) => r.name === name)?.key ?? name;
        if (!navigation.emit({ type: "tabPress", target, canPreventDefault: true }).defaultPrevented) navigation.navigate(name);
      }}
      accessibilityRole="tab"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, height: 56, alignItems: "center", justifyContent: "center", gap: 2 }}
    >
      {active && <View style={{ position: "absolute", top: 0, width: 24, height: 2, borderRadius: 2, backgroundColor: brand.ketchup }} />}
      {icon}
      <T size={11} weight={600} color={active ? colors.foreground : colors.faint}>
        {label}
      </T>
    </Pressable>
  );

  const current = state.routes[state.index].name;
  const ink = (name: string) => (current === name ? colors.foreground : colors.faint);
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", paddingBottom: bottom, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.hairline }}>
      {tab("index", current === "index", <HomeIcon size={22} color={ink("index")} />, LABELS.index)}
      {tab("battles", current === "battles", <SwordsIcon size={22} color={ink("battles")} />, LABELS.battles)}
      {profile && (
        <>
          <Pressable onPress={() => router.push("/rate")} accessibilityRole="button" accessibilityLabel="Rate a dish" style={{ flex: 1, height: 56, alignItems: "center" }}>
            {({ pressed }) => (
              <View style={{ position: "absolute", top: -16, width: 52, height: 52, borderRadius: 26, backgroundColor: brand.ketchup, alignItems: "center", justifyContent: "center", elevation: 6, transform: [{ scale: pressed ? 0.92 : 1 }] }}>
                <PlusIcon size={26} color={brand.studio} strokeWidth={2.75} />
              </View>
            )}
          </Pressable>
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
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...(props as unknown as Parameters<typeof TabBar>[0])} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="battles" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
