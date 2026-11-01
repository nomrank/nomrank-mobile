import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { FlatList, Pressable, ScrollView, Share, useWindowDimensions, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { BookmarkIcon, CheckIcon, FlagIcon, MapPinIcon, MessageCircleIcon, Share2Icon, UserPlusIcon, LinkIcon, type LucideIcon } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { CITIES, type City } from "@/core/cities";
import { dishHref } from "@/core/dishes";
import { formatScore, photoUrl, type Review, type Vote } from "@/core/ratings";
import { timeAgo } from "@/core/time";
import { REPORT_REASONS, type ReportTarget } from "@/core/validation";
import { applyVote, leadingSide, type VoteState } from "@/core/votes";
import { castVote, sendReport, setFollow, setSaved } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { follow, markFollowing, useFollows } from "@/lib/following";
import { once } from "@/lib/once";
import { SHARE_SITE } from "@/lib/supabase";
import { brand, useTheme } from "@/theme";
import { AgreeIcon, Avatar, DietMark, DisagreeIcon, DishAvg, Score, Verdict } from "./marks";
import { toast } from "./toast";
import { PhotoViewer } from "./photo-viewer";
import { PinchZoom } from "./pinch-zoom";
import { Btn, Input, Press, Sheet, T } from "./ui";

export const useGo = () => {
  const router = useRouter();
  return (href: string) => {
    if (once(`go:${href}`)) router.push(href as Href);
  };
};

const SIDES = [
  { kind: "facts" as const, label: "Agree", Icon: AgreeIcon, fill: brand.mustard },
  { kind: "cap" as const, label: "Disagree", Icon: DisagreeIcon, fill: brand.ketchup },
];

// Agree | Disagree as one joined control, and a quiet line for the winning side. On your own take it only shows the
// counts. The tap answers at once with a small pop and a rolling count; the server catches up.
export function useVote(ratingId: string, facts: number, cap: number, mine: Vote | undefined, mode: "vote" | "own") {
  const [state, setState] = useState<VoteState>({ facts, cap, mine });
  const pop = useSharedValue(1);
  useEffect(() => setState((s) => (s.mine === mine ? s : { ...s, mine })), [mine]); // your votes arrive after the feed does
  function press(kind: Vote) {
    if (mode === "own" || !once(`vote:${ratingId}`, 400)) return;
    const next = applyVote(state, kind);
    setState(next);
    if (next.mine) {
      Haptics.selectionAsync();
      pop.value = withSequence(withTiming(1.08, { duration: 90 }), withTiming(1, { duration: 140 }));
    }
    castVote(ratingId, next.mine ?? null);
  }
  return { state, press, pop, mode };
}

export function VoteButtons({ vote: { state, press, pop, mode } }: { vote: ReturnType<typeof useVote> }) {
  const { colors } = useTheme();
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const lead = leadingSide(state.facts, state.cap);

  return (
    <View style={{ gap: 6, alignItems: "flex-start" }}>
      <Animated.View accessibilityRole="none" style={[{ flexDirection: "row", height: 38, borderRadius: 999, overflow: "hidden", borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised }, popStyle]}>
        {SIDES.map(({ kind, label, Icon, fill }, i) => {
          const on = state.mine === kind;
          const count = kind === "facts" ? state.facts : state.cap;
          const ink = on ? brand.studio : colors.muted;
          return (
            <Pressable
              key={kind}
              onPress={() => press(kind)}
              disabled={mode === "own"}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${count}`}
              accessibilityState={{ selected: on }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minWidth: 64, justifyContent: "center", backgroundColor: on ? fill : "transparent", borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.hairline }}
            >
              <Icon color={ink} />
              <View style={{ overflow: "hidden" }}>
                <Animated.View key={count} entering={FadeInDown.duration(170)}>
                  <T size={13} weight={600} color={on ? brand.studio : colors.faint}>
                    {count}
                  </T>
                </Animated.View>
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
      {lead && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline, overflow: "hidden" }}>
            <View style={{ width: `${lead.percent}%`, height: 4, backgroundColor: lead.side === "agree" ? brand.mustard : brand.ketchup }} />
          </View>
          <T size={12} color={colors.faint}>
            {lead.percent}% {lead.side}
          </T>
        </View>
      )}
    </View>
  );
}

// Beside a name in the feed: a quiet Follow, which turns into a small Following badge. Unfollowing stays on their profile, so a
// stray tap in the feed can't undo it.
function FollowChip({ id, handle }: { id: string; handle: string }) {
  const { colors } = useTheme();
  const { userId } = useSession();
  const following = useFollows(id);
  if (!userId || id === userId) return null;
  if (following)
    return (
      <Animated.View entering={FadeIn.duration(160)} accessibilityLabel={`Following @${handle}`} style={{ height: 20, paddingHorizontal: 7, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.raised }}>
        <CheckIcon size={11} color={colors.mustardInk} strokeWidth={3} />
        <T size={11} weight={600} color={colors.muted}>
          Following
        </T>
      </Animated.View>
    );
  function press() {
    if (!once(`follow:${id}`)) return;
    Haptics.selectionAsync();
    follow(id).catch(() => toast("Couldn't do that just now. Try again."));
  }
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={`Follow @${handle}`} hitSlop={12}>
      <T size={13} weight={700} color={colors.mustardInk}>
        Follow
      </T>
    </Pressable>
  );
}

export function PersonLink({ handle, avatar, photo, size = 24 }: { handle: string; avatar: string | null; photo: string | null; size?: number }) {
  const { colors } = useTheme();
  const go = useGo();
  return (
    <Pressable onPress={() => go(`/u/${handle}`)} accessibilityRole="link" hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
      <Avatar handle={handle} code={avatar} photo={photo} size={size} />
      <T size={13} weight={600} color={colors.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
        @{handle}
      </T>
    </Pressable>
  );
}

// Every photo shows at the same 4:5, cropped to fill; full screen shows the whole picture.
const PHOTO_RATIO = 5 / 4;

// One photo in the feed: one tap opens it full screen, two tap agree, two fingers pinch it.
function FeedPhoto({ path, label, width, height, onTap, onPinch }: { path: string; label: string; width: number; height: number; onTap: () => void; onPinch: (on: boolean) => void }) {
  const uri = photoUrl(path);
  return (
    <PinchZoom uri={uri} onActive={onPinch}>
      <Pressable onPress={onTap} accessibilityRole="imagebutton" accessibilityLabel={label}>
        <Image source={uri} style={{ width, height }} contentFit="cover" transition={150} recyclingKey={path} />
      </Pressable>
    </PinchZoom>
  );
}

// Swipe through a take's photos, with dots when there are several.
export function PhotoCarousel({ photos, dish, onAgree, width, rounded }: { photos: { path: string }[]; dish: string; onAgree?: () => void; width: number; rounded?: boolean }) {
  const { colors } = useTheme();
  const [at, setAt] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const [pinching, setPinching] = useState(false);
  const height = width * PHOTO_RATIO;
  const tap = useTap(onAgree);
  const photo = (path: string, index: number) => <FeedPhoto path={path} label={`Photo ${index + 1} of ${dish}. Opens full screen`} width={width} height={height} onTap={() => tap(() => setViewing(index))} onPinch={setPinching} />;
  return (
    <View style={{ width, height, borderRadius: rounded ? 12 : 0, overflow: "hidden", backgroundColor: colors.raised }}>
      {photos.length === 1 ? (
        photo(photos[0].path, 0)
      ) : (
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          scrollEnabled={!pinching}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.path}
          onMomentumScrollEnd={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index }) => photo(item.path, index)}
        />
      )}
      {photos.length > 1 && (
        <View pointerEvents="none" style={{ position: "absolute", bottom: 8, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 4 }}>
          {photos.map((p, i) => (
            <View key={p.path} style={{ width: 16, height: 5, borderRadius: 3, backgroundColor: "#fff4ea", opacity: i === at ? 1 : 0.45 }} />
          ))}
        </View>
      )}
      {viewing !== null && <PhotoViewer paths={photos.map((p) => p.path)} start={viewing} onClose={() => setViewing(null)} />}
    </View>
  );
}

// A tap that waits a beat to see whether a second one follows. Two taps run `double`; one runs what you hand it. With no `double`
// (your own take) the single tap runs at once.
function useTap(double?: () => void) {
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (single?: () => void) => {
    if (!double) return single?.();
    const now = Date.now();
    clearTimeout(timer.current);
    if (now - last.current < 260) {
      last.current = 0;
      return double();
    }
    last.current = now;
    timer.current = setTimeout(() => single?.(), 260);
  };
}

// The big Agree that pops over a take when you double-tap it.
function Burst({ k }: { k: number }) {
  const s = useSharedValue(0);
  useEffect(() => {
    if (k) s.value = withSequence(withTiming(1, { duration: 160 }), withDelay(320, withTiming(0, { duration: 200 })));
  }, [k, s]);
  const style = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.6 + 0.4 * s.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: "32%", left: 0, right: 0, alignItems: "center" }, style]}>
      <AgreeIcon size={72} color={brand.mustard} />
    </Animated.View>
  );
}

type CardProps = { review: Review; vote?: Vote; showDish?: boolean; full?: boolean; inMeal?: boolean; saved?: boolean };

// One take. Feeds lead with the dish and sign the take underneath; on a dish page the author leads.
export const ReviewCard = memo(function ReviewCard({ review: r, vote, showDish = true, full, inMeal, saved }: CardProps) {
  const { colors } = useTheme();
  const { profile } = useSession();
  const { width } = useWindowDimensions();
  const go = useGo();
  const viewer = profile?.username ?? null;
  const mode = viewer === r.author.username ? "own" : "vote";
  const place = r.dish.restaurant;
  const byline = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <PersonLink handle={r.author.username} avatar={r.author.avatar} photo={r.author.avatar_path} />
      <FollowChip id={r.author.id} handle={r.author.username} />
      <T size={13} color={colors.faint}>
        {timeAgo(r.created_at)}
      </T>
    </View>
  );
  const open = full ? undefined : () => go(`/review/${r.id}`);
  const voting = useVote(r.id, r.facts_count, r.cap_count, vote, mode);
  const [burst, setBurst] = useState(0);
  const agree =
    mode === "own"
      ? undefined
      : () => {
          if (voting.state.mine !== "facts") voting.press("facts");
          else Haptics.selectionAsync();
          setBurst((n) => n + 1);
        };
  const tap = useTap(agree);
  return (
    <Pressable onPress={() => tap(open)} accessible={!full} style={{ paddingVertical: 16, gap: 10 }}>
      {!showDish && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {byline}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Verdict score={r.score} />
            <Score score={r.score} size={48} />
          </View>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          {showDish && (
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                <DietMark diet={r.dish.diet} />
                <Pressable onPress={() => go(dishHref(place.slug, r.dish.name))} accessibilityRole="link" hitSlop={6} style={{ flexShrink: 1 }}>
                  <T size={17} weight={700}>
                    {r.dish.name}
                  </T>
                </Pressable>
                <Verdict score={r.score} />
              </View>
              {!inMeal && (
                <Pressable onPress={() => go(`/r/${place.slug}`)} accessibilityRole="link" hitSlop={6}>
                  <T size={14} color={colors.faint}>
                    from{" "}
                    <T size={14} weight={500} color={colors.muted}>
                      {place.name}
                    </T>
                    {` · ${place.city}`}
                  </T>
                </Pressable>
              )}
              {full && <DishAvg avg={r.dish.avg_score} count={r.dish.rating_count} />}
            </View>
          )}
          {!!r.take && (
            <T size={15} numberOfLines={full ? undefined : 6} style={{ lineHeight: 23 }}>
              {r.take}
            </T>
          )}
          {showDish && !inMeal && byline}
        </View>
        {showDish && <Score score={r.score} size={full ? 76 : inMeal ? 54 : 64} />}
      </View>
      {r.photos.length > 0 && (
        <View style={inMeal ? undefined : { marginHorizontal: -20 }}>
          <PhotoCarousel photos={r.photos} dish={r.dish.name} onAgree={agree} width={inMeal ? width - 71 : width} rounded={inMeal} />
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <VoteButtons vote={voting} />
        {!full && (
          <Pressable onPress={() => go(`/review/${r.id}`)} accessibilityRole="button" accessibilityLabel={`${r.comments_count} ${r.comments_count === 1 ? "comment" : "comments"}`} style={{ height: 38, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 }}>
            <MessageCircleIcon size={18} color={colors.muted} />
            <T size={14} color={colors.muted}>
              {r.comments_count}
            </T>
          </Pressable>
        )}
        <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center" }}>
          <ShareTake review={r} compact={!full} size={18} />
          {saved !== undefined && <SaveButton dishId={r.dish.id} saved={saved} compact={!full} />}
        </View>
      </View>
      <Burst k={burst} />
    </Pressable>
  );
});

// Several takes from one person at one place, close together: one meal, strung along a line like courses.
export function MealCard({ reviews, votes }: { reviews: Review[]; votes: Record<string, Vote> }) {
  const { colors } = useTheme();
  const go = useGo();
  const [first] = reviews;
  const { author, dish } = first;
  const latest = reviews.reduce((a, b) => (b.created_at > a ? b.created_at : a), first.created_at);
  return (
    <View style={{ paddingVertical: 16 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Pressable onPress={() => go(`/u/${author.username}`)} accessibilityLabel={`@${author.username}`}>
          <Avatar handle={author.username} code={author.avatar} photo={author.avatar_path} size={28} />
        </Pressable>
        <T size={14} style={{ flex: 1 }}>
          <T size={14} weight={600} onPress={() => go(`/u/${author.username}`)}>
            @{author.username}
          </T>
          <T size={14} color={colors.muted}>{` had ${reviews.length} dishes at `}</T>
          <T size={14} weight={600} onPress={() => go(`/r/${dish.restaurant.slug}`)}>
            {dish.restaurant.name}
          </T>
          <T size={14} color={colors.muted}>{` in ${dish.restaurant.city}`}</T>
        </T>
        <FollowChip id={author.id} handle={author.username} />
        <T size={13} color={colors.faint}>
          {timeAgo(latest)}
        </T>
      </View>
      <View style={{ marginLeft: 14, marginTop: 4, paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: colors.hairline }}>
        {reviews.map((r, i) => (
          <View key={r.id} style={i ? { borderTopWidth: 1, borderTopColor: colors.hairline } : undefined}>
            <ReviewCard review={r} vote={votes[r.id]} inMeal />
          </View>
        ))}
      </View>
    </View>
  );
}

// "Want to try": a bookmark on feed cards, spelled out on a dish page.
export function SaveButton({ dishId, saved: initial, compact }: { dishId: string; saved: boolean; compact?: boolean }) {
  const { colors } = useTheme();
  const [saved, set] = useState(initial);
  function press() {
    if (!once(`save:${dishId}`, 400)) return;
    set(!saved);
    Haptics.selectionAsync();
    setSaved(dishId, !saved).catch(() => {
      set(saved);
      toast("Couldn't save that. Try again.");
    });
  }
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityLabel="Want to try" accessibilityState={{ selected: saved }} style={{ minHeight: compact ? 38 : 48, minWidth: 44, paddingHorizontal: compact ? 8 : 14, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: compact ? 0 : 1, borderColor: colors.hairline }}>
      <BookmarkIcon size={18} color={saved ? colors.mustardInk : colors.muted} fill={saved ? brand.mustard : "transparent"} />
      {!compact && (
        <T size={14} weight={600}>
          {saved ? "Saved" : "Want to try"}
        </T>
      )}
    </Pressable>
  );
}

export function FollowButton({ followeeId, handle, following: initial, onChange }: { followeeId: string; handle: string; following: boolean; onChange?: (f: boolean) => void }) {
  const [following, set] = useState(initial);
  function press() {
    set(!following);
    onChange?.(!following);
    markFollowing(followeeId, !following);
    setFollow(followeeId, !following).catch(() => {
      set(following);
      markFollowing(followeeId, following);
      toast("Couldn't do that just now. Try again.");
    });
  }
  return <Btn label={following ? "Following" : "Follow"} icon={following ? CheckIcon : UserPlusIcon} variant={following ? "secondary" : "primary"} onPress={press} accessibilityLabel={following ? `Unfollow @${handle}` : `Follow @${handle}`} style={{ minHeight: 40, paddingHorizontal: 14 }} />;
}

// The share sheet, the way X does it: a preview of what's being shared, then Copy link and Share via. The link carries the
// website's preview card (the dish photo, the score), so it looks right wherever it lands.
export function ShareSheet({ open, onClose, url, preview }: { open: boolean; onClose: () => void; url: string; preview: ReactNode }) {
  const { colors } = useTheme();
  async function copy() {
    await Clipboard.setStringAsync(url);
    Haptics.selectionAsync();
    onClose();
    toast("Link copied");
  }
  async function via() {
    onClose();
    // The link alone: Instagram, WhatsApp and the rest turn a bare link into the website's preview card, and fall back to plain text when words sit beside it.
    await Share.share({ message: url }).catch(() => {});
  }
  const action = (Icon: LucideIcon, label: string, run: () => void) => (
    <Press onPress={run} accessibilityRole="button" accessibilityLabel={label} to={0.985} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={colors.foreground} />
      </View>
      <T weight={600}>{label}</T>
    </Press>
  );
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.background, padding: 14, marginBottom: 8 }}>{preview}</View>
      {action(LinkIcon, "Copy link", copy)}
      {action(Share2Icon, "Share via…", via)}
      <T size={12} color={colors.faint} numberOfLines={1} ellipsizeMode="middle" style={{ textAlign: "center", marginTop: 6 }}>
        {url.replace(/^https?:\/\//, "")}
      </T>
    </Sheet>
  );
}

// The share icon. Tapping it opens the sheet above. `preview` is what the sheet shows; without one it shows the title.
export function ShareButton({ path, title, preview, size = 20, compact }: { path: string; title: string; preview?: ReactNode; size?: number; compact?: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Share" hitSlop={compact ? 6 : 0} style={{ width: compact ? 38 : 44, height: compact ? 38 : 44, alignItems: "center", justifyContent: "center" }}>
        <Share2Icon size={size} color={compact ? colors.muted : colors.foreground} />
      </Pressable>
      {open && (
        <ShareSheet
          open
          onClose={() => setOpen(false)}
          url={`${SHARE_SITE}${path}`}
          preview={
            preview ?? (
              <T weight={600} style={{ lineHeight: 21 }}>
                {title}
              </T>
            )
          }
        />
      )}
    </>
  );
}

// A take as the sheet shows it: who said it, what, and the dish with its score.
function TakePreview({ r }: { r: Review }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Avatar handle={r.author.username} code={r.author.avatar} photo={r.author.avatar_path} size={28} />
        <T size={14} weight={600}>
          @{r.author.username}
        </T>
        <T size={13} color={colors.faint}>
          {timeAgo(r.created_at)}
        </T>
      </View>
      {!!r.take && (
        <T numberOfLines={4} style={{ lineHeight: 22 }}>
          {r.take}
        </T>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <Score score={r.score} size={44} />
        <View style={{ flex: 1 }}>
          <T size={14} weight={700} numberOfLines={1}>
            {r.dish.name}
          </T>
          <T size={13} color={colors.muted} numberOfLines={1}>
            {r.dish.restaurant.name} · {r.dish.restaurant.city}
          </T>
        </View>
      </View>
    </View>
  );
}

// Share a take: the icon on every card and on the take's own page.
export function ShareTake({ review: r, compact, size }: { review: Review; compact?: boolean; size?: number }) {
  const snippet = r.take && r.take.length > 90 ? `${r.take.slice(0, 88).trimEnd()}…` : r.take;
  return (
    <ShareButton
      path={`/review/${r.id}`}
      title={`@${r.author.username} gave ${r.dish.name} at ${r.dish.restaurant.name} a ${formatScore(r.score)}/10${snippet ? `: “${snippet}”` : ""}`}
      preview={<TakePreview r={r} />}
      compact={compact}
      size={size}
    />
  );
}

// Report a take, comment, dish or list: the reasons differ by what's being reported, as in the database check.
export function ReportButton({ targetType, targetId, what }: { targetType: ReportTarget; targetId: string; what: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send() {
    setBusy(true);
    const failed = await sendReport({ target_type: targetType, target_id: targetId, reason, note });
    setBusy(false);
    if (failed) return setError(failed);
    setOpen(false);
    setReason("");
    setNote("");
    toast("Thanks. We'll take a look.");
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Report ${what}`} style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 6 }}>
        <FlagIcon size={14} color={colors.muted} />
        <T size={13} weight={500} color={colors.muted}>
          Report
        </T>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <T size={18} weight={700}>
            Report {what}
          </T>
          <View style={{ marginTop: 12, gap: 6 }}>
            {REPORT_REASONS[targetType].map((r) => (
              <Pressable key={r.value} onPress={() => setReason(r.value)} accessibilityRole="radio" accessibilityState={{ selected: reason === r.value }} style={{ minHeight: 48, justifyContent: "center", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: reason === r.value ? brand.mustard : colors.hairline }}>
                <T size={14} weight={600}>
                  {r.label}
                </T>
                {!!r.hint && (
                  <T size={13} color={colors.muted}>
                    {r.hint}
                  </T>
                )}
              </Pressable>
            ))}
          </View>
          <Input value={note} onChangeText={setNote} maxLength={300} placeholder="Anything else? (optional)" style={{ marginTop: 12 }} />
          {error && (
            <T size={14} color={colors.destructive} style={{ marginTop: 8 }}>
              {error}
            </T>
          )}
          <Btn label="Send report" busy={busy} disabled={!reason} onPress={send} style={{ marginTop: 12 }} />
        </ScrollView>
      </Sheet>
    </>
  );
}

// The city chip: where you eat now. Rankings, dishes and places follow it; the feed stays all-India. It asks once.
export function CityPicker() {
  const { colors } = useTheme();
  const { city, setCity, askCity, skipCity } = useSession();
  const [open, setOpen] = useState(false);
  const shown = open || askCity;
  const close = () => {
    if (askCity) skipCity();
    setOpen(false);
  };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={city ? `City: ${city}. Change` : "Pick a city"} style={{ minHeight: 38, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <MapPinIcon size={14} color={colors.mustardInk} />
        <T size={13} weight={600}>
          {city ?? "Pick a city"}
        </T>
      </Pressable>
      <Sheet open={shown} onClose={close}>
        <T size={20} weight={700}>
          Where are you eating?
        </T>
        <T size={14} color={colors.muted} style={{ marginTop: 4 }}>
          Rankings, dishes and places follow your city. The feed stays all India.
        </T>
        <View style={{ marginTop: 14, gap: 8 }}>
          {CITIES.map((c: City) => (
            <Btn
              key={c}
              label={c}
              variant="secondary"
              onPress={() => {
                setCity(c);
                if (askCity) skipCity();
                setOpen(false);
              }}
            />
          ))}
          <Btn label="Not now" variant="ghost" onPress={close} />
        </View>
      </Sheet>
    </>
  );
}
