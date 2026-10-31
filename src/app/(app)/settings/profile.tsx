import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { CameraIcon, Trash2Icon } from "lucide-react-native";
import { avatarPhotoUrl, avatarTraits, COLOURS, encodeAvatar, EYES, MOUTHS, SHAPES, type Traits } from "@/core/avatar";
import { DIETS, GENDERS, getPrivateDetails, getProfileByHandle } from "@/core/profiles";
import { DateOfBirth, RegionPicker } from "@/components/forms";
import { Avatar, DietMark } from "@/components/marks";
import { toast } from "@/components/toast";
import { Btn, Chip, Failed, Header, Input, Loading, T, TabRow, useData } from "@/components/ui";
import { getRegions, pickFromLibrary, updateProfile, type PhotoDraft } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import { brand, useTheme } from "@/theme";

const TRAITS = [
  { key: "shape", label: "Shape", names: SHAPES as readonly string[] },
  { key: "colour", label: "Colour", names: COLOURS.map((c) => c.name) as readonly string[] },
  { key: "eyes", label: "Eyes", names: EYES as readonly string[] },
  { key: "mouth", label: "Mouth", names: MOUTHS as readonly string[] },
] as const;

type Initial = Awaited<ReturnType<typeof load>>;

async function load(userId: string, handle: string) {
  const [me, secret, regions, home] = await Promise.all([
    getProfileByHandle(supabase, handle),
    getPrivateDetails(supabase, userId),
    getRegions(),
    supabase.from("profiles").select("home_region, home_region_changed_at").eq("id", userId).single<{ home_region: string; home_region_changed_at: string | null }>(),
  ]);
  if (!me || home.error) throw new Error("no profile");
  const changed = home.data.home_region_changed_at;
  const unlocks = changed ? new Date(new Date(changed).getTime() + 30 * 86_400_000) : null;
  const lockedUntil = unlocks && unlocks > new Date() ? unlocks.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" }) : null;
  return { me, secret, regions, home: home.data.home_region, lockedUntil };
}

function Form({ initial, userId, handle }: { initial: Initial; userId: string; handle: string }) {
  const { colors } = useTheme();
  const { reload } = useSession();
  const router = useRouter();
  const { me, secret, regions, home, lockedUntil } = initial;
  const [name, setName] = useState(me.display_name ?? "");
  const [bio, setBio] = useState(me.bio ?? "");
  const [instagram, setInstagram] = useState(me.instagram ?? "");
  const [dob, setDob] = useState(secret?.date_of_birth ?? "");
  const [gender, setGender] = useState<string>(secret?.gender ?? "");
  const [diet, setDiet] = useState<string>(me.diet ?? "");
  const [region, setRegion] = useState(home);
  const [traits, setTraits] = useState<Traits>(() => avatarTraits(me.avatar, handle));
  const [tab, setTab] = useState<(typeof TRAITS)[number]["key"]>("shape");
  const [photo, setPhoto] = useState<PhotoDraft | null>(me.avatar_path ? { key: me.avatar_path, path: me.avatar_path, uri: avatarPhotoUrl(me.avatar_path) } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = encodeAvatar(traits);
  const trait = TRAITS.find((t) => t.key === tab)!;

  async function pick() {
    const r = await pickFromLibrary(1);
    if (r.canceled) return;
    const a = r.assets[0];
    setPhoto({ key: Crypto.randomUUID(), uri: a.uri, width: a.width, height: a.height });
  }
  async function save() {
    setBusy(true);
    const failed = await updateProfile(userId, { display_name: name, bio, avatar: code, diet, instagram, date_of_birth: dob, gender, home_region: region }, photo, me.avatar_path);
    if (failed) {
      setBusy(false);
      return setError(failed);
    }
    await reload();
    toast("Profile saved");
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 10 }}>
          {photo ? <Image source={photo.uri} style={{ width: 96, height: 96, borderRadius: 48 }} contentFit="cover" accessibilityLabel="Your profile photo" /> : <Avatar handle={handle} code={code} size={96} />}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label={photo ? "Change photo" : "Add a photo"} icon={CameraIcon} variant="secondary" onPress={pick} style={{ minHeight: 40 }} />
            {photo && <Btn label="Remove" icon={Trash2Icon} variant="ghost" onPress={() => setPhoto(null)} style={{ minHeight: 40 }} />}
          </View>
        </View>
        {!photo && (
          <>
            <TabRow tabs={TRAITS.map((t) => [t.key, t.label] as const)} value={tab} onChange={setTab} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {trait.names.map((n, i) => {
                const on = traits[tab] === i;
                const preview = encodeAvatar({ ...traits, [tab]: i });
                return (
                  <Pressable key={n} onPress={() => setTraits({ ...traits, [tab]: i })} accessibilityRole="radio" accessibilityLabel={`${trait.label}: ${n}`} accessibilityState={{ selected: on }} style={{ width: 60, height: 60, borderRadius: 12, borderWidth: 2, borderColor: on ? brand.mustard : colors.hairline, alignItems: "center", justifyContent: "center" }}>
                    <Avatar handle={handle} code={preview} size={44} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        <T weight={600}>Name</T>
        <Input value={name} onChangeText={setName} maxLength={40} placeholder="Your name" accessibilityLabel="Name" />
        <T weight={600}>Bio</T>
        <Input value={bio} onChangeText={setBio} maxLength={160} multiline placeholder="A line about your taste" accessibilityLabel="Bio" style={{ minHeight: 76, paddingVertical: 10, textAlignVertical: "top" }} />
        <T size={13} color={colors.faint} style={{ textAlign: "right" }}>
          {bio.length}/160
        </T>
        <T weight={600}>Instagram</T>
        <Input value={instagram} onChangeText={setInstagram} autoCapitalize="none" autoCorrect={false} placeholder="handle" accessibilityLabel="Instagram handle" />
        <T weight={600}>What do you eat?</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DIETS.map((d) => (
            <Chip key={d.value} label={d.label} on={diet === d.value} onPress={() => setDiet(diet === d.value ? "" : d.value)} icon={<DietMark diet={d.mark} size={12} />} />
          ))}
        </View>
        <T weight={600}>Birthday (private)</T>
        <DateOfBirth value={dob} onChange={setDob} />
        <T weight={600}>Gender (private)</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {GENDERS.map((g) => (
            <Chip key={g.value} label={g.label} on={gender === g.value} onPress={() => setGender(gender === g.value ? "" : g.value)} />
          ))}
        </View>
        <T weight={600}>Home region</T>
        {lockedUntil ? (
          <T size={14} color={colors.muted}>
            {regions.find((r) => r.slug === region)?.name}. You can change it again on {lockedUntil}.
          </T>
        ) : (
          <RegionPicker regions={regions} value={region} onChange={setRegion} />
        )}
        {error && (
          <T accessibilityRole="alert" color={colors.destructive}>
            {error}
          </T>
        )}
        <Btn label="Save" busy={busy} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditProfile() {
  const { userId, profile } = useSession();
  const { data, failed, reload } = useData(() => load(userId!, profile!.username), [userId, profile?.username]);
  const [start, setStart] = useState<Initial | null>(null); // keep what's typed if the screen refreshes behind the form
  useEffect(() => {
    if (data && !start) setStart(data);
  }, [data, start]);
  if (!userId || !profile) return null;
  return (
    <View style={{ flex: 1 }}>
      <Header title="Edit profile" />
      {failed && !start ? <Failed onRetry={reload} /> : !start ? <Loading /> : <Form initial={start} userId={userId} handle={profile.username} />}
    </View>
  );
}
