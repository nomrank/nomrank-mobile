import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { HouseIcon, UsersRoundIcon } from "lucide-react-native";
import { avatarPhotoUrl, avatarTraits, COLOURS, EYES, MOUTHS, SHAPES } from "@/core/avatar";
import type { DishDiet } from "@/core/diet";
import { formatScore, scoreColor, verdict } from "@/core/ratings";
import { Image } from "expo-image";
import { T } from "./ui";
import { brand, useTheme } from "@/theme";

// Veg dot, vegan leaf, egg oval, non-veg triangle: they read apart without colour too.
const DIET = {
  veg: { label: "Veg", color: "#34b864" },
  vegan: { label: "Vegan", color: "#34b864" },
  egg: { label: "Egg", color: "#f0b232" },
  non_veg: { label: "Non-veg", color: "#e06a2c" },
} as const;

export function DietMark({ diet, size = 14 }: { diet: DishDiet; size?: number }) {
  const { label, color } = DIET[diet];
  return (
    <View accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={size} height={size} viewBox="0 0 16 16">
        <Rect x="1" y="1" width="14" height="14" rx="2.5" fill="none" stroke={color} strokeWidth="1.6" />
        {diet === "veg" && <Circle cx="8" cy="8" r="3.4" fill={color} />}
        {diet === "vegan" && <Path d="M4.6 11.4C4.4 7.3 7 4.6 11.4 4.6c.2 4.1-2.5 6.8-6.8 6.8Z" fill={color} />}
        {diet === "egg" && <Ellipse cx="8" cy="8.4" rx="2.7" ry="3.5" fill={color} />}
        {diet === "non_veg" && <Path d="M8 4.4 11.8 11H4.2Z" fill={color} />}
      </Svg>
    </View>
  );
}

const BOWL = "M4 14h16a8 7 0 0 1-16 0Z";

// A bowl with a solid heart rising off it: "loved it, same."
export function AgreeIcon({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={BOWL} />
      <Path fill={color} stroke="none" d="M12 11.6c-2.9-1.8-4.6-3.4-4.6-5.4A2.3 2.3 0 0 1 12 5.1a2.3 2.3 0 0 1 4.6 1.1c0 2-1.7 3.6-4.6 5.4Z" />
    </Svg>
  );
}

// The same bowl tipped away, a bold cross over it: "not for me."
export function DisagreeIcon({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={BOWL} transform="rotate(-14 12 17)" />
      <Path strokeWidth={2.4} d="m9 4.5 6 6m0-6-6 6" />
    </Svg>
  );
}

// Must try scores get a scalloped edge: a disc with fourteen bumps round it.
const BUMPS = Array.from({ length: 14 }, (_, i) => {
  const a = (i * 2 * Math.PI) / 14;
  return [50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)];
});

