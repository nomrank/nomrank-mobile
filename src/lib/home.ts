import type { Restaurant } from "@/core/restaurants";
import type { DishDiet } from "@/core/diet";
import { dishKey } from "@/core/dishes";

export const FIRST_LIST_KEY = "nomrank-first-list";

export type Spot = { id: string; name: string; diet: DishDiet; avg: number | null; count: number; place: Restaurant };
export type DishGroup = { key: string; name: string; spots: Spot[] };

// The same dish at several places shows once; most-served dishes first.
export function groupDishes(restaurants: Restaurant[], q = "") {
  const groups = new Map<string, DishGroup>();
  for (const place of restaurants) {
    for (const d of place.dishes) {
      const key = dishKey(d.name);
      if (q && !key.includes(q)) continue;
      const g = groups.get(key) ?? { key, name: d.name, spots: [] };
      g.spots.push({ id: d.id, name: d.name, diet: d.diet, avg: d.avg_score, count: d.rating_count, place });
      groups.set(key, g);
    }
  }
  return [...groups.values()].sort((a, b) => b.spots.length - a.spots.length || a.name.localeCompare(b.name));
}

// Map.groupBy isn't in Hermes yet.
export function groupBy<T>(items: T[], key: (t: T) => string) {
  const out = new Map<string, T[]>();
  for (const x of items) out.set(key(x), [...(out.get(key(x)) ?? []), x]);
  return [...out];
}
