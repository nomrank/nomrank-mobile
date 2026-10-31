import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { DownloadIcon, ExternalLinkIcon, LogOutIcon, MonitorIcon, MoonIcon, PencilIcon, SunIcon, type LucideIcon } from "lucide-react-native";
import { SHOW_DIETS, type ShowDiet } from "@/core/diet";
import { VISIBILITIES, type FeedDefault, type Visibility } from "@/core/profiles";
import { DeleteAccount } from "@/components/delete-account";
import { OptionList } from "@/components/forms";
import { useGo } from "@/components/social";
import { toast } from "@/components/toast";
import { Btn, Card, Header, Loading, Overline, T, useData } from "@/components/ui";
import { exportData, savePreferences, savePrivacy } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { SITE, supabase } from "@/lib/supabase";
import { brand, useTheme, type Choice } from "@/theme";

const THEMES: { value: Choice; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "Match my device", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];
const FEEDS: { value: FeedDefault; label: string; hint: string }[] = [
  { value: "top", label: "Top", hint: "Most agreed-with takes" },
  { value: "new", label: "New", hint: "Latest takes first" },
  { value: "following", label: "Following", hint: "Only people you follow" },
];
const PRIVACY = [
  { key: "saves_visibility", label: "Want to try list" },
  { key: "diary_visibility", label: "Diary" },
  { key: "followers_visibility", label: "Your followers" },
  { key: "following_visibility", label: "Who you follow" },
] as const;
type PrivacyKey = (typeof PRIVACY)[number]["key"];

function ThemeSwitch() {
  const { colors, choice, setChoice } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Colour theme" style={{ flexDirection: "row", borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 2 }}>
      {THEMES.map(({ value, label, Icon }) => (
        <Pressable key={value} onPress={() => setChoice(value)} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: choice === value }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: choice === value ? colors.foreground : "transparent" }}>
          <Icon size={17} color={choice === value ? colors.background : colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

function Preferences() {
  const { colors } = useTheme();
  const { prefs, reload } = useSession();
  const [show, setShow] = useState<ShowDiet>(prefs.show_diet);
  const [feed, setFeed] = useState<FeedDefault>(prefs.feed_default);
  const [busy, setBusy] = useState(false);
  const dirty = show !== prefs.show_diet || feed !== prefs.feed_default;
  async function save() {
    setBusy(true);
    const failed = await savePreferences(show, feed);
    if (!failed) await reload();
    setBusy(false);
    toast(failed ?? "Saved");
  }
  return (
    <>
      <T weight={600}>Show dishes</T>
      <T size={14} color={colors.muted}>
        Filters the feed, dish lists and search. Dish pages you open directly still show everything.
      </T>
      <OptionList options={SHOW_DIETS} value={show} onChange={setShow} />
      <T weight={600} style={{ marginTop: 8 }}>
        Home opens on
      </T>
      <OptionList options={FEEDS} value={feed} onChange={setFeed} />
      <Btn label="Save preferences" busy={busy} disabled={!dirty} onPress={save} />
    </>
  );
}

function Privacy({ userId, initial }: { userId: string; initial: Record<PrivacyKey, Visibility> }) {
  const { colors } = useTheme();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = PRIVACY.some(({ key }) => values[key] !== saved[key]);
  async function save() {
    setBusy(true);
    const failed = await savePrivacy(userId, values);
    setBusy(false);
    if (!failed) setSaved(values);
    toast(failed ?? "Saved");
  }
  return (
    <>
      {PRIVACY.map(({ key, label }) => (
        <View key={key} style={{ gap: 6 }}>
          <T size={14} weight={600}>
            {label}
          </T>
          <View accessibilityRole="radiogroup" accessibilityLabel={`Who can see ${label}`} style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.raised }}>
            {VISIBILITIES.map((v) => (
              <Pressable key={v.value} onPress={() => setValues({ ...values, [key]: v.value })} accessibilityRole="radio" accessibilityState={{ selected: values[key] === v.value }} style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: values[key] === v.value ? brand.mustard : "transparent" }}>
                <T size={13} weight={600} color={values[key] === v.value ? brand.studio : colors.muted}>
                  {v.label}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Btn label="Save privacy" busy={busy} disabled={!dirty} onPress={save} />
    </>
  );
}

function Link({ label, path }: { label: string; path: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => WebBrowser.openBrowserAsync(`${SITE}${path}`)} accessibilityRole="link" style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <T>{label}</T>
      <ExternalLinkIcon size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function Settings() {
  const { colors } = useTheme();
  const { userId, profile, session } = useSession();
  const go = useGo();
  const [exporting, setExporting] = useState(false);
  const { data: privacy } = useData(async () => {
    const { data, error } = await supabase.from("profiles").select("saves_visibility, diary_visibility, followers_visibility, following_visibility").eq("id", userId!).single<Record<PrivacyKey, Visibility>>();
    if (error) throw error;
    return data;
  }, [userId]);

  if (!profile || !userId) return null;
  const signOut = () => Alert.alert("Sign out?", undefined, [{ text: "Stay", style: "cancel" }, { text: "Sign out", onPress: () => supabase.auth.signOut() }]);
  async function download() {
    setExporting(true);
    const failed = await exportData(userId!);
    setExporting(false);
    if (failed) toast(failed);
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T weight={600}>Theme</T>
              <T size={14} color={colors.muted}>
                Light, dark, or match your device.
              </T>
            </View>
            <ThemeSwitch />
          </View>
        </Card>
        <Card style={{ gap: 10 }}>
          <Overline>Preferences</Overline>
          <Preferences />
        </Card>
        <Card style={{ gap: 12 }}>
          <Overline>Privacy</Overline>
          <T size={14} color={colors.muted}>
            What other people can see on your profile.
          </T>
          {privacy ? <Privacy key={JSON.stringify(privacy)} userId={userId} initial={privacy} /> : <Loading />}
        </Card>
        <Card style={{ gap: 10 }}>
          <Overline>Account</Overline>
          <T size={14} color={colors.muted}>
            Signed in as <T size={14} weight={600}>@{profile.username}</T>
            {session?.user.email ? `\n${session.user.email}` : ""}
          </T>
          <Btn label="Edit profile" icon={PencilIcon} variant="secondary" onPress={() => go("/settings/profile")} />
          <Btn label="Download my data" icon={DownloadIcon} variant="secondary" busy={exporting} onPress={download} />
          <Btn label="Sign out" icon={LogOutIcon} variant="secondary" onPress={signOut} />
        </Card>
        <Card style={{ gap: 2 }}>
          <Overline>About</Overline>
          <Link label="How Nomrank works" path="/about" />
          <Link label="Community guidelines" path="/about#guidelines" />
          <Link label="Terms" path="/terms" />
          <Link label="Privacy" path="/privacy" />
          <Link label="Credits" path="/credits" />
        </Card>
        <Card style={{ gap: 8, borderColor: colors.destructive }}>
          <Overline>Danger zone</Overline>
          <DeleteAccount userId={userId} username={profile.username} />
        </Card>
        <T size={12} color={colors.faint} style={{ textAlign: "center" }}>
          Nomrank {Constants.expoConfig?.version}
        </T>
      </ScrollView>
    </View>
  );
}
