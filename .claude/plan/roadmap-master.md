# Roadmap Master — Refatoração Todo App (Laravel 11 + Angular 17.3)

> Fonte da verdade dos problemas: `.claude/docs/analise-preliminar.md` (16 achados: Laravel 1–7, Angular 1–8, Infra 1).
> Decisão de fluxo que rege este roadmap: **DEC-003** (`.claude/decisions/DECISIONS.md`).

## Estratégia

Refactor **contract-first horizontal** (DEC-003): estabiliza-se o backend inteiro com as **feature tests como contrato executável** (shape do `TarefaResource`, status 201/204/422/404, prefixo `/api`, `PUT|PATCH`) **antes** de o front consumir; depois refatora-se o front inteiro contra esse contrato já testado; a integração ponta-a-ponta é re-provada num **único gate E2E manual no fim**. Os **testes são tecidos por camada** — feature tests PHPUnit dentro da Fase 1, specs Angular (HttpTestingController + componente) dentro da Fase 2 — o que **dissolve a antiga "Fase 3 — Testes" separada** do `plano-execucao.md`. Sem framework de E2E automatizado (Cypress/Playwright) para uma entidade só — right-sizing. Regra transversal: **manter a app funcionando a cada fase** (dev-protocol §6, "não big-bang"), provando "funcionando" por camada quando a integração no navegador estiver temporariamente vermelha.

## Ordem e dependências (visão macro)

1. **Fase 1 — Backend (Laravel) + feature tests** → fixa o contrato da API sob `/api`, SQLite/Eloquent, CORS restrito. Sem dependências acima. Fecha Laravel 1–7.
2. **Fase 2 — Frontend (Angular) + specs** → consome o contrato JÁ testado da Fase 1. **Depende da Fase 1** (PATCH de toggle + `TarefaResource` devolvendo exatamente `{id,title,completed}`). Fecha Angular 1–8.
3. **Fase 3 — Infra / DX / CI** → alinha docker path (`/var/www` e `/app`), Dockerfiles, e automatiza no CI as suites tecidas nas Fases 1/2. **Depende de 1 e 2** (o CI é só tão verde quanto as suites). Fecha Infra 1.
4. **Fase 4 — README de entrega** → documenta o "depois". **Bloqueante: só roda se as Fases 1–3 estiverem implementadas no código.**
5. **Fase 5 — Verificação final (E2E conectado) + entrega** → único gate cross-layer; publica o repositório. **Depende de tudo.**

> Renumeração vs. `plano-execucao.md`: a "Fase 3 — Testes" separada foi dissolvida (testes woven nas Fases 1/2); Infra virou Fase 3, README Fase 4, verificação/entrega Fase 5. Reconciliar `plano-execucao.md` e `diario-de-fases.md` com esta numeração.

---

## Fase 1 — Backend (Laravel 11): arquitetura idiomática do CRUD + feature tests

**Objetivo:** tirar a lógica das closures e a persistência de `storage/tarefas.json` para o trilho idiomático (rota → controller fino → FormRequest → Model Eloquent/SQLite → API Resource). Ao fim: rotas sob `/api` (grupo `api`), CRUD completo com `PUT|PATCH` (toggle de `completed`), 404 por Route Model Binding, 422 por FormRequest, CORS via `HandleCors` nativo restrito a `http://localhost:4200`, e suite PHPUnit Feature verde. Backend funciona isolado (verificável por curl); a religação do front a `/api/tarefas` fica para a Fase 2.

**Achados cobertos:** Laravel 1 (registro de rotas / `api:` no `bootstrap/app.php`), Laravel 2 (rotas inline + falta `PUT/PATCH` + `DELETE` 204 fantasma), Laravel 3 (FormRequests / validação), Laravel 4 (Controller), Laravel 5 (Model + migration / persistência), Laravel 6 (API Resource), Laravel 7 (CORS restrito).

