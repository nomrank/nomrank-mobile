import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AwardIcon, CameraIcon, CheckIcon, CompassIcon, FlameIcon, HandshakeIcon, LockIcon, MapPinIcon, MoonIcon, PenLineIcon, PencilIcon, PlusIcon, ScaleIcon, SettingsIcon, SparklesIcon, UtensilsIcon, type LucideIcon } from "lucide-react-native";
import { canSee, DIETS, getFavourites, getProfileByHandle, getProfileStats, getSaves, getSaveStates, isFollowing, palate, type Favourite, type ProfileStats, type Visibility } from "@/core/profiles";
import { formatScore, getMyVotes, getUserRatings, photoUrl, scoreColor, summarize, type Review } from "@/core/ratings";
import { dishHref } from "@/core/dishes";
import { badges, profileFacts, tasteMatch, UNLOCK_AT, type TasteMatch } from "@/core/taste";
import { AgreeIcon, Avatar, DietMark, DishAvg, Score } from "@/components/marks";
import { FollowButton, ReviewCard, ShareButton, useGo } from "@/components/social";
import { toast } from "@/components/toast";
import { Btn, Card, Empty, Failed, Header, Loading, Overline, Row, Sheet, T, TabRow, useData } from "@/components/ui";
import { saveFavourites } from "@/lib/actions";
import { groupBy } from "@/lib/home";
import { useKeepTabsInView, useScrollToTopOnTab } from "@/lib/scroll";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { brand, useTheme } from "@/theme";

const MONTH = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" });
const JOINED = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function Locked({ handle, visibility, what }: { handle: string; visibility: Visibility; what: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 6, paddingVertical: 40 }}>
      <LockIcon size={20} color={colors.mustardInk} />
      <T weight={600} style={{ textAlign: "center" }}>
        @{handle} keeps their {what} private
      </T>
      <T size={14} color={colors.muted} style={{ textAlign: "center" }}>
        {visibility === "followers" ? "Only people who follow them can see it. Follow them to take a look." : "Only they can see it."}
      </T>
    </View>
  );
}

function Spread({ scores, height = 32 }: { scores: number[]; height?: number }) {
  const { colors } = useTheme();
  const { spread } = summarize(scores);
  const peak = Math.max(1, ...spread);
  return (
    <View accessibilityLabel={`How they score: ${spread.map((n, i) => `${n} rated ${i + 1}`).join(", ")}`} style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height }}>
      {spread.map((n, i) => (
        <View key={i} style={{ flex: 1, height: n ? Math.max(height * 0.12, (n / peak) * height) : 2, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: n ? scoreColor(i + 1) : colors.hairline }} />
      ))}
    </View>
  );
}

function TasteCard({ stats, scores, own }: { stats: ProfileStats; scores: number[]; own: boolean }) {
  const { colors } = useTheme();
  const unlocked = stats.rated >= UNLOCK_AT;
  const left = UNLOCK_AT - stats.rated;
  const trust = stats.trust;
  return (
    <Card style={{ gap: 12 }}>
      {unlocked && stats.average !== null ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Score score={stats.average} size={64} />
          <View style={{ flex: 1 }}>
            <T size={18} weight={700}>
              {palate(stats.average, stats.rated)}
            </T>
            <T size={14} color={colors.muted}>
              {stats.rated} dishes rated · avg {formatScore(stats.average)}
            </T>
          </View>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <LockIcon size={15} color={colors.faint} />
            <T weight={600} style={{ flexShrink: 1 }}>
              {own ? `Rate ${left} more ${left === 1 ? "dish" : "dishes"} to unlock your taste` : "Still tasting"}
            </T>
          </View>
          <T size={14} color={colors.muted}>
            {own ? "Your average, palate and score spread show up after " : "Their taste shows up after "}
            {UNLOCK_AT} ratings.
          </T>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: UNLOCK_AT, now: stats.rated }} style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
            {Array.from({ length: UNLOCK_AT }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < stats.rated ? scoreColor(4 + (i * 5.5) / (UNLOCK_AT - 1)) : colors.hairline }} />
            ))}
          </View>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 10 }}>
        <View accessibilityLabel={`Trust ${trust}: agrees on their takes and likes on their comments, minus disagrees and dislikes`} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <HandshakeIcon size={18} color={trust > 0 ? colors.mustardInk : trust < 0 ? colors.ketchupInk : colors.faint} />
          <T size={20} weight={700} color={trust < 0 ? colors.ketchupInk : undefined}>
            {trust > 0 ? `+${trust}` : trust}
          </T>
          <T size={14} color={colors.muted}>
            trust
          </T>
        </View>
        {unlocked && (
          <View style={{ width: 128 }}>
            <Overline style={{ fontSize: 10, textAlign: "right", marginBottom: 4 }}>Score spread</Overline>
            <Spread scores={scores} />
          </View>
        )}
      </View>
    </Card>
  );
}

