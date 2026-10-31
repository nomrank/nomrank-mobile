import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { ChevronRightIcon, ClockIcon, TrophyIcon } from "lucide-react-native";
import { dishHref, keyFromDishSlug } from "@/core/dishes";
import { countWanted, isSaved } from "@/core/profiles";
import { getRankings, listHref } from "@/core/rankings";
import { formatScore, getDishRatings, getMyVotes, photoUrl, scoreColor, summarize, type Review } from "@/core/ratings";
import { getDish, getDishesToRate } from "@/core/restaurants";
import { DietMark, TastesLikeHome } from "@/components/marks";
import { RateAnother } from "@/components/rate-another";
import { ReportButton, ReviewCard, SaveButton, ShareButton, useGo } from "@/components/social";
import { Btn, Empty, Failed, Header, Loading, Overline, SortRow, T, useData } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme";

// Title and photo, the average and spread, your rating, then the takes.
export default function DishScreen() {
  const { slug, dish: dishSlug } = useLocalSearchParams<{ slug: string; dish: string }>();
  const { colors } = useTheme();
  const { userId, profile } = useSession();
  const go = useGo();
  const [sort, setSort] = useState<"top" | "new">("top");

  const { data, failed, reload } = useData(async () => {
    const dish = await getDish(supabase, slug, keyFromDishSlug(decodeURIComponent(dishSlug)));
    if (!dish) return { dish: null };
    const ratings = await getDishRatings(supabase, dish.id);
    const rated = Boolean(userId && ratings.some((r) => r.author.username === profile?.username));
    const [votes, next, saved, wanted, ranking] = await Promise.all([
      profile ? getMyVotes(supabase, ratings.map((r) => r.id)) : ({} as Awaited<ReturnType<typeof getMyVotes>>),
      rated && userId ? getDishesToRate(supabase, userId, slug) : null,
      userId && !rated ? isSaved(supabase, userId, dish.id) : false,
      countWanted(supabase, dish.id),
      dish.space ? getRankings(supabase, { dish: dish.id }).then((r) => r[0] ?? null) : null,
    ]);
    return { dish, ratings, votes, next, saved, wanted, ranking };
  }, [slug, dishSlug, userId, profile?.username]);

  const reviews = useMemo(() => {
    if (!data?.dish) return [];
    return data.ratings!.filter((r) => r.take).sort((a, b) => (sort === "new" ? b.created_at.localeCompare(a.created_at) : b.facts_count - b.cap_count - (a.facts_count - a.cap_count)));
  }, [data, sort]);
  const votes = data?.dish ? data.votes! : {};
  const renderItem = useCallback(
    ({ item }: { item: Review }) => (
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <ReviewCard review={item} vote={votes[item.id]} showDish={false} />
      </View>
    ),
    [votes, colors],
  );

  if (failed && !data)
    return (
      <>
        <Header />
        <Failed onRetry={reload} />
      </>
    );
  if (!data)
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  if (!data.dish)
    return (
      <>
        <Header />
        <Empty title="Dish not found">It may have been removed.</Empty>
      </>
    );

  const { dish, ratings = [], wanted = 0, ranking, saved, next } = data;
  const { count, average, spread } = summarize(ratings.map((r) => r.score));
  const peak = Math.max(1, ...spread);
  const mine = profile ? ratings.find((r) => r.author.username === profile.username) : undefined;
  const poster = ratings.find((r) => r.photos[0])?.photos[0];

  return (
    <View style={{ flex: 1 }}>
      <Header right={<ShareButton path={dishHref(dish.restaurant.slug, dish.name)} title={`${dish.name} at ${dish.restaurant.name}`} />} />
      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListEmptyComponent={<Empty>No takes on this dish yet.</Empty>}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            {dish.approved_at === null && (
              <View style={{ flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,194,60,0.4)", backgroundColor: "rgba(255,194,60,0.1)" }}>
                <ClockIcon size={16} color={colors.mustardInk} />
                <T size={14} style={{ flex: 1 }}>
                  Waiting for approval. This dish stays hidden from everyone else until it&apos;s reviewed.
                </T>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <DietMark diet={dish.diet} size={16} />
                  <T size={26} weight={700} accessibilityRole="header" style={{ flexShrink: 1, lineHeight: 31 }}>
                    {dish.name}
                  </T>
                </View>
                <Pressable onPress={() => go(`/r/${dish.restaurant.slug}`)} accessibilityRole="link" style={{ minHeight: 32, justifyContent: "center" }}>
                  <T color={colors.muted}>
                    {dish.restaurant.name}, {dish.restaurant.area}
                  </T>
                </Pressable>
              </View>
              {poster && <Image source={photoUrl(poster.path)} accessibilityLabel={`Photo of ${dish.name}`} style={{ width: 96, height: 128, borderRadius: 10 }} contentFit="cover" />}
            </View>

            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.hairline, paddingVertical: 14 }}>
              <View>
                <Overline>Overall rating</Overline>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  {average !== null && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: scoreColor(average) }} />}
                  <T size={30} weight={700} style={{ lineHeight: 34 }} accessibilityLabel={average === null ? "No ratings yet" : `${average.toFixed(1)}, from ${count} ${count === 1 ? "rating" : "ratings"}`}>
                    {average === null ? "–" : average.toFixed(1)}
                  </T>
                </View>
                <T size={12} color={colors.faint}>
                  {[!count && "No ratings yet", wanted > 0 && `${wanted} want to try`].filter(Boolean).join(" · ") || " "}
                </T>
              </View>
              <View accessibilityLabel={`Scores: ${spread.map((n, i) => `${n} rated ${i + 1}`).join(", ")}`} style={{ flex: 1, height: 56, flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
                {spread.map((n, i) => (
                  <Animated.View key={i} entering={FadeInDown.duration(300).delay(i * 25)} style={{ flex: 1, height: Math.max(3, (n / peak) * 56), borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: colors.faint, opacity: 0.55 }} />
                ))}
              </View>
            </View>

            {dish.space && (
              <View style={{ gap: 6 }}>
                <Pressable onPress={() => go(listHref(dish.space!.name))} accessibilityRole="link" style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TrophyIcon size={16} color={colors.mustardInk} />
                  <T size={14} weight={600}>
                    {ranking?.rank ? `#${ranking.rank} in ${dish.space.name}` : `In the ${dish.space.name} ranking`}
                  </T>
                  <ChevronRightIcon size={16} color={colors.muted} />
                </Pressable>
                {ranking && <TastesLikeHome avg={ranking.home_avg} count={ranking.home_count} demonym={dish.space.region?.demonym} />}
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn label={mine ? `You rated it ${formatScore(mine.score)} · Change` : "Rate this dish"} onPress={() => go(`/rate?dish=${dish.id}`)} style={{ flex: 1 }} />
              {!mine && <SaveButton key={String(saved)} dishId={dish.id} saved={Boolean(saved)} />}
            </View>
            {next && <RateAnother restaurant={next.restaurant} dishes={next.dishes} />}
            <View style={{ alignSelf: "flex-start" }}>
              <ReportButton targetType="dish" targetId={dish.id} what="this dish" />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
              <Overline>Takes{reviews.length > 0 ? ` · ${reviews.length}` : ""}</Overline>
              <SortRow options={["top", "new"] as const} value={sort} onChange={setSort} />
            </View>
          </View>
        }
      />
    </View>
  );
}
