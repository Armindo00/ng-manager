import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type CoachAccess = {
  coachId: string;
  appUserId: string;
  email: string;
};

export type CoachAuthResult = {
  hasAccess: boolean;
  coachId?: string;
  email?: string;
  password?: string;
  error?: string;
};

type Action =
  | "create-coach"
  | "create-coach-access"
  | "reset-coach-password"
  | "delete-coach-access";

function formatInvokeError(error: unknown, data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: string }).error);
  }

  if (error instanceof FunctionsHttpError) {
    return `Erro na Edge Function (${error.context.status}): verifica se fizeste deploy da function admin-student-auth.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro ao gerir acesso do treinador.";
}

async function invokeCoachAuth(
  action: Action,
  options: {
    coachId?: string;
    name?: string;
    email?: string;
    phone?: string;
  }
): Promise<CoachAuthResult> {
  const { data, error } = await supabase.functions.invoke("admin-student-auth", {
    body: {
      action,
      coachId: options.coachId,
      name: options.name,
      email: options.email,
      phone: options.phone,
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

  return data as CoachAuthResult;
}

export async function getCoachAccessMap() {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, email")
    .eq("role", "coach");

  if (error) throw error;

  const map = new Map<string, CoachAccess>();

  for (const row of data || []) {
    map.set(row.id, {
      coachId: row.id,
      appUserId: row.id,
      email: row.email,
    });
  }

  return map;
}

export async function createCoachWithAccess(
  name: string,
  email: string,
  phone: string
) {
  return invokeCoachAuth("create-coach", { name, email, phone });
}

export async function createCoachAccess(coachId: string, email: string) {
  return invokeCoachAuth("create-coach-access", { coachId, email });
}

export async function resetCoachPassword(coachId: string) {
  return invokeCoachAuth("reset-coach-password", { coachId });
}

export async function deleteCoachAccess(coachId: string) {
  return invokeCoachAuth("delete-coach-access", { coachId });
}
