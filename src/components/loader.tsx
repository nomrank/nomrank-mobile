import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { FACE, FOX, HAND, LEAF, MARK_VIEWBOX, SPARKLE } from "@/brand/logo";
import { brand, useTheme } from "@/theme";

const EASE = Easing.inOut(Easing.quad);

function Layer({ size, style, origin, children }: { size: number; style: ReturnType<typeof useAnimatedStyle>; origin?: string; children: React.ReactNode }) {
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size, transformOrigin: origin }, style]}>
      <Svg width={size} height={size} viewBox={MARK_VIEWBOX}>
        {children}
      </Svg>
    </Animated.View>
  );
}

function useLoop(value: SharedValue<number>, duration: number, pause: number, reduce: boolean) {
  useEffect(() => {
    if (!reduce) value.value = withRepeat(withSequence(withTiming(1, { duration, easing: EASE }), withTiming(0, { duration, easing: EASE }), withDelay(pause, withTiming(0, { duration: 1 }))), -1);
  }, [value, duration, pause, reduce]);
}

// The fox, alive: the head floats, the hand gives its OK now and then, the sparkle glints. No words. Each piece is its own
// layer, so it stays smooth while the screen loads. Reduced motion: it sits still.
export function FoxLoader({ size = 72 }: { size?: number }) {
  const { scheme } = useTheme();
  const reduce = useReducedMotion();
  const face = scheme === "light" ? "#f1c4a6" : "#fff4ea";
  const lift = useSharedValue(0);
  const wave = useSharedValue(0);
  const glint = useSharedValue(0);
  useLoop(lift, 900, 0, reduce);
  useLoop(wave, 220, 1100, reduce);
  useLoop(glint, 500, 500, reduce);
  const head = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value * -size * 0.05 }] }));
  const hand = useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.value * 12}deg` }] }));
  const sparkle = useAnimatedStyle(() => ({ opacity: 1 - glint.value * 0.5, transform: [{ scale: 1 + glint.value * 0.35 }] }));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ width: size, height: size }}>
      <Layer size={size} style={head}>
        <Path d={FOX} fill={brand.ketchup} fillRule="evenodd" />
        <Path d={FACE} fill={face} fillRule="evenodd" />
        <Path d={LEAF} fill={face} fillRule="evenodd" />
      </Layer>
      <Layer size={size} style={hand} origin="82% 90%">
        <Path d={HAND} fill={brand.ketchup} fillRule="evenodd" />
      </Layer>
      <Layer size={size} style={sparkle} origin="85% 28%">
        <Path d={SPARKLE} fill={brand.mustard} fillRule="evenodd" />
      </Layer>
    </View>
  );
}

export function Loader() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <FoxLoader size={96} />
    </View>
  );
}
