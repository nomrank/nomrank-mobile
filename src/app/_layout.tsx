import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Loader } from "@/components/loader";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <Routes />
      </SessionProvider>
    </ThemeProvider>
  );
}

// Signed out sees only the sign-in screen; signed in sees the app. The saved session is read first, behind the loader.
function Routes() {
  const session = useSession();
  const { colors, scheme } = useTheme();
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  if (session === undefined) return <Loader />;
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