**Tarefas:**
- [x] `[cmd]` Preparar ambiente (repo sem `vendor/` e sem `.env`): `composer install`, `cp .env.example .env`, `php artisan key:generate`, `touch database/database.sqlite`.
- [x] `[cmd]` **`php artisan install:api --force --without-migration-prompt`** — o `--force` é **obrigatório** porque `routes/api.php` já existe; sem ele o comando imprime "API routes file already exists." e **NÃO** insere `api:` no `bootstrap/app.php` (o achado L1 ficaria aberto). Alternativa equivalente: adicionar manualmente `api: __DIR__.'/../routes/api.php',` no `withRouting`. Sanctum entra instalado e ocioso (documentar no README; auth fora de escopo).
- [x] `[edição]` Limpar `routes/web.php`: remover `require __DIR__.'/api.php'`, deixar só a rota web `/`.
- [x] `[cmd]` `php artisan make:model Tarefa -mf` (Model + migration + factory).
- [x] `[edição]` Migration `create_tarefas_table`: `id()`, `string('title')`, `boolean('completed')->default(false)`, `timestamps()` (o `id()` auto-increment elimina a race do `max(id)+1`).
- [x] `[edição]` Model `Tarefa`: `$fillable = ['title','completed']`, `casts() => ['completed' => 'boolean']`; **preservar o trait `HasFactory`** do stub (senão `Tarefa::factory()` quebra).
- [x] `[edição]` `TarefaFactory`: `title => fake()->sentence()`, `completed => fake()->boolean()`.
- [x] `[cmd]` `php artisan make:request StoreTarefaRequest` e `php artisan make:request UpdateTarefaRequest`.
- [x] `[edição]` `StoreTarefaRequest`: `authorize() => true`; rules `title => required|string|max:255`, `completed => sometimes|boolean` (fecha o default silencioso → 422 sem title).
- [x] `[edição]` `UpdateTarefaRequest`: `authorize() => true`; rules `title => sometimes|required|string|max:255`, `completed => sometimes|boolean` (permite PATCH parcial / toggle só de `completed`).
- [x] `[cmd]` `php artisan make:resource TarefaResource`.
- [x] `[edição]` `TarefaResource->toArray()`: `id`, `title`, `completed => (bool) $this->completed`, `created_at`, `updated_at`.
- [x] `[cmd]` `php artisan make:controller TarefaController --api --model=Tarefa`.
- [x] `[edição]` `TarefaController` fino: `index` → `TarefaResource::collection(Tarefa::latest()->get())`; `store(StoreTarefaRequest)` → `new TarefaResource(Tarefa::create($request->validated()))` com 201; `show(Tarefa)`; `update(UpdateTarefaRequest, Tarefa)` → `$tarefa->update(...)` (atende PUT **e** PATCH/toggle); `destroy(Tarefa)` → `delete()` + `noContent()` (204). O Route Model Binding gera 404 automático.
- [x] `[edição]` Reescrever `routes/api.php`: remover `lerTarefas`/`salvarTarefas` e todas as closures; `use App\Http\Controllers\TarefaController;` + `Route::apiResource('tarefas', TarefaController::class)` (o `apiResource` já registra `update` como `PUT|PATCH`).
- [x] `[cmd]` `php artisan config:publish cors`.
- [x] `[edição]` `config/cors.php`: `paths => ['api/*']`, `allowed_origins => ['http://localhost:4200']`, `supports_credentials => false` (o default publicado vem com `['*']`).
- [x] `[edição]` Remover o append do `CorsMiddleware` custom do `bootstrap/app.php` (o `HandleCors` nativo já roda na pilha global e trata o preflight OPTIONS antes do router).
- [x] `[cmd]` `git rm app/Http/Middleware/CorsMiddleware.php` e `git rm storage/tarefas.json` (ambos rastreados).
- [x] `[edição]` `phpunit.xml`: descomentar/definir `DB_CONNECTION=sqlite` e `DB_DATABASE=:memory:` (suite hermética com `RefreshDatabase`, sem tocar o banco de dev).
- [x] `[cmd]` `php artisan migrate` (cria a tabela `tarefas` no `database/database.sqlite`).
- [x] `[teste]` `tests/Feature/TarefaTest.php` com `RefreshDatabase`: index (200 + estrutura), store válido (201 + `assertDatabaseHas`), store sem title (422 em `title`), update/PUT (200 + title alterado), toggle PATCH (200 + boolean invertido no BD), destroy (204 + `assertDatabaseMissing`), destroy inexistente (404). Remover os `ExampleTest` (Feature e Unit) do scaffold — o Feature faz `GET '/'` e quebraria no CI api-only.
- [x] `[teste]` `php artisan test` — suite verde (incluindo 422 e 404).
- [ ] `[verificação]` Smoke manual (`php artisan serve` + curl + preflight OPTIONS/CORS) — **deferido à Fase 5 (E2E)**. Os status 200/201/422/404/204 + PATCH toggle já ficam provados pelos feature tests acima; a origem restrita do CORS (não `*`) é revalidada no gate E2E da Fase 5.

**Comandos a executar:** `composer install` · `cp .env.example .env` · `php artisan key:generate` · `touch database/database.sqlite` · `php artisan install:api --force --without-migration-prompt` · `php artisan make:model Tarefa -mf` · `php artisan make:request StoreTarefaRequest` · `php artisan make:request UpdateTarefaRequest` · `php artisan make:resource TarefaResource` · `php artisan make:controller TarefaController --api --model=Tarefa` · `php artisan config:publish cors` · `git rm app/Http/Middleware/CorsMiddleware.php` · `git rm storage/tarefas.json` · `php artisan migrate` · `php artisan test`

