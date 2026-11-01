import { Stack } from "expo-router";
import { ActivityProvider } from "@/lib/activity";
import { useTheme } from "@/theme";

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <ActivityProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "ios_from_right" }}>
        <Stack.Screen name="rate/index" options={{ animation: "slide_from_bottom" }} />
      </Stack>
    </ActivityProvider>
  );
}
