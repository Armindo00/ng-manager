import { supabase } from "./supabase";
import type { Lesson } from "../types";
import type { WeekDay } from "../types/recurringTraining";
import { getScheduleDates as getScheduleDatesLisbon } from "../utils/dateUtils";

export function getScheduleDates(
  weekDay: WeekDay,
  repeatUntil: string,
  fromDate?: string
) {
  return getScheduleDatesLisbon(weekDay, repeatUntil, fromDate);
}

type PublishResult = {
  created: number;
  skipped: number;
};

function parsePublishResult(data: unknown): PublishResult {
  if (!data || typeof data !== "object") {
    return { created: 0, skipped: 0 };
  }

  const result = data as { created?: number; skipped?: number };

  return {
    created: Number(result.created ?? 0),
    skipped: Number(result.skipped ?? 0),
  };
}

export async function publishTrainingSchedule(trainingId: string) {
  const { data, error } = await supabase.rpc("publish_recurring_schedule", {
    p_training_id: trainingId,
  });

  if (error) throw error;

  const result = parsePublishResult(data);

  return {
    ...result,
    totalDates: result.created + result.skipped,
  };
}

export async function publishAllTrainingSchedules() {
  const { data, error } = await supabase.rpc("publish_recurring_schedule", {
    p_training_id: null,
  });

  if (error) throw error;

  return parsePublishResult(data);
}

// Mantido para compatibilidade com testes ou imports antigos.
export type { Lesson };
