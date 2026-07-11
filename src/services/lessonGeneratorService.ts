import { supabase } from "./supabase";

export async function generateLessonsFromRecurring() {
  const { data, error } = await supabase.rpc("generate_lessons_from_recurring");

  if (error) {
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}
