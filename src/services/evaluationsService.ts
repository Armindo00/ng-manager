import { supabase } from "./supabase";
import type { MonthlyEvaluation } from "../types";

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
  };
}

export async function getEvaluations() {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) throw error;

  return (data || []).map(fromDb);
}

export async function addEvaluation(evaluation: MonthlyEvaluation) {
  const { error } = await supabase
    .from("evaluations")
    .insert(toDb(evaluation));

  if (error) throw error;
}

export async function updateEvaluation(evaluation: MonthlyEvaluation) {
  const { error } = await supabase
    .from("evaluations")
    .update(toDb(evaluation))
    .eq("id", evaluation.id);

  if (error) throw error;
}

export async function deleteEvaluation(id: string) {
  const { error } = await supabase
    .from("evaluations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
