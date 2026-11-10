import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { toErrorMessage } from "../utils/errorMessage";

export type CoachAccess = {
  coachId: string;
  appUserId: string;
  email: string;
  blocked: boolean;
};

export type CoachAuthResult = {
  hasAccess: boolean;
  blocked?: boolean;
  coachId?: string;
  email?: string;
  password?: string;
  error?: string;
  repaired?: boolean;
};

type Action =
  | "create-coach"
  | "create-coach-access"
  | "reset-coach-password"
  | "toggle-coach-block"
  | "delete-coach-access"
  | "ensure-school-coach";

async function readFunctionError(
  error: unknown,
  data: unknown
): Promise<string> {
  if (data && typeof data === "object") {
    const message = toErrorMessage(data, "");
    if (message) return message;
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      const message = toErrorMessage(payload, "");
      if (message) {
        return `${message} (HTTP ${error.context.status})`;
      }
    } catch {
      try {
        const text = await error.context.text();
        if (text?.trim() && text.trim() !== "{}") {
          return `${text.trim()} (HTTP ${error.context.status})`;
        }
      } catch {
        // ignore
      }
    }

    return `Falha na função admin-student-auth (HTTP ${error.context.status}). Confirma no Supabase se a Edge Function está publicada.`;
  }

  return toErrorMessage(error, "Erro ao gerir acesso do treinador.");
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
    throw new Error(await readFunctionError(error, data));
  }

  if (data?.error) {
    throw new Error(
      toErrorMessage(data.error, "Erro ao gerir acesso do treinador.")
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "A função admin-student-auth não devolveu dados. Confirma o deploy no Supabase."
    );
  }

  return data as CoachAuthResult;
}

export async function getCoachAccessMap() {
  let rows:
    | Array<{
        id: string;
        email: string;
        blocked?: boolean;
      }>
    | null = null;

  const withBlocked = await supabase
    .from("app_users")
    .select("id, email, blocked")
    .eq("role", "coach");

  if (withBlocked.error?.message?.includes("blocked")) {
    const withoutBlocked = await supabase
      .from("app_users")
      .select("id, email")
      .eq("role", "coach");

    if (withoutBlocked.error) throw withoutBlocked.error;
    rows = withoutBlocked.data;
  } else {
    if (withBlocked.error) throw withBlocked.error;
    rows = withBlocked.data;
  }

  const map = new Map<string, CoachAccess>();

  for (const row of rows || []) {
    map.set(row.id, {
      coachId: row.id,
      appUserId: row.id,
      email: row.email,
      blocked: row.blocked ?? false,
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

export async function ensureSchoolCoach(name: string) {
  return invokeCoachAuth("ensure-school-coach", {
    name,
    email: undefined,
    phone: "-",
  });
}

export async function createCoachAccess(coachId: string, email: string) {
  return invokeCoachAuth("create-coach-access", { coachId, email });
}

export async function resetCoachPassword(coachId: string) {
  return invokeCoachAuth("reset-coach-password", { coachId });
}

export async function toggleCoachBlock(coachId: string) {
  return invokeCoachAuth("toggle-coach-block", { coachId });
}

export async function deleteCoachAccess(coachId: string) {
  return invokeCoachAuth("delete-coach-access", { coachId });
}
