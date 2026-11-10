import { supabase } from "./supabase";
import {
  fixedTrainings as defaultFixedTrainings,
  type FixedTraining,
} from "../data/fixedTrainings";

type DbFixedTraining = {
  id: string;
  weekday: FixedTraining["weekday"];
  title: string;
  students: string[] | null;
  coach_name: string | null;
  sort_order: number;
};

function fromDb(row: DbFixedTraining): FixedTraining {
  return {
    id: row.id,
    weekday: row.weekday,
    title: row.title,
    students: row.students || [],
    coachName: row.coach_name || undefined,
  };
}

function toDb(training: FixedTraining, sortOrder: number) {
  return {
    id: training.id,
    weekday: training.weekday,
    title: training.title,
    students: training.students,
    coach_name: training.coachName?.trim() || null,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };
}

const WEEKDAY_ORDER: FixedTraining["weekday"][] = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
];

export function sortFixedTrainings(trainings: FixedTraining[]) {
  return [...trainings].sort((a, b) => {
    const dayDiff =
      WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday);
    if (dayDiff !== 0) return dayDiff;
    return a.title.localeCompare(b.title, "pt");
  });
}

export async function getFixedTrainings() {
  const { data, error } = await supabase
    .from("fixed_trainings")
    .select("*")
    .order("sort_order")
    .order("title");

  if (error) throw error;

  const rows = (data || []).map((row) => fromDb(row as DbFixedTraining));
  return sortFixedTrainings(rows);
}

export async function saveFixedTraining(
  training: FixedTraining,
  sortOrder = 0
) {
  const { error } = await supabase
    .from("fixed_trainings")
    .upsert(toDb(training, sortOrder));

  if (error) throw error;
}

export async function deleteFixedTraining(id: string) {
  const { error } = await supabase.from("fixed_trainings").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Loads groups from DB. If empty, admin seeds defaults;
 * coaches get in-memory defaults until an admin opens the page.
 */
export async function ensureFixedTrainingsSeeded() {
  try {
    const existing = await getFixedTrainings();
    if (existing.length > 0) return existing;

    const sorted = sortFixedTrainings(defaultFixedTrainings);
    for (let index = 0; index < sorted.length; index += 1) {
      await saveFixedTraining(sorted[index], index);
    }

    return getFixedTrainings();
  } catch (error) {
    console.warn("fixed_trainings fallback to defaults", error);
    return sortFixedTrainings(defaultFixedTrainings);
  }
}

export async function restoreDefaultFixedTrainings() {
  const { error: clearError } = await supabase
    .from("fixed_trainings")
    .delete()
    .neq("id", "");

  if (clearError) throw clearError;

  const sorted = sortFixedTrainings(defaultFixedTrainings);
  for (let index = 0; index < sorted.length; index += 1) {
    await saveFixedTraining(sorted[index], index);
  }

  return getFixedTrainings();
}

export function getUniqueStudentNamesFromTrainings(trainings: FixedTraining[]) {
  return [...new Set(trainings.flatMap((training) => training.students))].sort(
    (a, b) => a.localeCompare(b, "pt")
  );
}

export { WEEKDAY_ORDER };
