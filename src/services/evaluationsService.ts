import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { EvaluationStatus, MonthlyEvaluation } from "../types";

type DbEvaluation = {
  id: string;
  student_id: string;
  coach_id: string;
  month: number;
  year: number;
  effort: number;
  attendance: number;
  technical_goal: string;
  goal_result: "completed" | "progress" | "continue";
  coach_comment: string;
  next_goal: string;
  status?: EvaluationStatus | null;
  share_token?: string | null;
  finalized_at?: string | null;
  sent_at?: string | null;
};

export type SharedEvaluation = {
  id: string;
  studentName: string;
  coachName: string;
  month: number;
  year: number;
  effort: number;
  attendance: number;
  technicalGoal: string;
  goalResult: "completed" | "progress" | "continue";
  coachComment: string;
  nextGoal: string;
  status: EvaluationStatus;
  finalizedAt: string | null;
  sentAt: string | null;
};

export type SendEvaluationResult = {
  ok: true;
  shareUrl: string;
  shareToken: string;
  emailed: boolean;
  emailReason: string | null;
  studentEmail: string | null;
  studentName: string;
  status: EvaluationStatus;
};

function fromDb(evaluation: DbEvaluation): MonthlyEvaluation {
  return {
    id: evaluation.id,
    studentId: evaluation.student_id,
    coachId: evaluation.coach_id,
    month: evaluation.month,
    year: evaluation.year,
    effort: evaluation.effort,
    attendance: evaluation.attendance,
    technicalGoal: evaluation.technical_goal,
    goalResult: evaluation.goal_result,
    coachComment: evaluation.coach_comment,
    nextGoal: evaluation.next_goal,
    status: evaluation.status || "draft",
    shareToken: evaluation.share_token || null,
    finalizedAt: evaluation.finalized_at || null,
    sentAt: evaluation.sent_at || null,
  };
}

function toDb(evaluation: MonthlyEvaluation) {
  return {
    id: evaluation.id,
    student_id: evaluation.studentId,
    coach_id: evaluation.coachId,
    month: evaluation.month,
    year: evaluation.year,
    effort: evaluation.effort,
    attendance: evaluation.attendance,
    technical_goal: evaluation.technicalGoal,
    goal_result: evaluation.goalResult,
    coach_comment: evaluation.coachComment,
    next_goal: evaluation.nextGoal,
    status: evaluation.status,
    share_token: evaluation.shareToken,
    finalized_at: evaluation.finalizedAt,
    sent_at: evaluation.sentAt,
  };
}

export function emptyEvaluation(coachId: string): MonthlyEvaluation {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    studentId: "",
    coachId,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    effort: 3,
    attendance: 100,
    technicalGoal: "",
    goalResult: "progress",
    coachComment: "",
    nextGoal: "",
    status: "draft",
    shareToken: null,
    finalizedAt: null,
    sentAt: null,
  };
}

export async function getEvaluations() {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => fromDb(row as DbEvaluation));
}

export async function saveEvaluation(evaluation: MonthlyEvaluation) {
  const { error } = await supabase
    .from("evaluations")
    .upsert(toDb(evaluation));

  if (error) throw error;
}

export async function addEvaluation(evaluation: MonthlyEvaluation) {
  await saveEvaluation(evaluation);
}

export async function updateEvaluation(evaluation: MonthlyEvaluation) {
  await saveEvaluation(evaluation);
}

export async function deleteEvaluation(id: string) {
  const { error } = await supabase.from("evaluations").delete().eq("id", id);

  if (error) throw error;
}

export async function getSharedEvaluation(token: string) {
  const { data, error } = await supabase.rpc("get_shared_evaluation", {
    p_token: token,
  });

  if (error) throw error;
  if (!data) return null;

  return data as SharedEvaluation;
}

export async function finalizeAndSendEvaluation(evaluationId: string) {
  const { data, error } = await supabase.functions.invoke("send-evaluation", {
    body: { evaluationId },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      throw new Error(
        (data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : null) ||
          `Erro ao enviar avaliação (HTTP ${error.context.status}).`
      );
    }
    throw error;
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as SendEvaluationResult;
}
