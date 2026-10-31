import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { T } from "./ui";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { LogoMark } from "./logo-mark";
import { useTheme } from "@/theme";

// The fox floats gently while the app loads. Reduced motion: it just sits there.
export function Loader({ label = "Loading" }: { label?: string }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    lift.value = withRepeat(withSequence(withTiming(-8, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1);
  }, [lift, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Animated.View style={style}>
        <LogoMark size={88} />
      </Animated.View>
      <T size={14} color={colors.muted}>{label}…</T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
});
