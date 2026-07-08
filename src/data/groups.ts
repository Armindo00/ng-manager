import type { Group } from "../types/group";
import { supabase } from "../services/supabase";

export async function getGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data ?? []) as Group[];
}

export async function saveGroups(groups: Group[]) {
  for (const group of groups) {
    const { error } = await supabase
      .from("groups")
      .upsert(group);

    if (error) throw error;
  }
}