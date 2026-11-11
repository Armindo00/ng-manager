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

function buildShareUrl(shareToken: string) {
  return `${window.location.origin}${window.location.pathname}#/avaliacao/${shareToken}`;
}

function createShareToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

async function readFunctionErrorMessage(error: unknown, data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: string }).error);
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === "object" && "error" in body) {
        return String((body as { error: string }).error);
      }
      if (body && typeof body === "object" && "message" in body) {
        return String((body as { message: string }).message);
      }
    } catch {
      // ignore parse failures
    }
    return `Erro ao enviar avaliação (HTTP ${error.context.status}).`;
  }

  if (error instanceof Error && error.message) return error.message;
  return "Erro ao enviar avaliação.";
}

/**
 * Finaliza a avaliação no cliente (gera link partilhável) e tenta email
 * via edge function. O email é opcional — se falhar auth/Resend, o link
 * e o mailto continuam disponíveis.
 */
export async function finalizeAndSendEvaluation(evaluationId: string) {
  const { data: evaluationRow, error: evaluationError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", evaluationId)
    .single();

  if (evaluationError || !evaluationRow) {
    throw new Error("Avaliação não encontrada.");
  }

  const evaluation = fromDb(evaluationRow as DbEvaluation);

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, name, email")
    .eq("id", evaluation.studentId)
    .single();

  if (studentError || !student) {
    throw new Error("Aluno não encontrado.");
  }

  const shareToken = evaluation.shareToken || createShareToken();
  const now = new Date().toISOString();
  const studentEmail =
    typeof student.email === "string" && student.email.includes("@")
      ? student.email.trim()
      : null;

  // Finalize locally first so the public link always works, even if the
  // optional email edge function returns 401/5xx.
  const { error: updateError } = await supabase
    .from("evaluations")
    .update({
      status: "finalized",
      share_token: shareToken,
      finalized_at: evaluation.finalizedAt || now,
    })
    .eq("id", evaluationId);

  if (updateError) throw updateError;

  const shareUrl = buildShareUrl(shareToken);
  let emailed = false;
  let emailReason: string | null = studentEmail
    ? "email_send_skipped"
    : "missing_student_email";
  let status: EvaluationStatus = "finalized";

  if (studentEmail) {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      const accessToken =
        refreshData.session?.access_token ||
        (await supabase.auth.getSession()).data.session?.access_token;

      if (!accessToken) {
        emailReason = "missing_session";
      } else {
        const { data, error } = await supabase.functions.invoke(
          "send-evaluation",
          {
            body: { evaluationId },
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (error || data?.error) {
          emailReason = await readFunctionErrorMessage(error, data);
        } else {
          const result = data as SendEvaluationResult;
          emailed = Boolean(result.emailed);
          emailReason = result.emailReason;
          status = result.status || (result.emailed ? "sent" : "finalized");
          if (result.shareUrl) {
            return {
              ok: true as const,
              shareUrl: result.shareUrl,
              shareToken: result.shareToken || shareToken,
              emailed,
              emailReason,
              studentEmail,
              studentName: student.name,
              status,
            };
          }
        }
      }
    } catch (error) {
      emailReason = await readFunctionErrorMessage(error, null);
    }
  }

  return {
    ok: true as const,
    shareUrl,
    shareToken,
    emailed,
    emailReason,
    studentEmail,
    studentName: student.name as string,
    status,
  } satisfies SendEvaluationResult;
}
