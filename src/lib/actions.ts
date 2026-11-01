import { Platform } from "react-native";
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import type { CommentVote } from "@/core/comments";
import { friendlyError } from "@/core/db-errors";
import { dishHref, dishKey } from "@/core/dishes";
import type { DishDiet, ShowDiet } from "@/core/diet";
import type { FeedDefault, Visibility } from "@/core/profiles";
import { getStanding, type Standing } from "@/core/rankings";
import type { Vote } from "@/core/ratings";
import { commentSchema, dishNameSchema, emailSchema, favouritesSchema, passwordSchema, profileSchema, ratingSchema, reportSchema, signupDetailsSchema, spaceNameSchema, usernameSchema } from "@/core/validation";
import { forgetPush } from "./notify";
import { AUTH_SITE, supabase } from "./supabase";

// The web app's server actions, as calls from the phone. The same checks run first, and the database has the last word
// (RLS, rate limits, ban checks), so nothing here is trusted more than the website is.

const confirmUrl = `${AUTH_SITE}/auth/confirm`; // email links finish on the website, then you sign in here

export type AuthResult = { error?: string; sent?: "confirm" | "reset" };

export async function signIn(rawEmail: string, password: string): Promise<AuthResult> {
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { error: email.error.issues[0].message };
  if (!password) return { error: "Enter your password." };
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (!error) return {};
  if (error.code === "email_not_confirmed") return { error: "Confirm your email first. We sent you a link when you signed up." };
  if (error.status === 429) return { error: "Too many tries. Give it a minute, then try again." };
  return { error: "That email and password don't match. Signed up before passwords? Use Forgot password." };
}

export async function signUp(rawEmail: string, rawPassword: string): Promise<AuthResult> {
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { error: email.error.issues[0].message };
  const password = passwordSchema.safeParse(rawPassword);
  if (!password.success) return { error: password.error.issues[0].message };
  const { data, error } = await supabase.auth.signUp({ email: email.data, password: password.data, options: { emailRedirectTo: confirmUrl } });
  if (error) {
    if (error.code === "user_already_exists") return { error: "That email already has an account. Sign in instead." };
    if (error.status === 429) return { error: "Too many tries. Give it a minute, then try again." };
    if (error.code === "weak_password") return { error: "Pick a stronger password: at least 8 characters." };
    return { error: "Couldn't create your account just now. Try again in a moment." };
  }
  if (data.user && data.user.identities?.length === 0) return { error: "That email already has an account. Sign in instead." };
  return data.session ? {} : { sent: "confirm" };
}

export async function resendConfirm(rawEmail: string): Promise<AuthResult> {
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { error: email.error.issues[0].message };
  const { error } = await supabase.auth.resend({ type: "signup", email: email.data, options: { emailRedirectTo: confirmUrl } });
  if (error?.status === 429) return { error: "Too many tries. Give it a minute, then try again." };
  return { sent: "confirm" };
}

export async function sendReset(rawEmail: string): Promise<AuthResult> {
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { error: email.error.issues[0].message };
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: confirmUrl });
  if (error?.status === 429) return { error: "Too many tries. Give it a minute, then try again." };
  return { sent: "reset" };
}

// Google, the way other apps do it: Android's own account chooser slides up over the app, you tap an account, and Supabase
// trusts the ID token Google hands back. No browser. Without a client ID (or on the web preview) it falls back to the browser flow.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export async function signInWithGoogle(): Promise<AuthResult> {
  if (GOOGLE_WEB_CLIENT_ID && Platform.OS === "android") {
    try {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return {}; // they closed the chooser
      const token = response.data.idToken;
      if (!token) return { error: "Google sign-in didn't finish. Try again." };
      const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token });
      return error ? { error: "Google sign-in didn't finish. Try again." } : {};
    } catch (e) {
      if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return {};
      return { error: "Google sign-in isn't available right now. Try email instead." };
    }
  }
  return signInWithGoogleInBrowser();
}

