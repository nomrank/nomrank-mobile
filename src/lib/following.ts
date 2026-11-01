import { useSyncExternalStore } from "react";
import { getFollowees } from "@/core/profiles";
import { setFollow } from "./actions";
import { supabase } from "./supabase";

// Who you follow, held once so every card in every feed agrees and updates together.
let ids = new Set<string>();
const listeners = new Set<() => void>();
const set = (next: Set<string>) => {
  ids = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useFollows = (id: string) => useSyncExternalStore(subscribe, () => ids.has(id));

export async function loadFollowing(userId: string | null) {
  set(new Set(userId ? await getFollowees(supabase, userId) : []));
}

export function markFollowing(id: string, on: boolean) {
  const next = new Set(ids);
  if (on) next.add(id);
  else next.delete(id);
  set(next);
}

// The change shows at once; if the server refuses it goes back and the error reaches the caller.
export async function follow(id: string) {
  markFollowing(id, true);
  await setFollow(id, true).catch((e) => {
    markFollowing(id, false);
    throw e;
  });
}
