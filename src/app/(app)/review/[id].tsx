import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowBigDownIcon, ArrowBigUpIcon, PencilIcon, Trash2Icon } from "lucide-react-native";
import { getMyCommentVotes, getThreads, type Comment, type CommentVote, type Thread } from "@/core/comments";
import { dishHref } from "@/core/dishes";
import { getSaveStates } from "@/core/profiles";
import { getMyVotes, getReview } from "@/core/ratings";
import { getDishesToRate } from "@/core/restaurants";
import { timeAgo } from "@/core/time";
import { toggleVote } from "@/core/votes";
import { RateAnother } from "@/components/rate-another";
import { PersonLink, ReportButton, ReviewCard, ShareButton, useGo } from "@/components/social";
import { toast } from "@/components/toast";
import { Btn, Empty, Failed, Header, Input, Loading, Overline, T, useData } from "@/components/ui";
import { addComment, castCommentVote, deleteComment, deleteRating } from "@/lib/actions";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/theme";

function Composer({ ratingId, parentId, placeholder, onPosted, onCancel }: { ratingId: string; parentId?: string; placeholder: string; onPosted: () => void; onCancel?: () => void }) {
  const { colors } = useTheme();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    setBusy(true);
    const failed = await addComment(ratingId, parentId ?? null, body);
    setBusy(false);
    setError(failed);
    if (failed) return;
    setBody("");
    toast(parentId ? "Reply posted" : "Comment posted");
    onPosted();
  }
  return (
    <View style={{ gap: 8 }}>
      <Input value={body} onChangeText={setBody} maxLength={500} multiline placeholder={placeholder} accessibilityLabel={placeholder} autoFocus={!!parentId} style={{ minHeight: parentId ? 60 : 76, paddingVertical: 10, textAlignVertical: "top" }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <T size={13} color={error ? colors.destructive : colors.faint} style={{ flex: 1 }}>
          {error ?? (body.length > 400 ? `${body.length}/500` : "")}
        </T>
        {onCancel && <Btn label="Cancel" variant="ghost" onPress={onCancel} style={{ minHeight: 40 }} />}
        <Btn label={parentId ? "Reply" : "Post"} busy={busy} disabled={!body.trim()} onPress={post} style={{ minHeight: 40 }} />
      </View>
    </View>
  );
}

// One score per comment: likes minus dislikes, between an up and a down arrow.
function CommentVotes({ comment: c, mine, mode }: { comment: Comment; mine?: CommentVote; mode: "vote" | "own" }) {
  const { colors } = useTheme();
  const [state, setState] = useState({ counts: { like: c.like_count, dislike: c.dislike_count }, mine });
  const score = state.counts.like - state.counts.dislike;
  function press(kind: CommentVote) {
    if (mode === "own") return;
    const next = toggleVote(state.counts, state.mine, kind);
    setState(next);
    castCommentVote(c.id, next.mine ?? null);
  }
  const arrow = (kind: CommentVote) => {
    const on = state.mine === kind;
    const Icon = kind === "like" ? ArrowBigUpIcon : ArrowBigDownIcon;
    const color = on ? (kind === "like" ? colors.mustardInk : colors.ketchupInk) : colors.muted;
    return (
      <Pressable onPress={() => press(kind)} disabled={mode === "own"} accessibilityRole="button" accessibilityLabel={kind === "like" ? "Like" : "Dislike"} accessibilityState={{ selected: on }} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", opacity: mode === "own" ? 0.4 : 1 }}>
        <Icon size={18} color={color} fill={on ? color : "transparent"} />
      </Pressable>
    );
  };
  return (
    <View accessibilityLabel={`Comment score ${score}`} style={{ flexDirection: "row", alignItems: "center" }}>
      {arrow("like")}
      <T size={14} weight={600} color={state.mine === "like" ? colors.mustardInk : state.mine === "dislike" ? colors.ketchupInk : undefined} style={{ minWidth: 16, textAlign: "center" }}>
        {score}
      </T>
      {arrow("dislike")}
    </View>
  );
}