**Critério de aceite:** (1) `php artisan test` verde com a suite Feature de Tarefa cobrindo index/store(+422)/update-PUT/toggle-PATCH/destroy(+404); (2) fluxo exercitado por HTTP com os status corretos e preflight OPTIONS restrito à origem `http://localhost:4200`; (3) dados no SQLite (tabela `tarefas`), `storage/tarefas.json` removido do git; (4) `api.php` sem closures/funções globais, `CorsMiddleware` custom removido, `route:list` mostrando o `apiResource` sob prefixo `api/`. Backend funciona isolado.

**Riscos:**
- Ambiente sem `vendor/`/`.env`/PHP no PATH: nenhum artisan roda antes de `composer install` + `.env` + `key:generate` (ou de dentro do container).
- `install:api` **sem `--force` não toca o `bootstrap/app.php`** quando `api.php` já existe — falha silenciosa do achado L1.
- O prefixo `/api` quebra o front atual (hardcoded `http://localhost:8000/tarefas`); integração no navegador fica vermelha até a Fase 2 (risco aceito e documentado; sequenciar a Fase 2 imediatamente).
- `config:publish cors` publica com `['*']`: publicar não basta, tem que restringir.
- CORS é aplicado pelo navegador: curl só confere headers, não valida bloqueio. O preflight OPTIONS precisa responder 2xx.
- Sem o cast `completed => boolean` o SQLite devolve `0/1` e quebra o contrato booleano do front.
- Ao remover o `CorsMiddleware`, conferir que não resta referência órfã (principalmente no `bootstrap/app.php`) — classe não encontrada derruba a app.
- `--model=Tarefa` exige que o parâmetro de rota (`{tarefa}` do `apiResource`) case com o type-hint, senão o 404 automático e a injeção do Model não funcionam.

---

## Fase 2 — Frontend (Angular 17.3): standalone, signals e specs

**Objetivo:** sair do `AppComponent` faz-tudo (`any`, HTTP inline, dados falsos no erro, estilos inline com px fixo) para a arquitetura standalone idiomática do 17.3, consumindo o contrato JÁ testado da Fase 1. Entregar specs (TodoService via HttpTestingController + 1 componente) e manter a app funcionando. Right-sizing: sem auth, sem store global.

**Achados cobertos:** Angular 1 (`provideHttpClient(withFetch())`, remove `HttpClientModule`), Angular 2 (`src/environments/` com `apiUrl`), Angular 3 (`interface Todo`), Angular 4 (`TodoService` tipado), Angular 5 (raiz fino + signals + OnPush + `inject()` + `takeUntilDestroyed`), Angular 6 (`@if/@for` com `track` + `@empty` + `[class.completed]`), Angular 7 (SCSS escopado responsivo, tokens no `:root`), Angular 8 (erro real, sem dados fake).

> **Detalhamento completo (tasks, comandos, critério, riscos): [roadmap-fase2-frontend.md](roadmap-fase2-frontend.md).**

**Blocos (tracking):**
- [ ] **B1 — Base:** `npm ci`, `ng generate environments` (`apiUrl` → `/api/tarefas`), `provideHttpClient(withFetch())`, `interface Todo` (A1/A2/A3)
- [ ] **B2 — Service:** `TodoService` tipado — GET/POST/PATCH/DELETE (A4)
- [ ] **B3 — Componentes:** form/list/item + `AppComponent` fino (signals + OnPush + `inject()` + `takeUntilDestroyed`) (A5/A1)
- [ ] **B4 — Template/estilos/erro:** `@if/@for` (track) + `@empty` + `[class.completed]`, SCSS responsivo, erro real sem dados fake (A6/A7/A8)
- [ ] **B5 — Specs + verificação:** `TodoService` (HttpTestingController) + componente; `ng test`/`ng build`; E2E manual vs. backend

**Critério de aceite (resumo):** `ng test` verde; E2E manual (listar/criar/concluir-PATCH/remover) contra o backend; erro real sem dados fake; `ng build` ok; zero `any`, sem `HttpClientModule`/`*ngIf`/`*ngFor`/estilos inline. (Detalhe no doc dedicado.)

---

## Fase 3 — Infra / DX / CI: docker path coerente, Dockerfiles corretos, pipeline

**Objetivo:** tornar o ambiente reprodutível e adicionar rede de segurança automatizada, **sem tocar na lógica de domínio**. Alinhar `working_dir`/volume/`WORKDIR` em `/var/www` (backend) e `/app` (frontend) para hot-reload real; compilar `pdo_sqlite` no backend; CI GitHub Actions rodando as suites tecidas nas Fases 1/2; Pint (bloqueante) e Prettier/ESLint (opcionais). Right-sizing: nada de multi-stage prod, filas, registries.

