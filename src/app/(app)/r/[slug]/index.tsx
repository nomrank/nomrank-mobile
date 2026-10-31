import { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { dishHref, dishKey } from "@/core/dishes";
import { DISH_DIETS, filterMenus, type DishDiet } from "@/core/diet";
import { getRestaurant, type Dish, type Restaurant } from "@/core/restaurants";
import { DietMark, DishAvg } from "@/components/marks";
import { useGo } from "@/components/social";
import { toast } from "@/components/toast";
import { Btn, Card, Chip, dishCount, Empty, Failed, Header, Input, Loading, Row, T, useData } from "@/components/ui";
import { addDish } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme";

// Add a dish to the menu. A near-duplicate is pointed out as you type; the database's unique index has the final word.
function AddDish({ restaurant: r }: { restaurant: Restaurant }) {
  const { colors } = useTheme();
  const router = useRouter();
  const go = useGo();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [diet, setDiet] = useState<DishDiet | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const close = r.dishes.find((d) => name.trim() && dishKey(d.name) === dishKey(name));

  async function add() {
    setBusy(true);
    const out = await addDish(r.id, name, diet);
    setBusy(false);
    if (out.error) {
      setError(out.error);
      return;
    }
    toast(out.live ? "Dish added" : "Dish added. It shows for everyone once it's reviewed.");
    if (out.href) router.push(out.href as Href);
  }

  if (!open) return <Btn label="Add a dish" variant="secondary" onPress={() => setOpen(true)} />;
  return (
    <Card style={{ gap: 10 }}>
      <T weight={600}>Add a dish to {r.name}</T>
      <Input value={name} onChangeText={setName} maxLength={60} placeholder="Dish name" accessibilityLabel="Dish name" autoFocus />
      {close && (
        <Pressable onPress={() => go(dishHref(r.slug, close.name))} accessibilityRole="link">
          <T size={14} color={colors.muted}>
            Already on the menu: <T size={14} weight={600}>{close.name}</T>
          </T>
        </Pressable>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {DISH_DIETS.map((d) => (
          <Chip key={d.value} label={d.label} on={diet === d.value} onPress={() => setDiet(d.value)} icon={<DietMark diet={d.value} size={12} />} />
        ))}
      </View>
      {error && (
        <T size={14} color={colors.destructive}>
          {error}
        </T>
      )}
      <Btn label="Add dish" busy={busy} disabled={!name.trim() || !diet || !!close} onPress={add} />
      <Btn label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
    </Card>
  );
}

export default function RestaurantScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { prefs } = useSession();
  const go = useGo();
  const { data, failed, reload } = useData(() => getRestaurant(supabase, slug), [slug]);
  const r = data && filterMenus([data], prefs.show_diet)[0];
  const renderItem = useCallback(
    ({ item: d }: { item: Dish }) => (
      <Row onPress={() => go(dishHref(r!.slug, d.name))} leading={<DietMark diet={d.diet} />} title={d.name} meta={<DishAvg avg={d.avg_score} count={d.rating_count} orEmpty />} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` is stable in effect
    [r?.slug],
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Header />
      {failed && !data ? (
        <Failed onRetry={reload} />
      ) : !data && !failed ? (
        <Loading />
      ) : !r ? (
        <Empty title="Place not found">It may have been removed.</Empty>
      ) : (
        <FlatList
          data={r.dishes}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ gap: 4, marginBottom: 8 }}>
              <T size={26} weight={700} accessibilityRole="header">
                {r.name}
              </T>
              <T color={colors.muted}>
                {r.area}, {r.city}
              </T>
              <T size={14} weight={700} style={{ marginTop: 16 }}>
                {dishCount(r.dishes.length)}
              </T>
            </View>
          }
          ListEmptyComponent={<Empty>No dishes yet. Add the one you came for.</Empty>}
          ListFooterComponent={
            <View style={{ marginTop: 16 }}>
              <AddDish restaurant={r} />
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}
