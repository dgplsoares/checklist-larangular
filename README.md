# Checklist — Refatoração Fullstack (Laravel 11 + Angular 17)

Aplicação de lista de tarefas (checklist) refatorada a partir de um template
propositalmente mal estruturado. O objetivo **não** foi adicionar features, e sim
**refatorar** backend (PHP/Laravel) e frontend (Angular) para qualidade, separação de
responsabilidades, arquitetura moderna e responsividade — mantendo a app funcionando a
cada etapa.

> O enunciado original do teste está preservado em **[DESAFIO.md](DESAFIO.md)**.

## Stack e bibliotecas

O desafio já definia a stack (**Angular + PHP**); as escolhas *dentro* dela — banco,
bibliotecas de teste, lint, containerização e CI — foram deliberadas e estão abaixo.

**Backend — Laravel 11 (PHP 8.2/8.3)**
- **Eloquent + SQLite** para persistência (antes era um arquivo JSON)
- `FormRequest` (validação → **422**), **API Resource** (contrato de saída estável)
- `Route::apiResource` sob o prefixo **`/api`** (RESTful, `PUT|PATCH` para concluir tarefa)
- **Route Model Binding** (404 automático) e **`HandleCors`** nativo (CORS restrito)
- **Laravel Sanctum** instalado via `install:api`, porém **ocioso** — autenticação fora de escopo
- Testes: **PHPUnit** (feature tests); code style: **Pint**

**Frontend — Angular 17.3 standalone (Node 20)**
- `provideHttpClient(withFetch())` e `environment` para a URL da API
- `interface Todo` tipada e `TodoService` (HTTP isolado, desembrulha o envelope `data`)
- Componentes standalone (`todo-form` / `todo-list` / `todo-item`) com signal `input()`/`output()`
- Estado em **signals** + `ChangeDetectionStrategy.OnPush` + `inject()` + `takeUntilDestroyed`
- Control flow **`@if` / `@for` / `@empty`**, SCSS escopado responsivo (mobile-first, design tokens)
- Testes: **Jasmine/Karma** (service via `HttpTestingController` + componentes)

**Infra & tooling**
- **Docker Compose** (backend + frontend), reprodutível a partir de um clone limpo
- **CI (GitHub Actions):** testes, build e lint de back e front a cada push

## Como rodar

Há **duas formas** de rodar o projeto — escolha **uma delas**. Você **não** precisa
instalar tudo: cada pré-requisito abaixo só é necessário **se** você optar pela via
correspondente.

- **Opção A — Docker (recomendada):** requer apenas o **Docker** (com Docker Compose).
- **Opção B — Local, sem Docker:** requer **PHP 8.2+ e Composer** (para o backend) **e** **Node 20 + npm** (para o frontend).

### Opção A — Docker (recomendada)
```bash
docker compose up --build
```
- Frontend: <http://localhost:4200> · API: <http://localhost:8000/api/tarefas>
- No primeiro boot, o `backend/docker-entrypoint.sh` cria `.env`/`APP_KEY`, o arquivo SQLite e roda as migrations — nada manual.

### Opção B — Local (sem Docker)
**Backend** — requer PHP 8.2+ e Composer:
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan serve            # http://localhost:8000
```
**Frontend** — requer Node 20:
```bash
cd frontend
npm install
npm start                    # http://localhost:4200 (consome http://localhost:8000/api/tarefas)
```

### Testes
```bash
(cd backend  && php artisan test)
(cd frontend && npm test -- --watch=false --browsers=ChromeHeadless)
```

## Arquitetura e decisões

O trabalho seguiu um fluxo **contract-first**: primeiro o backend inteiro (com os feature
tests atuando como *contrato executável* da API), depois o frontend consumindo esse
contrato já testado, e por fim a verificação ponta-a-ponta. As decisões de arquitetura
estão registradas em [`.claude/decisions/DECISIONS.md`](.claude/decisions/DECISIONS.md):

- **DEC-001** — Persistência via **SQLite + Eloquent** (não arquivo JSON): elimina a race
  condition / *lost update*, e traz transações, constraints e queries. SQLite por ser
  zero-config para avaliação; um SaaS real usaria MySQL/Postgres.
- **DEC-002** — Processo de desenvolvimento versionado em `.claude/` (transparência/SDD).
- **DEC-003** — Fluxo *contract-first* horizontal, com testes tecidos por camada.

## Antes → depois (16 achados)

| # | Antes (baseline) | Depois (refatorado) |
|---|------------------|---------------------|
| L1 | Rotas de API caindo no grupo `web` (CSRF/419), sem prefixo `/api` | `api:` no `bootstrap/app.php` (`install:api`) → grupo `api` + prefixo `/api` |
| L2 | Lógica inline em `routes/api.php` (closures + funções globais) | `TarefaController` fino + `Route::apiResource` |
| L3 | Sem validação (default silencioso de `title`) | `FormRequest` (`Store`/`Update`) → 422 |
| L4 | **Sem endpoint para concluir** a tarefa (só GET/POST/DELETE) | `PUT\|PATCH /api/tarefas/{id}` (toggle de `completed`) |
| L5 | Persistência em `storage/tarefas.json` | Model `Tarefa` + migration (SQLite) |
| L6 | Resposta = array cru do arquivo | `TarefaResource` (contrato de saída) |
| L7 | CORS custom global liberado (`*`) | `HandleCors` nativo restrito a `http://localhost:4200` |
| A1 | God Component (`any`, HTTP inline) | `TodoService` + model + componentes filhos |
| A2 | `HttpClientModule` importado no componente | `provideHttpClient(withFetch())` no `app.config.ts` |
| A3 | `any` em todo o fluxo | `interface Todo` |
| A4 | URL hardcoded + HTTP no componente | `TodoService` tipado + `environment` |
| A5 | `Default` change detection, sem `inject`/teardown | signals + OnPush + `inject()` + `takeUntilDestroyed` |
| A6 | `*ngIf`/`*ngFor` + `[style]` inline | `@if`/`@for`/`@empty` + `[class.completed]` |
| A7 | Estilos inline em px, não responsivo | SCSS escopado responsivo + design tokens |
| A8 | Erro fabricava dados falsos ("Tarefa offline") | Estado de erro real (loading / erro / vazio) |
| Infra 1 | `docker-compose` com `working_dir` ≠ volume | `working_dir`/volume coerentes + `docker-entrypoint.sh` |

