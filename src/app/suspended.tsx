import { useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeleteAccount } from "@/components/delete-account";
import { toast } from "@/components/toast";
import { Btn, T } from "@/components/ui";
import { exportData } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme";

// Where a suspended account lands. They can still take their data, delete the account, or sign out.
export default function Suspended() {
  const { colors } = useTheme();
  const { userId, profile } = useSession();
  const [busy, setBusy] = useState(false);
  async function download() {
    if (!userId) return;
    setBusy(true);
    const failed = await exportData(userId);
    setBusy(false);
    if (failed) toast(failed);
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
        <T size={26} weight={700} accessibilityRole="header">
          Your account is suspended
        </T>
        <T color={colors.muted}>You can&apos;t rate, comment or vote right now. You can still download your data, delete your account, or sign out.</T>
        <Btn label="Download my data" variant="secondary" busy={busy} onPress={download} />
        <Btn label="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
        {userId && profile && <DeleteAccount userId={userId} username={profile.username} />}
      </ScrollView>
    </SafeAreaView>
  );
}
