import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { makeMutable, runOnJS, useAnimatedStyle, withTiming } from "react-native-reanimated";

type Spot = { uri: string; x: number; y: number; width: number; height: number };

const scale = makeMutable(1);
const x = makeMutable(0);
const y = makeMutable(0);
let place: ((s: Spot | null) => void) | null = null;

// Pinch a feed photo the way Instagram does: it lifts out of the list, follows your fingers, and settles back when you let go.
// The photo is drawn by PinchHost above every screen, since the list and card would clip it.
export function PinchZoom({ uri, onActive, children }: { uri: string; onActive: (on: boolean) => void; children: ReactNode }) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const lift = () => {
    onActive(true);
    box.current?.measureInWindow((left, top, width, height) => place?.({ uri, x: left, y: top, width, height }));
  };
  const drop = () => {
    onActive(false);
    place?.(null);
  };
  const pinch = Gesture.Pinch()
    .onStart(() => runOnJS(lift)())
    .onUpdate((e) => {
      scale.value = Math.min(4, Math.max(1, e.scale));
    })
    .onEnd(() => {
      x.value = withTiming(0, { duration: 200 });
      y.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 }, () => runOnJS(drop)());
    });
  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    });
  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
      <View ref={box} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}

export function PinchHost() {
  const [spot, setSpot] = useState<Spot | null>(null);
  useEffect(() => {
    place = setSpot;
    return () => {
      place = null;
    };
  }, []);
  const photo = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));
  const dim = useAnimatedStyle(() => ({ opacity: Math.min(0.75, (scale.value - 1) * 1.5) }));
  if (!spot) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}>
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#0a070d" }, dim]} />
      <Animated.View style={[{ position: "absolute", left: spot.x, top: spot.y, width: spot.width, height: spot.height }, photo]}>
        <Image source={spot.uri} style={{ width: spot.width, height: spot.height }} contentFit="cover" />
      </Animated.View>
    </View>
  );
}
