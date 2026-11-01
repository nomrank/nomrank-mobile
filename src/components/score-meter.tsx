import { useRef, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { haptic } from "@/lib/haptics";
import { MinusIcon, PlusIcon } from "lucide-react-native";
import { angleOf, point, scoreAtAngle, sector } from "@/core/plate";
import { formatScore, scoreColor, verdict } from "@/core/ratings";
import { brand, useTheme } from "@/theme";
import { FONT, T } from "./ui";

const OUTER = 137;
const INNER = 91;
const SLICES = Array.from({ length: 10 }, (_, i) => i + 1);

// The score as a plate: ten slices that fill ketchup-to-mustard. Tap a slice or drag round the ring; − and + step by half a
// point. Screen readers get an adjustable control.
export function ScoreMeter({ score, onChange }: { score: number; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 72, 288);
  const color = score ? scoreColor(score) : undefined;
  const latest = useRef(score);
  latest.current = score;
  const [, tick] = useState(0);

  const pick = (n: number) => {
    if (n === latest.current) return;
    latest.current = n;
    onChange(n);
    tick((x) => x + 1);
    haptic.tap();
  };
  const step = (by: number) => pick(Math.min(10, Math.max(0.5, (latest.current || 0) + by)));

  // Coordinates are in the gesture's own view: dx/dy from the middle of the plate.
  const atPoint = (x: number, y: number, first: boolean) => {
    const dx = x - size / 2;
    const dy = y - size / 2;
    const dist = Math.hypot(dx, dy) / (size / 300);
    if (first && (dist > OUTER + 8 || dist < INNER - 12)) return; // only the ring starts a gesture, not the middle
    pick(scoreAtAngle(angleOf(dx, dy), first ? 0 : latest.current));
  };
  const gesture = Gesture.Pan()
    .minDistance(2)
    .onBegin((e) => {
      runOnJS(atPoint)(e.x, e.y, true);
    })
    .onUpdate((e) => {
      runOnJS(atPoint)(e.x, e.y, false);
    });

  return (
    <View style={{ alignItems: "center" }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Your score"
        accessibilityValue={{ text: score ? `${formatScore(score)} out of 10, ${verdict(score).label}` : "Not scored yet" }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 0.5 : -0.5)}
        style={{ width: size, height: size }}
      >
        <GestureDetector gesture={gesture}>
          <View collapsable={false} style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 300 300">
              {SLICES.map((i) => {
                const fill = Math.min(1, Math.max(0, score - (i - 1)));
                const a0 = (i - 1) * 36 + 2.5;
                const a1 = i * 36 - 2.5;
                const mid = (i - 0.5) * 36;
                const lifted = score > i - 1 && score <= i;
                const [dx, dy] = [point(5, mid)[0] - 150, point(5, mid)[1] - 150];
                return (
                  <G key={i} transform={lifted ? `translate(${dx} ${dy})` : undefined}>
                    <Path d={sector(a0, a1, OUTER, INNER)} fill={colors.raised} stroke={colors.raised} strokeWidth={6} strokeLinejoin="round" />
                    {fill >= 0.5 && <Path d={sector(a0, fill === 1 ? a1 : mid, OUTER, INNER)} fill={color} stroke={color} strokeWidth={6} strokeLinejoin="round" />}
                  </G>
                );
              })}
              {SLICES.map((i) => {
                const [x, y] = point((OUTER + INNER) / 2, (i - 1) * 36 + 18);
                return (
                  <SvgText key={i} x={x} y={y + 5} textAnchor="middle" fontSize={15} fontFamily={FONT[600]} fill={score >= i ? brand.studio : colors.faint}>
                    {i}
                  </SvgText>
                );
              })}
            </Svg>
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <T weight={700} color={color ?? colors.faint} style={{ fontSize: 56, lineHeight: 64 }}>
                {score ? formatScore(score) : "–"}
              </T>
              <T size={14} weight={600} color={colors.muted}>
                {score ? verdict(score).label : "Pick a score"}
              </T>
            </View>
          </View>
        </GestureDetector>
      </View>
      <View style={{ marginTop: 14, width: size, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <StepButton label="Lower the score by half a point" onPress={() => step(-0.5)} disabled={score <= 0.5}>
          <MinusIcon size={20} color={colors.foreground} />
        </StepButton>
        <T size={13} color={colors.muted}>
          Tap or drag round the plate
        </T>
        <StepButton label="Raise the score by half a point" onPress={() => step(0.5)} disabled={score >= 10}>
          <PlusIcon size={20} color={colors.foreground} />
        </StepButton>
      </View>
    </View>
  );
}

function StepButton({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled: boolean; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised, opacity: disabled ? 0.4 : 1 }}>
      {children}
    </Pressable>
  );
}
