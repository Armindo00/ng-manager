import { supabase } from "./supabase";
import type { Coach } from "../types";

export async function getCoaches() {
  const { data, error } = await supabase
    .from("coaches")
    .select("*")
    .order("name");

  if (error) throw error;

  return data as Coach[];
}

export async function addCoach(coach: Coach) {
  const { error } = await supabase
    .from("coaches")
    .insert(coach);

  if (error) throw error;
}

export async function updateCoach(coach: Coach) {
  const { error } = await supabase
    .from("coaches")
    .update(coach)
    .eq("id", coach.id);

  if (error) throw error;
}

export async function deleteCoach(id: string) {
  const { error } = await supabase
    .from("coaches")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
