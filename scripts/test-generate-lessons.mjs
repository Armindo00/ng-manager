import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zhcupwgfxrwawqcyejrx.supabase.co",
  "sb_publishable_VhLGfEXOxTdmwYkANRHk0g_KVsxWBLI"
);

const accounts = [
  { email: "armindo.j.costa@hotmail.com", password: "12345678" },
  { email: "admin@test.com", password: "12345678" },
];

for (const account of accounts) {
  console.log(`\n=== Teste ${account.email} ===`);

  const login = await supabase.auth.signInWithPassword(account);

  if (login.error) {
    console.log("Login falhou:", login.error.message);
    continue;
  }

  console.log("Login OK");

  const { data, error } = await supabase.rpc("generate_lessons_from_recurring");

  if (error) {
    console.log("RPC erro:", error.message);
    console.log("Detalhes:", error);
  } else {
    console.log("RPC sucesso, criados:", data);
  }

  await supabase.auth.signOut();
}

const { error: anonError } = await supabase.rpc("generate_lessons_from_recurring");
console.log("\n=== Sem login ===");
console.log(anonError ? anonError.message : "funcionou sem login");