function CommentItem({ comment: c, mine, onReply, onChange }: { comment: Comment; mine?: CommentVote; onReply?: () => void; onChange: () => void }) {
  const { colors } = useTheme();
  const { profile } = useSession();
  const viewer = profile?.username ?? null;
  const own = viewer === c.author.username;
  const remove = () =>
    Alert.alert("Delete this comment?", "This can't be undone.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete it",
        style: "destructive",
        onPress: async () => {
          await deleteComment(c.id);
          toast("Comment deleted");
          onChange();
        },
      },
    ]);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <PersonLink handle={c.author.username} avatar={c.author.avatar} photo={c.author.avatar_path} />
        <T size={13} color={colors.faint}>
          {timeAgo(c.created_at)}
        </T>
      </View>
      <T style={{ paddingLeft: 32, lineHeight: 22 }}>{c.body}</T>
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 24, flexWrap: "wrap" }}>
        <CommentVotes comment={c} mine={mine} mode={own ? "own" : "vote"} />
        {onReply && (
          <Pressable onPress={onReply} accessibilityRole="button" style={{ minHeight: 36, paddingHorizontal: 8, justifyContent: "center" }}>
            <T size={14} weight={500} color={colors.muted}>
              Reply
            </T>
          </Pressable>
        )}
        {viewer && !own && <ReportButton targetType="comment" targetId={c.id} what="this comment" />}
        {own && (
          <Pressable onPress={remove} accessibilityRole="button" style={{ minHeight: 36, paddingHorizontal: 8, justifyContent: "center" }}>
            <T size={14} weight={500} color={colors.muted}>
              Delete
            </T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Comments({ ratingId, threads, votes, onChange }: { ratingId: string; threads: Thread[]; votes: Record<string, CommentVote>; onChange: () => void }) {
  const { colors } = useTheme();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const total = threads.reduce((n, t) => n + 1 + t.replies.length, 0);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 16, gap: 12 }}>
      <Overline>Comments{total > 0 ? ` · ${total}` : ""}</Overline>
      <Composer ratingId={ratingId} placeholder="Add a comment" onPosted={onChange} />
      {threads.length ? (
        threads.map((t) => (
          <View key={t.id} style={{ paddingVertical: 6 }}>
            <CommentItem comment={t} mine={votes[t.id]} onChange={onChange} onReply={() => setReplyTo(replyTo === t.id ? null : t.id)} />
            {(t.replies.length > 0 || replyTo === t.id) && (
              <View style={{ marginTop: 8, marginLeft: 14, paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: colors.hairline, gap: 10 }}>
                {t.replies.map((r) => (
                  <CommentItem key={r.id} comment={r} mine={votes[r.id]} onChange={onChange} />
                ))}
                {replyTo === t.id && (
                  <Composer
                    ratingId={ratingId}
                    parentId={t.id}
                    placeholder={`Reply to @${t.author.username}`}
                    onCancel={() => setReplyTo(null)}
                    onPosted={() => {
                      setReplyTo(null);
                      onChange();
                    }}
                  />
                )}
              </View>
            )}
          </View>
        ))
      ) : (
        <T size={14} color={colors.muted} style={{ paddingVertical: 12 }}>
          No comments yet.
        </T>
      )}
    </View>
  );
}

// One take in full, with its comments.
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, profile } = useSession();
  const router = useRouter();
  const go = useGo();

  const { data, failed, reload } = useData(async () => {
    const review = await getReview(supabase, id);
    if (!review?.take) return { review: null };
    const [votes, threads] = await Promise.all([profile ? getMyVotes(supabase, [review.id]) : ({} as Awaited<ReturnType<typeof getMyVotes>>), getThreads(supabase, review.id)]);
    const own = Boolean(userId && profile?.username === review.author.username);
    const [commentVotes, next, saves] = await Promise.all([
      profile ? getMyCommentVotes(supabase, threads.flatMap((t) => [t.id, ...t.replies.map((r) => r.id)])) : ({} as Record<string, CommentVote>),
      own && userId ? getDishesToRate(supabase, userId, review.dish.restaurant.slug) : null,
      getSaveStates(supabase, profile ? userId : null, [review.dish.id]),
    ]);
    return { review, votes, threads, own, commentVotes, next, saves };
  }, [id, userId, profile?.username]);

  const remove = () =>
    Alert.alert("Delete this take?", "Your score, words and photos go, along with its votes and comments. This can't be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete take",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRating(userId!, id);
            toast("Take deleted");
            router.back();
          } catch {
            toast("Couldn't delete that take.");
          }
        },
      },
    ]);

  const review = data?.review;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Header right={review ? <ShareButton path={`/review/${review.id}`} title={`@${review.author.username} on ${review.dish.name}`} /> : undefined} />
      {failed && !data ? (
        <Failed onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : !review ? (
        <Empty title="Take not found">It may have been deleted.</Empty>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <ReviewCard review={review} vote={data.votes![review.id]} saved={data.saves![review.dish.id]} full />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 4, marginBottom: 8 }}>
            {data.own ? (
              <>
                <Btn label="Edit" icon={PencilIcon} variant="ghost" onPress={() => go(`/rate?dish=${review.dish.id}`)} style={{ minHeight: 40 }} />
                <Btn label="Delete" icon={Trash2Icon} variant="ghost" onPress={remove} style={{ minHeight: 40 }} />
              </>
            ) : (
              <ReportButton targetType="rating" targetId={review.id} what="this take" />
            )}
          </View>
          {data.next && (
            <View style={{ marginBottom: 16 }}>
              <RateAnother restaurant={data.next.restaurant} dishes={data.next.dishes} />
            </View>
          )}
          <Comments ratingId={review.id} threads={data.threads!} votes={data.commentVotes!} onChange={reload} />
          <Btn label="See every take" variant="secondary" onPress={() => go(dishHref(review.dish.restaurant.slug, review.dish.name))} style={{ marginTop: 16 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
