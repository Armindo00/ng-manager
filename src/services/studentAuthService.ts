import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type StudentAccess = {
  studentId: string;
  appUserId: string;
  email: string;
  blocked: boolean;
};

export type StudentAuthResult = {
  hasAccess: boolean;
  blocked: boolean;
  email?: string;
  password?: string;
  error?: string;
};

type Action =
  | "create"
  | "reset-password"
  | "toggle-block"
  | "delete-access"
  | "update-email";

function formatInvokeError(error: unknown, data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: string }).error);
  }

  if (error instanceof FunctionsHttpError) {
    return `Erro na Edge Function (${error.context.status}): verifica se fizeste deploy da function admin-student-auth.`;
  }

  if (error instanceof Error) {
    if (
      error.message.includes("Failed to send a request") ||
      error.message.includes("Function not found") ||
      error.message.includes("404")
    ) {
      return "Edge Function não encontrada. Faz deploy com: npx supabase functions deploy admin-student-auth --project-ref zhcupwgfxrwawqcyejrx";
    }

    return error.message;
  }

  return "Erro ao gerir acesso do aluno.";
}

async function invokeStudentAuth(
  action: Action,
  studentId: string,
  options?: { name?: string; email?: string }
): Promise<StudentAuthResult> {
  const { data, error } = await supabase.functions.invoke("admin-student-auth", {
    body: {
      action,
      studentId,
      name: options?.name,
      email: options?.email,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();

        if (payload?.error) {
          throw new Error(String(payload.error));
        }
      } catch (parseError) {
        if (
          parseError instanceof Error &&
          parseError.message &&
          !parseError.message.includes("Unexpected")
        ) {
          throw parseError;
        }
      }
    }

    throw new Error(formatInvokeError(error, data));
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as StudentAuthResult;
}

export async function getStudentAccessMap() {
  let rows:
    | Array<{
        id: string;
        student_id: string | null;
        email: string;
        blocked?: boolean;
      }>
    | null = null;

  const withBlocked = await supabase
    .from("app_users")
    .select("id, student_id, email, blocked")
    .eq("role", "student");

  if (withBlocked.error?.message?.includes("blocked")) {
    const withoutBlocked = await supabase
      .from("app_users")
      .select("id, student_id, email")
      .eq("role", "student");

    if (withoutBlocked.error) throw withoutBlocked.error;
    rows = withoutBlocked.data;
  } else {
    if (withBlocked.error) throw withBlocked.error;
    rows = withBlocked.data;
  }

  const map = new Map<string, StudentAccess>();

  for (const row of rows || []) {
    if (!row.student_id) continue;

    map.set(row.student_id, {
      studentId: row.student_id,
      appUserId: row.id,
      email: row.email,
      blocked: row.blocked ?? false,
    });
  }

  return map;
}

export async function createStudentAccess(
  studentId: string,
  name: string,
  email: string
) {
  return invokeStudentAuth("create", studentId, { name, email });
}

export async function resetStudentPassword(studentId: string) {
  return invokeStudentAuth("reset-password", studentId);
}

export async function toggleStudentBlock(studentId: string) {
  return invokeStudentAuth("toggle-block", studentId);
}

export async function deleteStudentAccess(studentId: string) {
  return invokeStudentAuth("delete-access", studentId);
}

export async function updateStudentAccessEmail(studentId: string, email: string) {
  return invokeStudentAuth("update-email", studentId, { email });
}
