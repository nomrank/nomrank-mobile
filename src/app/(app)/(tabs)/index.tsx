import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDownIcon, CrownIcon, SearchIcon, XIcon } from "lucide-react-native";
import { filterMenus, type ShowDiet } from "@/core/diet";
import { dishHref, dishKey } from "@/core/dishes";
import { getFollowees } from "@/core/profiles";
import { getListedDishes, getLists, getRankings, listHref, listLeaders, type Leader } from "@/core/rankings";
import { FEED_PAGE, getFeed, getMyVotes, groupMeals, type FeedSort, type Review, type Vote } from "@/core/ratings";
import { getRestaurants, type Restaurant } from "@/core/restaurants";
import { LogoMark } from "@/components/logo-mark";
import { DietMark, DishAvg } from "@/components/marks";
import { CityPicker, MealCard, ReviewCard, useGo } from "@/components/social";
import { FirstTour, StartSpace } from "@/components/home-parts";
import { FoxLoader } from "@/components/loader";
import { dishCount, Empty, Failed, Input, Loading, Overline, Rise, Row, SortRow, T, TabRow, useData, WORDMARK } from "@/components/ui";
import { FIRST_LIST_KEY, groupBy, groupDishes, type DishGroup } from "@/lib/home";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { brand, useTheme } from "@/theme";

type View_ = "takes" | "rankings" | "dishes" | "places";
const TABS = [["takes", "Takes"], ["rankings", "Rankings"], ["dishes", "Dishes"], ["places", "Places"]] as const;
type Item = { key: string; node: () => ReactNode };

function DishGroupRow({ group: g, href }: { group: DishGroup; href: (s: DishGroup["spots"][number]) => string }) {
  const { colors } = useTheme();
  const go = useGo();
  const [open, setOpen] = useState(false);
  if (g.spots.length === 1) {
    const s = g.spots[0];
    return <Row onPress={() => go(href(s))} leading={<DietMark diet={s.diet} />} title={<T weight={600} size={16}>{g.name}</T>} meta={<Meta place={s.place.name} avg={s.avg} count={s.count} />} />;
  }
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ minHeight: 64, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T size={16} weight={600}>
            {g.name}
          </T>
          <T size={14} color={colors.muted}>
            At {g.spots.length} places
          </T>
        </View>
        <ChevronDownIcon size={20} color={colors.foreground} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      {open && (
        <View style={{ marginLeft: 12, marginBottom: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: brand.mustard }}>
          {g.spots.map((s) => (
            <Row key={s.id} onPress={() => go(href(s))} leading={<DietMark diet={s.diet} />} title={<T weight={600}>{s.place.name}</T>} meta={<Meta place={s.place.area} avg={s.avg} count={s.count} />} />
          ))}
        </View>
      )}
    </View>
  );
}

function Meta({ place, avg, count }: { place: string; avg: number | null; count: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <T size={14} color={colors.muted}>
        {place} ·
      </T>
      <DishAvg avg={avg} count={count} orEmpty />
    </View>
  );
}

export function RankingRow({ item: { list, count, leader } }: { item: Leader }) {
  const { colors } = useTheme();
  const go = useGo();
  return (
    <Row
      onPress={() => go(listHref(list.name))}
      label={`Top ${list.name}`}
      title={
        leader ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CrownIcon size={14} color={colors.mustardInk} />
            <DietMark diet={leader.diet} size={12} />
            <T size={16} weight={700} style={{ flexShrink: 1 }}>
              {leader.name}
            </T>
          </View>
        ) : (
          <T size={16} weight={700} color={colors.muted}>
            Not rated yet
          </T>
        )
      }
      meta={leader ? <Meta place={leader.restaurant.name} avg={leader.avg_score} count={leader.rating_count} /> : dishCount(count)}
    />
  );
}

