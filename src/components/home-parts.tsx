import { useState } from "react";
import { Modal, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { listHref } from "@/core/rankings";
import { finishTour, startSpace } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme";
import { toast } from "./toast";
import { Btn, Input, T } from "./ui";

const STEPS = [
  { title: "Rate the dish, not the place", body: "Tap Rate, find the dish you ate and give it 1 to 10. Every dish gets its own score." },
  { title: "Your city, your rankings", body: "Rankings, dishes and places follow the city up top. The feed shows takes from all of India." },
  { title: "Takes and rankings", body: "Takes are what people wrote about a dish. Rankings show the best dish in each food." },
  { title: "Two dishes, one pick", body: "Battles put two dishes head to head. Vote for the one you'd order." },
];

// The first-time tour, once per account (the same flag as the website). Skipping counts as watching it.
export function FirstTour() {
  const { colors } = useTheme();
  const { userId, reload } = useSession();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  const last = step === STEPS.length - 1;
  const close = () => {
    setOpen(false);
    if (userId) finishTour(userId).then(() => reload());
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(23,17,28,0.8)", justifyContent: "center", padding: 20 }}>
        <View accessibilityViewIsModal style={{ borderRadius: 20, backgroundColor: colors.paper, padding: 22, gap: 8 }}>
          <T size={13} color={colors.faint}>
            {step + 1} of {STEPS.length}
          </T>
          <T size={22} weight={700}>
            {STEPS[step].title}
          </T>
          <T color={colors.muted}>{STEPS[step].body}</T>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Btn label="Skip" variant="ghost" onPress={close} style={{ flex: 1 }} />
            <Btn label={last ? "Got it" : "Next"} onPress={() => (last ? close() : setStep(step + 1))} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Start a food list. If one with that name exists, you land on it instead.
export function StartSpace() {
  const { colors } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function go() {
    setBusy(true);
    const r = await startSpace(name);
    setBusy(false);
    if (r.error) return setError(r.error);
    setOpen(false);
    setName("");
    toast("List started");
    if (r.name) router.push(listHref(r.name) as Href);
  }
  if (!open) return <Btn label="Start a food list" variant="secondary" onPress={() => setOpen(true)} style={{ marginTop: 16 }} />;
  return (
    <View style={{ marginTop: 16, gap: 8 }}>
      <Input value={name} onChangeText={setName} maxLength={40} placeholder="A food, like Misal" accessibilityLabel="Food name" autoFocus />
      {error && (
        <T size={14} color={colors.destructive}>
          {error}
        </T>
      )}
      <Btn label="Start it" busy={busy} disabled={!name.trim()} onPress={go} />
      <Btn label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}