// Signing out of Supabase alone leaves Google remembering the account, so the next "Sign in with Google" skips the chooser.
export async function signOutEverywhere() {
  await forgetPush().catch(() => {});
  if (Platform.OS === "android") await GoogleSignin.signOut().catch(() => {});
  await supabase.auth.signOut();
}

async function signInWithGoogleInBrowser(): Promise<AuthResult> {
  const redirectTo = Linking.createURL("auth");
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) return { error: "Google sign-in isn't available right now." };
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return {};
  const code = new URL(result.url).searchParams.get("code");
  if (!code) return { error: "Google sign-in didn't finish. Try again." };
  const { error: swap } = await supabase.auth.exchangeCodeForSession(code);
  return swap ? { error: "Google sign-in didn't finish. Try again." } : {};
}

export type Region = { slug: string; name: string; kind: "state" | "ut" };

export async function getRegions() {
  const { data, error } = await supabase.from("regions").select("slug, name, kind").order("name").returns<Region[]>();
  if (error) throw error;
  return data;
}

type NewProfile = { username: string; display_name: string; date_of_birth: string; gender: string; diet: string; region: string };

// Sign-up's last step. `field` says which step an error belongs to.
export async function createProfile(userId: string, form: NewProfile): Promise<{ error?: { field: "username" | "about" | "region" | "form"; message: string } }> {
  const username = usernameSchema.safeParse(form.username);
  if (!username.success) return { error: { field: "username", message: username.error.issues[0].message } };
  const about = signupDetailsSchema.safeParse({ display_name: form.display_name, diet: form.diet, date_of_birth: form.date_of_birth, gender: form.gender });
  if (!about.success) return { error: { field: "about", message: about.error.issues[0].message } };
  if (!form.region) return { error: { field: "region", message: "Pick where home is." } };
  const { display_name, diet, date_of_birth, gender } = about.data;
  const { error } = await supabase.from("profiles").insert({ id: userId, username: username.data, home_region: form.region, display_name, diet });
  if (error?.code === "23505" && error.message.includes("username")) return { error: { field: "username", message: `@${username.data} is taken. Try another.` } };
  if (error?.code === "23503") return { error: { field: "region", message: "That place isn't on our list yet." } };
  if (error && error.code !== "23505") return { error: { field: "form", message: "Couldn't save that. Try again in a moment." } };
  await supabase.from("profile_private").upsert({ date_of_birth, gender }, { onConflict: "user_id" });
  return {};
}

export async function castVote(ratingId: string, kind: Vote | null) {
  if (!kind) return void (await supabase.from("votes").delete().eq("rating_id", ratingId));
  const { data } = await supabase.from("votes").update({ kind }).eq("rating_id", ratingId).select("rating_id");
  if (!data?.length) await supabase.from("votes").insert({ rating_id: ratingId, kind });
}

export async function castCommentVote(commentId: string, kind: CommentVote | null) {
  if (!kind) return void (await supabase.from("comment_votes").delete().eq("comment_id", commentId));
  const { data } = await supabase.from("comment_votes").update({ kind }).eq("comment_id", commentId).select("comment_id");
  if (!data?.length) await supabase.from("comment_votes").insert({ comment_id: commentId, kind });
}

export async function addComment(ratingId: string, parentId: string | null, raw: string) {
  const body = commentSchema.safeParse(raw);
  if (!body.success) return body.error.issues[0].message;
  const { error } = await supabase.from("comments").insert({ rating_id: ratingId, parent_id: parentId, body: body.data });
  return error ? friendlyError(error, "Couldn't post that just now. Try again in a moment.") : null;
}

export const deleteComment = (id: string) => supabase.from("comments").delete().eq("id", id);

export type Posted = { score: number; edited: boolean; dish: string; place: string; href: string; before: Standing | null; after: Standing | null; atHome: boolean };
export type PhotoDraft = { key: string; path?: string; uri: string; width?: number; height?: number };

