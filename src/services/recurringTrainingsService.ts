import { supabase } from "./supabase";

export type RecurringTraining = {
  id: string;
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  weekDay: string;
  van: string;
  repeatUntil: string;
  active?: boolean;
  defaultTime?: string;
  defaultBeach?: string;
};

type DbRecurringTraining = {
  id: string;
  group_id: string;
  group_name: string;
  coach_id: string;
  coach_name: string;
  week_day: string;
  van: string;
  repeat_until: string;
  active?: boolean | null;
  default_time?: string | null;
  default_beach?: string | null;
};

function fromDb(training: DbRecurringTraining): RecurringTraining {
  return {
    id: training.id,
    groupId: training.group_id,
    groupName: training.group_name,
    coachId: training.coach_id,
    coachName: training.coach_name,
    weekDay: training.week_day,
    van: training.van,
    repeatUntil: training.repeat_until,
    active: training.active ?? true,
    defaultTime: training.default_time || "",
    defaultBeach: training.default_beach || "",
  };
}

function toDb(training: RecurringTraining) {
  return {
    id: training.id,
    group_id: training.groupId,
    group_name: training.groupName,
    coach_id: training.coachId,
    coach_name: training.coachName,
    week_day: training.weekDay,
    van: training.van,
    repeat_until: training.repeatUntil,
    active: training.active ?? true,
  };
}

function isMissingColumnError(error: { message?: string } | null, column: string) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes(column.toLowerCase());
}

export function getRecurringTrainingErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);

    if (message.includes("row-level security")) {
      return "Sem permissão para guardar horários. Confirma que estás logado como admin.";
    }

    return message;
  }

  return "Erro desconhecido ao guardar horário.";
}

export async function getRecurringTrainings() {
  const { data, error } = await supabase
    .from("recurring_trainings")
    .select("*");

  if (error) throw error;

  return (data || []).map(fromDb);
}

export async function addRecurringTraining(training: RecurringTraining) {
  const payload = toDb(training);

  let { error } = await supabase.from("recurring_trainings").insert(payload);

  if (error && isMissingColumnError(error, "active")) {
    const { active, ...legacyPayload } = payload;
    ({ error } = await supabase.from("recurring_trainings").insert(legacyPayload));
  }

  if (error) throw error;
}

export async function deleteRecurringTraining(id: string) {
  const { error } = await supabase
    .from("recurring_trainings")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
