import { useCallback, useMemo } from "react";
import { FlatList, Pressable, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { CrownIcon, HouseIcon, PlusIcon, ScaleIcon, SproutIcon, TrophyIcon, UsersRoundIcon } from "lucide-react-native";
import { allows } from "@/core/diet";
import { dishHref } from "@/core/dishes";
import { getList, getListedDishes, getLists, getRankedList, getRankings, listLeaders, type FoodList, type RankedDish } from "@/core/rankings";
import { DietMark, DishAvg, TastesLikeHome } from "@/components/marks";
import { CityPicker, ReportButton, ShareButton, useGo } from "@/components/social";
import { Btn, Card, dishCount, Empty, Failed, Header, Loading, Overline, T, useData } from "@/components/ui";
import { useSession } from "@/lib/session";
import { SITE, supabase } from "@/lib/supabase";
import { useTheme } from "@/theme";
import { RankingRow } from "../(tabs)/index";

function RankRow({ dish: d, demonym }: { dish: RankedDish; demonym?: string }) {
  const { colors } = useTheme();
  const go = useGo();
  const podium = d.rank !== null && d.rank <= 3;
  return (
    <Pressable onPress={() => go(dishHref(d.restaurant.slug, d.name))} accessibilityRole="link" style={{ minHeight: 64, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      {d.rank !== null && (
        <View accessibilityLabel={`Rank ${d.rank}`} style={{ width: 36, alignItems: "center" }}>
          {d.rank === 1 && <CrownIcon size={15} color={colors.mustardInk} style={{ position: "absolute", top: -13 }} />}
          <T size={podium ? 24 : 18} weight={800} color={podium ? colors.mustardInk : colors.muted}>
            {d.rank}
          </T>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <DietMark diet={d.diet} size={12} />
          <T weight={600} style={{ flexShrink: 1 }}>
            {d.name}
          </T>
        </View>
        <T size={14} color={colors.faint}>
          {d.restaurant.name}, {d.restaurant.area}
        </T>
        <TastesLikeHome avg={d.home_avg} count={d.home_count} demonym={demonym} />
      </View>
      <DishAvg avg={d.avg_score} count={d.rating_count} />
    </Pressable>
  );
}

function HowItWorks({ list }: { list: FoodList }) {
  const { colors } = useTheme();
  const points = [
    { Icon: UsersRoundIcon, text: "Only ratings from people on Nomrank count. Nobody can pay for a spot." },
    { Icon: ScaleIcon, text: "Weighted, so a single perfect 10 can't take the top on its own." },
    { Icon: SproutIcon, text: "Ratings from accounts less than a week old count half." },
    ...(list.region ? [{ Icon: HouseIcon, text: `Tastes like home shows once 3 ${list.region.demonym} have rated a dish.` }] : []),
  ];
  return (
    <Card style={{ gap: 10 }}>
      <T size={14} weight={600}>
        How this ranking works
      </T>
      {points.map(({ Icon, text }) => (
        <View key={text} style={{ flexDirection: "row", gap: 10 }}>
          <Icon size={16} color={colors.mustardInk} />
          <T size={14} color={colors.muted} style={{ flex: 1 }}>
            {text}
          </T>
        </View>
      ))}
      <Pressable onPress={() => WebBrowser.openBrowserAsync(`${SITE}/about#rankings`)} accessibilityRole="link" style={{ minHeight: 36, justifyContent: "center" }}>
        <T size={14} weight={600}>
          More on how rankings work
        </T>
      </Pressable>
    </Card>
  );
}

// One food's ranking in your city. Positions count within what's shown, so the list always reads 1, 2, 3.
export default function Ranking() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const { profile, city, prefs } = useSession();
  const go = useGo();
  const { data, failed, reload } = useData(async () => {
    const list = await getList(supabase, decodeURIComponent(slug));
    if (!list) return { list: null };
    const [all, lists, listed, rankings] = await Promise.all([getRankedList(supabase, list.id, city), getLists(supabase), getListedDishes(supabase), getRankings(supabase)]);
    return { list, all, lists, listed, rankings };
  }, [slug, city]);

  const view = useMemo(() => {
    if (!data?.list) return null;
    const dishes = data.all!.filter((d) => allows(prefs.show_diet, d.diet));
    const ranked = dishes.filter((d) => d.rank !== null).map((d, i) => ({ ...d, rank: i + 1 }));
    const unrated = dishes.filter((d) => d.rank === null);
    const others = listLeaders(data.lists!, city ? data.listed!.filter((d) => d.restaurant.city === city) : data.listed!, data.rankings!, prefs.show_diet).filter((l) => l.list.id !== data.list!.id);
    return { dishes, ranked, unrated, others };
  }, [data, city, prefs.show_diet]);

  const list = data?.list;
  const renderItem = useCallback(({ item }: { item: RankedDish }) => <RankRow dish={item} demonym={list?.region?.demonym} />, [list]);

  if (failed && !data) return <><Header /><Failed onRetry={reload} /></>;
  if (!data) return <><Header /><Loading /></>;
  if (!list || !view) return <><Header /><Empty title="Ranking not found">It may have been removed.</Empty></>;

  return (
    <View style={{ flex: 1 }}>
      <Header right={<ShareButton path={`/top/${slug}`} title={`Top ${list.name} on Nomrank`} />} />
      <FlatList
        data={view.ranked}
        keyExtractor={(d) => d.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TrophyIcon size={14} color={colors.mustardInk} />
              <Overline style={{ color: colors.mustardInk }}>Rankings</Overline>
            </View>
            <T size={28} weight={700} accessibilityRole="header" style={{ lineHeight: 33 }}>
              Top {list.name}
              {city && <T size={28} weight={700} color={colors.muted}>{` in ${city}`}</T>}
            </T>
            <View style={{ alignSelf: "flex-start" }}>
              <CityPicker />
            </View>
            <T size={14} color={colors.muted}>
              {dishCount(view.dishes.length)}
              {view.ranked.length > 0 && ` · ${view.ranked.length} ranked`}
            </T>
            {prefs.show_diet !== "all" && (
              <T size={14} color={colors.faint}>
                Showing the dishes your food preference allows.{" "}
                <T size={14} weight={600} onPress={() => go("/settings")}>
                  Change
                </T>
              </T>
            )}
            <View style={{ alignSelf: "flex-start" }}>
              <ReportButton targetType="space" targetId={list.id} what="this list" />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Card>
            <T size={14} color={colors.muted} style={{ textAlign: "center" }}>
              Nothing rated here yet. Rate one and it takes the top spot.
            </T>
          </Card>
        }
        ListFooterComponent={
          <View style={{ gap: 20, marginTop: 20 }}>
            {view.unrated.length > 0 && (
              <View>
                <Overline>Not rated yet</Overline>
                {view.unrated.map((d) => (
                  <RankRow key={d.id} dish={d} />
                ))}
              </View>
            )}
            <HowItWorks list={list} />
            <Btn label="Rate what you ate" icon={PlusIcon} onPress={() => go(profile ? "/rate" : "/login")} />
            {view.others.length > 0 && (
              <View>
                <Overline>More rankings</Overline>
                {view.others.map((l) => (
                  <RankingRow key={l.list.id} item={l} />
                ))}
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}
