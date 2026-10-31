import Svg, { G, Path } from "react-native-svg";
import { FACE, FOX, HAND, LEAF, MARK_VIEWBOX, SPARKLE } from "@/brand/logo";
import { brand, useTheme } from "@/theme";

// The fox mark in the brand's colours. The cream face turns peach on the light theme so it doesn't vanish into the page.
export function LogoMark({ size = 40 }: { size?: number }) {
  const { scheme } = useTheme();
  const face = scheme === "light" ? "#f1c4a6" : "#fff4ea";
  return (
    <Svg width={size} height={size} viewBox={MARK_VIEWBOX}>
      <G>
        <Path d={FOX} fill={brand.ketchup} fillRule="evenodd" />
        <Path d={FACE} fill={face} fillRule="evenodd" />
        <Path d={LEAF} fill={face} fillRule="evenodd" />
      </G>
      <Path d={HAND} fill={brand.ketchup} fillRule="evenodd" />
      <Path d={SPARKLE} fill={brand.mustard} fillRule="evenodd" />
    </Svg>
  );
}
