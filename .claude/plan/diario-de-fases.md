# Diário de Fases

> Registro curto por fase: reanálise pré-fase (mini-roadmap), descobertas e decisões.
> Ver protocolo §7.

## Fase 0 — Análise preliminar  [concluída]

- Análise guiada pela arquitetura esperada de cada stack (esperado × real), por estação
  (Laravel) e por camada (Angular).
- Saída: `.claude/docs/analise-preliminar.md` — 7 achados Laravel, 8 Angular, 1 infra.
- Método: levantamento manual com apoio de IA (Claude Code) e verificação adversarial
  de precisão de versão (ex.: `HttpClientModule` não é `@deprecated` no Angular 17.3 —
  isso veio no v18; `httpResource`/`resource()` só existem a partir do v19).
- Próximo: planejamento amplo (roadmap master) e definição do fluxo de trabalho.

## Fase 1 — Backend (Laravel) + feature tests  [concluída]

**Reanálise pré-fase (mini-roadmap):** (1) ambiente Docker; (2) rotas `/api` (`install:api --force`) + limpar `web.php`; (3) domínio (Model/migration/factory, FormRequests, Resource); (4) `TarefaController --api` + `apiResource` (fecha o gap `PATCH`/L4); (5) CORS restrito + limpeza + feature tests.

**Descobertas / desvios do roadmap:**
- **`pdo_sqlite` antecipado da Fase 3 → Fase 1.** O item "Dockerfile: `libsqlite3-dev` + `pdo_sqlite`" estava na Fase 3, mas é **pré-requisito** do `migrate` no SQLite — sem ele o ambiente não sobe. Trazido para o bloco 1. O restante do fix de Infra (`working_dir` do compose) permanece na Fase 3.
- **Dev-loop sem PHP local:** comandos rodam via `docker compose run --rm -w /var/www laravel <cmd>` — o `-w /var/www` aponta para o código montado, contornando o path bug do compose (corrigido só na Fase 3).
- Warning `version obsolete` no `docker-compose.yml` (cosmético) — remover na Fase 3.
- **Container roda como root → arquivos gerados ficam `root:root`.** As pastas novas `app/Http/Requests` e `app/Http/Resources` ficaram inacessíveis para edição pelo host (EACCES). Mitigação: `sudo chown -R 1000:1000 backend`. Fix limpo (mapear usuário do container p/ o host ou `chown` no entrypoint) → Fase 3.

**Progresso (blocos):**
- **B1 — Ambiente:** build com `pdo_sqlite`/`sqlite3`; `composer install` (Laravel v11.45.1); `.env` + APP_KEY; `migrate` inicial (users/cache/jobs).
- **B2 — Rotas `/api`:** `install:api --force` inseriu `api:` no `bootstrap/app.php` (prefixo `/api`, grupo `api`) e trouxe o Sanctum (ocioso); `web.php` limpo (removido o `require`).
- **B3 — Domínio:** Model `Tarefa` (`$fillable` + cast boolean), migration `tarefas`, factory, `Store/UpdateTarefaRequest` (422), `TarefaResource`; `migrate` da tabela `tarefas`.
- **B4 — Controller + rotas:** `TarefaController --api` fino; `routes/api.php` só com `apiResource('tarefas')` (`update` = PUT|PATCH → fecha o gap **L4**).
- **B5 — CORS + testes:** `config/cors.php` restrito a `:4200` (paths `api/*`); `CorsMiddleware` custom removido (HandleCors nativo); `phpunit.xml` em SQLite `:memory:`; **7 feature tests verdes** (CRUD + 422 + 404 + toggle). Removidos `CorsMiddleware`, `storage/tarefas.json` e os `ExampleTest`.

**Fechamento — descobertas/decisões:**
- FormRequest do L11 vem com `authorize(): false` → ajustado para `true` (senão 403 em tudo).
- `git rm` do último arquivo de `tests/Unit` levou o diretório junto → suíte `Unit` removida do `phpunit.xml` (só Feature; right-sizing p/ CRUD fino).
- Sanctum instalado por `install:api` e **ocioso** (migration `personal_access_tokens` roda mas sem uso) — auth fora de escopo; documentar no README.
- `composer audit` reportou 24 advisories (deps do lock) — revisar na Fase 3/README.
- **Achados fechados:** Laravel 1–7 (L1 rotas `/api` · L2 controller · L3 validação · L4 PATCH/gap · L5 Model+SQLite · L6 Resource · L7 CORS restrito).