**Achados cobertos:** Infra 1 (path descasado no `docker-compose.yml`, serviço laravel). Fecha também, por coerência, o gêmeo não-documentado no frontend (`WORKDIR /frontend` vs mount `./frontend:/app`) e materializa o gap "sem testes" como pipeline CI.

**Tarefas:**
- [ ] `[verificação]` Baseline: `php artisan route:list` mostra `api/tarefas` (GET/POST/PATCH/DELETE); `php artisan test` verde local; front aponta `/api`. **Concreto:** confirmar que os `ExampleTest` de scaffold (Feature `GET '/'` e Unit) foram removidos/substituídos na Fase 1 — senão o job backend do CI quebra por teste default, não de domínio. (Esta fase **não** cria testes de domínio.)
- [ ] `[edição]` **Criar `backend/docker-entrypoint.sh`** (executável) idempotente — **antes** de editar o compose: `composer install --no-interaction --no-progress` (popula `./backend/vendor` no mount); `[ -f .env ] || (cp .env.example .env && php artisan key:generate --force)`; `touch database/database.sqlite`; `php artisan migrate --graceful --force`; `exec php artisan serve --host=0.0.0.0 --port=8000`.
- [ ] `[edição]` `docker-compose.yml` serviço laravel: `working_dir: /var/www` (= destino do volume `./backend:/var/www`); remover a chave obsoleta `version: '3.8'`; `command: sh docker-entrypoint.sh`. Adicionar `working_dir: /app` ao serviço angular (coerência/simetria).
- [ ] `[edição]` `backend/Dockerfile`: `WORKDIR /var/www`; **adicionar `libsqlite3-dev` ao `apt-get` ANTES** de `docker-php-ext-install … pdo_sqlite` (build determinístico); remover `pdo_mysql` (right-sizing; manter é aceitável, `pdo_sqlite` é obrigatório).
- [ ] `[edição]` `phpunit.xml`: garantir `DB_CONNECTION=sqlite` / `DB_DATABASE=:memory:` (se a Fase 1 já fez, vira verificação).
- [ ] `[edição]` `frontend/Dockerfile`: `WORKDIR /app` (= mount `./frontend:/app`); opcional `npm ci` no command para clone limpo.
- [ ] `[edição]` `.github/workflows/ci.yml` (novo): trigger `push`/`pull_request` em `main`, dois jobs paralelos. **Backend** (`working-directory: backend`): checkout@v4 → setup-php@v2 (php 8.3, ext `mbstring,pdo_sqlite,sqlite3`, coverage none) → `cp .env.example .env` → `composer install --no-interaction --prefer-dist --no-progress` → `php artisan key:generate` → `php artisan test`. **Frontend** (`working-directory: frontend`): checkout → setup-node@v4 (node 20, cache npm, `cache-dependency-path: frontend/package-lock.json`) → `npm ci` → `npm test -- --watch=false --browsers=ChromeHeadlessCI` → `npm run build`.
- [ ] `[edição]` `frontend/karma.conf.js`: custom launcher **`ChromeHeadlessCI`** (base `ChromeHeadless`, flags `--no-sandbox --headless --disable-gpu`); usar `--browsers=ChromeHeadlessCI` no CI (verde determinístico; não depender do sandbox padrão). `karma-chrome-launcher` já está nas devDependencies.
- [ ] `[cmd]` Paridade local backend: `cp .env.example .env` · `composer install` · `php artisan key:generate` · `php artisan test`.
- [ ] `[cmd]` Paridade local frontend: `npm ci` · `npm test -- --watch=false --browsers=ChromeHeadlessCI` · `npm run build`.
- [ ] `[edição/cmd]` Lint/format: `./vendor/bin/pint` (formata uma vez) + passo `./vendor/bin/pint --test` **bloqueante** no job backend. Opcional não-bloqueante: Prettier `format:check` e/ou ESLint via `ng add @angular-eslint/schematics`.
- [ ] `[verificação]` Smoke: `chmod +x backend/docker-entrypoint.sh`; `docker compose config` (valida, sem warning de version); `docker compose up --build` sobe backend `:8000` + frontend `:4200`; CRUD via UI batendo em `/api/tarefas`; hot-reload comprovado editando um arquivo de cada lado sem rebuild; push da branch → dois jobs verdes. Atualizar README com o fluxo `docker compose up` + descrição do CI + nota de evoluções fora de escopo.

**Comandos a executar:** `chmod +x backend/docker-entrypoint.sh` · `docker compose config` · `docker compose up --build` · `cp .env.example .env` · `composer install` · `php artisan key:generate` · `php artisan test` · `./vendor/bin/pint` · `./vendor/bin/pint --test` · `npm ci` · `npm test -- --watch=false --browsers=ChromeHeadlessCI` · `npm run build`

