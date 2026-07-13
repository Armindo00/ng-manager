import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

function formatInvokeError(error: unknown, data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: string }).error);
  }

  if (error instanceof FunctionsHttpError) {
    return `Erro na Edge Function (${error.context.status}).`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro ao atualizar a conta.";
}

export async function completePasswordChange() {
  const { data, error } = await supabase.functions.invoke("admin-student-auth", {
    body: { action: "complete-password-change" },
  });

  if (error) {
    throw new Error(formatInvokeError(error, data));
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }
}
