import { useCallback } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { LockIcon } from "lucide-react-native";
import { canSeeFollowList, getFollowList, getProfileByHandle, getProfileStats, isFollowing, type FollowKind, type FollowPerson } from "@/core/profiles";
import { Avatar } from "@/components/marks";
import { FollowButton, useGo } from "@/components/social";
import { Empty, Failed, Header, Loading, T, useData } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { brand, useTheme } from "@/theme";

function Person({ person: p, self }: { person: FollowPerson; self: boolean }) {
  const { colors } = useTheme();
  const go = useGo();
  const name = p.display_name ?? `@${p.username}`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <Pressable onPress={() => go(`/u/${p.username}`)} accessibilityRole="link" style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar handle={p.username} code={p.avatar} photo={p.avatar_path} size={48} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight={600} numberOfLines={1}>
            {name}
          </T>
          {p.display_name && (
            <T size={14} color={colors.muted} numberOfLines={1}>
              @{p.username}
            </T>
          )}
        </View>
      </Pressable>
      {!self && <FollowButton followeeId={p.id} handle={p.username} following={p.following} />}
    </View>
  );
}

// Someone's followers or following. The database decides who may look; the counts always show.
export default function FollowList() {
  const { handle, kind: raw } = useLocalSearchParams<{ handle: string; kind: string }>();
  const kind: FollowKind = raw === "following" ? "following" : "followers";
  const { colors } = useTheme();
  const { userId, profile: viewer } = useSession();
  const router = useRouter();
  const { data, failed, reload } = useData(async () => {
    const profile = await getProfileByHandle(supabase, decodeURIComponent(handle).toLowerCase());
    if (!profile) return { profile: null };
    const own = userId === profile.id;
    const [stats, open, follows] = await Promise.all([getProfileStats(supabase, profile.id), canSeeFollowList(supabase, profile.id, kind), userId && !own ? isFollowing(supabase, userId, profile.id) : false]);
    const people = open ? await getFollowList(supabase, profile.id, kind, viewer ? userId : null) : [];
    return { profile, own, stats, open, follows, people };
  }, [handle, kind, userId]);
  const renderItem = useCallback(({ item }: { item: FollowPerson }) => <Person person={item} self={userId === item.id} />, [userId]);

  if (failed && !data) return <><Header /><Failed onRetry={reload} /></>;
  if (!data) return <><Header /><Loading /></>;
  const p = data.profile;
  if (!p) return <><Header /><Empty title="Profile not found">No one has that handle.</Empty></>;
  const visibility = kind === "followers" ? p.followers_visibility : p.following_visibility;

  return (
    <View style={{ flex: 1 }}>
      <Header title={p.display_name ?? `@${p.username}`} />
      <View style={{ marginHorizontal: 20, marginTop: 4, flexDirection: "row", gap: 4, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.raised }}>
        {(
          [
            ["followers", data.stats!.followers, data.stats!.followers === 1 ? "Follower" : "Followers"],
            ["following", data.stats!.following, "Following"],
          ] as const
        ).map(([k, count, label]) => (
          <Pressable key={k} onPress={() => router.replace(`/u/${p.username}/${k}` as Href)} accessibilityRole="tab" accessibilityState={{ selected: k === kind }} style={{ flex: 1, minHeight: 44, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: k === kind ? brand.mustard : "transparent" }}>
            <T size={14} weight={600} color={k === kind ? brand.studio : colors.muted}>
              {count} {label}
            </T>
          </Pressable>
        ))}
      </View>
      {!data.open ? (
        <View style={{ alignItems: "center", gap: 8, padding: 32 }}>
          <LockIcon size={20} color={colors.mustardInk} />
          <T weight={600} style={{ textAlign: "center" }}>
            @{p.username} keeps this list private
          </T>
          <T size={14} color={colors.muted} style={{ textAlign: "center" }}>
            {visibility === "followers" ? "Only people who follow them can see it. Follow them to take a look." : "Only they can see it."}
          </T>
          {visibility === "followers" && !data.own && <FollowButton followeeId={p.id} handle={p.username} following={Boolean(data.follows)} onChange={() => setTimeout(reload, 400)} />}
        </View>
      ) : (
        <FlatList
          data={data.people}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={<Empty>{kind === "followers" ? (data.own ? "No followers yet. Rate a few dishes and they'll come." : `No one follows @${p.username} yet.`) : data.own ? "You're not following anyone yet." : `@${p.username} isn't following anyone yet.`}</Empty>}
        />
      )}
    </View>
  );
}
