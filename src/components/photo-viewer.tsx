import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { XIcon } from "lucide-react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { photoUrl } from "@/core/ratings";
import { T } from "./ui";

const MAX = 4;

// One photo you can pinch, drag while zoomed, and double-tap to zoom in or out.
function ZoomPage({ uri, width, height, onZoom, onClose }: { uri: string; width: number; height: number; onZoom: (z: boolean) => void; onClose: () => void }) {
  const scale = useSharedValue(1);
  const base = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const bx = useSharedValue(0);
  const by = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));

  const reset = () => {
    "worklet";
    scale.value = withTiming(1, { duration: 180 });
    x.value = withTiming(0, { duration: 180 });
    y.value = withTiming(0, { duration: 180 });
    base.value = 1;
    bx.value = 0;
    by.value = 0;
    runOnJS(onZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX, Math.max(0.8, base.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < 1.05) return reset();
      base.value = scale.value;
      runOnJS(onZoom)(true);
    });
  // Only drags once zoomed in; at 1x the swipe belongs to the pager.
  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      if (base.value <= 1) return;
      const limitX = (width * (scale.value - 1)) / 2;
      const limitY = (height * (scale.value - 1)) / 2;
      x.value = Math.min(limitX, Math.max(-limitX, bx.value + e.translationX));
      y.value = Math.min(limitY, Math.max(-limitY, by.value + e.translationY));
    })
    .onEnd(() => {
      bx.value = x.value;
      by.value = y.value;
    });
  const double = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (base.value > 1) return reset();
      base.value = 2.5;
      scale.value = withTiming(2.5, { duration: 180 });
      runOnJS(onZoom)(true);
    });
  const single = Gesture.Tap().onEnd(() => {
    if (base.value <= 1) runOnJS(onClose)();
  });
  const gesture = Gesture.Exclusive(double, single, Gesture.Simultaneous(pinch, pan));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height, alignItems: "center", justifyContent: "center" }, style]}>
        <Image source={uri} style={{ width, height }} contentFit="contain" transition={150} />
      </Animated.View>
    </GestureDetector>
  );
}

// A take's photos full screen: swipe between them, pinch or double-tap to zoom, tap once (or Android back) to close.
export function PhotoViewer({ paths, start, onClose }: { paths: string[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const [at, setAt] = useState(start ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const list = useRef<FlatList>(null);
  useEffect(() => {
    setAt(start ?? 0);
    setZoomed(false);
  }, [start]);
  return (
    <Modal visible={start !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "rgba(10,7,13,0.97)" }}>
        {start !== null && (
          <FlatList
            ref={list}
            data={paths}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={start}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(p) => p}
            onMomentumScrollEnd={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <ZoomPage uri={photoUrl(item)} width={width} height={height} onZoom={setZoomed} onClose={onClose} />}
          />
        )}
        <View pointerEvents="box-none" style={{ position: "absolute", top: top + 8, left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,244,234,0.14)", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={22} color="#fff4ea" />
          </Pressable>
          {paths.length > 1 && (
            <T size={14} weight={600} color="#fff4ea">
              {at + 1} / {paths.length}
            </T>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
