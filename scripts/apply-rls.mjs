import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "zhcupwgfxrwawqcyejrx";
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error(
    "Falta SUPABASE_ACCESS_TOKEN.\n\n" +
      "1. Vai a https://supabase.com/dashboard/account/tokens\n" +
      "2. Cria um Personal Access Token\n" +
      "3. Executa:\n" +
      '   $env:SUPABASE_ACCESS_TOKEN="seu-token"; npm run db:apply-rls'
  );
  process.exit(1);
}

const sqlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "rls.sql"
);
const sql = readFileSync(sqlPath, "utf8");

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
  console.error(`Erro ao aplicar RLS (${response.status}):`);
  console.error(errorText);
  process.exit(1);
}

const result = await response.json().catch(() => null);

console.log("RLS aplicado com sucesso no projeto", PROJECT_REF);

if (result) {
  console.log(result);
}
