import { useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { BellIcon, ImagesIcon } from "lucide-react-native";
import { Btn, Card, T } from "@/components/ui";
import { useIntro } from "@/lib/intro";
import { useTheme } from "@/theme";

const ASKS = [
  { Icon: BellIcon, title: "Notifications", text: "Know when someone agrees with your take, replies or follows you." },
  { Icon: ImagesIcon, title: "Photos and camera", text: "Add photos of what you ate to your takes, and pick a profile picture." },
];

// Asked once, after sign-up, with the reason on screen before Android's own prompts. Saying no is fine: the app still works
// and rate-a-dish asks again when you add a photo.
export default function Permissions() {
  const { colors } = useTheme();
  const { finishPermissions } = useIntro();
  const [busy, setBusy] = useState(false);

  async function allow() {
    setBusy(true);
    if (Platform.OS !== "web") {
      await Notifications.requestPermissionsAsync().catch(() => {});
      await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => {});
      await ImagePicker.requestCameraPermissionsAsync().catch(() => {});
    }
    finishPermissions();
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, gap: 14 }}>
      <View style={{ flex: 1, justifyContent: "center", gap: 14 }}>
        <T size={28} weight={700} accessibilityRole="header">
          Two quick things
        </T>
        <T color={colors.muted}>Nomrank works better with these. You can change them any time in your phone&apos;s settings.</T>
        {ASKS.map(({ Icon, title, text }) => (
          <Card key={title} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
            <Icon size={22} color={colors.mustardInk} />
            <View style={{ flex: 1 }}>
              <T weight={700}>{title}</T>
              <T size={14} color={colors.muted}>
                {text}
              </T>
            </View>
          </Card>
        ))}
      </View>
      <Btn label="Allow" busy={busy} onPress={allow} />
      <Btn label="Not now" variant="ghost" onPress={finishPermissions} />
    </SafeAreaView>
  );
}
