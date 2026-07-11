import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action =
  | "create"
  | "reset-password"
  | "toggle-block"
  | "delete-access"
  | "update-email"
  | "create-coach"
  | "create-coach-access"
  | "reset-coach-password"
  | "delete-coach-access";

type RequestBody = {
  action: Action;
  studentId?: string;
  coachId?: string;
  name?: string;
  email?: string;
  phone?: string;
};

const STUDENT_ACTIONS = new Set<Action>([
  "create",
  "reset-password",
  "toggle-block",
  "delete-access",
  "update-email",
]);

const COACH_ACCESS_ACTIONS = new Set<Action>([
  "create-coach-access",
  "reset-coach-password",
  "delete-coach-access",
]);

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
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    blocked: data.blocked ?? false,
  };
}

async function findCoachAccess(adminClient: ReturnType<typeof createClient>, coachId: string) {
  const { data, error } = await adminClient
    .from("app_users")
    .select("id, email")
    .eq("id", coachId)
    .eq("role", "coach")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
  };
}

async function reassignCoachReferences(
  adminClient: ReturnType<typeof createClient>,
  oldCoachId: string,
  newCoachId: string
) {
  if (oldCoachId === newCoachId) return;

  const tables = ["groups", "lessons", "recurring_trainings", "evaluations"] as const;

  for (const table of tables) {
    const { error } = await adminClient
      .from(table)
      .update({ coach_id: newCoachId })
      .eq("coach_id", oldCoachId);

    if (error) throw error;
  }
}

