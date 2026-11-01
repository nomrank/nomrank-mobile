import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Same Supabase project as the web app. Only the publishable key lives here (RLS does the protecting).
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: "pkce" },
});

// Refresh tokens only while the app is on screen.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

// Where people land from legal links and shared links.
export const SITE = "https://www.nomrank.in";
// Shared takes, dishes and profiles have to open for whoever gets them, and show their preview card. Until launch the main site only
// shows the waitlist, so those links point at beta. Switch this to SITE the day the main site opens.
export const SHARE_SITE = "https://beta.nomrank.in";
// Email links need a site that serves /auth/confirm. The main site doesn't until launch, so they stay on beta.
export const AUTH_SITE = "https://beta.nomrank.in";
