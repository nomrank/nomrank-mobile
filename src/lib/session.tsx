import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { asCity, type City } from "@/core/cities";
import { getPreferences, type FeedDefault } from "@/core/profiles";
import type { ShowDiet } from "@/core/diet";
import { supabase } from "./supabase";

export type Profile = {
  username: string;
  avatar: string | null;
  avatar_path: string | null;
  home_region: string;
  city: City | null;
  tour_done_at: string | null;
  banned_at: string | null;
  regions: { name: string; demonym: string } | null;
};

const CITY_KEY = "nomrank-city";
const ASKED_KEY = "nomrank-city-asked";
const DEFAULT_PREFS = { show_diet: "all" as ShowDiet, feed_default: "new" as FeedDefault };

type Ctx = {
  ready: boolean; // the saved session and profile have been read
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  city: City | null;
  askCity: boolean;
  setCity: (c: City) => void;
  skipCity: () => void;
  prefs: typeof DEFAULT_PREFS;
  reload: () => Promise<void>;
};
const SessionContext = createContext<Ctx | null>(null);

// Who is signed in, their profile, city and preferences: what the web app reads on every request, held once here.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [localCity, setLocalCity] = useState<City | null>(null);
  const [asked, setAsked] = useState(true);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    AsyncStorage.multiGet([CITY_KEY, ASKED_KEY]).then(([[, c], [, a]]) => {
      setLocalCity(asCity(c));
      setAsked(a === "1");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setPrefs(DEFAULT_PREFS);
      setLoaded(true);
      return;
    }
    const [{ data }, p] = await Promise.all([
      supabase.from("profiles").select("username, avatar, avatar_path, home_region, city, tour_done_at, banned_at, regions(name, demonym)").eq("id", userId).maybeSingle<Profile>(),
      getPreferences(supabase, userId).catch(() => DEFAULT_PREFS),
    ]);
    setProfile(data);
    setPrefs(p);
    setLoaded(true);
  }, [userId]);

  const known = session !== undefined;
  useEffect(() => {
    if (!known) return;
    setLoaded(false);
    reload();
  }, [known, reload]); // keyed on the user, not the session object: token refreshes must not reload the profile

  const value = useMemo<Ctx>(() => {
    const city = profile?.city ?? localCity;
    return {
      ready: known && loaded,
      session: session ?? null,
      userId,
      profile,
      city,
      askCity: !(profile ? profile.city : city) && !asked,
      setCity: (c) => {
        setLocalCity(c);
        AsyncStorage.setItem(CITY_KEY, c);
        if (userId) {
          setProfile((p) => p && { ...p, city: c });
          // If this write fails the device still remembers, and they get asked again on the next one.
          supabase.from("profiles").update({ city: c }).eq("id", userId).then(() => {});
        }
      },
      skipCity: () => {
        setAsked(true);
        AsyncStorage.setItem(ASKED_KEY, "1");
      },
      prefs,
      reload,
    };
  }, [session, known, loaded, userId, profile, localCity, asked, prefs, reload]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
