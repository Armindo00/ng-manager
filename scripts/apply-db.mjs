import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "zhcupwgfxrwawqcyejrx";
const token = process.env.SUPABASE_ACCESS_TOKEN;

const APPLY_ORDER = [
  "fix-duplicate-emails.sql",
  "migrations/001_baseline_schema.sql",
  "rls.sql",
  "compensations.sql",
  "vans.sql",
  "inventory.sql",
  "generate-lessons.sql",
  "lesson-rpcs.sql",
  "publish-schedule.sql",
  "constraints.sql",
];

if (!token) {
  console.error(
    "Falta SUPABASE_ACCESS_TOKEN.\n\n" +
      "1. Vai a https://supabase.com/dashboard/account/tokens\n" +
      "2. Cria um Personal Access Token\n" +
      "3. Executa:\n" +
      '   $env:SUPABASE_ACCESS_TOKEN="seu-token"; npm run db:apply'
  );
  process.exit(1);
}

const supabaseDir = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase");

async function runQuery(sql, label) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Erro em ${label} (${response.status}):`);
    console.error(errorText);
    process.exit(1);
  }

  return response.json().catch(() => null);
}

console.log(`A aplicar ${APPLY_ORDER.length} ficheiros SQL no projeto ${PROJECT_REF}...\n`);

for (const relativePath of APPLY_ORDER) {
  const sqlPath = join(supabaseDir, relativePath);
  const sql = readFileSync(sqlPath, "utf8");

  console.log(`→ ${relativePath}`);
  await runQuery(sql, relativePath);
}

console.log("\nBase de dados atualizada com sucesso.");
