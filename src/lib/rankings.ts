import { supabase } from "./supabase";

export type FoodList = { id: string; name: string };
export type RankedDish = { id: string; name: string; diet: string; rating_count: number; avg_score: number | null; rank: number | null; place: string; area: string };

export async function getLists(): Promise<FoodList[]> {
  const { data, error } = await supabase.from("spaces").select("id, name").order("name");
  if (error) throw error;
  return data;
}

// One list, best first: ranked dishes by rank, then the unrated ones by name. Same view and order as the web app.
export async function getRankedList(listId: string): Promise<RankedDish[]> {
  const [rankings, dishes] = await Promise.all([
    supabase.from("dish_rankings").select("dish_id, rank").eq("space_id", listId),
    supabase.from("dishes").select("id, name, diet, rating_count, avg_score, restaurant:restaurants!inner(name, area)").eq("space_id", listId),
  ]);
  if (rankings.error) throw rankings.error;
  if (dishes.error) throw dishes.error;
  const rank = new Map(rankings.data.map((r) => [r.dish_id, r.rank as number | null]));
  return (dishes.data as unknown as (Omit<RankedDish, "rank" | "place" | "area"> & { restaurant: { name: string; area: string } })[])
    .map(({ restaurant, ...d }) => ({ ...d, rank: rank.get(d.id) ?? null, place: restaurant.name, area: restaurant.area }))
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.name.localeCompare(b.name));
}