// Shrinks a picked photo to the web's limits and returns JPEG bytes. `square` centre-crops for a profile picture.
async function jpegBytes(p: PhotoDraft, square: boolean) {
  const ctx = ImageManipulator.manipulate(p.uri);
  const [w, h] = [p.width ?? 1600, p.height ?? 1600];
  if (square) {
    const side = Math.min(w, h);
    ctx.crop({ originX: (w - side) / 2, originY: (h - side) / 2, width: side, height: side }).resize({ width: Math.min(512, side) });
  } else if (Math.max(w, h) > 1600) {
    ctx.resize(w >= h ? { width: 1600 } : { height: 1600 });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return (await fetch(saved.uri)).arrayBuffer();
}

async function upload(bucket: string, userId: string, p: PhotoDraft, square = false) {
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, await jpegBytes(p, square), { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

export const pickFromLibrary = (limit: number) => ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: limit > 1, selectionLimit: limit, quality: 1 });
export const takePhoto = () => ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });

// Create or update your one rating of a dish. `photos`, when given, replace the old set. Returns what changed for the panel.
export async function saveRating(
  userId: string,
  atHomeRegion: string | undefined,
  dishId: string,
  input: { score: number; take: string },
  photos: PhotoDraft[] | null,
): Promise<{ error?: string; posted?: Posted }> {
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let paths: string[] = [];
  if (photos) {
    try {
      paths = await Promise.all(photos.map((p) => p.path ?? upload("rating-photos", userId, p)));
    } catch {
      return { error: "A photo didn't upload. Check your connection and try again." };
    }
  }

  const before = await getStanding(supabase, dishId);
  const { data: existing } = await supabase.from("ratings").select("id").eq("dish_id", dishId).eq("user_id", userId).maybeSingle();
  const { data: saved, error } = existing
    ? await supabase.from("ratings").update(parsed.data).eq("id", existing.id).select("id").single()
    : await supabase.from("ratings").insert({ dish_id: dishId, ...parsed.data }).select("id").single();
  if (error || !saved) return { error: friendlyError(error, "Couldn't save that just now. Try again in a moment.") };
  await supabase.from("saves").delete().eq("dish_id", dishId); // you've had it now: off your "Want to try" list

  if (photos) {
    const { data: old } = await supabase.from("rating_photos").select("path").eq("rating_id", saved.id);
    await supabase.from("rating_photos").delete().eq("rating_id", saved.id);
    const gone = (old ?? []).map((p) => p.path).filter((p) => !paths.includes(p));
    if (gone.length) await supabase.storage.from("rating-photos").remove(gone);
    if (paths.length) {
      const { error: photoError } = await supabase.from("rating_photos").insert(paths.map((path, i) => ({ rating_id: saved.id, path, position: i + 1 })));
      if (photoError) return { error: "Saved your score, but the photos didn't attach. Try adding them again." };
    }
  }

  const [after, { data: dish }] = await Promise.all([
    getStanding(supabase, dishId),
    supabase.from("dishes").select("name, restaurant:restaurants(slug, name)").eq("id", dishId).single<{ name: string; restaurant: { slug: string; name: string } }>(),
  ]);
  return {
    posted: {
      score: parsed.data.score,
      edited: Boolean(existing),
      dish: dish?.name ?? "this dish",
      place: dish?.restaurant.name ?? "",
      href: parsed.data.take ? `/review/${saved.id}` : dish ? dishHref(dish.restaurant.slug, dish.name) : "/",
      before,
      after,
      atHome: Boolean(after?.home && atHomeRegion === after.home.region),
    },
  };
}

export async function deleteRating(userId: string, ratingId: string) {
  const { data: photos } = await supabase.from("rating_photos").select("path").eq("rating_id", ratingId);
  const { data: gone, error } = await supabase.from("ratings").delete().eq("id", ratingId).eq("user_id", userId).select("id");
  if (error || !gone?.length) throw new Error("Couldn't delete that take.");
  const paths = (photos ?? []).map((p) => p.path).filter((p) => p.startsWith(`${userId}/`));
  if (paths.length) await supabase.storage.from("rating-photos").remove(paths); // best effort: a leftover file is harmless
}

