import type { User } from "../types";
import { supabase } from "./supabase";
import { getUserByEmail, isUserBlocked } from "./usersService";

export type SessionResolveResult =
  | { ok: true; user: User }
  | { ok: false; reason: "blocked" | "student" | "missing" | "error"; message: string };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve app_users for an auth email.
 * Retries briefly — right after signIn the JWT/session can still be settling,
 * and querying inside onAuthStateChange can race without a short defer/retry.
 */
export async function resolveAppUserFromEmail(
  email: string,
  options?: { retries?: number }
): Promise<SessionResolveResult> {
  const retries = options?.retries ?? 3;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const appUser = await getUserByEmail(email);

      if (isUserBlocked(appUser)) {
        return {
          ok: false,
          reason: "blocked",
          message: "Conta bloqueada. Contacta a escola.",
        };
      }

      if (appUser.role === "student") {
        return {
          ok: false,
          reason: "student",
          message: "O acesso de alunos está desativado. Contacta a escola.",
        };
      }

      return { ok: true, user: appUser };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await wait(150 * (attempt + 1));
      }
    }
  }

  console.error(lastError);
  return {
    ok: false,
    reason: "missing",
    message: "Este utilizador ainda não tem permissões na aplicação.",
  };
}

export async function resolveSessionUser(): Promise<SessionResolveResult> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error(error);
    return {
      ok: false,
      reason: "error",
      message: "Sessão inválida. Volta a iniciar sessão.",
    };
  }

  const email = data.session?.user?.email;
  if (!email) {
    return {
      ok: false,
      reason: "missing",
      message: "Sem sessão ativa.",
    };
  }

  return resolveAppUserFromEmail(email);
}
