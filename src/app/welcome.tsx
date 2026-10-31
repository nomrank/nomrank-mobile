import { useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Animated, { interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRightIcon, HouseIcon } from "lucide-react-native";
import { Score } from "@/components/marks";
import { SERIF, T, WORDMARK } from "@/components/ui";
import { useIntro } from "@/lib/intro";
import { brand, palettes } from "@/theme";

const INK = palettes.dark;

type Plate = { photo: number; size: number; x: number; y: number; score?: number; depth: number };
type Slide = { lines: string[]; accent: string; text: string; plates: Plate[] };

// Positions are fractions of the art area, so the composition holds on any phone. Sizes are fractions of the screen width.
const SLIDES: Slide[] = [
  {
    lines: ["Every", "dish,"],
    accent: "ranked.",
    text: "Rate the dish, not the place. Find what's actually worth ordering.",
    plates: [
      { photo: require("../../assets/images/intro/mutton-biryani.jpg"), size: 0.86, x: 0.52, y: 0.02, score: 9.6, depth: 0.5 },
      { photo: require("../../assets/images/intro/butter-chicken.jpg"), size: 0.5, x: -0.12, y: 0.12, score: 9.1, depth: 0.25 },
      { photo: require("../../assets/images/intro/pav-bhaji.jpg"), size: 0.34, x: 0.2, y: 0.56, score: 8.3, depth: 0.8 },
    ],
  },
  {
    lines: ["Say it.", "Settle"],
    accent: "it.",
    text: "Drop a hot take, agree or disagree, and put two dishes head to head in Battles.",
    plates: [
      { photo: require("../../assets/images/intro/ragda-chaat.jpg"), size: 0.62, x: -0.1, y: 0.06, score: 8.4, depth: 0.3 },
      { photo: require("../../assets/images/intro/samosa.jpg"), size: 0.62, x: 0.48, y: 0.32, score: 8.2, depth: 0.6 },
    ],
  },
  {
    lines: ["Tastes", "like"],
    accent: "home.",
    text: "See how people from a dish's home region rate it. Rankings for your city, takes from all of India.",
    plates: [
      { photo: require("../../assets/images/intro/idli-sambar.jpg"), size: 0.92, x: 0.28, y: 0.04, score: 8.8, depth: 0.5 },
      { photo: require("../../assets/images/intro/paneer-tikka.jpg"), size: 0.4, x: -0.1, y: 0.5, depth: 0.25 },
    ],
  },
];

function PlateArt({ plate, index, scroll, width, height, scale }: { plate: Plate; index: number; scroll: SharedValue<number>; width: number; height: number; scale: number }) {
  const size = plate.size * width * scale;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(scroll.value / width, [index - 1, index, index + 1], [width * plate.depth, 0, -width * plate.depth]) }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: plate.x * width, top: plate.y * height, width: size, height: size }, style]}>
      <Image source={plate.photo} contentFit="cover" style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: "#2a2231" }} accessibilityIgnoresInvertColors />
      {plate.score !== undefined && (
        <View style={{ position: "absolute", top: size * 0.02, ...(plate.x + plate.size > 1 ? { left: size * 0.08 } : { right: size * 0.1 }) }}>
          <Score score={plate.score} size={(plate.size > 0.6 ? 64 : 50) * Math.max(scale, 0.8)} />
        </View>
      )}
    </Animated.View>
  );
}

function Dot({ index, scroll, width }: { index: number; scroll: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle<ViewStyle>(() => {
    const k = interpolate(scroll.value / width, [index - 1, index, index + 1], [0, 1, 0], "clamp");
    return { width: 8 + 14 * k, opacity: 0.35 + 0.65 * k };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: INK.foreground }, style]} />;
}

