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
// Email links need a site that serves /auth/confirm. The main site doesn't until launch, so they stay on beta.
export const AUTH_SITE = "https://beta.nomrank.in";