function MatchCard({ match, handle }: { match: TasteMatch; handle: string }) {
  const { colors } = useTheme();
  if (match.percent === null)
    return (
      <View style={{ borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, padding: 12 }}>
        <T size={14} color={colors.muted}>
          {match.common ? `You've both rated ${match.common} ${match.common === 1 ? "dish" : "dishes"}. Rate ${3 - match.common} more in common to see your taste match.` : `Rate a few dishes @${handle} has rated to see your taste match.`}
        </T>
      </View>
    );
  return (
    <Card style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <T size={30} weight={700} color={scoreColor(4 + (match.percent / 100) * 5.5)}>
          {match.percent}%
        </T>
        <T weight={600}>taste match</T>
      </View>
      <T size={14} color={colors.muted}>
        On {match.common} dishes you&apos;ve both rated.
      </T>
      {match.split && (
        <T size={14} color={colors.muted} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          You split on <T size={14} weight={600}>{match.split.dish}</T> at {match.split.place}: <T size={14} weight={600}>you {formatScore(match.split.mine)}</T> · <T size={14} weight={600}>them {formatScore(match.split.theirs)}</T>
        </T>
      )}
    </Card>
  );
}

const BADGE_ICONS: Record<string, LucideIcon> = { "first-take": PenLineIcon, "ten-dishes": UtensilsIcon, explorer: CompassIcon, trusted: HandshakeIcon, "biryani-buff": FlameIcon, "all-rounder": ScaleIcon, "night-owl": MoonIcon, shutterbug: CameraIcon };