**Critério de aceite:** num clone limpo: (1) `docker compose up --build` sobe os dois serviços com paths coerentes em `/var/www` e `/app`, hot-reload comprovado dos dois lados; (2) container backend com `pdo_sqlite` compilado e `php artisan migrate` roda sobre sqlite; (3) CRUD ponta-a-ponta pela UI em `:4200`; (4) `.github/workflows/ci.yml` existe e, no push/PR à `main`, job backend (`composer install` + `php artisan test` em `:memory:`) e job frontend (`npm ci` + `ng test` headless + `ng build`) ficam verdes; (5) `./vendor/bin/pint --test` passa.

**Riscos:**
- **Gotcha central:** montar `./backend:/var/www` **esconde** o `vendor/` e o sqlite baked; alinhar o path sem o entrypoint quebraria o `serve`. Mitigação: o `docker-entrypoint.sh` roda `composer install` + `.env`/`key:generate` + `migrate` antes do serve.
- Mesmo gotcha do `node_modules` no frontend ao alinhar `/app` (host já tem `node_modules`; `npm ci` opcional cobre clone limpo).
- `key:generate` a cada boot rotacionaria o `APP_KEY` — a guarda `[ -f .env ]` só gera quando o `.env` é criado.
- `ng test` headless no runner: `ubuntu-latest` costuma trazer Chrome; o launcher `ChromeHeadlessCI` (`--no-sandbox`) garante verde determinístico se o sandbox falhar.
- Sem specs no front, `ng test` pode reportar "Executed 0 of 0" e sair 0 (verde) — o gate real enquanto isso é `ng build`; não travar o CI por ausência de specs.
- Right-sizing: **não** adicionar multi-stage prod, nginx, Postgres/MySQL, filas, Redis, deploy — só citar como evolução no README.

---

## Fase 4 — README de entrega

**Objetivo:** escrever o `README.md` da raiz como documento de entrega: stack/bibliotecas, decisões de arquitetura (resumindo o `DECISIONS.md`), tabela antes→depois dos 16 achados, como rodar (Docker + local + testes), uso de IA/SDD (apontando para `.claude/`) e próximos passos (multi-tenant, filas, auth Sanctum — **não** implementados). Fase de documentação e verificação de veracidade: nenhum código de produção novo.

**Achados cobertos:** nenhum corrigido diretamente — consolida e **comprova** a resolução dos 16 achados na tabela antes→depois; documenta Sanctum ocioso e CORS restrito.

**Tarefas:**
- [ ] `[verificação — BLOQUEANTE]` Reanálise pré-fase: confrontar **cada um dos 16 achados** com o código já refatorado (ex.: `bootstrap/app.php` com `api:`; `routes/api.php` com `apiResource`; Model `Tarefa` + migration; `config/cors.php` restrito; front com `provideHttpClient(withFetch())` e `apiUrl` `/api/tarefas`). **Se qualquer achado ainda estiver no "antes", PARAR — não escrever o README** (esta fase só roda depois das Fases 1–3 implementadas e commitadas). Produzir mini-roadmap de 3–5 itens.
- [ ] `[verificação/edição]` Reconciliar `DECISIONS.md`: garantir um `DEC-XXX` para cada decisão não trivial — `install:api` + Sanctum instalado/ocioso; `HandleCors` nativo + `config/cors.php` restrito a `:4200`; URL do front → `/api/tarefas`; signals + `toSignal`/subscribe + OnPush (não `resource()/httpResource`); erro real com rollback. Hoje existem DEC-001/002/003; criar os que faltam antes de o README apontar para eles.
- [ ] `[edição]` Preservar o enunciado original em `.claude/docs/desafio-original.md` e linká-lo no novo README.
- [ ] `[edição]` Seção **Stack e bibliotecas**: Backend PHP 8.2/8.3 + Laravel 11.31 (Eloquent+SQLite, FormRequest, API Resource, `apiResource`, `HandleCors` nativo, Sanctum ocioso); Frontend Angular 17.3 standalone (`provideHttpClient(withFetch())`, signals + `toSignal`, OnPush, `inject()`, control flow `@if/@for`). **NÃO** citar `httpResource/resource()` (v19+); **NÃO** chamar `HttpClientModule` de `@deprecated` (só v18).
- [ ] `[edição]` Seção **Decisões de arquitetura**: resumo em prosa/bullets ligado ao `DECISIONS.md` (não duplicar — apontar). Cada decisão rastreia um `DEC-XXX`.
- [ ] `[edição]` **Tabela antes→depois** — exatamente 16 linhas (Laravel 1–7, Angular 1–8, Infra 1): problema no baseline → correção aplicada → arquivo(s)/camada.
- [ ] `[edição]` Seção **Como rodar**: Docker (`docker compose up --build`, portas 4200/8000, `docker compose exec laravel php artisan migrate`, URL `/api/tarefas`) e Local (backend: `cp .env.example .env` → `composer install` → `php artisan key:generate` → **`touch database/database.sqlite`** → `php artisan migrate` → `php artisan serve`; frontend: `npm install` → `npm start`). Testes: `php artisan test` e `npm test`. Apontar a URL **`/api/tarefas`** (não a antiga `/tarefas`).
- [ ] `[edição]` Seção **Uso de IA + SDD**: método rastreável (análise → plano → decisões → implementação → verificação) apontando para `.claude/` (protocols/plan/decisions/docs); sem co-autoria por commit (dev-protocol §4).
- [ ] `[edição]` Seção **Próximos passos / evolução**: multi-tenant, filas/jobs, auth real com Sanctum (instalado e ocioso — só ligar), banco gerenciado (MySQL/Postgres, DEC-001) — redigidos como evolução **não** entregue.
- [ ] `[verificação]` Dogfood Docker de clone limpo: seguir **só** o README na via Docker; CRUD + toggle + responsivo (desktop e mobile). Conferir também o path do serviço angular (hot-reload).
- [ ] `[teste]` Dogfood local: seguir o passo a passo local + rodar `php artisan test` e `npm test` verdes.
- [ ] `[verificação]` Revisão final: precisão de versão; zero menção a empresas/projetos externos; conteúdo puramente técnico; links internos válidos; markdown renderiza.
- [ ] `[edição]` Registrar as descobertas no `.claude/plan/diario-de-fases.md`.

