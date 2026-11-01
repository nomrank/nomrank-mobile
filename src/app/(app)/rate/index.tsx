import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, CheckIcon, HouseIcon, ImagePlusIcon, PlusIcon, SearchIcon, SparklesIcon, TrophyIcon, XIcon } from "lucide-react-native";
import { filterMenus } from "@/core/diet";
import { dishKey } from "@/core/dishes";
import { avgMove, rankMove, type Move } from "@/core/rankings";
import { formatScore, photoUrl } from "@/core/ratings";
import { getDishById, getRestaurants, type DishDetail } from "@/core/restaurants";
import { DietMark, DishAvg, Score } from "@/components/marks";
import { ScoreMeter } from "@/components/score-meter";
import { toast } from "@/components/toast";
import { Btn, Card, Empty, Failed, Header, Input, Loading, Overline, Row, T, useData } from "@/components/ui";
import { pickFromLibrary, saveRating, takePhoto, type PhotoDraft, type Posted } from "@/lib/actions";
import { groupDishes } from "@/lib/home";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useGo } from "@/components/social";
import { useTheme } from "@/theme";

const MAX_TAKE = 500;

// Step one: find the dish. Your city's dishes show first; searching reaches every city, for what you ate on a trip.
function DishPicker() {
  const { colors } = useTheme();
  const { city, prefs } = useSession();
  const go = useGo();
  const [query, setQuery] = useState("");
  const q = dishKey(query);
  const { data, failed, reload } = useData(() => getRestaurants(supabase), []);
  const restaurants = useMemo(() => (data ? filterMenus(data, prefs.show_diet) : []), [data, prefs.show_diet]);
  const near = city ? restaurants.filter((r) => r.city === city) : restaurants;
  const spots = useMemo(
    () => groupDishes(q ? restaurants.map((r) => ({ ...r, dishes: r.dishes.filter((d) => dishKey(`${d.name} ${r.name}`).includes(q)) })) : near).sort((a, b) => a.name.localeCompare(b.name)).flatMap((g) => g.spots),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `near` follows restaurants and city
    [q, restaurants, city],
  );
  const popular = near.flatMap((r) => r.dishes.map((d) => ({ ...d, place: r }))).filter((d) => d.rating_count > 0).sort((a, b) => b.rating_count - a.rating_count).slice(0, 6);

  return (
    <View style={{ flex: 1 }}>
      <Header title="What did you eat?" />
      {failed && !data ? (
        <Failed onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 8 }} keyboardShouldPersistTaps="handled">
          <View>
            <Input value={query} onChangeText={setQuery} placeholder="Dish or place" accessibilityLabel="Find the dish you ate" autoFocus style={{ paddingLeft: 42 }} />
            <View pointerEvents="none" style={{ position: "absolute", left: 14, top: 15 }}>
              <SearchIcon size={18} color={colors.muted} />
            </View>
          </View>
          {!q && popular.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Overline>Most rated right now</Overline>
              {popular.map((d) => (
                <Row key={d.id} onPress={() => go(`/rate?dish=${d.id}`)} leading={<DietMark diet={d.diet} />} title={d.name} meta={<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><T size={14} color={colors.muted}>{d.place.name} ·</T><DishAvg avg={d.avg_score} count={d.rating_count} /></View>} />
              ))}
              <Overline style={{ marginTop: 18 }}>Every dish</Overline>
            </View>
          )}
          {spots.slice(0, 200).map((s) => (
            <Row key={s.id} onPress={() => go(`/rate?dish=${s.id}`)} leading={<DietMark diet={s.diet} />} title={<T weight={600} size={16}>{s.name}</T>} meta={`${s.place.name}, ${s.place.area}`} />
          ))}
          {!spots.length && <Empty>Not here yet? Open the place and add the dish first.</Empty>}
        </ScrollView>
      )}
    </View>
  );
}

function Delta({ move }: { move: Move }) {
  const { colors } = useTheme();
  const color = move.tone === "up" ? colors.mustardInk : move.tone === "down" ? colors.ketchupInk : colors.muted;
  const Icon = move.tone === "up" ? ArrowUpIcon : move.tone === "down" ? ArrowDownIcon : null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {Icon && <Icon size={14} color={color} strokeWidth={3} />}
      <T size={14} weight={600} color={color}>
        {move.text}
      </T>
    </View>
  );
}

const MIN_HOME = 3;