## Fase 2 — Frontend (Angular) + specs  [concluída]

**Reanálise pré-fase:** dev loop **local** (Node 20, sem Docker/root); contrato mudou p/ `/api/tarefas` (prefixo da Fase 1); ordem crítica signal→OnPush; `destroyRef` p/ `takeUntilDestroyed`. Detalhamento no doc dedicado `roadmap-fase2-frontend.md`.

**Progresso (blocos):**
- **B1 — Base:** `npm ci`, `ng generate environments` (apiUrl `/api/tarefas`, absoluta em dev), `provideHttpClient(withFetch())`, `interface Todo`.
- **B2 — Service:** `TodoService` tipado (GET/POST/PATCH/DELETE), com **unwrap do envelope `data`** (API Resource).
- **B3 — Componentes:** `todo-form`/`todo-list`/`todo-item` (signal `input()/output()`, OnPush) + `AppComponent` fino (signals, `inject`, `takeUntilDestroyed`, updates imutáveis, sem `HttpClientModule`/dados falsos). Build verde.
- **B4 — Template/estilos:** `@if/@for track`/`@empty`, `[class.completed]`, SCSS responsivo (tokens `:root`, `clamp`, sem px fixo), erro real (carga com retry; erro de ação sem apagar a lista).
- **B5 — Specs + E2E:** 10 testes verdes (service via `HttpTestingController` + 3 componentes) + E2E manual (7 checks) validado.

**Descobertas/decisões:**
- Respostas do backend vêm **envelopadas em `data`** (API Resource) → o service desembrulha (`map(r => r.data)`). Detalhe que o contract-first fez aparecer na hora certa.
- Specs stub do `ng generate component` **quebram** com `input.required()` sem valor → reescritos com `fixture.componentRef.setInput`.
- **`withFetch()` fora do teste:** `provideHttpClient(withFetch())` fura o `HttpTestingController` (vai à rede real) → usar `provideHttpClient()` + `provideHttpClientTesting()`.
- `npm audit`: 73 vulnerabilidades (deps transitivas do Angular 17.3) — revisar no README (próximos passos).
- **Achados fechados:** Angular 1–8.

## Fase 3 — Infra / DX / CI  [concluída]

**Reanálise pré-fase:** `docker-compose.yml` com `version` obsoleto e path descasado nos **dois** serviços (laravel `/backend`≠`/var/www`; angular `/frontend`≠`/app` — gêmeo do Infra 1, não documentado no achado). Sem `.github`. Pint disponível; a Fase 1 já resolveu `pdo_sqlite` + `phpunit.xml` (DB `:memory:`).

**Ajustes ao plano (no `roadmap-master.md`, Fase 3):**
- Install **condicional** no boot (`[ -d vendor ] || composer install`; `[ -d node_modules ] || npm ci`) — clone limpo funciona sem reinstalar à toa.
- Corrigir o gêmeo do Infra 1 no frontend (WORKDIR `/app` + command com `npm ci` condicional).
- Entrypoint roda como root → arquivos root-owned (ok pro avaliador; dev usa `docker compose run` + chown).

**Mini-roadmap:** (1) docker path coerente + `docker-entrypoint.sh` + verificar `up --build`; (2) CI GitHub Actions (backend + frontend) + `karma.conf.js` (`ChromeHeadlessCI`); (3) Pint (Prettier/ESLint opcional). Tracking detalhado na Fase 3 do `roadmap-master.md`.

**Progresso/fechamento:**
- **B1:** `docker compose up --build` verificado (entrypoint roda, back+front conectados, hot-reload) → **Infra 1 fechado**. Imagens viraram ambiente puro; código+deps vêm do volume + entrypoint/command (evita o double-install que o mount causava).
- **B2:** CI GitHub Actions **verde** (backend `php artisan test`; frontend `ng test` via `karma.conf.js`/`ChromeHeadlessCI` + `ng build`). Descoberta: o builder do Angular 17 não auto-carrega `karma.conf.js` → precisa `karmaConfig` no `angular.json`.
- **B3:** Pint = 36 files clean (código já no padrão) → gate `pint --test` adicionado ao CI. CI verde no push (run 29068738287).
- Prettier/ESLint no front: deixado como **próximos passos** (right-sizing). Aviso do CI sobre `checkout@v4`/Node 20 é cosmético.
