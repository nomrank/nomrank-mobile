import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMark } from "@/components/logo-mark";
import { supabase } from "@/lib/supabase";
import { brand, useTheme } from "@/theme";

type Mode = "in" | "up";

// Email and password, like the web app. Create account sends the confirmation email; Google comes later.
export default function Login() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  async function submit() {
    if (!email.trim() || password.length < 8) return setNote({ text: "Enter your email and a password of at least 8 characters.", bad: true });
    setBusy(true);
    setNote(null);
    const { error, data } =
      mode === "in" ? await supabase.auth.signInWithPassword({ email: email.trim(), password }) : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) setNote({ text: mode === "in" ? "That email and password don't match." : error.message, bad: true });
    else if (mode === "up" && !data.session) setNote({ text: "Check your email to confirm, then sign in.", bad: false });
  }

  const input = [styles.input, { backgroundColor: colors.raised, borderColor: colors.input, color: colors.foreground }];
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <LogoMark size={64} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Rate the <Text style={{ color: colors.mustardInk }}>dish</Text>, not the place.
          </Text>
          <View style={[styles.tabs, { backgroundColor: colors.raised }]}>
            {(["in", "up"] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} style={[styles.tab, mode === m && { backgroundColor: colors.paper }]}>
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>{m === "in" ? "Sign in" : "Create account"}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Email"
            style={input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.faint}
            secureTextEntry
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            textContentType={mode === "in" ? "password" : "newPassword"}
            accessibilityLabel="Password"
            onSubmitEditing={submit}
            style={input}
          />
          {note && (
            <Text accessibilityRole="alert" style={{ color: note.bad ? colors.destructive : colors.muted }}>
              {note.text}
            </Text>
          )}
          <Pressable onPress={submit} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.button, { backgroundColor: brand.ketchup, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}>
            {busy ? <ActivityIndicator color={brand.studio} /> : <Text style={styles.buttonText}>{mode === "in" ? "Sign in" : "Create account"}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 14, flexGrow: 1, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", lineHeight: 34, marginBottom: 8 },
  tabs: { flexDirection: "row", borderRadius: 12, padding: 4 },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 52, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonText: { color: brand.studio, fontSize: 16, fontWeight: "700" },
});
