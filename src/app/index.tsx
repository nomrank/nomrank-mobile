import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMark } from "@/components/logo-mark";
import { getLists, getRankedList, type FoodList, type RankedDish } from "@/lib/rankings";
import { supabase } from "@/lib/supabase";
import { brand, useTheme, type Choice } from "@/theme";

const CHOICES: { value: Choice; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// 0.1.0 home: the food lists and the ranked dishes of one, read straight from Supabase (the same ranking as the web app).
export default function Home() {
  const { colors, choice, setChoice } = useTheme();
  const [lists, setLists] = useState<FoodList[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<RankedDish[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getLists()
      .then((l) => {
        setLists(l);
        setListId(l[0]?.id ?? null);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    if (!listId) return;
    let live = true;
    setDishes(null);
    getRankedList(listId)
      .then((d) => live && setDishes(d))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [listId]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <LogoMark size={36} />
        <Text style={[styles.brand, { color: colors.foreground }]}>
          nomrank<Text style={{ color: brand.ketchup }}>.</Text>
        </Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.switch, { backgroundColor: colors.raised }]}>
          {CHOICES.map((c) => (
            <Pressable key={c.value} onPress={() => setChoice(c.value)} accessibilityRole="radio" accessibilityState={{ selected: choice === c.value }} style={[styles.pill, choice === c.value && { backgroundColor: colors.foreground }]}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: choice === c.value ? colors.background : colors.muted }}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {lists.map((l) => (
          <Pressable key={l.id} onPress={() => setListId(l.id)} accessibilityRole="button" accessibilityState={{ selected: listId === l.id }} style={[styles.chip, { borderColor: listId === l.id ? brand.mustard : colors.hairline, backgroundColor: listId === l.id ? "rgba(255,194,60,0.15)" : "transparent" }]}>
            <Text style={{ color: listId === l.id ? colors.foreground : colors.muted, fontWeight: "600" }}>{l.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <Text style={[styles.empty, { color: colors.destructive }]}>Couldn&apos;t load. Check your connection and reopen the app.</Text>
      ) : !dishes ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={brand.mustard} />
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>No dishes in this list yet.</Text>}
          renderItem={({ item: d }) => (
            <View style={[styles.row, { backgroundColor: colors.paper, borderColor: colors.hairline }]}>
              <Text style={[styles.rank, { color: colors.faint }]}>{d.rank ?? "–"}</Text>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.dish, { color: colors.foreground }]}>
                  {d.name}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>
                  {d.place} · {d.area}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.score, { color: colors.foreground }]}>{d.avg_score === null ? "New" : Number(d.avg_score).toFixed(1)}</Text>
                <Text style={{ color: colors.faint, fontSize: 11 }}>
                  {d.rating_count} {d.rating_count === 1 ? "rating" : "ratings"}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <Pressable onPress={() => supabase.auth.signOut()} accessibilityRole="button" style={styles.signOut}>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Sign out</Text>
            </Pressable>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  brand: { fontSize: 22, fontWeight: "800", letterSpacing: -0.8 },
  switch: { flexDirection: "row", borderRadius: 999, padding: 3 },
  pill: { minHeight: 32, paddingHorizontal: 10, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chips: { flexGrow: 0, marginBottom: 4 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  rank: { width: 24, textAlign: "center", fontSize: 18, fontWeight: "700" },
  dish: { fontSize: 16, fontWeight: "700" },
  score: { fontSize: 22, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 40, paddingHorizontal: 20 },
  signOut: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 12 },
});