// Three landing screens: swipe, or tap through. Skip goes straight to sign-in.
export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const { finishIntro } = useIntro();
  const list = useAnimatedRef<Animated.ScrollView>();
  const scroll = useSharedValue(0);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;
  const lock = useRef(false);

  const onScroll = useAnimatedScrollHandler((e) => {
    scroll.value = e.contentOffset.x;
  });
  const finish = () => {
    if (lock.current) return;
    lock.current = true;
    finishIntro();
  };
  const next = () => {
    if (last) return finish();
    list.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  const headline = Math.min(width * 0.2, 84);
  // The plates get whatever the words and the buttons leave, so they never run into the text on a short phone.
  const artHeight = Math.max(120, height - (top + 68 + headline * 3.1 + 80) - (bottom + 128));
  const scale = Math.min(1, artHeight / (width * 0.85));

  return (
    <View style={{ flex: 1, backgroundColor: INK.background }}>
      {/* The big soft curve behind the plates. */}
      <View pointerEvents="none" style={{ position: "absolute", width: width * 1.9, height: width * 1.9, borderRadius: width, left: -width * 0.1, bottom: -width * 0.95, backgroundColor: INK.paper }} />
      <View pointerEvents="none" style={{ position: "absolute", width: width * 1.2, height: width * 1.2, borderRadius: width, right: -width * 0.55, top: height * 0.14, backgroundColor: "#1d1623" }} />

      <Animated.ScrollView
        ref={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={StyleSheet.absoluteFill}
      >
        {SLIDES.map((s, i) => (
          <View key={s.accent} accessible accessibilityLabel={`${s.lines.join(" ")} ${s.accent} ${s.text}`} style={{ width, height, paddingTop: top + 68, paddingHorizontal: 24 }}>
            <T style={{ fontFamily: SERIF, fontSize: headline, lineHeight: headline * 0.98, color: INK.foreground }}>{s.lines.join("\n")}</T>
            <T style={{ fontFamily: SERIF, fontSize: headline, lineHeight: headline * 1.04, color: brand.mustard }}>{s.accent}</T>
            <T size={16} color={INK.muted} style={{ marginTop: 10, maxWidth: 300, lineHeight: 23 }}>
              {s.text}
            </T>
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: bottom + 128, height: artHeight }}>
              {s.plates.map((p, n) => (
                <PlateArt key={n} plate={p} index={i} scroll={scroll} width={width} height={artHeight} scale={scale} />
              ))}
              {i === 2 && (
                <View style={{ position: "absolute", left: 20, bottom: -12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: INK.raised }}>
                  <HouseIcon size={16} color={brand.mustard} />
                  <T size={13} weight={600} color={INK.foreground}>
                    8.7 from 12 Kannadigas
                  </T>
                </View>
              )}
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={{ position: "absolute", top: top + 12, left: 24, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T style={{ fontFamily: WORDMARK, fontSize: 24, letterSpacing: -0.8, color: INK.foreground }}>
          nomrank<T style={{ fontFamily: WORDMARK, fontSize: 24, color: brand.ketchup }}>.</T>
        </T>
        <Pressable onPress={finish} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }}>
          <T size={15} color={INK.muted}>
            Skip
          </T>
        </Pressable>
      </View>

      <View style={{ position: "absolute", left: 24, right: 24, bottom: bottom + 14, alignItems: "center", gap: 10 }}>
        <View accessibilityLabel={`Screen ${page + 1} of ${SLIDES.length}`} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
          {SLIDES.map((s, i) => (
            <Dot key={s.accent} index={i} scroll={scroll} width={width} />
          ))}
        </View>
        <Pressable onPress={next} accessibilityRole="button" style={({ pressed }) => ({ width: "100%", maxWidth: 320, height: 56, borderRadius: 28, backgroundColor: INK.foreground, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <T size={17} weight={600} color={brand.studio}>
            {last ? "Get started" : "Next"}
          </T>
          <ArrowRightIcon size={20} color={brand.studio} />
        </Pressable>
      </View>
    </View>
  );
}
