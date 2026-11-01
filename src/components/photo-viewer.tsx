import { useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { XIcon } from "lucide-react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { photoUrl } from "@/core/ratings";
import { haptic } from "@/lib/haptics";
import { T } from "./ui";

const MAX = 4;
const GUTTER = 12;
const SNAP = { duration: 240, easing: Easing.bezier(0.32, 0.72, 0, 1) };

function Page({ path, index, page, width, height, scale, x, y }: { path: string; index: number; page: SharedValue<number>; width: number; height: number; scale: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> }) {
  const zoom = useAnimatedStyle(() => (page.value === index ? { transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] } : { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] }));
  return (
    <Animated.View style={[{ width, height, alignItems: "center", justifyContent: "center" }, zoom]}>
      <Image source={photoUrl(path)} style={{ width: width - GUTTER * 2, height: height - 160, borderRadius: 12 }} contentFit="contain" transition={120} />
    </Animated.View>
  );
}

// A take's photos, large: swipe between them, pinch or double-tap to zoom, drag while zoomed, tap or swipe down to close.
// One gesture owns the whole screen, so paging and pinching can't fight the way a scroll view and a pinch do.
export function PhotoViewer({ paths, start, onClose }: { paths: string[]; start: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const [at, setAt] = useState(start);
  const last = paths.length - 1;
  const page = useSharedValue(start);
  const pager = useSharedValue(-start * width);
  const drop = useSharedValue(0);
  const axis = useSharedValue(0); // 0 undecided, 1 paging, 2 swiping down
  const scale = useSharedValue(1);
  const base = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const bx = useSharedValue(0);
  const by = useSharedValue(0);

  const turned = (i: number) => {
    setAt(i);
    haptic.tap();
  };
  const unzoom = () => {
    "worklet";
    scale.value = withTiming(1, SNAP);
    x.value = withTiming(0, SNAP);
    y.value = withTiming(0, SNAP);
    base.value = 1;
    bx.value = 0;
    by.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX, Math.max(0.85, base.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1.05) return unzoom();
      base.value = scale.value;
    });
  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(8)
    .onStart(() => {
      axis.value = 0;
    })
    .onUpdate((e) => {
      if (base.value > 1) {
        const limitX = (width * (base.value - 1)) / 2;
        const limitY = (height * (base.value - 1)) / 2;
        x.value = Math.min(limitX, Math.max(-limitX, bx.value + e.translationX));
        y.value = Math.min(limitY, Math.max(-limitY, by.value + e.translationY));
        return;
      }
      if (!axis.value) axis.value = Math.abs(e.translationX) >= Math.abs(e.translationY) ? 1 : 2;
      if (axis.value === 2) {
        drop.value = e.translationY;
        return;
      }
      const atEdge = (page.value === 0 && e.translationX > 0) || (page.value === last && e.translationX < 0);
      pager.value = -page.value * width + e.translationX * (atEdge ? 0.3 : 1);
    })
    .onEnd((e) => {
      if (base.value > 1) {
        bx.value = x.value;
        by.value = y.value;
        return;
      }
      if (axis.value === 2) {
        if (Math.abs(e.translationY) > 120 || Math.abs(e.velocityY) > 900) runOnJS(onClose)();
        else drop.value = withTiming(0, SNAP);
        return;
      }
      const next = e.translationX < -width / 4 || e.velocityX < -500 ? Math.min(page.value + 1, last) : e.translationX > width / 4 || e.velocityX > 500 ? Math.max(page.value - 1, 0) : page.value;
      if (next !== page.value) runOnJS(turned)(next);
      page.value = next;
      pager.value = withTiming(-next * width, SNAP);
    });
  const double = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (base.value > 1) return unzoom();
      base.value = 2.5;
      scale.value = withTiming(2.5, SNAP);
    });
  const single = Gesture.Tap().onEnd(() => {
    if (base.value <= 1) runOnJS(onClose)();
  });
  const gesture = Gesture.Simultaneous(Gesture.Exclusive(double, single), pinch, pan);

  const track = useAnimatedStyle(() => ({ transform: [{ translateX: pager.value }, { translateY: drop.value }] }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - Math.min(0.7, Math.abs(drop.value) / 400) }));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#0a070d" }, dim]} />
        <GestureDetector gesture={gesture}>
          <View style={{ flex: 1, overflow: "hidden" }} collapsable={false}>
            <Animated.View style={[{ flexDirection: "row", width: width * paths.length, height }, track]}>
              {paths.map((p, i) => (
                <Page key={p} path={p} index={i} page={page} width={width} height={height} scale={scale} x={x} y={y} />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
        <View pointerEvents="box-none" style={{ position: "absolute", top: top + 8, left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,244,234,0.14)", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={22} color="#fff4ea" />
          </Pressable>
          {paths.length > 1 && <CountBadge at={at} of={paths.length} />}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// "2/4" on a dark pill, over a photo.
export function CountBadge({ at, of }: { at: number; of: number }) {
  return (
    <View accessibilityLabel={`Photo ${at + 1} of ${of}`} style={{ paddingHorizontal: 9, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(23,17,28,0.72)" }}>
      <T size={12} weight={600} color="#fff4ea">
        {at + 1}/{of}
      </T>
    </View>
  );
}