**Comandos a executar:** `docker compose up --build` · `docker compose exec laravel php artisan migrate` · `cp .env.example .env` · `composer install` · `php artisan key:generate` · `touch database/database.sqlite` · `php artisan migrate` · `php artisan serve` · `php artisan test` · `npm install` · `npm start` · `npm test`

**Critério de aceite:** README com as 6 seções (stack; decisões ligadas ao `DECISIONS.md`; tabela antes→depois de 16 linhas; como rodar Docker+local+testes; IA/SDD apontando para `.claude/`; próximos passos como evolução). Prova prática: de um clone limpo, seguindo **apenas** o README, `docker compose up --build` **e** a via local sobem a app (front `:4200`, API `:8000/api/tarefas`) e o CRUD + toggle funciona; `php artisan test` e `npm test` verdes. Revisão confirma precisão de versão e ausência de referências externas. `DECISIONS.md` reconciliado, diário atualizado.

**Riscos:**
- **A via Docker do README só é verdadeira se a Fase 3 já corrigiu o Infra 1** (paths em `/var/www`); esta fase **não** corrige o docker — só documenta e dogfooda.
- A URL mudou para `/api/tarefas`; documentar a antiga `/tarefas` deixa o README incorreto.
- SQLite exige `touch database/database.sqlite` + `migrate` (e `key:generate` antes) — o migrate não-interativo falha sem o arquivo.
- CORS restrito a `http://localhost:4200`; documentar a origem esperada e onde ajustá-la (`config/cors.php`).
- Precisão de versão é armadilha: não citar `httpResource/resource()` (v19+) nem `HttpClientModule` como `@deprecated` (v18).
- Sanctum instalado por `install:api` mas auth fora de escopo — descrever como "instalado e ocioso / evolução", nunca como implementado.
- Não versionar segredos: `.env` fica ignorado; conferir que nenhum `.env`/`APP_KEY` vaza no commit.

---

## Fase 5 — Verificação final (E2E conectado, do zero) + entrega

**Objetivo:** provar que o resultado das Fases 1–4 funciona ponta a ponta a partir de um estado limpo: `docker compose up` único, fluxos reais na UI contra o backend real com persistência em SQLite, estado de erro real (A8), responsividade a ~320px (A7), suites e CI verdes, commits semânticos, README final e repositório público. Fase de verificação e entrega — sem código de produção novo.

**Achados cobertos:** nenhum novo. Revalida em conjunto L1–L7, A1–A8 e Infra 1; exercita explicitamente **L4** (concluir via PATCH), **L7** (CORS restrito, não `*`), **A6** (estado vazio `@empty`), **A7** (320px) e **A8** (erro real).

