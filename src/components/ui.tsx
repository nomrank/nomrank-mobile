import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Modal, Pressable, Text, TextInput, useWindowDimensions, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeftIcon, ChevronRightIcon, SendIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { FoxLoader } from "./loader";
import { brand, useTheme } from "@/theme";

export const FONT = { 400: "Geist_400Regular", 500: "Geist_500Medium", 600: "Geist_600SemiBold", 700: "Geist_700Bold", 800: "Geist_800ExtraBold" } as const;
export const WORDMARK = "PlusJakartaSans_800ExtraBold";
export const SERIF = "DMSerifDisplay_400Regular";

type TProps = TextProps & { size?: number; weight?: keyof typeof FONT; color?: string; style?: StyleProp<TextStyle> };

// All text: Geist at a size and weight, in the theme's foreground unless told otherwise.
export const APressable = Animated.createAnimatedComponent(Pressable);

// A pressable that gives under the finger: quick down, a little slower back.
export function Press({ style, onPress, onPressIn, onPressOut, to = 0.97, ...rest }: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; to?: number }) {
  const scale = useSharedValue(1);
  const last = useRef(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      {...rest}
      onPress={(e) => {
        if (e.timeStamp - last.current < 500) return; // a double tap is one action
        last.current = e.timeStamp;
        haptic.light();
        onPress?.(e);
      }}
      onPressIn={(e) => {
        scale.value = withTiming(to, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 170 });
        onPressOut?.(e);
      }}
      style={[style, anim]}
    />
  );
}

export function T({ size = 15, weight = 400, color, style, ...rest }: TProps) {
  const { colors } = useTheme();
  return <Text {...rest} style={[{ fontFamily: FONT[weight], fontSize: size, lineHeight: Math.round(size * 1.35), color: color ?? colors.foreground }, style]} />;
}

export function Overline({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <T size={12} weight={600} color={colors.faint} style={[{ letterSpacing: 1, textTransform: "uppercase" }, style]}>
      {children}
    </T>
  );
}

type BtnProps = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
  icon?: ComponentType<{ size?: number; color?: string }>;
  style?: StyleProp<ViewStyle>;
};

export function Btn({ label, variant = "primary", busy, icon: Icon, disabled, style, ...rest }: BtnProps) {
  const { colors } = useTheme();
  const fill = variant === "primary" ? brand.ketchup : variant === "secondary" ? colors.raised : variant === "danger" ? colors.destructive : "transparent";
  const ink = variant === "primary" || variant === "danger" ? brand.studio : colors.foreground;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      style={[
        { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: fill, opacity: disabled ? 0.5 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.hairline },
        style,
      ]}
      {...rest}
    >
      {busy ? <FoxLoader size={24} /> : Icon ? <Icon size={18} color={ink} /> : null}
      <T size={15} weight={600} color={ink}>
        {label}
      </T>
    </Press>
  );
}

// The small round send arrow beside a comment box or take.
export function SendButton({ label, busy, disabled, onPress, style }: { label: string; busy?: boolean; disabled?: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <Press onPress={onPress} disabled={disabled || busy} to={0.9} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }} style={[{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: disabled ? colors.raised : brand.ketchup }, style]}>
      {busy ? <FoxLoader size={22} /> : <SendIcon size={17} color={disabled ? colors.faint : brand.studio} />}
    </Press>
  );
}

export function Input({ style, ...rest }: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      selectionColor={brand.ketchup}
      {...rest}
      style={[{ minHeight: 48, borderWidth: 1, borderColor: colors.input, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.raised, color: colors.foreground, fontFamily: FONT[400], fontSize: 16 }, style]}
    />
  );
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      to={0.95}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6, borderColor: on ? brand.mustard : colors.hairline, backgroundColor: on ? "rgba(255,194,60,0.15)" : "transparent" }}
    >
      {icon}
      <T size={14} weight={600} color={on ? colors.foreground : colors.muted}>
        {label}
      </T>
    </Press>
  );
}

// Underlined text tabs, like the web's Takes / Rankings row.
export function TabRow<K extends string>({ tabs, value, onChange }: { tabs: readonly (readonly [K, string])[]; value: K; onChange: (k: K) => void }) {
  const { colors } = useTheme();
  const spots = useRef<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const line = useAnimatedStyle(() => ({ width: width.value, transform: [{ translateX: x.value }] }));
  const move = (k: K, jump: boolean) => {
    const s = spots.current[k];
    if (!s) return;
    x.value = jump ? s.x : withTiming(s.x, { duration: 180 });
    width.value = jump ? s.width : withTiming(s.width, { duration: 180 });
  };
  useEffect(() => move(value, false), [value]); // eslint-disable-line react-hooks/exhaustive-deps -- shared values are stable
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 22, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      {tabs.map(([k, label]) => (
        <Pressable
          key={k}
          onPress={() => {
            if (k !== value) haptic.tap();
            onChange(k);
          }}
          onLayout={(e) => {
            spots.current[k] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
            if (k === value) move(k, true);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === k }}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <T size={14} weight={600} color={value === k ? colors.foreground : colors.muted}>
            {label}
          </T>
        </Pressable>
      ))}
      <Animated.View style={[{ position: "absolute", left: 0, bottom: -1, height: 2, borderRadius: 2, backgroundColor: brand.mustard }, line]} />
    </View>
  );
}

