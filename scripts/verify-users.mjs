import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zhcupwgfxrwawqcyejrx.supabase.co";
const supabaseAnonKey = "sb_publishable_VhLGfEXOxTdmwYkANRHk0g_KVsxWBLI";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testAccounts = [
  { email: "admin@test.com", password: "12345678", role: "admin" },
];

async function tryLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

async function fetchTable(table) {
  const { data, error } = await supabase.from(table).select("*");
  return { data, error };
}

async function main() {
  console.log("=== Verificação app_users / coaches / students ===\n");

  const login = await tryLogin("admin@test.com", "12345678");

  if (login.error) {
    console.log("Login admin@test.com:", login.error.message);
    console.log("\nTentando leitura sem autenticação...\n");
  } else {
    console.log("Login admin@test.com: OK");
    console.log("Auth email:", login.data.user?.email);
    console.log("Auth user id:", login.data.user?.id, "\n");
  }

  const tables = ["app_users", "coaches", "students"];

  for (const table of tables) {
    const { data, error } = await fetchTable(table);

    if (error) {
      console.log(`${table}: ERRO -> ${error.message}`);
      continue;
    }

    console.log(`${table}: ${data.length} registo(s)`);
    console.log(JSON.stringify(data, null, 2));
    console.log("");
  }

  const { data: appUsers } = await fetchTable("app_users");
  const { data: coaches } = await fetchTable("coaches");
  const { data: students } = await fetchTable("students");

  if (!appUsers || appUsers.length === 0) {
    console.log("Não foi possível ler app_users. RLS pode estar ativo sem admin configurado.");
    return;
  }

  console.log("=== Análise de ligações ===\n");

  const coachIds = new Set((coaches || []).map((c) => c.id));
  const studentIds = new Set((students || []).map((s) => s.id));

  for (const user of appUsers) {
    const issues = [];

    if (!user.email) {
      issues.push("sem email");
    }

    if (user.role === "coach" && !coachIds.has(user.id)) {
      issues.push(`id ${user.id} não existe em coaches`);
    }

    if (user.role === "student") {
      if (!user.student_id) {
        issues.push("student_id em falta");
      } else if (!studentIds.has(user.student_id)) {
        issues.push(`student_id ${user.student_id} não existe em students`);
      }
    }

    if (user.role === "admin" && user.student_id) {
      issues.push("admin não deve ter student_id");
    }

    const status = issues.length === 0 ? "OK" : `PROBLEMAS: ${issues.join("; ")}`;
    console.log(`- ${user.name} (${user.email}) [${user.role}] -> ${status}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
