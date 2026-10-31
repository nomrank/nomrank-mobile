import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
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
import { IntroContext, INTRO_KEY, PERMISSIONS_KEY } from "@/lib/intro";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/theme";

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

// First run: the landing screens, then sign-in. Then whichever gate applies: finish your profile, a suspended account,
// the permissions ask, and finally the app. Signed out after the landing screens you can browse; anything that writes leads
// to sign-in. Each guard is what the web app's redirects do on every request.
function Routes() {
  const { ready, session, profile } = useSession();
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const [seen, setSeen] = useState<boolean | null>(null);
  const [asked, setAsked] = useState(true);
  const [wantLogin, setWantLogin] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([INTRO_KEY, PERMISSIONS_KEY]).then(([[, intro], [, perms]]) => {
      setSeen(intro === "1");
      setAsked(perms === "1");
    });
  }, []);

  useEffect(() => {
    if (!wantLogin || !seen) return;
    setWantLogin(false);
    router.push("/login");
  }, [wantLogin, seen, router]);

  if (!ready || seen === null) return <Loader />;

  const needsProfile = Boolean(session && !profile);
  const banned = Boolean(profile?.banned_at);
  const askPermissions = Boolean(profile && !banned && !asked);
  const inApp = seen && !needsProfile && !banned && !askPermissions;

  return (
    <IntroContext.Provider
      value={{
        finishIntro: (login) => {
          AsyncStorage.setItem(INTRO_KEY, "1");
          setSeen(true);
          setWantLogin(login);
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
          <Stack.Protected guard={seen && !session}>
            <Stack.Screen name="login" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          </Stack.Protected>
        </Stack>
        <Toaster />
      </View>
    </IntroContext.Provider>
  );
}
