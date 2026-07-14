# Migrations NG Manager

Ordem de aplicação (idempotente — seguro em BD existente):

| # | Ficheiro | Conteúdo |
|---|----------|----------|
| 1 | `001_baseline_schema.sql` | Tabelas base + índices |
| 2 | `../rls.sql` | Funções auth, RLS unificado (email case-insensitive) |
| 3 | `../compensations.sql` | Tabela + RLS compensações |
| 4 | `../vans.sql` | Carrinhas + tarefas |
| 5 | `../inventory.sql` | Inventário |
| 6 | `../generate-lessons.sql` | Geração diária de rascunhos (Lisbon) |
| 7 | `../lesson-rpcs.sql` | RPC `update_lesson_response` |
| 8 | `../publish-schedule.sql` | RPC `publish_recurring_schedule` |
| 9 | `../constraints.sql` | FKs, índices únicos, trigger IDs |

## Aplicar tudo

```powershell
$env:SUPABASE_ACCESS_TOKEN="seu-token"
npm run db:apply
```

## Aplicar só RLS (legado)

```powershell
npm run db:apply-rls
```

## Ficheiros legados (não usar em deploy novo)

- `fix-rls-email.sql` — fundido em `rls.sql`
- `generate-lessons-fix.sql` — duplicado de `generate-lessons.sql`
- `compensations-fix.sql` — políticas já em `compensations.sql`
- `verify-users.sql`, `fix-student-link.sql`, `link-student-access.sql` — scripts de reparação pontual

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `SUPABASE_ACCESS_TOKEN` | Scripts `db:apply` / `db:apply-rls` |
| `SUPABASE_PROJECT_REF` | Opcional (default: projeto NG) |
| `VITE_SUPABASE_URL` | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Frontend |
| `CRON_SECRET` | Edge function `generate-lessons` (obrigatório) |
