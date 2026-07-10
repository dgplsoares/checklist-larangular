# Plano de Execução — Refatoração Checklist

> Índice das fases. O **detalhamento** (tarefas, comandos, critério de aceite, riscos)
> está em `.claude/plan/roadmap-master.md`. Achados: `.claude/docs/analise-preliminar.md`.
> Fluxo de execução: **DEC-003** (contract-first, testes woven, gate E2E no fim).

## Fases

1. **Backend (Laravel) + feature tests** — contrato da API sob `/api`, SQLite/Eloquent, `PATCH` toggle, 404/422, CORS restrito. Fecha **Laravel 1–7**.
2. **Frontend (Angular) + specs** — `interface Todo`, `TodoService`, `provideHttpClient`, environments, componentização, signals + OnPush, `@if/@for`, SCSS responsivo, erro real. Consome o contrato da Fase 1. Fecha **Angular 1–8**.
3. **Infra / DX / CI** — docker path coerente (`/var/www`, `/app`), Dockerfiles, CI (GitHub Actions), lint. Fecha **Infra 1**.
4. **README de entrega** — stack, decisões (via `DECISIONS.md`), tabela antes→depois, como rodar, IA/SDD, próximos passos.
5. **Verificação final (E2E conectado) + entrega** — smoke do zero, fluxos reais (concluir/L4, responsivo/A7, erro real/A8, CORS restrito/L7, `@empty`/A6), commits semânticos, repositório público.

> A antiga "Fase 3 — Testes" separada foi **dissolvida** (testes tecidos nas Fases 1 e 2), conforme **DEC-003**.