// After you post: what your score did to the dish. Each tile rises in a beat after the one before.
function PostedPanel({ posted: p }: { posted: Posted }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { before, after } = p;
  const rank = after && after.position !== null ? rankMove(before?.position ?? null, after.position) : null;
  const rating = avgMove(before?.avg ?? null, after?.avg ?? null);
  const home = after?.home ?? null;
  useEffect(() => toast(p.edited ? "Rating updated" : "Rating posted"), [p.edited]);
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Animated.View entering={FadeInDown.duration(360)} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Score score={p.score} size={84} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CheckIcon size={15} color={colors.mustardInk} strokeWidth={3} />
            <T size={14} weight={600} color={colors.mustardInk}>
              {p.edited ? "Updated" : "Posted"}
            </T>
          </View>
          <T size={24} weight={700} style={{ lineHeight: 29 }}>
            {p.dish}
          </T>
          {!!p.place && <T color={colors.muted}>{p.place}</T>}
        </View>
      </Animated.View>
      {after && (
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <SparklesIcon size={15} color={colors.mustardInk} />
              <T size={14} color={colors.muted}>
                Overall rating
              </T>
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              {before?.avg != null && before.avg !== after.avg && (
                <>
                  <T size={18} color={colors.faint}>
                    {before.avg.toFixed(1)}
                  </T>
                  <ArrowRightIcon size={15} color={colors.faint} />
                </>
              )}
              <T size={30} weight={700}>
                {after.avg === null ? "–" : formatScore(after.avg)}
              </T>
              <T size={14} color={colors.muted}>
                from {after.ratings} {after.ratings === 1 ? "rating" : "ratings"}
              </T>
            </View>
            {rating && <Delta move={rating} />}
          </Card>
        </Animated.View>
      )}
      {after?.list && (
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TrophyIcon size={15} color={colors.mustardInk} />
              <T size={14} color={colors.muted}>
                {after.list} in {after.city}
              </T>
            </View>
            {after.position !== null ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <T size={30} weight={700}>
                    #{after.position}
                  </T>
                  <T size={14} color={colors.muted}>
                    of {after.ranked} ranked
                  </T>
                </View>
                {rank && <Delta move={rank} />}
              </>
            ) : (
              <T size={14} color={colors.muted}>
                Not ranked yet. It joins the list once it has a rating.
              </T>
            )}
          </Card>
        </Animated.View>
      )}
      {home && (
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <HouseIcon size={15} color={colors.mustardInk} />
              <T size={14} color={colors.muted}>
                Tastes like home
              </T>
            </View>
            {home.count >= MIN_HOME && home.avg !== null ? (
              <T>
                <T size={24} weight={700}>
                  {formatScore(home.avg)}
                </T>
                <T color={colors.muted}>{` from ${home.count} ${home.demonym}`}</T>
              </T>
            ) : (
              <>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {Array.from({ length: MIN_HOME }, (_, i) => (
                    <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < home.count ? colors.mustardInk : colors.raised }} />
                  ))}
                </View>
                <T size={14} color={colors.muted}>
                  {p.atHome ? "Your rating counts here. " : ""}
                  {home.count} of {MIN_HOME} {home.demonym} so far. Its score shows once {MIN_HOME} have rated it.
                </T>
              </>
            )}
          </Card>
        </Animated.View>
      )}
      <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 8, marginTop: 4 }}>
        <Btn label="See it" icon={TrophyIcon} onPress={() => router.replace(p.href as Href)} />
        <Btn label="Rate another dish" icon={PlusIcon} variant="secondary" onPress={() => router.replace("/rate")} />
      </Animated.View>
    </ScrollView>
  );
}

