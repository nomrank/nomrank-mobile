import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { EyeIcon, EyeOffIcon, MailCheckIcon } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { LogoMark } from "@/components/logo-mark";
import { Btn, Input, T } from "@/components/ui";
import { resendConfirm, sendReset, signIn, signInWithGoogle, signUp } from "@/lib/actions";
import { SITE } from "@/lib/supabase";
import { useTheme } from "@/theme";

type Mode = "in" | "up" | "reset";

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <Path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <Path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <Path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
    </Svg>
  );
}

// Email and password or Google, like the web app. Confirmation and reset links finish on the website.
export default function Login() {
  const { colors } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<"confirm" | "reset" | null>(null);

  async function run(job: () => Promise<{ error?: string; sent?: "confirm" | "reset" }>) {
    setBusy(true);
    setError(undefined);
    const r = await job();
    setBusy(false);
    if (r.error) setError(r.error);
    if (r.sent) setSent(r.sent);
  }
  const submit = () => run(() => (mode === "in" ? signIn(email, password) : mode === "up" ? signUp(email, password) : sendReset(email)));
  const legal = (path: string) => WebBrowser.openBrowserAsync(`${SITE}${path}`);

  if (sent)
    return (
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
        <MailCheckIcon size={36} color={colors.mustardInk} />
        <T size={26} weight={700}>
          Check your email
        </T>
        <T color={colors.muted}>{sent === "confirm" ? `We sent a link to ${email.trim()}. Open it, then come back and sign in.` : `If ${email.trim()} has an account, a reset link is on its way. Set your new password, then sign in here.`}</T>
        {sent === "confirm" && <Btn label="Send it again" variant="secondary" busy={busy} onPress={() => run(() => resendConfirm(email))} />}
        {error && <T color={colors.destructive}>{error}</T>}
        <Btn
          label="Back to sign in"
          variant="ghost"
          onPress={() => {
            setSent(null);
            setMode("in");
          }}
        />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 14, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <LogoMark size={64} />
          <T size={32} weight={800} style={{ lineHeight: 36, letterSpacing: -0.8 }}>
            {mode === "reset" ? (
              "Forgot your password?"
            ) : (
              <>
                Rate the <T size={32} weight={800} color={colors.mustardInk}>dish</T>, not the place.
              </>
            )}
          </T>
          {mode !== "reset" && (
            <>
              <View accessibilityRole="tablist" style={{ flexDirection: "row", borderRadius: 12, padding: 4, backgroundColor: colors.raised }}>
                {(["in", "up"] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setMode(m);
                      setError(undefined);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === m }}
                    style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: mode === m ? colors.paper : "transparent" }}
                  >
                    <T weight={600}>{m === "in" ? "Sign in" : "Create account"}</T>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => run(signInWithGoogle)} disabled={busy} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <GoogleMark />
                <T weight={600}>Continue with Google</T>
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
                <T size={12} color={colors.faint}>
                  OR
                </T>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
              </View>
            </>
          )}
          <Input value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" accessibilityLabel="Your email" />
          {mode !== "reset" && (
            <View>
              <Input value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry={!show} autoComplete={mode === "in" ? "current-password" : "new-password"} textContentType={mode === "in" ? "password" : "newPassword"} accessibilityLabel="Password" onSubmitEditing={submit} style={{ paddingRight: 48 }} />
              <Pressable onPress={() => setShow(!show)} accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"} style={{ position: "absolute", right: 2, top: 2, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                {show ? <EyeOffIcon size={20} color={colors.muted} /> : <EyeIcon size={20} color={colors.muted} />}
              </Pressable>
            </View>
          )}
          {error && (
            <T accessibilityRole="alert" size={14} color={colors.destructive}>
              {error}
            </T>
          )}
          <Btn label={mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"} busy={busy} onPress={submit} />
          {mode === "in" && <Btn label="Forgot password?" variant="ghost" onPress={() => setMode("reset")} />}
          {mode === "reset" && <Btn label="Back to sign in" variant="ghost" onPress={() => setMode("in")} />}
          <T size={13} color={colors.faint} style={{ textAlign: "center" }}>
            By continuing, you agree to our{" "}
            <T size={13} weight={600} color={colors.muted} onPress={() => legal("/terms")}>
              Terms
            </T>{" "}
            and{" "}
            <T size={13} weight={600} color={colors.muted} onPress={() => legal("/privacy")}>
              Privacy Policy
            </T>
            .
          </T>
          {router.canGoBack() && <Btn label="Keep browsing" variant="ghost" onPress={() => router.back()} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
