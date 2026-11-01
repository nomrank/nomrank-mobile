import { useState } from "react";
import { Platform, View } from "react-native";
import { PlusSquareIcon, ShareIcon, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme";
import { Btn, Sheet, T } from "./ui";

// iPhones get Nomrank from the website: Apple lets no page install itself, so this shows the two taps in Safari's own menu.
const iphoneInBrowser = () => {
  if (Platform.OS !== "web") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const ios = /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  return !nav.standalone && (ios || location.search.includes("install=1"));
};

const STEPS: { Icon: LucideIcon; text: string }[] = [
  { Icon: ShareIcon, text: "Tap Share in Safari's toolbar" },
  { Icon: PlusSquareIcon, text: "Choose Add to Home Screen, then Add" },
];

export function InstallSheet() {
  const { colors } = useTheme();
  const [open, setOpen] = useState(iphoneInBrowser);
  return (
    <Sheet open={open} onClose={() => setOpen(false)}>
      <T size={20} weight={700} accessibilityRole="header">
        Put Nomrank on your Home Screen
      </T>
      <T size={14} color={colors.muted} style={{ marginTop: 4 }}>
        It opens full screen, just like an app. Open it from there and sign in once.
      </T>
      <View style={{ gap: 12, marginTop: 16, marginBottom: 18 }}>
        {STEPS.map(({ Icon, text }) => (
          <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} color={colors.foreground} />
            </View>
            <T weight={600} style={{ flex: 1 }}>
              {text}
            </T>
          </View>
        ))}
      </View>
      <Btn label="Got it" variant="secondary" onPress={() => setOpen(false)} />
    </Sheet>
  );
}