## Testes & CI

Testes automatizados nos dois lados — não eram um requisito do desafio, mas são a rede de
segurança que prova que a app **continua funcionando** após a refatoração.

**Backend — PHPUnit (feature tests, SQLite `:memory:`)** · [`backend/tests/Feature/TarefaTest.php`](backend/tests/Feature/TarefaTest.php)
- lista (200 + estrutura do JSON), criar (201 + persistência no banco), criar **sem título → 422**, atualizar via PUT, **concluir via PATCH** (o `completed` inverte no banco), remover (204) e **remover inexistente → 404**.

**Frontend — Jasmine/Karma (18 testes)**
- `TodoService` — cada verbo HTTP (GET/POST/PATCH/DELETE) na URL certa e o *unwrap* do envelope `data`;
- `AppComponent` — mutações de estado (add/toggle/remove) e **todos os ramos de erro**, incluindo o *rollback* do toggle otimista;
- componentes — o form emite só com título válido (com `trim`), o item emite o toggle no checkbox, a lista mostra o estado vazio (`@empty`).

**CI — GitHub Actions** · [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
A cada push/PR na `main`, dois jobs em paralelo:
- **backend:** `php artisan test` **+ `pint --test`** — este **automatiza a verificação de integridade com o padrão de código do Laravel**: se algo fugir do style oficial, o pipeline quebra;
- **frontend:** `ng test` (headless) **+ `ng build`** — garante que a suíte passa e que a app compila dentro dos budgets.

## Além dos critérios

O `DESAFIO.md` pede a refatoração; abaixo está o que foi entregue **além** disso — cada
item verificável no repo.

- **Fechamento de um gap funcional (não só refactor).** O baseline renderizava "tarefa
  concluída" (line-through), mas **não havia endpoint para concluir** — a UI prometia um
  estado inalcançável. Adicionamos o `PUT|PATCH /api/tarefas/{id}` e o checkbox que o
  consome. *(achado L4 · `TarefaController@update`, `todo-item`)*
- **Testes automatizados nos dois lados.** Feature tests no backend + 18 specs no
  frontend, cobrindo CRUD, validação (422/404), ramos de erro e o toggle otimista.
  *(`backend/tests/Feature`, `frontend/src/app/*.spec.ts`)*
- **Pipeline de CI verde.** GitHub Actions rodando testes e build de back e front a cada
  push — a app é sempre validada, não "funciona só na minha máquina". *(`.github/workflows/ci.yml`)*
- **Lint automatizado com o padrão Laravel.** `pint --test` é um **gate do CI**: o
  pipeline falha se o código PHP divergir do style oficial do framework. *(job backend)*
- **Docker reprodutível de clone limpo.** O `docker-compose` do template estava quebrado
  (path descasado); reescrevemos com um entrypoint que cria `.env`/chave/banco e roda as
  migrations sozinho — um único `docker compose up --build` sobe tudo sem passo manual.
  *(achado Infra 1 · `docker-compose.yml`, `backend/docker-entrypoint.sh`)*
- **Tratamento de erro real e resiliente.** No lugar do fallback que fabricava dados
  falsos, estados reais de loading/erro/vazio; e o toggle é **otimista com rollback** —
  se o servidor falhar, a UI reverte sozinha em vez de mentir sobre o dado.
  *(achados A8/B2 · `app.component.ts`)*
- **Processo transparente e revisão final adversarial.** Todo o método (análise → plano →
  decisões → diário) está versionado em `.claude/`, e a entrega passou por uma revisão
  final com olhar de avaliador para caçar gaps reais antes do envio. *(`.claude/`)*

## Uso de IA e SDD

O projeto foi desenvolvido com **Claude Code** como par de engenharia, de forma
transparente e rastreável. Todo o processo — análise → plano → decisões → implementação →
verificação — está versionado em [`.claude/`](.claude/): protocolo de desenvolvimento,
roadmap por fases, diário de fases e registro de decisões. É a mesma prática de engenharia
orientada a especificações (SDD) que aplico nos meus projetos, autorais e em equipe.

## Próximos passos (fora do escopo)

- **Multi-tenant** (isolamento por empresa) e **autenticação** (Sanctum já instalado — é só ligar)
- **Filas/jobs** para processamento assíncrono e alto volume
- Banco gerenciado (**MySQL/Postgres**) no lugar do SQLite
- **Prettier/ESLint** no frontend (o backend já tem lint via Pint)
- Rodar `composer audit` / `npm audit` e atualizar dependências transitivas
- Paginação e filtros no endpoint de tarefas; versionamento de API
