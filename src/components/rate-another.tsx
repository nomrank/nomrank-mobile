import { Pressable, View } from "react-native";
import { PlusIcon } from "lucide-react-native";
import type { Dish, Restaurant } from "@/core/restaurants";
import { useTheme } from "@/theme";
import { DietMark } from "./marks";
import { useGo } from "./social";
import { Card, T } from "./ui";

const MAX_CHIPS = 8;

// After you rate a dish: the rest of that place's menu as one-tap chips, so logging a whole meal takes seconds.
export function RateAnother({ restaurant, dishes }: { restaurant: Restaurant; dishes: Dish[] }) {
  const { colors } = useTheme();
  const go = useGo();
  return (
    <Card style={{ gap: 8 }}>
      <T weight={600}>Had something else at {restaurant.name}?</T>
      <T size={14} color={colors.muted}>
        {dishes.length ? "Rate it while it's fresh." : "You've rated everything on the list here."}
      </T>
      {dishes.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {dishes.slice(0, MAX_CHIPS).map((d) => (
            <Pressable key={d.id} onPress={() => go(`/rate?dish=${d.id}`)} accessibilityRole="button" accessibilityLabel={`Rate ${d.name}`} style={{ minHeight: 38, maxWidth: "100%", paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <PlusIcon size={14} color={colors.mustardInk} />
              <DietMark diet={d.diet} size={12} />
              <T size={14} weight={500} numberOfLines={1} style={{ flexShrink: 1 }}>
                {d.name}
              </T>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable onPress={() => go(`/r/${restaurant.slug}`)} accessibilityRole="link" style={{ minHeight: 36, justifyContent: "center" }}>
        <T size={14} weight={600} color={colors.muted}>
          {dishes.length > MAX_CHIPS ? `See all ${dishes.length} dishes` : "Not listed? Add a dish"}
        </T>
      </Pressable>
    </Card>
  );
}
