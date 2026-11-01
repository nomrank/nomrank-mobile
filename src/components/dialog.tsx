import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Btn, T } from "./ui";
import { brand, useTheme } from "@/theme";

type Ask = { title: string; body?: string; yes: string; no?: string; danger?: boolean };

let open: ((ask: Ask, done: (yes: boolean) => void) => void) | null = null;

// Ask a yes/no question in our own card instead of Android's grey alert: `await confirm({ title, yes })`.
export const confirm = (ask: Ask) => new Promise<boolean>((done) => (open ? open(ask, done) : done(false)));

export function DialogHost() {
  const { colors } = useTheme();
  const [state, setState] = useState<{ ask: Ask; done: (yes: boolean) => void } | null>(null);
  useEffect(() => {
    open = (ask, done) => setState({ ask, done });
    return () => {
      open = null;
    };
  }, []);
  const close = (yes: boolean) => {
    state?.done(yes);
    setState(null);
  };
  if (!state) return null;
  const { ask } = state;
  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={() => close(false)}>
      <Animated.View entering={FadeIn.duration(150)} style={{ flex: 1, backgroundColor: "rgba(23,17,28,0.72)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Pressable accessibilityLabel="Close" onPress={() => close(false)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
        <Animated.View entering={FadeInDown.duration(200)} accessibilityViewIsModal style={{ width: "100%", maxWidth: 360, borderRadius: 24, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 22, gap: 8 }}>
          <View style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: ask.danger ? colors.destructive : brand.mustard, marginBottom: 6 }} />
          <T size={19} weight={700} accessibilityRole="header">
            {ask.title}
          </T>
          {!!ask.body && (
            <T size={14} color={colors.muted}>
              {ask.body}
            </T>
          )}
          <View style={{ gap: 8, marginTop: 14 }}>
            <Btn label={ask.yes} variant={ask.danger ? "danger" : "primary"} onPress={() => close(true)} />
            <Btn label={ask.no ?? "Cancel"} variant="ghost" onPress={() => close(false)} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
