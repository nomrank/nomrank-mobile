import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Share, View, type LayoutChangeEvent } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInLeft, FadeInRight, useAnimatedStyle, useReducedMotion, withTiming, ZoomIn } from "react-native-reanimated";
import { CheckIcon, FlameIcon, ShareIcon, SwordsIcon, TrophyIcon } from "lucide-react-native";
import { getBattles, split, type Battle } from "@/core/battles";
import { DietMark } from "@/components/marks";
import { toast } from "@/components/toast";
import { CityPicker } from "@/components/social";
import { Btn, Failed, Loading, Press, T, useData } from "@/components/ui";
import { voteBattle } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { SITE, supabase } from "@/lib/supabase";
import { brand, useTheme } from "@/theme";

// FlatList throws if this object changes between renders, so it lives out here.
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

// One corner: a tall colour tile with the dish's score big in it. Voting fills it from the base to its share of the votes.
function Side({ battle, side, percent, lead, saving, onVote }: { battle: Battle; side: "a" | "b"; percent: number; lead: boolean; saving: boolean; onVote: (b: Battle, s: "a" | "b") => void }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const d = battle[side];
  const voted = battle.mine !== null;
  const mine = battle.mine === side;
  const rated = d.avg !== null && d.count > 0;
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleY: withTiming(voted ? percent / 100 : 0, { duration: reduce ? 0 : 700 }) }] }));
  return (
    <Animated.View entering={(side === "a" ? FadeInLeft : FadeInRight).duration(420).delay(side === "a" ? 80 : 180)} style={{ flex: 1, minWidth: 0 }}>
      <Press onPress={() => onVote(battle, side)} accessibilityRole="button" accessibilityLabel={`Vote for ${d.name} at ${d.place}`} accessibilityState={{ selected: mine }} style={{ gap: 10, opacity: voted && !mine ? 0.6 : 1 }}>
      <View style={{ aspectRatio: 3 / 4, maxHeight: 340, borderRadius: 24, padding: 14, overflow: "hidden", justifyContent: "space-between", backgroundColor: side === "a" ? brand.ketchup : brand.mustard, borderWidth: mine ? 3 : 0, borderColor: colors.foreground }}>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, transformOrigin: "bottom", backgroundColor: "rgba(23,17,28,0.25)" }, fill]} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <View style={{ backgroundColor: "#fff4ea", borderRadius: 6, padding: 4 }}>
            <DietMark diet={d.diet} size={12} />
          </View>
          {(mine || lead) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: brand.studio, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
              {mine ? <CheckIcon size={12} color={brand.mustard} strokeWidth={3} /> : <FlameIcon size={12} color={brand.mustard} fill={brand.mustard} />}
              <T size={10} weight={700} color="#fff4ea" style={{ textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 13 }}>
                {mine ? (saving ? "Saving" : "Your pick") : "Leading"}
              </T>
            </View>
          )}
        </View>
        <View>
          <T weight={800} color={brand.studio} style={{ fontSize: 56, lineHeight: 58, letterSpacing: -2 }}>
            {rated ? d.avg!.toFixed(1) : "New"}
          </T>
          <T size={11} weight={600} color={brand.studio} style={{ textTransform: "uppercase", letterSpacing: 0.6, opacity: 0.75 }}>
            {rated ? `${d.count} ${d.count === 1 ? "rating" : "ratings"}` : "No ratings yet"}
          </T>
          {voted && (
            <T weight={800} color={brand.studio} style={{ fontSize: 30, lineHeight: 36, marginTop: 4 }}>
              {percent}%
            </T>
          )}
        </View>
      </View>
      <View style={{ paddingHorizontal: 4, gap: 2 }}>
        <T size={18} weight={700} style={{ lineHeight: 21 }}>
          {d.name}
        </T>
        <T size={11} weight={500} color={colors.muted} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
          {d.place}
          {battle.city === null && ` · ${d.city}`}
        </T>
      </View>
      </Press>
    </Animated.View>
  );
}