// The score as a tilted sticker, ketchup (low) to mustard (high). 9+ becomes the scalloped badge.
export function Score({ score, size = 52 }: { score: number; size?: number }) {
  const text = formatScore(score);
  const badge = verdict(score).tone === "must";
  const fill = scoreColor(score);
  const roomy = size >= 48;
  return (
    <View accessibilityRole="image" accessibilityLabel={`${text} out of 10`} style={{ width: size, height: size, transform: [{ rotate: "-8deg" }], alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute" }}>
        {badge ? (
          <G fill={fill}>
            <Circle cx="50" cy="50" r="41" />
            {BUMPS.map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r="9.5" />
            ))}
          </G>
        ) : (
          <Circle cx="50" cy="50" r="50" fill={fill} />
        )}
        <Ellipse cx="34" cy="28" rx="24" ry="16" fill="#fff" opacity="0.2" />
        {roomy && <Circle cx="50" cy="50" r={badge ? 33 : 42} fill="none" stroke={brand.studio} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 4" />}
      </Svg>
      <T weight={800} color={brand.studio} style={{ fontSize: size * (text.length > 2 ? 0.33 : 0.38), lineHeight: size * 0.4, letterSpacing: -0.5 }}>
        {text}
      </T>
      {roomy && (
        <T weight={700} color={brand.studio} style={{ fontSize: 8, lineHeight: 9, letterSpacing: 1 }}>
          / 10
        </T>
      )}
    </View>
  );
}

// The score in words, from "Send it back" to "Must try".
export function Verdict({ score }: { score: number }) {
  const { colors } = useTheme();
  const v = verdict(score);
  const ink = v.tone === "must" || v.tone === "again" ? colors.mustardInk : v.tone === "clean" ? colors.foreground : v.tone === "okay" ? colors.muted : colors.ketchupInk;
  const bg = v.tone === "must" ? "rgba(255,194,60,0.15)" : v.tone === "back" ? "rgba(255,75,58,0.15)" : colors.raised;
  return (
    <View style={{ height: 20, paddingHorizontal: 8, borderRadius: 999, backgroundColor: bg, justifyContent: "center" }}>
      <T size={11} weight={600} color={ink} style={{ letterSpacing: 0.4, textTransform: "uppercase", lineHeight: 14 }}>
        {v.label}
      </T>
    </View>
  );
}

// Everyone's score for a dish: a people icon in the score's colour, and the number.
export function DishAvg({ avg, count, orEmpty, size = 14 }: { avg: number | null; count: number; orEmpty?: boolean; size?: number }) {
  const { colors } = useTheme();
  if (!count || avg === null) return orEmpty ? <T size={size} color={colors.muted}>No ratings yet</T> : null;
  const score = Number(avg).toFixed(1);
  return (
    <View accessibilityLabel={`Overall rating ${score}, from ${count} ${count === 1 ? "rating" : "ratings"}`} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <UsersRoundIcon size={size} color={scoreColor(Number(score))} />
      <T size={size} weight={600}>
        {score}
      </T>
    </View>
  );
}

export function TastesLikeHome({ avg, count, demonym }: { avg: number | null; count: number; demonym: string | undefined }) {
  const { colors } = useTheme();
  if (avg === null || !demonym) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <HouseIcon size={15} color={colors.mustardInk} />
      <T size={13} color={colors.muted} style={{ flexShrink: 1 }}>
        Tastes like home:{" "}
        <T size={13} weight={600}>
          {avg.toFixed(1)}
        </T>{" "}
        from {count} {demonym}
      </T>
    </View>
  );
}

const INK = "#2a1a22";
const TONGUE = "#ff7a8a";
const GAP = 8;

function Body({ shape, fill, shade }: { shape: (typeof SHAPES)[number]; fill: string; shade: string }) {
  switch (shape) {
    case "idli":
      return <Ellipse cx="32" cy="35" rx="25" ry="20" fill={fill} />;
    case "momo":
      return (
        <>
          <Path d="M9 41C9 28 19 19 32 19s23 9 23 22c0 9-10 15-23 15S9 50 9 41Z" fill={fill} />
          <Path d="M27 20.5c.6-4.5 9.4-4.5 10 0" fill={fill} stroke={shade} strokeWidth="2" strokeLinecap="round" />
          <Path d="M24 23c-1.4-1.8-1.7-3.6-1-5.4M40 23c1.4-1.8 1.7-3.6 1-5.4" fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "dosa":
      return (
        <>
          <Path d="M10 50Q8 47 10 44L29 11Q32 6 35 11L54 44Q56 47 54 50Q32 58 10 50Z" fill={fill} />
          <Path d="M32 14 22 47" fill="none" stroke={shade} strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
        </>
      );
    case "barfi":
      return (
        <>
          <Rect x="11" y="13" width="42" height="42" rx="12" fill={fill} />
          <Path d="M18 18h28" stroke={shade} strokeWidth="2" strokeLinecap="round" opacity=".5" />
        </>
      );
    case "laddoo":
      return (
        <>
          <Circle cx="32" cy="34" r="23" fill={fill} />
          {[[20, 21], [44, 19], [50, 33], [14, 36], [21, 48], [44, 49], [33, 14]].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={shade} />
          ))}
        </>
      );
    case "kulfi":
      return (
        <>
          <Rect x="29" y="47" width="6" height="14" rx="3" fill="#e8c48c" />
          <Path d="M15 27a17 17 0 0 1 34 0v19a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5Z" fill={fill} />
        </>
      );
  }
}

const SHINE = { idli: [22, 25, 8, 4.5], momo: [20, 30, 6, 3.5], dosa: [27, 24, 3, 6], barfi: [22, 25, 5, 3], laddoo: [24, 22, 6, 3.5], kulfi: [23, 20, 5, 3] } as const;
const FACE = { idli: [32, 35, 1], momo: [32, 40, 1], dosa: [33, 40, 0.86], barfi: [32, 37, 1], laddoo: [32, 35, 1], kulfi: [32, 33, 0.95] } as const;