// Home: search, then Takes (the all-India feed), Rankings, Dishes and Places (which follow your city).
export default function Home() {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const { userId, profile, city, prefs } = useSession();
  const router = useRouter();
  const go = useGo();
  const [view, setView] = useState<View_>("takes");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<FeedSort>(prefs.feed_default);
  const q = dishKey(query);
  const show: ShowDiet = prefs.show_diet;

  const browse = useData(async () => {
    const [restaurants, lists, listed, rankings] = await Promise.all([getRestaurants(supabase), getLists(supabase), getListedDishes(supabase), getRankings(supabase)]);
    return { restaurants, lists, listed, rankings };
  }, []);

  const restaurants: Restaurant[] = useMemo(() => filterMenus((browse.data?.restaurants ?? []).filter((r) => !city || r.city === city), show), [browse.data, city, show]);
  const leaders = useMemo(() => {
    if (!browse.data) return [];
    const { lists, listed, rankings } = browse.data;
    return listLeaders(lists, city ? listed.filter((d) => d.restaurant.city === city) : listed, rankings, show);
  }, [browse.data, city, show]);

  // The feed, a page at a time. `run` drops answers from a sort you've already left.
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [fetched, setFetched] = useState(0);
  const [done, setDone] = useState(false);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedFailed, setFeedFailed] = useState(false);
  const run = useRef(0);

  const page = useCallback(
    async (offset: number) => {
      const authors = sort === "following" && userId ? await getFollowees(supabase, userId) : [];
      const rows = await getFeed(supabase, sort, authors, { offset, show });
      const mine = profile ? await getMyVotes(supabase, rows.map((r) => r.id)) : {};
      return { rows, mine };
    },
    [sort, userId, show, profile],
  );

  const first = useCallback(async () => {
    const mine = ++run.current;
    try {
      const { rows, mine: v } = await page(0);
      if (mine !== run.current) return;
      setReviews(rows);
      setVotes(v);
      setFetched(rows.length);
      setDone(rows.length < FEED_PAGE);
      setFeedFailed(false);
    } catch {
      if (mine === run.current) setFeedFailed(true);
    }
  }, [page]);

  useEffect(() => {
    setReviews(null);
    first();
  }, [first]);

  async function loadMore() {
    if (more || done || !reviews || view !== "takes" || q) return;
    setMore(true);
    const mine = run.current;
    try {
      const { rows, mine: v } = await page(fetched);
      if (mine !== run.current) return;
      const seen = new Set(reviews.map((r) => r.id));
      setReviews([...reviews, ...rows.filter((r) => !seen.has(r.id))]); // pages can overlap when votes reorder Top
      setVotes({ ...votes, ...v });
      setFetched(fetched + rows.length);
      if (rows.length < FEED_PAGE) setDone(true);
    } catch {
      setDone(true); // stop trying; pull to refresh starts over
    } finally {
      setMore(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await Promise.all([first(), browse.reload()]);
    setRefreshing(false);
  }

  // Onboarding's first pick: open its ranking once.
  useEffect(() => {
    AsyncStorage.getItem(FIRST_LIST_KEY).then((food) => {
      if (!food) return;
      AsyncStorage.removeItem(FIRST_LIST_KEY);
      router.push(listHref(food) as Href);
    });
  }, [router]);

  const items: Item[] = useMemo(() => {
    if (q) {
      const groups = groupDishes(restaurants, q);
      const places = restaurants.filter((r) => dishKey(`${r.name} ${r.area}`).includes(q));
      if (!groups.length && !places.length) return [{ key: "none", node: () => <Empty>Nothing matches that yet. Try a dish like “idli” or a place name.</Empty> }];
      return [
        ...(groups.length ? [{ key: "dh", node: () => <T weight={700} size={14} style={{ marginTop: 8 }}>{dishCount(groups.length)}</T> }] : []),
        ...groups.map((g) => ({ key: `g${g.key}`, node: () => <DishGroupRow group={g} href={(s) => dishHref(s.place.slug, s.name)} /> })),
        ...(places.length ? [{ key: "ph", node: () => <T weight={700} size={14} style={{ marginTop: 16 }}>{places.length === 1 ? "1 place" : `${places.length} places`}</T> }] : []),
        ...places.map((r) => ({ key: `p${r.id}`, node: () => <Row onPress={() => go(`/r/${r.slug}`)} title={r.name} meta={r.area} /> })),
      ];
    }
    if (view === "takes") {
      if (feedFailed) return [{ key: "fail", node: () => <Failed onRetry={first} /> }];
      if (!reviews) return [{ key: "wait", node: () => <Loading /> }];
      if (!reviews.length)
        return [{ key: "none", node: () => <Empty title={sort === "following" ? "Nothing from your people yet" : "No takes yet"}>{sort === "following" ? "Follow people from their profiles and their takes land here." : "Rate a dish and write what you thought. It shows up here."}</Empty> }];
      return groupMeals(reviews).map((meal) => ({
        key: meal[0].id,
        node: () => (
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
            {meal.length > 1 ? <MealCard reviews={meal} votes={votes} /> : <ReviewCard review={meal[0]} vote={votes[meal[0].id]} />}
          </View>
        ),
      }));
    }
    if (browse.failed && !browse.data) return [{ key: "fail", node: () => <Failed onRetry={browse.reload} /> }];
    if (!browse.data) return [{ key: "wait", node: () => <Loading /> }];
    if (view === "rankings") {
      const rows: Item[] = leaders.length ? leaders.map((l) => ({ key: l.list.id, node: () => <RankingRow item={l} /> })) : [{ key: "none", node: () => <Empty>No rankings yet. They fill in as people rate.</Empty> }];
      return profile ? [...rows, { key: "start", node: () => <StartSpace /> }] : rows;
    }
    if (view === "dishes") {
      const groups = groupDishes(restaurants);
      return groups.length ? groups.map((g) => ({ key: g.key, node: () => <DishGroupRow group={g} href={(s) => dishHref(s.place.slug, s.name)} /> })) : [{ key: "none", node: () => <Empty>No dishes yet. Open a place and add the one you came for.</Empty> }];
    }
    if (!restaurants.length) return [{ key: "none", node: () => <Empty>No places yet. Check back soon.</Empty> }];
    const several = new Set(restaurants.map((r) => r.city)).size > 1;
    return groupBy(restaurants, (r) => (several ? `${r.area}, ${r.city}` : r.area)).flatMap(([area, list]) => [
      { key: `a${area}`, node: () => <Overline style={{ marginTop: 18 }}>{area}</Overline> },
      ...list.map((r) => ({ key: r.id, node: () => <Row onPress={() => go(`/r/${r.slug}`)} title={r.name} meta={dishCount(r.dishes.length)} /> })),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` is stable in effect
  }, [q, view, reviews, votes, feedFailed, sort, restaurants, leaders, browse.data, browse.failed, profile, colors]);

  const renderItem = useCallback(({ item, index }: { item: Item; index: number }) => <Rise index={index}>{item.node()}</Rise>, []);

  return (
    <View style={{ flex: 1, paddingTop: top }}>
      {profile && !profile.tour_done_at && <FirstTour />}
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={1.5}
        removeClippedSubviews
        windowSize={9}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={brand.mustard} colors={[brand.ketchup]} />}
        ListFooterComponent={more ? <View style={{ alignItems: "center", padding: 16 }}><FoxLoader size={40} /></View> : done && view === "takes" && !q && (reviews?.length ?? 0) > FEED_PAGE ? <T size={14} color={colors.faint} style={{ textAlign: "center", padding: 16 }}>You&apos;re all caught up.</T> : undefined}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <LogoMark size={36} />
                <T style={{ fontFamily: WORDMARK, fontSize: 22, letterSpacing: -0.8 }}>nomrank</T>
              </View>
              <CityPicker />
            </View>
            {show !== "all" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <T size={13} color={colors.muted}>
                  Showing {show === "vegan" ? "vegan dishes only" : show === "veg" ? "vegetarian dishes only" : "vegetarian and egg dishes"}.
                </T>
                <Pressable onPress={() => go("/settings")} hitSlop={8} accessibilityRole="link">
                  <T size={13} weight={600}>
                    Change
                  </T>
                </Pressable>
              </View>
            )}
            <View>
              <Input value={query} onChangeText={setQuery} placeholder="Dosa, biryani, a place…" accessibilityLabel="Search dishes and places" returnKeyType="search" style={{ paddingLeft: 42, paddingRight: 44 }} />
              <View pointerEvents="none" style={{ position: "absolute", left: 14, top: 15 }}>
                <SearchIcon size={18} color={colors.muted} />
              </View>
              {!!query && (
                <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" style={{ position: "absolute", right: 2, top: 2, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                  <XIcon size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
            {!q && <TabRow tabs={TABS} value={view} onChange={setView} />}
            {!q && view === "takes" && <SortRow options={["new", "top", "following"] as const} value={sort} onChange={setSort} />}
          </View>
        }
      />
    </View>
  );
}
