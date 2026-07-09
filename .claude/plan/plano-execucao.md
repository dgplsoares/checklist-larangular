# Plano de Execução — Refatoração Checklist

> Fases da refatoração. O detalhamento por fase (tarefas, checklists, ordem de
> execução) é produzido na análise/planejamento amplo (roadmap master) — próxima etapa.
> Achados que originam o trabalho: `.claude/docs/analise-preliminar.md`.

## Fases

### Fase 1 — Backend (Laravel)
Objetivo: sair do arquivo JSON para persistência real e camadas idiomáticas.
Escopo: Model + migration (SQLite), Controller, FormRequest, API Resource, rotas `/api`
(grupo `api`), endpoint de atualização (`PATCH`) para concluir tarefa, 404/422 corretos,
CORS nativo. Cobre os achados **Laravel 1–7**.

### Fase 2 — Frontend (Angular)
Objetivo: sair do God Component para arquitetura standalone moderna.
Escopo: `interface Todo`, `TodoService`, `provideHttpClient`, environments,
componentização, signals + OnPush + `inject()`, control flow `@if/@for`, SCSS
responsivo, tratamento de erro real. Cobre os achados **Angular 1–8**.

### Fase 3 — Testes
Objetivo: rede de segurança e critério de aceite.
Escopo: PHPUnit feature (CRUD + 422 + 404 + toggle) no backend; specs de service e de
componente no frontend.

### Fase 4 — Infra / DX
Objetivo: reprodutibilidade e qualidade contínua.
Escopo: corrigir `docker-compose`/Dockerfiles (achado **Infra 1**), CI (GitHub Actions),
lint (Pint no PHP, Prettier/ESLint no Angular).

### Fase 5 — README de entrega
Objetivo: comunicar tecnologias, decisões de arquitetura, antes→depois, como rodar,
uso de IA/SDD e próximos passos.

### Fase 6 — Verificação final e entrega
Objetivo: subir do zero, exercitar os fluxos (incluindo responsivo), commits semânticos
e tornar o repositório público.

## Detalhamento por fase

> _(A ser preenchido na análise/planejamento amplo — roadmap master.)_
