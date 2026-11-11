import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createShareToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function monthLabel(month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 1, 1, 12));
  return date.toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
}

function goalResultLabel(value: string) {
  if (value === "completed") return "Cumprido";
  if (value === "progress") return "Em progresso";
  return "Continuar";
}

function buildEmailHtml(input: {
  studentName: string;
  coachName: string;
  period: string;
  effort: number;
  attendance: number;
  technicalGoal: string;
  goalResult: string;
  coachComment: string;
  nextGoal: string;
  shareUrl: string;
}) {
  return `
  <div style="font-family: Manrope, Arial, sans-serif; color:#10233a; line-height:1.5;">
    <h2 style="margin:0 0 8px;">Avaliação mensal</h2>
    <p style="margin:0 0 16px; color:#3d5168;">Olá ${input.studentName}, a tua avaliação de ${input.period} já está disponível.</p>
    <div style="border:1px solid #d7e0ea; border-radius:12px; padding:16px; background:#f5f8fb;">
      <p><strong>Treinador:</strong> ${input.coachName}</p>
      <p><strong>Empenho:</strong> ${input.effort}/5</p>
      <p><strong>Presença:</strong> ${input.attendance}%</p>
      <p><strong>Objetivo técnico:</strong> ${input.technicalGoal || "—"}</p>
      <p><strong>Resultado:</strong> ${goalResultLabel(input.goalResult)}</p>
      <p><strong>Comentário:</strong> ${input.coachComment || "—"}</p>
      <p><strong>Próximo objetivo:</strong> ${input.nextGoal || "—"}</p>
    </div>
    <p style="margin:18px 0 8px;">
      <a href="${input.shareUrl}" style="display:inline-block; background:#0f766e; color:white; text-decoration:none; padding:12px 16px; border-radius:10px; font-weight:700;">
        Ver avaliação
      </a>
    </p>
    <p style="color:#6b7c8f; font-size:13px;">NextGeneration Surf School</p>
  </div>`;
}

async function sendWithResend(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from =
    Deno.env.get("EVALUATION_FROM_EMAIL") ??
    "NextGeneration <onboarding@resend.dev>";

  if (!apiKey) {
    return { emailed: false, reason: "missing_resend_key" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha no envio de email (${response.status}): ${text}`);
  }

  return { emailed: true as const, reason: null };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const appOrigin =
      Deno.env.get("APP_ORIGIN") ?? "https://ng-manager.vercel.app";

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user?.email) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const { data: appUser, error: appUserError } = await adminClient
      .from("app_users")
      .select("id, name, role")
      .ilike("email", user.email)
      .single();

    if (appUserError || !appUser) {
      return jsonResponse({ error: "Utilizador sem permissões." }, 403);
    }

    if (appUser.role !== "admin" && appUser.role !== "coach") {
      return jsonResponse({ error: "Sem permissão para enviar avaliações." }, 403);
    }

    const body = await request.json();
    const evaluationId = String(body.evaluationId || "");
    if (!evaluationId) {
      return jsonResponse({ error: "Avaliação em falta." }, 400);
    }

    const { data: evaluation, error: evaluationError } = await adminClient
      .from("evaluations")
      .select("*")
      .eq("id", evaluationId)
      .single();

    if (evaluationError || !evaluation) {
      return jsonResponse({ error: "Avaliação não encontrada." }, 404);
    }

    if (
      appUser.role === "coach" &&
      evaluation.coach_id !== appUser.id
    ) {
      return jsonResponse(
        { error: "Só podes enviar avaliações que criaste." },
        403
      );
    }

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id, name, email")
      .eq("id", evaluation.student_id)
      .single();

    if (studentError || !student) {
      return jsonResponse({ error: "Aluno não encontrado." }, 404);
    }

    const shareToken = evaluation.share_token || createShareToken();
    const now = new Date().toISOString();
    const shareUrl = `${appOrigin.replace(/\/$/, "")}/#/avaliacao/${shareToken}`;
    const period = monthLabel(evaluation.month, evaluation.year);
    const coachName = appUser.name || "Treinador";

    let emailed = false;
    let emailReason: string | null = null;

    if (!student.email?.includes("@")) {
      emailReason = "missing_student_email";
    } else {
      const mail = await sendWithResend({
        to: student.email.trim(),
        subject: `Avaliação ${period} · NextGeneration`,
        html: buildEmailHtml({
          studentName: student.name,
          coachName,
          period,
          effort: evaluation.effort,
          attendance: evaluation.attendance,
          technicalGoal: evaluation.technical_goal,
          goalResult: evaluation.goal_result,
          coachComment: evaluation.coach_comment,
          nextGoal: evaluation.next_goal,
          shareUrl,
        }),
      });
      emailed = mail.emailed;
      emailReason = mail.reason;
    }

    const nextStatus = emailed ? "sent" : "finalized";

    const { error: updateError } = await adminClient
      .from("evaluations")
      .update({
        status: nextStatus,
        share_token: shareToken,
        finalized_at: evaluation.finalized_at || now,
        sent_at: emailed ? now : evaluation.sent_at,
      })
      .eq("id", evaluationId);

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({
      ok: true,
      shareUrl,
      shareToken,
      emailed,
      emailReason,
      studentEmail: student.email || null,
      studentName: student.name,
      status: nextStatus,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao finalizar/enviar avaliação.",
      },
      500
    );
  }
});