const BattleCard = memo(function BattleCard({ battle: b, index, total, height, saving, streak, onVote }: { battle: Battle; index: number; total: number; height: number; saving: boolean; streak: number; onVote: (b: Battle, s: "a" | "b") => void }) {
  const { colors } = useTheme();
  const voted = b.mine !== null;
  const s = split(b.votes);
  const close = s.n >= 4 && Math.abs(b.votes.a - b.votes.b) <= 1;
  const list = b.a.list === b.b.list ? b.a.list : null;
  const share = () => Share.share({ message: `${b.a.name} at ${b.a.place} or ${b.b.name} at ${b.b.place}? Pick one on Nomrank. ${SITE}/battles?b=${b.id}` });
  return (
    <View accessibilityLabel={`Battle ${index + 1} of ${total}: ${b.tag}`} style={{ height, paddingHorizontal: 20, justifyContent: "center", gap: 18 }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <T size={11} weight={600} color={close ? colors.mustardInk : colors.muted} style={{ letterSpacing: 1.2, textTransform: "uppercase", textAlign: "center" }}>
          {[`${index + 1} of ${total}`, list, b.city ?? "City war", close && "Neck and neck"].filter(Boolean).join(" · ")}
        </T>
        <T weight={800} style={{ fontSize: 32, lineHeight: 34, letterSpacing: -1, textAlign: "center" }}>
          {b.tag}
        </T>
      </View>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <Side battle={b} side="a" percent={s.a} lead={voted && s.n > 1 && b.votes.a > b.votes.b} saving={saving} onVote={onVote} />
        <Side battle={b} side="b" percent={s.b} lead={voted && s.n > 1 && b.votes.b > b.votes.a} saving={saving} onVote={onVote} />
        {!voted && (
          <Animated.View entering={ZoomIn.delay(460).springify().damping(13)} pointerEvents="none" style={{ position: "absolute", left: "50%", top: 110, marginLeft: -24, width: 48, height: 48, borderRadius: 24, borderWidth: 4, borderColor: colors.background, backgroundColor: brand.studio, alignItems: "center", justifyContent: "center" }}>
            <T size={14} weight={800} color="#fff4ea">
              VS
            </T>
          </Animated.View>
        )}
      </View>
      <View style={{ alignItems: "center", gap: 10, minHeight: 74, justifyContent: "center" }}>
        {voted ? (
          <>
            <View accessibilityLabel={`${s.a}% for ${b.a.name}, ${s.b}% for ${b.b.name}`} style={{ flexDirection: "row", height: 6, width: 260, borderRadius: 3, overflow: "hidden", backgroundColor: brand.mustard }}>
              <View style={{ width: `${s.a}%`, backgroundColor: brand.ketchup }} />
            </View>
            <T size={12} color={colors.muted}>
              {s.n} {s.n === 1 ? "vote" : "votes"}
              {s.n <= 2 && " so far. You're early"}
              {streak >= 2 && ` · ${streak} in a row`}
            </T>
          </>
        ) : (
          <T size={12} weight={600} color={colors.muted} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>
            Tap the one you&apos;d order
          </T>
        )}
        <Pressable onPress={share} accessibilityRole="button" style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ShareIcon size={16} color={colors.foreground} />
          <T size={14} weight={600}>
            Share
          </T>
        </Pressable>
      </View>
    </View>
  );
});

// Battles fill the screen one at a time; picking a side shows the result, then moves on to the next fight.
export default function Battles() {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const { userId, city } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ b?: string }>();
  const { data, failed, reload } = useData(() => getBattles(supabase, userId, city), [userId, city]);
  const [battles, setBattles] = useState<Battle[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [height, setHeight] = useState(0);
  const list = useRef<FlatList<Battle | "end">>(null);
  const onScreen = useRef<string | null>(null);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data) setBattles(data);
  }, [data]);
  useEffect(() => () => void (advance.current && clearTimeout(advance.current)), []);

  const vote = useCallback(
    async (battle: Battle, side: "a" | "b") => {
      if (!userId) return;
      if (battle.mine === side) return;
      const first = battle.mine === null;
      const optimistic = { ...battle, mine: side, votes: { a: battle.votes.a + (side === "a" ? 1 : 0) - (battle.mine === "a" ? 1 : 0), b: battle.votes.b + (side === "b" ? 1 : 0) - (battle.mine === "b" ? 1 : 0) } };
      setBattles((all) => all && all.map((b) => (b.id === battle.id ? optimistic : b)));
      if (first) setStreak((n) => n + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSaving(battle.id);
      const result = await voteBattle(battle.id, userId, side);
      setSaving(null);
      if ("error" in result) {
        toast(result.error);
        setBattles((all) => all && all.map((b) => (b.id === battle.id ? battle : b)));
        if (first) setStreak((n) => Math.max(0, n - 1));
        return;
      }
      setBattles((all) => all && all.map((b) => (b.id === battle.id ? { ...b, votes: result.votes } : b)));
      if (advance.current) clearTimeout(advance.current);
      advance.current = setTimeout(() => {
        const at = (battlesRef.current ?? []).findIndex((b) => b.id === battle.id);
        if (onScreen.current === battle.id && at >= 0) list.current?.scrollToOffset({ offset: (at + 1) * heightRef.current, animated: true });
      }, 2000);
    },
    [userId],
  );
  const battlesRef = useRef(battles);
  battlesRef.current = battles;
  const heightRef = useRef(height);
  heightRef.current = height;

  const onViewable = useRef(({ viewableItems }: { viewableItems: { item: unknown }[] }) => {
    const top = viewableItems[0]?.item as Battle | "end" | undefined;
    onScreen.current = top && top !== "end" ? top.id : null;
  }).current;

  const rows: (Battle | "end")[] = battles ? [...battles, "end"] : [];
  const start = params.b && battles ? Math.max(0, battles.findIndex((b) => b.id === params.b)) : 0;

  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8 }}>
        <T size={22} weight={800} accessibilityRole="header">
          Battles
        </T>
        <CityPicker />
      </View>
      <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}>
        {failed && !battles ? (
          <Failed onRetry={reload} />
        ) : !battles || !height ? (
          <Loading />
        ) : (
          <FlatList
            ref={list}
            data={rows}
            keyExtractor={(r) => (r === "end" ? "end" : r.id)}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
            initialScrollIndex={start}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={VIEWABILITY}
            renderItem={({ item, index }) =>
              item === "end" ? (
                <View style={{ height, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
                  <SwordsIcon size={32} color={colors.mustardInk} />
                  <T size={24} weight={700} style={{ textAlign: "center" }}>
                    {battles.length ? "That's every battle for now" : city ? `No battles in ${city} yet` : "No battles yet"}
                  </T>
                  <T color={colors.muted} style={{ textAlign: "center" }}>
                    New fights land regularly. In the meantime, the lists settle it the slow way.
                  </T>
                  <Btn label="See the top lists" icon={TrophyIcon} onPress={() => router.navigate("/")} />
                </View>
              ) : (
                <BattleCard battle={item} index={index} total={battles.length} height={height} saving={saving === item.id} streak={streak} onVote={vote} />
              )
            }
          />
        )}
      </View>
    </View>
  );
}