function RateForm({ dish, existing }: { dish: DishDetail; existing: { score: number; take: string | null; photos: string[] } | null }) {
  const { colors } = useTheme();
  const { userId, profile } = useSession();
  const [score, setScore] = useState(existing?.score ?? 0);
  const [take, setTake] = useState(existing?.take ?? "");
  const [photos, setPhotos] = useState<PhotoDraft[]>((existing?.photos ?? []).map((path) => ({ key: path, path, uri: photoUrl(path) })));
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [posted, setPosted] = useState<Posted | null>(null);

  function add(assets: ImagePicker.ImagePickerAsset[]) {
    if (!assets.length) return;
    setPhotos((p) => [...p, ...assets.map((a) => ({ key: Crypto.randomUUID(), uri: a.uri, width: a.width, height: a.height }))].slice(0, 4));
    setChanged(true);
  }
  async function fromLibrary() {
    const r = await pickFromLibrary(4 - photos.length);
    if (!r.canceled) add(r.assets);
  }
  async function fromCamera() {
    const { granted, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      if (!canAskAgain) Alert.alert("Camera is off for Nomrank", "Turn it on in your phone's settings to take photos here.", [{ text: "Not now" }, { text: "Open settings", onPress: () => Linking.openSettings() }]);
      return;
    }
    const r = await takePhoto();
    if (!r.canceled) add(r.assets);
  }
  const addPhoto = () => Alert.alert("Add a photo", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Take a photo", onPress: fromCamera }, { text: "Choose from gallery", onPress: fromLibrary }]);

  async function submit() {
    if (!score) return setError("Pick a score from 0.5 to 10.");
    if (!userId) return;
    setError(undefined);
    setBusy(true);
    const r = await saveRating(userId, profile?.regions?.name, dish.id, { score, take }, changed ? photos : null);
    setBusy(false);
    if (r.error) setError(r.error);
    if (r.posted) setPosted(r.posted);
  }

  if (posted) return <PostedPanel posted={posted} />;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <T size={24} weight={700} accessibilityRole="header" style={{ lineHeight: 30 }}>
            How was the {dish.name}?
          </T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <DietMark diet={dish.diet} />
            <T color={colors.muted} style={{ flexShrink: 1 }}>
              at {dish.restaurant.name}, {dish.restaurant.area}
              {existing ? " · you've rated this before, saving updates it" : ""}
            </T>
          </View>
        </View>
        <ScoreMeter score={score} onChange={setScore} />
        <View style={{ gap: 6 }}>
          <T weight={600}>
            Hot take{" "}
            <T weight={500} color={colors.muted}>
              (optional)
            </T>
          </T>
          <Input value={take} onChangeText={(s) => setTake(s.slice(0, MAX_TAKE))} multiline placeholder="What did you think?" accessibilityLabel="Hot take" style={{ minHeight: 110, paddingVertical: 12, textAlignVertical: "top" }} />
          <T size={14} color={colors.muted} style={{ textAlign: "right" }}>
            {take.length}/{MAX_TAKE}
          </T>
        </View>
        <View style={{ gap: 10 }}>
          <T weight={600}>
            Photos{" "}
            <T weight={500} color={colors.muted}>
              (up to 4)
            </T>
          </T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {photos.map((p, i) => (
              <View key={p.key} style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden" }}>
                <Image source={p.uri} accessibilityLabel={`Photo ${i + 1}`} style={{ width: 80, height: 80 }} contentFit="cover" />
                <Pressable
                  onPress={() => {
                    setPhotos((all) => all.filter((x) => x.key !== p.key));
                    setChanged(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                  hitSlop={6}
                  style={{ position: "absolute", top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(23,17,28,0.85)", alignItems: "center", justifyContent: "center" }}
                >
                  <XIcon size={15} color="#fff4ea" />
                </Pressable>
              </View>
            ))}
            {photos.length < 4 && (
              <Pressable onPress={addPhoto} accessibilityRole="button" accessibilityLabel="Add photos" style={{ width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: colors.input, alignItems: "center", justifyContent: "center" }}>
                <ImagePlusIcon size={24} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>
        {error && (
          <T accessibilityRole="alert" color={colors.destructive}>
            {error}
          </T>
        )}
        <Btn label={busy ? "Posting" : take.trim() ? "Post it" : "Save score"} busy={busy} onPress={submit} />
        <T size={13} color={colors.faint} style={{ textAlign: "center" }}>
          Your score, take and photos are public. Rate what you actually ate, and keep it about the food.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RateDish({ id }: { id: string }) {
  const { userId } = useSession();
  const { data, failed, reload } = useData(async () => {
    const dish = await getDishById(supabase, id);
    if (!dish) return { dish: null };
    const { data: mine } = await supabase.from("ratings").select("score, take, photos:rating_photos(path, position)").eq("dish_id", dish.id).eq("user_id", userId!).maybeSingle<{ score: number; take: string | null; photos: { path: string; position: number }[] }>();
    return { dish, mine };
  }, [id, userId]);
  const [start, setStart] = useState<typeof data>(null); // the form keeps what you typed if the screen refreshes behind it
  useEffect(() => {
    if (data && !start) setStart(data);
  }, [data, start]);

  if (failed && !start) return <><Header /><Failed onRetry={reload} /></>;
  if (!start) return <><Header /><Loading /></>;
  if (!start.dish) return <><Header /><Empty title="Dish not found">It may have been removed.</Empty></>;
  const { mine } = start;
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <RateForm dish={start.dish} existing={mine ? { score: mine.score, take: mine.take, photos: [...mine.photos].sort((a, b) => a.position - b.position).map((p) => p.path) } : null} />
    </View>
  );
}

export default function Rate() {
  const { dish } = useLocalSearchParams<{ dish?: string }>();
  return dish ? <RateDish key={dish} id={dish} /> : <DishPicker />;
}