export async function setFollow(followeeId: string, follow: boolean) {
  if (follow) {
    const { error } = await supabase.from("follows").insert({ followee_id: followeeId });
    if (error && error.code !== "23505") throw error;
  } else {
    await supabase.from("follows").delete().eq("followee_id", followeeId);
  }
}

export async function setSaved(dishId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase.from("saves").insert({ dish_id: dishId });
    if (error && error.code !== "23505") throw error;
  } else {
    await supabase.from("saves").delete().eq("dish_id", dishId);
  }
}

export async function saveFavourites(ratingIds: string[]) {
  const ids = favouritesSchema.safeParse(ratingIds);
  if (!ids.success) return ids.error.issues[0].message;
  const { error } = await supabase.rpc("set_favourites", { rating_ids: ids.data });
  return error ? "Couldn't pin those just now. Try again in a moment." : null;
}

export async function sendReport(input: { target_type: string; target_id: string; reason: string; note: string }) {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return parsed.error.issues[0].message;
  const { error } = await supabase.from("reports").insert(parsed.data);
  if (error && error.code !== "23505") return friendlyError(error, "Couldn't send that just now. Try again in a moment.");
  return null;
}

export async function addDish(restaurantId: string, raw: string, diet: DishDiet | ""): Promise<{ error?: string; existing?: { id: string; name: string }; live?: boolean; href?: string }> {
  const name = dishNameSchema.safeParse(raw);
  if (!name.success) return { error: name.error.issues[0].message };
  if (!diet) return { error: "Pick veg, vegan, egg or non-veg." };
  const { data, error } = await supabase
    .from("dishes")
    .insert({ restaurant_id: restaurantId, name: name.data, diet })
    .select("name, approved_at, restaurant:restaurants(slug)")
    .single<{ name: string; approved_at: string | null; restaurant: { slug: string } }>();
  if (error?.code === "23505") {
    const { data: existing } = await supabase.from("dishes").select("id, name").eq("restaurant_id", restaurantId).eq("name_key", dishKey(name.data)).maybeSingle();
    return { error: "That one's already on the menu.", existing: existing ?? undefined };
  }
  if (error) return { error: friendlyError(error, "Couldn't add that just now. Try again in a moment.") };
  return { live: Boolean(data.approved_at), href: dishHref(data.restaurant.slug, data.name) };
}

export async function startSpace(raw: string): Promise<{ error?: string; name?: string }> {
  const name = spaceNameSchema.safeParse(raw);
  if (!name.success) return { error: name.error.issues[0].message };
  const { data, error } = await supabase.from("spaces").insert({ name: name.data }).select("name").single<{ name: string }>();
  if (error?.code === "23505") return { name: name.data };
  if (error) return { error: friendlyError(error, "Couldn't start that list. Try again in a moment.") };
  return { name: data.name };
}

export async function voteBattle(battle: string, userId: string, side: "a" | "b"): Promise<{ votes: { a: number; b: number } } | { error: string }> {
  const { error } = await supabase.from("battle_votes").upsert({ battle_id: battle, user_id: userId, side }, { onConflict: "battle_id,user_id" });
  if (error) {
    if (error.code === "54000") return { error: "Slow down a little. Try again in a bit." };
    if (error.code === "42501") return { error: "This account can't vote right now." };
    return { error: "Couldn't save your vote. Try again." };
  }
  const { data } = await supabase.from("battle_tally").select("a, b").eq("battle_id", battle).maybeSingle();
  return { votes: { a: Number(data?.a ?? 0), b: Number(data?.b ?? 0) } };
}

export const markAllRead = (userId: string) => supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
export const finishTour = (userId: string) => supabase.from("profiles").update({ tour_done_at: new Date().toISOString() }).eq("id", userId);

export async function savePreferences(show_diet: ShowDiet, feed_default: FeedDefault) {
  const { error } = await supabase.from("profile_private").upsert({ show_diet, feed_default }, { onConflict: "user_id" });
  return error ? "Couldn't save that just now. Try again in a moment." : null;
}

