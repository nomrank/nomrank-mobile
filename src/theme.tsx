import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The web app's colour tokens (apps/web/app/globals.css), dark and light.
export const palettes = {
  dark: { background: "#17111c", foreground: "#fff4ea", paper: "#211a27", raised: "#2a2231", hairline: "#2f2737", faint: "#8e8296", muted: "#b3a8b9", destructive: "#ff8a7d", input: "#6e6377", mustardInk: "#ffc23c", ketchupInk: "#ff4b3a" },
  light: { background: "#fbf6ef", foreground: "#17111c", paper: "#ffffff", raised: "#f3ebe0", hairline: "#e6dccf", faint: "#756a7b", muted: "#5f5467", destructive: "#c4301f", input: "#8c8293", mustardInk: "#8a5a00", ketchupInk: "#d42d1c" },
} as const;
export const brand = { ketchup: "#ff4b3a", mustard: "#ffc23c", studio: "#17111c" } as const;

export type Choice = "system" | "light" | "dark";
const KEY = "nomrank-theme";

type Ctx = { colors: (typeof palettes)["dark"] | (typeof palettes)["light"]; scheme: "light" | "dark"; choice: Choice; setChoice: (c: Choice) => void };
const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === "light" ? "light" : "dark";
  const [choice, setChoiceState] = useState<Choice>("system");
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => (v === "light" || v === "dark") && setChoiceState(v));
  }, []);
  const value = useMemo<Ctx>(() => {
    const scheme = choice === "system" ? system : choice;
    return {
      colors: palettes[scheme],
      scheme,
      choice,
      setChoice: (c) => {
        setChoiceState(c);
        if (c === "system") AsyncStorage.removeItem(KEY);
        else AsyncStorage.setItem(KEY, c);
      },
    };
  }, [choice, system]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme outside ThemeProvider");
  return t;
}
