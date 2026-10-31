import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "./ui";
import { useTheme } from "@/theme";

let show: ((text: string) => void) | null = null;

// Say something briefly from anywhere: toast("Saved").
export const toast = (text: string) => show?.(text);

export function Toaster() {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    show = (t) => {
      setText(t);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setText(null), 2600);
    };
    return () => {
      show = null;
    };
  }, []);
  if (!text) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: top + 8, left: 16, right: 16, alignItems: "center" }}>
      <Animated.View accessibilityLiveRegion="polite" entering={FadeInUp.duration(200)} exiting={FadeOutUp.duration(160)} style={{ backgroundColor: colors.raised, borderColor: colors.hairline, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <T size={14} weight={600}>
          {text}
        </T>
      </Animated.View>
    </View>
  );
}
