import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLists } from "@/core/rankings";
import { DIETS, GENDERS } from "@/core/profiles";
import { isAtLeast13, usernameSchema } from "@/core/validation";
import { DateOfBirth } from "@/components/forms";
import { DietMark } from "@/components/marks";
import { RegionPicker } from "@/components/forms";
import { Btn, Chip, Input, Loading, T, useData } from "@/components/ui";
import { createProfile, getRegions } from "@/lib/actions";
import { FIRST_LIST_KEY } from "@/lib/home";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme";

// Four steps: who you are, about you, where home is, what you want to eat first. All of it saves at the end.
export default function Onboarding() {
  const { colors } = useTheme();
  const { userId, session, reload } = useSession();
  const meta = session?.user.user_metadata; // Google hands over the person's name
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [name, setName] = useState(String(meta?.full_name ?? meta?.name ?? "").trim().slice(0, 40));
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [diet, setDiet] = useState("");
  const [region, setRegion] = useState("");
  const [foods, setFoods] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { data } = useData(async () => {
    const [regions, lists] = await Promise.all([getRegions(), getLists(supabase)]);
    return { regions, lists };
  }, []);

  function next() {
    setError(undefined);
    if (step === 1) {
      const parsed = usernameSchema.safeParse(username);
      if (!parsed.success) return setError(parsed.error.issues[0].message);
    }
    if (step === 2) {
      if (!dob) return setError("Add your date of birth.");
      if (!isAtLeast13(dob)) return setError("You need to be at least 13 to use Nomrank.");
    }
    if (step === 3 && !region) return setError("Pick where home is.");
    if (step < 4) return setStep(step + 1);
    finish();
  }

  async function finish() {
    if (!userId) return;
    setBusy(true);
    const r = await createProfile(userId, { username, display_name: name, date_of_birth: dob, gender, diet, region });
    if (r.error) {
      setBusy(false);
      setError(r.error.message);
      if (r.error.field === "username") setStep(1);
      if (r.error.field === "about") setStep(2);
      if (r.error.field === "region") setStep(3);
      return;
    }
    if (foods[0]) await AsyncStorage.setItem(FIRST_LIST_KEY, foods[0]); // Home opens its ranking once
    await reload();
  }

  if (!data) return <Loading />;
  const toggle = (f: string) => setFoods((all) => (all.includes(f) ? all.filter((x) => x !== f) : all.length < 5 ? [...all, f] : all));

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 14, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <T size={12} weight={600} color={colors.faint} style={{ letterSpacing: 1, textTransform: "uppercase" }}>
            Step {step} of 4
          </T>
          {step === 1 && (
            <>
              <T size={26} weight={700} accessibilityRole="header">
                Pick your handle
              </T>
              <T color={colors.muted}>It&apos;s how you show up on every dish you rate.</T>
              <Input value={username} onChangeText={setUsername} placeholder="handle" autoCapitalize="none" autoCorrect={false} maxLength={21} accessibilityLabel="Handle" />
              <Input value={name} onChangeText={setName} placeholder="Your name (optional)" maxLength={40} accessibilityLabel="Your name" />
            </>
          )}
          {step === 2 && (
            <>
              <T size={26} weight={700} accessibilityRole="header">
                A bit about you
              </T>
              <T color={colors.muted}>Your birthday and gender stay private. You need to be 13 or older.</T>
              <DateOfBirth value={dob} onChange={setDob} />
              <T weight={600}>Gender (optional)</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {GENDERS.map((g) => (
                  <Chip key={g.value} label={g.label} on={gender === g.value} onPress={() => setGender(gender === g.value ? "" : g.value)} />
                ))}
              </View>
              <T weight={600}>What do you eat? (optional)</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {DIETS.map((d) => (
                  <Chip key={d.value} label={d.label} on={diet === d.value} onPress={() => setDiet(diet === d.value ? "" : d.value)} icon={<DietMark diet={d.mark} size={12} />} />
                ))}
              </View>
            </>
          )}
          {step === 3 && (
            <>
              <T size={26} weight={700} accessibilityRole="header">
                Where&apos;s home?
              </T>
              <T color={colors.muted}>Where you grew up eating. It powers Tastes like home.</T>
              <RegionPicker regions={data.regions} value={region} onChange={setRegion} />
            </>
          )}
          {step === 4 && (
            <>
              <T size={26} weight={700} accessibilityRole="header">
                What are you hungry for?
              </T>
              <T color={colors.muted}>Pick a few foods. We&apos;ll open with the first one&apos;s ranking.</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {data.lists.map((l) => (
                  <Chip key={l.id} label={l.name} on={foods.includes(l.name)} onPress={() => toggle(l.name)} />
                ))}
              </View>
            </>
          )}
          {error && (
            <T accessibilityRole="alert" size={14} color={colors.destructive}>
              {error}
            </T>
          )}
          <View style={{ flex: 1 }} />
          <Btn label={step === 4 ? "Start eating" : "Continue"} busy={busy} onPress={next} />
          {step > 1 && <Btn label="Back" variant="ghost" onPress={() => setStep(step - 1)} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