**Tarefas:**
- [ ] `[verificação]` Working tree limpo; Fases 1–4 mergeadas na branch de entrega; nenhum `storage/tarefas.json` remanescente (`git status`, `git log --oneline`).
- [ ] `[cmd]` Do zero: `docker compose down -v` + **`docker compose up -d --build`** (`-d` é necessário para os `exec` seguintes). Confirmar laravel `:8000` e angular `:4200` up, paths em `/var/www` e `/app`; `curl -i http://localhost:8000/api/tarefas` → 200.
- [ ] `[cmd]` Banco no container: `docker compose exec laravel php artisan migrate --force`; GET vem do SQLite (Eloquent). **Nota:** o entrypoint deve fazer isso no boot para o clone hands-off da tarefa de reprodutibilidade.
- [ ] `[verificação]` Smoke API via curl: GET (200), POST válido (201), POST sem title (422), PATCH toggle (200), DELETE existente (204), DELETE inexistente (404). **Preflight OPTIONS: `Access-Control-Allow-Origin` = `http://localhost:4200` (NÃO `*`) e `PATCH` em `allowed_methods`** — cerne do achado L7.
- [ ] `[verificação]` E2E UI desktop (`:4200`) vs. backend real: (a) listar; (b) criar + persiste após reload; (c) validação 422 no título vazio; (d) **concluir via checkbox/PATCH persiste após reload (gap L4)**; (e) remover; (f) **remover todas → aparece o estado vazio `@empty` (A6)**.
- [ ] `[verificação]` Erro real (A8): `docker compose stop laravel`, agir na UI → mensagem de erro/retry, **sem** dados fake ("offline"/`fakeTodo`); `docker compose start laravel` → retry restaura os dados reais.
- [ ] `[verificação]` Responsividade (A7): DevTools ~320px sem overflow horizontal, controles clicáveis e texto legível; repetir ~768px.
- [ ] `[teste]` `docker compose exec laravel php artisan test` — verde (sqlite `:memory:`).
- [ ] `[teste]` Suite do front headless. **Nota:** o serviço `angular` (node:20) **não** tem Chrome — ou instalar `chromium` no `frontend/Dockerfile` + `CHROME_BIN` + launcher `ChromeHeadlessNoSandbox` (`--no-sandbox --disable-gpu`), ou rodar a suite no host/CI (onde há browser). `docker compose exec angular npm test …` só funciona se o browser estiver no container.
- [ ] `[verificação]` CI verde no commit de entrega (`gh run list`, `gh run view <id>`) — jobs backend e frontend `success`.
- [ ] `[verificação]` Histórico de commits semânticos (Conventional Commits: feat/refactor/fix/test/chore/docs), coeso por fase/achado, sem `wip`/lixo.
- [ ] `[edição]` Finalizar o README (estado final, não o texto do teste).
- [ ] `[cmd]` **Commit do README + push + AGUARDAR CI verde** — antes do clone da tarefa seguinte (senão o clone pega um remote sem o README final e a publicação sai sem CI verde no commit de entrega).
- [ ] `[verificação]` Reprodutibilidade do zero: `gh repo clone` em tmp limpo + `docker compose up --build` sem arquivos extras → sobe e `GET /api/tarefas` responde. Depende do entrypoint fazer `cp .env.example .env` + `key:generate` + `touch sqlite` + `migrate` no boot (nada de estado não versionado).
- [ ] `[cmd]` Tornar público: conferir que `.env`/`APP_KEY` **não** estão versionados (`.gitignore` + histórico); `gh repo edit --visibility public --accept-visibility-change-consequences`; validar o link.

**Comandos a executar:** `docker compose down -v` · `docker compose up -d --build` · `docker compose exec laravel php artisan migrate --force` · `docker compose exec laravel php artisan test` · (suite do front onde há browser) · `gh run list` · `git log --oneline --graph` · `gh repo edit --visibility public --accept-visibility-change-consequences`

**Critério de aceite:** a stack sobe do zero com um único `docker compose up` (reprodutível de clone limpo), backend `:8000` e frontend `:4200` no ar. Os fluxos E2E passam na UI contra o backend real: listar, criar (com 422 no vazio), concluir via checkbox/PATCH (L4), remover, e **remover todas → estado vazio `@empty`** (A6); criar e concluir persistem após reload (SQLite). Backend derrubado → erro real sem dados fake (A8), recupera no retry. Layout a 320px sem overflow (A7). Preflight OPTIONS restrito a `http://localhost:4200` com PATCH (L7). `php artisan test` e a suite do front (headless) verdes e CI verde no commit de entrega. Commits semânticos; README permite subir/testar sem conhecimento prévio. Repositório público, sem segredos expostos.

