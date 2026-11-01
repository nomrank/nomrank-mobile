import { useState } from "react";
import { Pressable, View } from "react-native";
import { deleteAccount } from "@/lib/actions";
import { useTheme } from "@/theme";
import { Btn, Input, T } from "./ui";

// Delete your account for good: you confirm by typing your handle. Also open to suspended accounts.
export function DeleteAccount({ userId, username }: { userId: string; username: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    const failed = await deleteAccount(userId, username, typed);
    setBusy(false);
    setError(failed);
  }
  if (!open)
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <T size={14} color={colors.faint}>
          Delete my account
        </T>
      </Pressable>
    );
  return (
    <View style={{ gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.destructive }}>
      <T size={14} color={colors.muted}>
        This removes your account, ratings, takes, comments and photos for good. Type <T size={14} weight={600}>{username}</T> to confirm.
      </T>
      <Input value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Type your handle to confirm" />
      {error && (
        <T size={14} color={colors.destructive}>
          {error}
        </T>
      )}
      <Btn label="Delete it for good" variant="danger" busy={busy} disabled={!typed.trim()} onPress={remove} />
      <Btn label="Keep my account" variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}
