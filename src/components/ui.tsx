import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brand, useTheme } from "@/theme";

export const FONT = { 400: "Geist_400Regular", 500: "Geist_500Medium", 600: "Geist_600SemiBold", 700: "Geist_700Bold", 800: "Geist_800ExtraBold" } as const;
export const WORDMARK = "PlusJakartaSans_800ExtraBold";
export const SERIF = "DMSerifDisplay_400Regular";

type TProps = TextProps & { size?: number; weight?: keyof typeof FONT; color?: string; style?: StyleProp<TextStyle> };

// All text: Geist at a size and weight, in the theme's foreground unless told otherwise.
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      style={({ pressed }) => [
        { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: fill, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.hairline },
        style,
      ]}
      {...rest}
    >
      {busy ? <ActivityIndicator size="small" color={ink} /> : Icon ? <Icon size={18} color={ink} /> : null}
      <T size={15} weight={600} color={ink}>
        {label}
      </T>
    </Pressable>
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6, borderColor: on ? brand.mustard : colors.hairline, backgroundColor: on ? "rgba(255,194,60,0.15)" : "transparent" }}
    >
      {icon}
      <T size={14} weight={600} color={on ? colors.foreground : colors.muted}>
        {label}
      </T>
    </Pressable>
  );
}

// Underlined text tabs, like the web's Takes / Rankings row.
export function TabRow<K extends string>({ tabs, value, onChange }: { tabs: readonly (readonly [K, string])[]; value: K; onChange: (k: K) => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 22, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      {tabs.map(([k, label]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: value === k }} style={{ minHeight: 44, justifyContent: "center" }}>
          <T size={14} weight={600} color={value === k ? colors.foreground : colors.muted}>
            {label}
          </T>
          {value === k && <View style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2, backgroundColor: brand.mustard }} />}
        </Pressable>
      ))}
    </View>
  );
}

// The little sort links under a tab row.
export function SortRow<K extends string>({ options, value, onChange }: { options: readonly K[]; value: K; onChange: (k: K) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      {options.map((s) => (
        <Pressable key={s} onPress={() => onChange(s)} accessibilityRole="button" accessibilityState={{ selected: value === s }} style={{ minHeight: 40, justifyContent: "center" }}>
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

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <ActivityIndicator color={brand.mustard} accessibilityLabel="Loading" />
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
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 64, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1, borderBottomWidth: 1, borderBottomColor: colors.hairline })}>
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

// A bottom sheet on a dimmed backdrop. Tap outside, or Android back, closes it.
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(23,17,28,0.7)" }} />
      <View style={{ maxHeight: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.paper, padding: 20, paddingBottom: bottom + 20 }}>{children}</View>
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