**Riscos:**
- Prefixo `/api`: se o `environment` do front ainda apontar `/tarefas`, o GET dá 404 e a UI parece "sem dados". Conferir `apiUrl` antes do E2E.
- CORS/preflight: `config/cors.php` deve permitir `:4200` e PATCH; testar o PATCH **pela UI**, não só por curl.
- Docker path: reconfirmar `working_dir`+volume+`WORKDIR` em `/var/www` (backend) e `/app` (frontend); path errado serve código antigo e engana a verificação.
- SQLite no container: arquivo precisa existir e ter permissão; volume por cima de arquivo inexistente faz o migrate falhar — garantir `touch`+`migrate` no entrypoint.
- Front headless em container/CI exige Chrome + `--no-sandbox`; sem o **binário** o Karma trava ("No binary for ChromeHeadless").
- `docker compose down -v` apaga volumes: o SQLite zera de propósito (é o "do zero") — persistência real é validada por reload dentro da mesma sessão, não entre resets de volume.
- Portas 8000/4200 ocupadas por `serve`/`ng serve` avulsos fazem o `up` falhar no bind.
- Publicar é praticamente definitivo: garantir que `.env`/`APP_KEY`/segredos **não** estão versionados antes do `gh repo edit --visibility public`.

---

## Definição de pronto (global)

- [ ] **Os 16 achados** (Laravel 1–7, Angular 1–8, Infra 1) corrigidos no código e comprovados na tabela antes→depois do README.
- [ ] Backend: `/api/tarefas` via `apiResource` + `TarefaController` fino + FormRequests (422) + `TarefaResource` + Model Eloquent/SQLite; 404 por Route Model Binding; `HandleCors` nativo restrito a `http://localhost:4200`; `storage/tarefas.json` e `CorsMiddleware` custom removidos.
- [ ] Frontend: `interface Todo` em todo o fluxo (zero `any`); `TodoService` tipado; `provideHttpClient(withFetch())`; environments; componentização + signals imutáveis + OnPush + `inject()` + `takeUntilDestroyed`; `@if/@for` (track) + `@empty`; SCSS responsivo mobile-first; erro real (loading/erro/vazio) **sem** dados fake.
- [ ] Infra: docker path coerente (`/var/www`, `/app`) com hot-reload; `pdo_sqlite` compilado; CI verde (backend + frontend) no commit de entrega; Pint `--test` verde.
- [ ] Testes woven verdes: PHPUnit Feature (CRUD + 422 + 404 + toggle) e specs Angular (TodoService via HttpTestingController + 1 componente).
- [ ] E2E manual do gate final passa (persistência, erro real, 320px, CORS restrito, `@empty`).
- [ ] README completo e verdadeiro (dogfood de clone limpo); `DECISIONS.md` reconciliado; diário atualizado; commits semânticos; repositório público sem segredos.
- [ ] App funcionando ao fim de **cada** fase (por camada quando a integração no navegador estiver temporariamente vermelha entre Fase 1 e Fase 2).

## Mapa achado → fase

| Achado | Descrição | Fase (implementa) | Revalidação |
|---|---|---|---|
| Laravel 1 | Registro de rotas / `api:` no `bootstrap/app.php` | Fase 1 | Fase 5 |
| Laravel 2 | Rotas inline + falta `PUT/PATCH` (toggle) + `DELETE` 204 fantasma | Fase 1 | Fase 5 (L4 na UI) |
| Laravel 3 | Validação / FormRequests (422) | Fase 1 | Fase 5 |
| Laravel 4 | `TarefaController` | Fase 1 | Fase 5 |
| Laravel 5 | Model Eloquent + migration / persistência SQLite | Fase 1 | Fase 5 |
| Laravel 6 | `TarefaResource` (contrato de saída) | Fase 1 | Fase 5 |
| Laravel 7 | CORS nativo restrito (não `*`) | Fase 1 | **Fase 5 (preflight restrito)** |
| Angular 1 | `provideHttpClient(withFetch())` (remove `HttpClientModule`) | Fase 2 | Fase 5 |
| Angular 2 | `src/environments/` com `apiUrl` | Fase 2 | Fase 5 |
| Angular 3 | `interface Todo` (fim dos `any`) | Fase 2 | Fase 5 |
| Angular 4 | `TodoService` tipado (GET/POST/PATCH/DELETE) | Fase 2 | Fase 5 |
| Angular 5 | Raiz fino: signals + OnPush + `inject()` + `takeUntilDestroyed` | Fase 2 | Fase 5 |
| Angular 6 | `@if/@for` (track) + `@empty` + `[class.completed]` | Fase 2 | **Fase 5 (`@empty`)** |
| Angular 7 | SCSS escopado responsivo, tokens no `:root` | Fase 2 | **Fase 5 (320px)** |
| Angular 8 | Erro real (loading/erro/vazio), sem dados fake | Fase 2 | **Fase 5 (backend down)** |
| Infra 1 | Path descasado no `docker-compose.yml` (serviço laravel) | Fase 3 | Fase 5 |

> Testes (a antiga "Fase 3 — Testes" do `plano-execucao.md`, dissolvida): feature tests tecidos na **Fase 1**, specs na **Fase 2**, automatizados no CI na **Fase 3**, e o gate E2E integrado na **Fase 5** (DEC-003).