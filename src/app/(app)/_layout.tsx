import type { ReactNode } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import Animated, { Easing, SlideInDown, SlideInRight } from "react-native-reanimated";
import { ActivityProvider } from "@/lib/activity";
import { useTheme } from "@/theme";

const EASE = Easing.bezier(0.32, 0.72, 0, 1);

// The web build has no native screen transitions, so each pushed screen brings its own.
function WebEnter({ name, children }: { name: string; children: ReactNode }) {
  if (name === "(tabs)") return children;
  const enter = (name === "rate/index" ? SlideInDown : SlideInRight).duration(280).easing(EASE);
  return (
    <Animated.View entering={enter} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
}

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <ActivityProvider>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "ios_from_right" }}
        screenLayout={Platform.OS === "web" ? ({ route, children }) => <WebEnter name={route.name}>{children}</WebEnter> : undefined}
      >
        <Stack.Screen name="rate/index" options={{ animation: "slide_from_bottom" }} />
      </Stack>
    </ActivityProvider>
  );
}