function Badges({ ratings, trust, own }: { ratings: Review[]; trust: number; own: boolean }) {
  const { colors } = useTheme();
  const earned = badges(ratings, trust);
  if (!earned.length && !own) return null;
  return (
    <View style={{ gap: 8 }}>
      <Overline>Badges</Overline>
      {earned.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {earned.map((b) => {
            const Icon = BADGE_ICONS[b.id] ?? AwardIcon;
            return (
              <View key={b.id} accessible accessibilityLabel={`${b.label}: ${b.detail}`} style={{ width: "31.5%", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}>
                <LinearGradient colors={[brand.ketchup, brand.mustard]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                  {b.id === "dosa-devotee" ? <AgreeIcon size={20} color={brand.studio} /> : <Icon size={20} color={brand.studio} />}
                </LinearGradient>
                <T size={12} weight={600} style={{ textAlign: "center" }}>
                  {b.label}
                </T>
              </View>
            );
          })}
        </View>
      ) : (
        <T size={14} color={colors.muted}>
          Write a take, rate 10 dishes or try 5 places to earn your first badge.
        </T>
      )}
    </View>
  );
}

function Favourites({ favourites, own, ratings, onSaved }: { favourites: Favourite[]; own: boolean; ratings: Review[]; onSaved: () => void }) {
  const { colors } = useTheme();
  const go = useGo();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (!favourites.length && !own) return null;

  const edit = () => {
    setPicked(favourites.map((f) => f.rating.id));
    setOpen(true);
  };
  async function save() {
    setBusy(true);
    const failed = await saveFavourites(picked);
    setBusy(false);
    if (failed) return toast(failed);
    setOpen(false);
    onSaved();
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Overline>Favourites</Overline>
        {own && (
          <Pressable onPress={edit} accessibilityRole="button" accessibilityLabel="Edit favourites" hitSlop={10} style={{ minHeight: 32, justifyContent: "center" }}>
            <T size={13} weight={600} color={colors.muted}>
              Edit
            </T>
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {favourites.map(({ rating: r }) => {
          const photo = [...r.photos].sort((a, b) => a.position - b.position)[0];
          return (
            <Pressable key={r.id} onPress={() => go(dishHref(r.dish.restaurant.slug, r.dish.name))} accessibilityRole="link" accessibilityLabel={r.dish.name} style={{ flex: 1, maxWidth: "23%", gap: 4 }}>
              <View style={{ aspectRatio: 3 / 4 }}>
                <View style={{ flex: 1, borderRadius: 10, overflow: "hidden", backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" }}>
                  {photo ? (
                    <Image source={photoUrl(photo.path)} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  ) : (
                    <T size={26} weight={700}>
                      {r.dish.name[0]}
                    </T>
                  )}
                </View>
                <View style={{ position: "absolute", right: -5, bottom: -5 }}>
                  <Score score={r.score} size={30} />
                </View>
              </View>
              <T size={12} weight={600} numberOfLines={2}>
                {r.dish.name}
              </T>
              <T size={11} color={colors.faint} numberOfLines={1}>
                {r.dish.restaurant.name}
              </T>
            </Pressable>
          );
        })}
        {own && favourites.length < 4 && (
          <Pressable onPress={edit} accessibilityRole="button" accessibilityLabel="Pin a favourite" style={{ width: "23%", aspectRatio: 3 / 4, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: colors.input, alignItems: "center", justifyContent: "center" }}>
            <PlusIcon size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <T size={18} weight={700}>
          Pin up to 4 favourites
        </T>
        <ScrollView style={{ marginVertical: 12 }}>
          {ratings.length === 0 && <T color={colors.muted}>Rate a dish first, then pin it here.</T>}
          {ratings.map((r) => {
            const on = picked.includes(r.id);
            return (
              <Pressable key={r.id} onPress={() => setPicked((p) => (on ? p.filter((x) => x !== r.id) : p.length < 4 ? [...p, r.id] : p))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                <Score score={r.score} size={34} />
                <View style={{ flex: 1 }}>
                  <T size={14} weight={600} numberOfLines={1}>
                    {r.dish.name}
                  </T>
                  <T size={12} color={colors.faint} numberOfLines={1}>
                    {r.dish.restaurant.name}
                  </T>
                </View>
                {on && <CheckIcon size={18} color={colors.mustardInk} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <Btn label="Save favourites" busy={busy} onPress={save} />
      </Sheet>
    </View>
  );
}

function Chip({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ minHeight: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", gap: 6 }}>
      {children}
    </Pressable>
  );
}

type Item = { key: string; node: () => ReactNode };

// Who they are, their numbers and four favourites, then their takes, a diary of everything rated, and Want to try.
export function ProfileScreen({ handle, tab: asTab }: { handle: string; tab?: boolean }) {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const { userId, profile: viewer } = useSession();
  const go = useGo();
  const [tab, setTab] = useState<"takes" | "diary" | "saved">("takes");
  const list = useRef<FlatList<Item>>(null);
  useScrollToTopOnTab(asTab ? "you" : "", list);
  const keep = useKeepTabsInView(list);

  const { data, failed, reload } = useData(async () => {
    const p = await getProfileByHandle(supabase, handle);
    if (!p) return { missing: true as const };
    const [stats, favourites, ratings, saves] = await Promise.all([getProfileStats(supabase, p.id), getFavourites(supabase, p.id), getUserRatings(supabase, p.id), getSaves(supabase, p.id)]);
    const takes = ratings.filter((r) => r.take);
    const other = userId && userId !== p.id ? userId : null;
    const [votes, saveStates, following, mine] = await Promise.all([
      viewer ? getMyVotes(supabase, takes.map((r) => r.id)) : ({} as Awaited<ReturnType<typeof getMyVotes>>),
      getSaveStates(supabase, viewer ? userId : null, takes.map((r) => r.dish.id)),
      other ? isFollowing(supabase, other, p.id) : false,
      other ? getUserRatings(supabase, other) : null,
    ]);
    return { missing: false as const, p, stats, favourites, ratings, saves, takes, votes, saveStates, following, match: mine && tasteMatch(mine, ratings) };
  }, [handle, userId, viewer?.username]);

  const [followOverride, setFollowOverride] = useState<boolean | null>(null);

  const items: Item[] = useMemo(() => {
    if (!data || data.missing) return [];
    const { p, ratings, saves, takes, votes, saveStates, following } = data;
    const own = viewer?.username === p.username;
    const follows = followOverride ?? following;
    const diaryOpen = canSee(p.diary_visibility, { own, follows });
    const savesOpen = canSee(p.saves_visibility, { own, follows });
    const single = (key: string, node: () => ReactNode): Item[] => [{ key, node }];
    if (tab === "takes")
      return takes.length
        ? takes.map((r) => ({
            key: r.id,
            node: () => (
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                <ReviewCard review={r} vote={votes[r.id]} saved={saveStates[r.dish.id]} />
              </View>
            ),
          }))
        : single("none", () => <Empty>{own ? "Rate a dish and say what you thought. Your takes show up here." : `@${p.username} hasn't written a take yet.`}</Empty>);
    if (tab === "diary") {
      if (!diaryOpen) return single("lock", () => <Locked handle={p.username} visibility={p.diary_visibility} what="diary" />);
      if (!ratings.length) return single("none", () => <Empty>{own ? "Everything you rate lands here, by date." : `@${p.username} hasn't rated anything yet.`}</Empty>);
      return groupBy(ratings, (r) => MONTH.format(new Date(r.created_at))).flatMap(([month, list]) => [
        { key: month, node: () => <Overline style={{ marginTop: 18 }}>{month}</Overline> },
        ...list.map((r) => ({
          key: r.id,
          node: () => (
            <Pressable onPress={() => go(r.take ? `/review/${r.id}` : dishHref(r.dish.restaurant.slug, r.dish.name))} accessibilityRole="link" style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
              <T size={18} weight={700} color={colors.muted} style={{ width: 28, textAlign: "center" }}>
                {DAY.format(new Date(r.created_at))}
              </T>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <DietMark diet={r.dish.diet} size={12} />
                  <T weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {r.dish.name}
                  </T>
                </View>
                <T size={14} color={colors.faint} numberOfLines={1}>
                  {r.dish.restaurant.name}
                  {r.take ? " · wrote a take" : ""}
                </T>
              </View>
              <Score score={r.score} size={38} />
            </Pressable>
          ),
        })),
      ]);
    }
    if (!savesOpen) return single("lock", () => <Locked handle={p.username} visibility={p.saves_visibility} what="Want to try list" />);
    if (!saves.length) return single("none", () => <Empty>{own ? "Tap “Want to try” on any dish to save it here for later." : `@${p.username} hasn't saved any dishes yet.`}</Empty>);
    return saves.map(({ dish: d }) => ({
      key: d.id,
      node: () => (
        <Row
          onPress={() => go(dishHref(d.restaurant.slug, d.name))}
          leading={<DietMark diet={d.diet} />}
          title={d.name}
          meta={
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <T size={14} color={colors.muted}>
                {d.restaurant.name} ·
              </T>
              <DishAvg avg={d.avg_score} count={d.rating_count} orEmpty />
            </View>
          }
        />
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` is stable in effect
  }, [data, tab, viewer?.username, followOverride, colors]);

  const renderItem = useCallback(({ item }: { item: Item }) => <>{item.node()}</>, []);

  const head = asTab ? <View style={{ height: top }} /> : <Header />;
  if (failed && !data) return <>{head}<Failed onRetry={reload} /></>;
  if (!data) return <>{head}<Loading /></>;
  if (data.missing) return <>{head}<Empty title="Profile not found">No one has that handle.</Empty></>;

  const { p, stats, favourites, ratings, saves, takes, following, match } = data;
  const own = viewer?.username === p.username;
  const name = p.display_name ?? `@${p.username}`;
  const facts = profileFacts(ratings);
  const stated = DIETS.find((d) => d.value === p.diet);
  const follows = followOverride ?? following;
  const diaryOpen = canSee(p.diary_visibility, { own, follows });
  const savesOpen = canSee(p.saves_visibility, { own, follows });

  return (
    <View style={{ flex: 1 }}>
      {head}
      <FlatList
        ref={list}
        onScroll={keep.onScroll}
        scrollEventThrottle={32}
        data={items}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={brand.mustard} colors={[brand.ketchup]} />}
        ListHeaderComponent={
          <View onLayout={keep.onHeaderLayout} style={{ gap: 14, paddingTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Avatar handle={p.username} code={p.avatar} photo={p.avatar_path} size={80} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ShareButton path={`/u/${p.username}`} title={`${name} on Nomrank`} />
                {own ? (
                  <>
                    <Btn label="Edit" icon={PencilIcon} variant="secondary" onPress={() => go("/settings/profile")} accessibilityLabel="Edit profile" style={{ minHeight: 40, paddingHorizontal: 12 }} />
                    <Pressable onPress={() => go("/settings")} accessibilityRole="button" accessibilityLabel="Settings" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                      <SettingsIcon size={20} color={colors.foreground} />
                    </Pressable>
                  </>
                ) : (
                  <FollowButton followeeId={p.id} handle={p.username} following={follows} onChange={setFollowOverride} />
                )}
              </View>
            </View>
            <View>
              <T size={name.length > 20 ? 20 : 26} weight={700} accessibilityRole="header">
                {name}
              </T>
              {p.display_name && (
                <T size={14} weight={600} color={colors.muted}>
                  @{p.username}
                </T>
              )}
              <T size={14} color={colors.faint}>
                {p.regions && `Home: ${p.regions.name} · `}Joined {JOINED.format(new Date(p.created_at))}
              </T>
            </View>
            {p.bio && <T>{p.bio}</T>}
            {(facts.regularAt || facts.diet || facts.signature || stated || p.instagram) && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {facts.regularAt && (
                  <Chip onPress={() => go(`/r/${facts.regularAt!.slug}`)}>
                    <MapPinIcon size={14} color={colors.mustardInk} />
                    <T size={14} color={colors.muted}>
                      Regular at
                    </T>
                    <T size={14} weight={600}>
                      {facts.regularAt.name}
                    </T>
                  </Chip>
                )}
                {stated ? (
                  <Chip>
                    <DietMark diet={stated.mark} size={12} />
                    <T size={14} weight={600}>
                      {stated.label}
                    </T>
                  </Chip>
                ) : (
                  facts.diet && (
                    <Chip>
                      <DietMark diet={facts.diet === "Mostly non-veg" ? "non_veg" : "veg"} size={12} />
                      <T size={14} weight={600}>
                        {facts.diet}
                      </T>
                    </Chip>
                  )
                )}
                {p.instagram && (
                  <Chip onPress={() => Linking.openURL(`https://www.instagram.com/${p.instagram}/`)}>
                    <CameraIcon size={14} color={colors.mustardInk} />
                    <T size={14} weight={600}>
                      @{p.instagram}
                    </T>
                  </Chip>
                )}
                {facts.signature && (
                  <Chip>
                    <SparklesIcon size={14} color={colors.mustardInk} />
                    <T size={14} color={colors.muted}>
                      Signature:
                    </T>
                    <T size={14} weight={600}>
                      {facts.signature}
                    </T>
                  </Chip>
                )}
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 16 }}>
              {(
                [
                  ["followers", stats.followers, stats.followers === 1 ? "follower" : "followers"],
                  ["following", stats.following, "following"],
                ] as const
              ).map(([kind, count, label]) => (
                <Pressable key={kind} onPress={() => go(`/u/${p.username}/${kind}`)} accessibilityRole="link" hitSlop={8} style={{ minHeight: 36, justifyContent: "center" }}>
                  <T size={14} color={colors.muted}>
                    <T size={14} weight={600}>
                      {count}
                    </T>{" "}
                    {label}
                  </T>
                </Pressable>
              ))}
            </View>
            <TasteCard stats={stats} scores={ratings.map((r) => r.score)} own={own} />
            {match && <MatchCard match={match} handle={p.username} />}
            <Favourites favourites={favourites} own={own} ratings={ratings} onSaved={reload} />
            <Badges ratings={ratings} trust={stats.trust} own={own} />
            <TabRow
              tabs={[
                ["takes", `Takes ${takes.length}`],
                ["diary", diaryOpen ? `Diary ${ratings.length}` : "Diary · private"],
                ["saved", savesOpen ? `Want to try ${saves.length}` : "Want to try · private"],
              ]}
              value={tab}
              onChange={(t) => {
                keep.settle();
                setTab(t);
              }}
            />
          </View>
        }
      />
    </View>
  );
}
