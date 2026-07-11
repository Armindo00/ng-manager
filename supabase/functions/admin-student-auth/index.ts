import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "create" | "reset-password" | "toggle-block" | "delete-access" | "update-email";

type RequestBody = {
  action: Action;
  studentId: string;
  name?: string;
  email?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";

  for (let index = 0; index < length; index += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

async function assertAdmin(authHeader: string | null) {
  if (!authHeader) {
    throw new Error("Sessão inválida.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user?.email) {
    throw new Error("Sessão inválida.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: appUser, error: appUserError } = await adminClient
    .from("app_users")
    .select("role")
    .eq("email", user.email)
    .single();

  if (appUserError || appUser?.role !== "admin") {
    throw new Error("Apenas administradores podem gerir acessos.");
  }

  return adminClient;
}

async function findStudentAccess(adminClient: ReturnType<typeof createClient>, studentId: string) {
  const { data, error } = await adminClient
    .from("app_users")
    .select("id, email, blocked")
    .eq("student_id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (error) throw error;

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = await assertAdmin(req.headers.get("Authorization"));
    const body = (await req.json()) as RequestBody;

    if (!body.studentId || !body.action) {
      return jsonResponse({ error: "Pedido inválido." }, 400);
    }

    if (body.action === "create") {
      if (!body.name || !body.email) {
        return jsonResponse({ error: "Nome e email são obrigatórios." }, 400);
      }

      const existing = await findStudentAccess(adminClient, body.studentId);

      if (existing) {
        return jsonResponse({
          error: "Este aluno já tem acesso criado.",
          hasAccess: true,
          blocked: existing.blocked ?? false,
        }, 409);
      }

      const password = generatePassword();

      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: body.email,
          password,
          email_confirm: true,
          user_metadata: {
            name: body.name,
            role: "student",
          },
        });

      if (authError || !authData.user) {
        return jsonResponse({
          error: authError?.message || "Erro ao criar utilizador de acesso.",
        }, 400);
      }

      const { error: appUserError } = await adminClient.from("app_users").insert({
        id: authData.user.id,
        name: body.name,
        email: body.email,
        role: "student",
        student_id: body.studentId,
        blocked: false,
      });

      if (appUserError) {
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return jsonResponse({ error: appUserError.message }, 400);
      }

      return jsonResponse({
        hasAccess: true,
        blocked: false,
        email: body.email,
        password,
      });
    }

    const access = await findStudentAccess(adminClient, body.studentId);

    if (!access) {
      return jsonResponse({ error: "Este aluno ainda não tem acesso criado." }, 404);
    }

    if (body.action === "reset-password") {
      const password = generatePassword();

      const { error } = await adminClient.auth.admin.updateUserById(access.id, {
        password,
        ban_duration: "none",
      });

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      await adminClient
        .from("app_users")
        .update({ blocked: false })
        .eq("id", access.id);

      return jsonResponse({
        hasAccess: true,
        blocked: false,
        email: access.email,
        password,
      });
    }

    if (body.action === "toggle-block") {
      const shouldBlock = !(access.blocked ?? false);

      const { error } = await adminClient.auth.admin.updateUserById(access.id, {
        ban_duration: shouldBlock ? "876000h" : "none",
      });

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      await adminClient
        .from("app_users")
        .update({ blocked: shouldBlock })
        .eq("id", access.id);

      return jsonResponse({
        hasAccess: true,
        blocked: shouldBlock,
        email: access.email,
      });
    }

    if (body.action === "delete-access") {
      const { error: authError } = await adminClient.auth.admin.deleteUser(access.id);

      if (authError) {
        return jsonResponse({ error: authError.message }, 400);
      }

      await adminClient.from("app_users").delete().eq("id", access.id);

      return jsonResponse({ hasAccess: false, blocked: false });
    }

    if (body.action === "update-email") {
      if (!body.email) {
        return jsonResponse({ error: "Email é obrigatório." }, 400);
      }

      const { error } = await adminClient.auth.admin.updateUserById(access.id, {
        email: body.email,
      });

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      await adminClient
        .from("app_users")
        .update({ email: body.email })
        .eq("id", access.id);

      return jsonResponse({
        hasAccess: true,
        blocked: access.blocked ?? false,
        email: body.email,
      });
    }

    return jsonResponse({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ error: message }, 400);
  }
});
