# NG Manager

App interna da **NextGeneration Surf School** para treinadores e administração.

## Fluxo principal

1. **Hoje** — o treinador escolhe o grupo fixo que deu, regista a sessão e marca presenças (pode indicar 2.º treinador).
2. **Grupos fixos** — escala semanal completa (`src/data/fixedTrainings.ts`).
3. **Os meus treinos** — totais mensais (água + videoanálise).
4. **Admin → Calendário** — mostra grupos fixos planeados + treinos já registados.
5. **Admin → Treinos / mês** — totais por treinador.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Para SQL: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.

```bash
npm run db:apply
```

## Notas

- O login de **alunos** está desativado de momento.
- **Grupos (DB)** e **Horários** são legado / avançado — o dia a dia usa os grupos fixos.