// The little sort links under a tab row.
export function SortRow<K extends string>({ options, value, onChange }: { options: readonly K[]; value: K; onChange: (k: K) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      {options.map((s) => (
        <Pressable key={s} onPress={() => { haptic.tap(); onChange(s); }} accessibilityRole="button" accessibilityState={{ selected: value === s }} style={{ minHeight: 40, justifyContent: "center" }}>
          <T size={14} weight={value === s ? 600 : 400} color={value === s ? colors.mustardInk : colors.muted} style={{ textTransform: "capitalize" }}>
            {s}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }, style]}>{children}</View>;
}

// A pushed screen's top: back arrow, optional title, optional action on the right. Clears the status bar.
export function Header({ title, right }: { title?: string; right?: ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: top + 4, paddingHorizontal: 12, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.background }}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityRole="button" accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <ArrowLeftIcon size={22} color={colors.foreground} />
      </Pressable>
      <T size={17} weight={700} numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </T>
      {right}
    </View>
  );
}

// The fox, in the middle of the screen. `cover` lays it over a list, whose rows would otherwise pull it to the top. It waits a beat
// so a quick load never flashes it.
export function Loading({ cover }: { cover?: boolean }) {
  return (
    <View pointerEvents="none" style={[{ alignItems: "center", justifyContent: "center", padding: 32 }, cover ? { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 } : { flex: 1 }]}>
      <Animated.View entering={FadeIn.delay(100).duration(160)}>
        <FoxLoader size={84} />
      </Animated.View>
    </View>
  );
}

export function Failed({ onRetry }: { onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <T weight={600}>Couldn&apos;t load that</T>
      <T size={14} color={colors.muted} style={{ textAlign: "center" }}>
        Check your connection and try again.
      </T>
      {onRetry && <Btn label="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function Empty({ title, children }: { title?: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 36, paddingHorizontal: 16, alignItems: "center", gap: 4 }}>
      {title && <T weight={600}>{title}</T>}
      {children && (
        <T size={14} color={colors.muted} style={{ textAlign: "center" }}>
          {children}
        </T>
      )}
    </View>
  );
}

// A tappable list row: label, title, one line of detail, chevron.
export function Row({ onPress, label, title, meta, leading }: { onPress: () => void; label?: string; title: ReactNode; meta?: ReactNode; leading?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" android_ripple={{ color: colors.raised }} style={{ minHeight: 64, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <T size={12} weight={600} color={colors.faint}>
            {label}
          </T>
        )}
        {typeof title === "string" ? <T size={16} weight={700}>{title}</T> : title}
        {meta && (typeof meta === "string" ? <T size={14} color={colors.muted}>{meta}</T> : meta)}
      </View>
      <ChevronRightIcon size={20} color={colors.foreground} />
    </Pressable>
  );
}

const DRAWER = Easing.bezier(0.32, 0.72, 0, 1);

// A bottom sheet on a dimmed backdrop: rises, and leaves the way it came. Tap outside, drag the handle down, or Android back closes it.
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [shown, setShown] = useState(open);
  const y = useSharedValue(height);
  useEffect(() => {
    if (open) {
      setShown(true);
      y.value = withTiming(0, { duration: 280, easing: DRAWER });
    } else {
      y.value = withTiming(height, { duration: 200, easing: DRAWER }, (done) => {
        if (done) runOnJS(setShown)(false);
      });
    }
  }, [open, height, y]);
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - y.value / height }));
  const drag = Gesture.Pan()
    .onUpdate((e) => {
      y.value = e.translationY > 0 ? e.translationY : e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) runOnJS(onClose)();
      else y.value = withTiming(0, { duration: 200, easing: DRAWER });
    });
  if (!shown) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1, backgroundColor: "rgba(23,17,28,0.7)" }, dim]}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.paper, paddingHorizontal: 20, paddingBottom: bottom + 20 }, panel]}>
          <GestureDetector gesture={drag}>
            <View collapsable={false} style={{ alignItems: "center", paddingTop: 12, paddingBottom: 14 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.hairline }} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Loads something when the screen opens and again each time you come back to it, so counts stay honest after an edit.
export function useData<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const run = useRef(0);
  const reload = useCallback(async () => {
    const mine = ++run.current;
    try {
      const next = await load();
      if (mine === run.current) {
        setData(next);
        setFailed(false);
      }
    } catch {
      if (mine === run.current) setFailed(true);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps -- the caller names what the load depends on
  useEffect(() => {
    setData(null);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  return { data, failed, reload, setData };
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const dishCount = (n: number) => plural(n, "dish", "dishes");