export async function savePrivacy(userId: string, privacy: Record<"saves_visibility" | "diary_visibility" | "followers_visibility" | "following_visibility", Visibility>) {
  const { error } = await supabase.from("profiles").update(privacy).eq("id", userId);
  return error ? "Couldn't save that just now. Try again in a moment." : null;
}

export type ProfileForm = { display_name: string; bio: string; avatar: string; diet: string; instagram: string; date_of_birth: string; gender: string; home_region: string };

export async function updateProfile(userId: string, form: ProfileForm, photo: PhotoDraft | null, oldPhoto: string | null): Promise<string | null> {
  const parsed = profileSchema.safeParse(form);
  if (!parsed.success) return parsed.error.issues[0].message;
  const { date_of_birth, gender, ...details } = parsed.data;
  let avatar_path: string | null = null;
  if (photo) {
    try {
      avatar_path = photo.path ?? (await upload("avatars", userId, photo, true));
    } catch {
      return "That photo didn't upload properly. Try adding it again.";
    }
  }
  const { error } = await supabase.from("profiles").update({ ...details, avatar_path }).eq("id", userId);
  if (error?.code === "23514" && error.message.includes("home region")) return "You changed your home region less than 30 days ago. Try again later.";
  if (error) return "Couldn't save that just now. Try again in a moment.";
  const { error: privateError } = await supabase.from("profile_private").upsert({ date_of_birth, gender }, { onConflict: "user_id" });
  if (privateError) return "Saved your profile, but not your birthday and gender. Try again.";
  if (oldPhoto && oldPhoto !== avatar_path) await supabase.storage.from("avatars").remove([oldPhoto]); // best effort
  return null;
}

// Delete your account for good: the database first, then the files, so a failed delete never leaves a live account without its pictures.
export async function deleteAccount(userId: string, username: string, typed: string) {
  if (typed.trim().replace(/^@/, "").toLowerCase() !== username) return `Type ${username} to confirm.`;
  const files = await Promise.all(
    ["rating-photos", "avatars"].map(async (bucket) => {
      const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
      return { bucket, paths: (data ?? []).map((f) => `${userId}/${f.name}`) };
    }),
  );
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return error.message.includes("superadmin") ? "The superadmin account runs the admin site and can't be deleted." : "Couldn't delete your account just now. Try again in a moment.";
  for (const { bucket, paths } of files) if (paths.length) await supabase.storage.from(bucket).remove(paths);
  await supabase.auth.signOut();
  return null;
}

// "Download my data": the same JSON as the website, handed to the phone's share sheet.
export async function exportData(userId: string) {
  const mine = (table: string, columns: string, owner = "user_id") => supabase.from(table).select(columns).eq(owner, userId);
  const results = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("profile_private").select("*").eq("user_id", userId).maybeSingle(),
    mine("ratings", "id, score, take, created_at, updated_at, dish:dishes(name, restaurant:restaurants(name)), photos:rating_photos(path)"),
    mine("comments", "id, rating_id, parent_id, body, created_at"),
    mine("votes", "rating_id, kind, created_at"),
    mine("comment_votes", "comment_id, kind"),
    mine("saves", "created_at, dish:dishes(name, restaurant:restaurants(name))"),
    mine("favourites", "position, rating_id"),
    mine("follows", "followee:profiles!follows_followee_id_fkey(username), created_at", "follower_id"),
    mine("reports", "target_type, target_id, reason, note, created_at", "reporter_id"),
    mine("notifications", "kind, detail, created_at, read_at"),
  ]);
  if (results.some((r) => r.error)) return "Couldn't gather your data just now. Try again in a moment.";
  const [profile, details, ratings, comments, votes, commentVotes, saves, favourites, following, reports, notifications] = results.map((r) => r.data);
  const file = new File(Paths.cache, "nomrank-my-data.json");
  file.write(JSON.stringify({ exported_at: new Date().toISOString(), profile, private_details: details, ratings, comments, votes, comment_votes: commentVotes, want_to_try: saves, favourites, following, reports, notifications }, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Your Nomrank data" });
  return null;
}