function sanitizeEmail(email: string) {
  return email
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email: string) {
  const normalized = sanitizeEmail(email);
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized);
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string
) {
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw error;

  const normalized = sanitizeEmail(email);

  return (
    data.users.find(
      (user) => user.email && sanitizeEmail(user.email) === normalized
    ) ?? null
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = await assertAdmin(req.headers.get("Authorization"));
    const body = (await req.json()) as RequestBody;

    if (!body.action) {
      return jsonResponse({ error: "Pedido inválido." }, 400);
    }

    if (STUDENT_ACTIONS.has(body.action) && !body.studentId) {
      return jsonResponse({ error: "studentId é obrigatório." }, 400);
    }

    if (COACH_ACCESS_ACTIONS.has(body.action) && !body.coachId) {
      return jsonResponse({ error: "coachId é obrigatório." }, 400);
    }

    if (body.action === "create-coach") {
      if (!body.name || !body.email || !body.phone) {
        return jsonResponse({ error: "Nome, email e telefone são obrigatórios." }, 400);
      }

      const normalizedEmail = sanitizeEmail(String(body.email ?? ""));

      if (!isValidEmail(normalizedEmail)) {
        return jsonResponse({
          error: `Email inválido: "${body.email}". Usa um formato como treinador@escola.com`,
        }, 400);
      }

      const existingCoachUser = await findAuthUserByEmail(adminClient, normalizedEmail);

      if (existingCoachUser) {
        return jsonResponse({
          error: "Já existe uma conta com este email.",
        }, 409);
      }

      const password = generatePassword();

      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: body.name,
            role: "coach",
          },
        });

      if (authError || !authData.user) {
        return jsonResponse({
          error: authError?.message || "Erro ao criar utilizador de acesso.",
        }, 400);
      }

      const coachId = authData.user.id;

      const { error: coachError } = await adminClient.from("coaches").insert({
        id: coachId,
        name: body.name,
        phone: body.phone,
      });

      if (coachError) {
        await adminClient.auth.admin.deleteUser(coachId);
        return jsonResponse({ error: coachError.message }, 400);
      }

      const { error: appUserError } = await adminClient.from("app_users").insert({
        id: coachId,
        name: body.name,
        email: normalizedEmail,
        role: "coach",
      });

      if (appUserError) {
        await adminClient.from("coaches").delete().eq("id", coachId);
        await adminClient.auth.admin.deleteUser(coachId);
        return jsonResponse({ error: appUserError.message }, 400);
      }

      return jsonResponse({
        hasAccess: true,
        coachId,
        email: normalizedEmail,
        password,
      });
    }

    if (body.action === "create-coach-access") {
      if (!body.email) {
        return jsonResponse({ error: "Email é obrigatório." }, 400);
      }

      const normalizedEmail = sanitizeEmail(String(body.email ?? ""));

      if (!isValidEmail(normalizedEmail)) {
        return jsonResponse({
          error: `Email inválido: "${body.email}". Usa um formato como treinador@escola.com`,
        }, 400);
      }

      const existingAccess = await findCoachAccess(adminClient, body.coachId!);

      if (existingAccess) {
        return jsonResponse({
          error: "Este treinador já tem acesso criado.",
          hasAccess: true,
        }, 409);
      }

      const { data: coach, error: coachLookupError } = await adminClient
        .from("coaches")
        .select("id, name, phone")
        .eq("id", body.coachId!)
        .maybeSingle();

      if (coachLookupError || !coach) {
        return jsonResponse({ error: "Treinador não encontrado." }, 404);
      }

      const password = generatePassword();
      let authUserId: string | null = null;
      let createdPassword: string | undefined = password;
      const oldCoachId = coach.id;

      const existingAuthUser = await findAuthUserByEmail(adminClient, normalizedEmail);

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
        createdPassword = undefined;

        const { error: updateError } =
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password,
            email_confirm: true,
            ban_duration: "none",
            user_metadata: {
              name: coach.name,
              role: "coach",
            },
          });

        if (updateError) {
          return jsonResponse({ error: updateError.message }, 400);
        }
      } else {
        const { data: authData, error: authError } =
          await adminClient.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
              name: coach.name,
              role: "coach",
            },
          });

        if (authError || !authData.user) {
          return jsonResponse({
            error: authError?.message || "Erro ao criar utilizador de acesso.",
          }, 400);
        }

        authUserId = authData.user.id;
      }

      if (authUserId !== oldCoachId) {
        await reassignCoachReferences(adminClient, oldCoachId, authUserId);
        await adminClient.from("coaches").delete().eq("id", oldCoachId);

        const { error: coachInsertError } = await adminClient.from("coaches").insert({
          id: authUserId,
          name: coach.name,
          phone: coach.phone,
        });

        if (coachInsertError) {
          return jsonResponse({ error: coachInsertError.message }, 400);
        }
      }

      const { error: appUserError } = await adminClient.from("app_users").insert({
        id: authUserId,
        name: coach.name,
        email: normalizedEmail,
        role: "coach",
      });

      if (appUserError) {
        return jsonResponse({ error: appUserError.message }, 400);
      }

      return jsonResponse({
        hasAccess: true,
        coachId: authUserId,
        email: normalizedEmail,
        password: createdPassword,
        linkedExistingAuthUser: Boolean(existingAuthUser),
      });
    }

    if (body.action === "reset-coach-password") {
      const access = await findCoachAccess(adminClient, body.coachId!);

      if (!access) {
        return jsonResponse({ error: "Este treinador ainda não tem acesso criado." }, 404);
      }

      const password = generatePassword();

      const { error } = await adminClient.auth.admin.updateUserById(access.id, {
        password,
        ban_duration: "none",
      });

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse({
        hasAccess: true,
        email: access.email,
        password,
      });
    }

    if (body.action === "delete-coach-access") {
      const access = await findCoachAccess(adminClient, body.coachId!);

      if (!access) {
        return jsonResponse({ error: "Este treinador ainda não tem acesso criado." }, 404);
      }

      const { error: authError } = await adminClient.auth.admin.deleteUser(access.id);

      if (authError) {
        return jsonResponse({ error: authError.message }, 400);
      }

      await adminClient.from("app_users").delete().eq("id", access.id);

      return jsonResponse({ hasAccess: false });
    }

    if (body.action === "create") {
      if (!body.name || !body.email) {
        return jsonResponse({ error: "Nome e email são obrigatórios." }, 400);
      }

      const normalizedEmail = sanitizeEmail(String(body.email ?? ""));

      if (!isValidEmail(normalizedEmail)) {
        return jsonResponse({
          error: `Email inválido: "${body.email}". Usa um formato como aluno@escola.com`,
          debug: {
            received: body.email,
            normalized: normalizedEmail,
            length: normalizedEmail.length,
          },
        }, 400);
      }

      const existing = await findStudentAccess(adminClient, body.studentId);

      if (existing) {
        return jsonResponse({
          error: "Este aluno já tem acesso criado.",
          hasAccess: true,
          blocked: existing.blocked ?? false,
        }, 409);
      }

      const { data: orphanAppUser, error: orphanLookupError } = await adminClient
        .from("app_users")
        .select("id, student_id, email, blocked")
        .ilike("email", normalizedEmail)
        .eq("role", "student")
        .maybeSingle();

      if (orphanLookupError) {
        return jsonResponse({ error: orphanLookupError.message }, 400);
      }

      if (orphanAppUser) {
        if (orphanAppUser.student_id && orphanAppUser.student_id !== body.studentId) {
          return jsonResponse({
            error: "Este email já está ligado a outro aluno.",
          }, 409);
        }

        if (!orphanAppUser.student_id) {
          const { error: repairError } = await adminClient
            .from("app_users")
            .update({
              student_id: body.studentId,
              name: body.name,
              email: normalizedEmail,
              blocked: false,
            })
            .eq("id", orphanAppUser.id);

          if (repairError) {
            return jsonResponse({ error: repairError.message }, 400);
          }

          return jsonResponse({
            hasAccess: true,
            blocked: orphanAppUser.blocked ?? false,
            email: normalizedEmail,
            repairedExistingAccess: true,
          });
        }
      }

      const password = generatePassword();
      let authUserId: string | null = null;
      let createdPassword: string | undefined = password;

      const existingAuthUser = await findAuthUserByEmail(
        adminClient,
        normalizedEmail
      );

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
        createdPassword = undefined;

        const { error: updateError } =
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password,
            email_confirm: true,
            ban_duration: "none",
            user_metadata: {
              name: body.name,
              role: "student",
            },
          });

        if (updateError) {
          return jsonResponse({ error: updateError.message }, 400);
        }
      } else {
        const { data: authData, error: authError } =
          await adminClient.auth.admin.createUser({
            email: normalizedEmail,
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
            debug: {
              email: normalizedEmail,
              length: normalizedEmail.length,
            },
          }, 400);
        }

        authUserId = authData.user.id;
      }

      const { error: appUserError } = await adminClient.from("app_users").insert({
        id: authUserId,
        name: body.name,
        email: normalizedEmail,
        role: "student",
        student_id: body.studentId,
      });

      if (appUserError) {
        if (!existingAuthUser && authUserId) {
          await adminClient.auth.admin.deleteUser(authUserId);
        }

        return jsonResponse({ error: appUserError.message }, 400);
      }

      return jsonResponse({
        hasAccess: true,
        blocked: false,
        email: normalizedEmail,
        password: createdPassword,
        linkedExistingAuthUser: Boolean(existingAuthUser),
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
        .eq("id", access.id)
        .then(() => undefined)
        .catch(() => undefined);

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
        .eq("id", access.id)
        .then(() => undefined)
        .catch(() => undefined);

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

      const normalizedEmail = sanitizeEmail(String(body.email ?? ""));

      if (!isValidEmail(normalizedEmail)) {
        return jsonResponse({
          error: `Email inválido: "${body.email}". Usa um formato como aluno@escola.com`,
        }, 400);
      }

      const { error } = await adminClient.auth.admin.updateUserById(access.id, {
        email: normalizedEmail,
      });

      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      await adminClient
        .from("app_users")
        .update({ email: normalizedEmail })
        .eq("id", access.id);

      return jsonResponse({
        hasAccess: true,
        blocked: access.blocked ?? false,
        email: normalizedEmail,
      });
    }

    return jsonResponse({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ error: message }, 400);
  }
});