function Eye({ kind, x, side }: { kind: (typeof EYES)[number]; x: number; side: "left" | "right" }) {
  const stroke = { fill: "none", stroke: INK, strokeWidth: 2.4, strokeLinecap: "round" as const };
  switch (kind) {
    case "dots":
      return <Circle cx={x} cy={0} r="2.7" fill={INK} />;
    case "happy":
      return <Path d={`M${x - 3} 1q3-4 6 0`} {...stroke} />;
    case "wink":
      return side === "left" ? <Circle cx={x} cy={0} r="2.7" fill={INK} /> : <Path d={`M${x - 3} 0q3 2.4 6 0`} {...stroke} />;
    case "sleepy":
      return <Path d={`M${x - 3} 0q3 2.4 6 0`} {...stroke} />;
    case "shiny":
      return (
        <>
          <Circle cx={x} cy={0} r="3.6" fill={INK} />
          <Circle cx={x + 1.1} cy={-1.2} r="1.3" fill="#fff" />
        </>
      );
    case "hearts":
      return <Path d={`M${x} 2.6c-2.5-1.6-3.8-2.9-3.8-4.4a1.9 1.9 0 0 1 3.8-.5 1.9 1.9 0 0 1 3.8.5c0 1.5-1.3 2.8-3.8 4.4Z`} fill={INK} />;
  }
}

function Mouth({ kind }: { kind: (typeof MOUTHS)[number] }) {
  const y = 7;
  const stroke = { fill: "none", stroke: INK, strokeWidth: 2.4, strokeLinecap: "round" as const };
  switch (kind) {
    case "smile":
      return <Path d={`M-5 ${y}q5 4.5 10 0`} {...stroke} />;
    case "grin":
      return (
        <>
          <Path d={`M-5.5 ${y - 1}h11a5.5 5.5 0 0 1-11 0Z`} fill={INK} />
          <Path d={`M-2.6 ${y + 3.6}a2.6 1.8 0 0 1 5.2 0Z`} fill={TONGUE} />
        </>
      );
    case "yum":
      return (
        <>
          <Path d={`M-5 ${y}q5 4.5 10 0`} {...stroke} />
          <Path d={`M.6 ${y + 2}v2.2a2.2 2.2 0 0 0 4.4 0v-3.3`} fill={TONGUE} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        </>
      );
    case "ooh":
      return <Ellipse cx="0" cy={y + 1} rx="2.4" ry="3" fill={INK} />;
    case "smirk":
      return <Path d={`M-4.5 ${y + 1.5}q4.5 2 9-2.5`} {...stroke} />;
    case "flat":
      return <Path d={`M-4 ${y + 1}h8`} {...stroke} />;
  }
}

// A person's Nomrank character (or their uploaded photo).
export function Avatar({ handle, code, photo, size = 28 }: { handle: string; code?: string | null; photo?: string | null; size?: number }) {
  const { colors } = useTheme();
  if (photo) return <Image source={avatarPhotoUrl(photo)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.raised }} contentFit="cover" accessibilityIgnoresInvertColors />;
  const t = avatarTraits(code, handle);
  const shape = SHAPES[t.shape];
  const { fill, shade } = COLOURS[t.colour];
  const [cx, cy, scale] = FACE[shape];
  const [sx, sy, srx, sry] = SHINE[shape];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Body shape={shape} fill={fill} shade={shade} />
      <Ellipse cx={sx} cy={sy} rx={srx} ry={sry} fill="#fff" opacity=".32" transform={`rotate(-25 ${sx} ${sy})`} />
      <G transform={`translate(${cx} ${cy}) scale(${scale})`}>
        <Ellipse cx={-GAP - 5} cy="4.5" rx="3.2" ry="2" fill="#ff7f8f" opacity=".45" />
        <Ellipse cx={GAP + 5} cy="4.5" rx="3.2" ry="2" fill="#ff7f8f" opacity=".45" />
        <Eye kind={EYES[t.eyes]} x={-GAP} side="left" />
        <Eye kind={EYES[t.eyes]} x={GAP} side="right" />
        <Mouth kind={MOUTHS[t.mouth]} />
      </G>
    </Svg>
  );
}

