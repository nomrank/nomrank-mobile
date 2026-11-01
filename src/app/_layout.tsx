import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, useRouter, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, Geist_800ExtraBold } from "@expo-google-fonts/geist";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { Loader } from "@/components/loader";
import { Toaster } from "@/components/toast";
import { IntroContext, INTRO_KEY, PERMISSIONS_KEY, takeLink } from "@/lib/intro";
import "@/lib/notify"; // defines the background check at launch, including when Android starts the app just for it
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/theme";

// The emulator smoke test (scripts/smoke.sh) opens every screen without an account; this flag lets it in. Never set in releases.
const SMOKE = process.env.EXPO_PUBLIC_SMOKE === "1";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fonts] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, Geist_800ExtraBold, PlusJakartaSans_800ExtraBold, DMSerifDisplay_400Regular });
  useEffect(() => {
    if (fonts) SplashScreen.hideAsync();
  }, [fonts]);
  if (!fonts) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SessionProvider>
          <Routes />
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// First run: the landing screens, then sign-in, which is required. Then whichever gate applies: finish your profile, a
// suspended account, the permissions ask, and finally the app.
function Routes() {
  const { ready, session, profile } = useSession();
  const { colors, scheme } = useTheme();
  const [seen, setSeen] = useState<boolean | null>(SMOKE ? true : null);
  const [asked, setAsked] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([INTRO_KEY, PERMISSIONS_KEY]).then(([[, intro], [, perms]]) => {
      setSeen(intro === "1");
      setAsked(perms === "1");
    });
  }, []);

  const router = useRouter();
  const entered = SMOKE || (seen === true && Boolean(session) && Boolean(profile) && !profile?.banned_at && asked);
  useEffect(() => {
    if (!entered) return;
    const link = takeLink();
    if (link) router.push(link as Href);
  }, [entered, router]);

  if (!ready || seen === null) return <Loader />;

  const needsProfile = Boolean(session && !profile);
  const banned = Boolean(profile?.banned_at);
  const askPermissions = Boolean(profile && !banned && !asked);
  const inApp = SMOKE || (seen && Boolean(session) && !needsProfile && !banned && !askPermissions);

  return (
    <IntroContext.Provider
      value={{
        finishIntro: () => {
          AsyncStorage.setItem(INTRO_KEY, "1");
          setSeen(true);
        },
        finishPermissions: () => {
          AsyncStorage.setItem(PERMISSIONS_KEY, "1");
          setAsked(true);
        },
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={!seen || scheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Protected guard={!seen}>
            <Stack.Screen name="welcome" />
          </Stack.Protected>
          <Stack.Protected guard={needsProfile}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={banned}>
            <Stack.Screen name="suspended" />
          </Stack.Protected>
          <Stack.Protected guard={askPermissions}>
            <Stack.Screen name="permissions" />
          </Stack.Protected>
          <Stack.Protected guard={inApp}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!SMOKE && seen && !session}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
        <Toaster />
      </View>
    </IntroContext.Provider>
  );
}
