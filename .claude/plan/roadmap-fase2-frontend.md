# Roadmap — Fase 2: Frontend (Angular 17.3)

> Detalhamento da Fase 2 do [roadmap-master.md](roadmap-master.md). Fecha os achados **Angular 1–8** de [../docs/analise-preliminar.md](../docs/analise-preliminar.md). Fluxo: **DEC-003** (contract-first — consome o `/api/tarefas` já testado na Fase 1).

## Objetivo
Sair do `AppComponent` faz-tudo (`any`, HTTP inline, dados falsos no erro, estilos inline em px) para a arquitetura standalone idiomática do Angular 17.3, consumindo o contrato já testado do backend. Entregar specs e manter a app funcionando. Right-sizing: sem auth, sem store global, sem framework de E2E automatizado.

## Achados cobertos
- **A1** — separação de responsabilidades (God Component → service/model/componentes filhos)
- **A2** — `src/environments/` com `apiUrl`
- **A3** — `interface Todo` (fim dos `any`)
- **A4** — `TodoService` tipado
- **A5** — `AppComponent` fino: `signal` + OnPush + `inject()` + `takeUntilDestroyed`
- **A6** — control flow `@if/@for` (com `track`) + `@empty` + `[class.completed]`
- **A7** — SCSS escopado responsivo, tokens no `:root`
- **A8** — tratamento de erro real (loading/erro/vazio), sem dados fabricados

## Pré-requisitos / dev loop
- **Dev loop local** (Node 20 + npm 10): `ng`/`npm` rodam direto no host — sem Docker, sem ajuste de ownership.
- Contrato do backend: **`/api/tarefas`** (prefixo `/api` da Fase 1). Em dev (front `:4200` × back `:8000`), a `apiUrl` precisa ser **absoluta**.

## Blocos

### Bloco 1 — Base: providers, environments, model (A1/A2/A3)
- [ ] `[cmd]` executar `npm ci` — completa o `node_modules` e traz o binário `ng`.
- [ ] `[cmd]` executar `ng generate environments` — cria `src/environments/environment.ts` + `environment.development.ts` e injeta `fileReplacements` no `angular.json`.
- [ ] `[edição]` editar `src/environments/environment.development.ts` → `export const environment = { apiUrl: 'http://localhost:8000/api/tarefas' };` (dev cross-port → URL absoluta).
- [ ] `[edição]` editar `src/environments/environment.ts` (produção, default) → `export const environment = { apiUrl: '/api/tarefas' };` (relativa, atrás de proxy).
- [ ] `[edição]` editar `src/app/app.config.ts` → adicionar `provideHttpClient(withFetch())` aos `providers` (mantendo `provideRouter`); import de `@angular/common/http`.
- [ ] `[edição]` criar `src/app/models/todo.model.ts` → `export interface Todo { id: number; title: string; completed: boolean }` (espelha o `TarefaResource`).

### Bloco 2 — Service: camada de dados/HTTP (A4)
- [ ] `[cmd]` executar `ng generate service todo`.
- [ ] `[edição]` editar `src/app/todo.service.ts`:
  - `private http = inject(HttpClient)`; `private apiUrl = environment.apiUrl`;
  - `getTodos(): Observable<Todo[]>` → `GET apiUrl`;
  - `addTodo(title: string): Observable<Todo>` → `POST apiUrl { title }`;
  - `toggleTodo(todo: Todo): Observable<Todo>` → `PATCH ${apiUrl}/${todo.id} { completed: !todo.completed }`;
  - `removeTodo(id: number): Observable<void>` → `DELETE ${apiUrl}/${id}`;
  - zero `any` (tudo tipado com `Todo`).

### Bloco 3 — Componentes: separação + reatividade (A5/A1)
- [ ] `[cmd]` executar `ng generate component todo-form`, `ng generate component todo-list`, `ng generate component todo-item`.
- [ ] `[edição]` `todo-item.component.ts`: `todo = input.required<Todo>()`; `toggle = output<Todo>()`; `remove = output<number>()`; template com `<input type="checkbox" [checked]="todo().completed" (change)="toggle.emit(todo())">`, `[class.completed]="todo().completed"` e botão remover; `ChangeDetectionStrategy.OnPush`.
- [ ] `[edição]` `todo-list.component.ts`: `todos = input.required<Todo[]>()`; template `@for (t of todos(); track t.id) { <app-todo-item ... /> } @empty { Nenhuma tarefa }`; repassa `toggle`/`remove`; OnPush.
- [ ] `[edição]` `todo-form.component.ts`: `add = output<string>()`; input + botão; no submit faz `title.trim()`, ignora vazio, emite `add` e limpa o campo; OnPush.
- [ ] `[edição]` `app.component.ts` (container fino): `private service = inject(TodoService)`, `private destroyRef = inject(DestroyRef)`; estado em `todos = signal<Todo[]>([])`, `loading = signal(true)`, `error = signal<string | null>(null)`; `ChangeDetectionStrategy.OnPush`; `ngOnInit` → `service.getTodos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next, error })`; handlers `onAdd`/`onToggle`/`onRemove` atualizando `todos.update(...)` de forma **imutável** (sem `push`); remover `HttpClientModule`/`HttpClient` e imports não usados.

### Bloco 4 — Template, estilos e erro (A6/A7/A8)
- [ ] `[edição]` `app.component.html`: `<app-todo-form (add)="onAdd($event)" />` + `@if (loading()) { … } @else if (error()) { mensagem de erro + botão retry } @else { <app-todo-list [todos]="todos()" (toggle)="onToggle($event)" (remove)="onRemove($event)" /> }`; sem `style=` inline, sem `*ngIf`/`*ngFor`.
- [ ] `[edição]` `src/styles.scss`: tokens no `:root` (cores, espaçamentos, raio).
- [ ] `[edição]` SCSS dos componentes: mobile-first, sem larguras fixas em px (`max-width` + `%`/`rem`/`clamp`), `[class.completed]` → `text-decoration: line-through`; manter cada folha `< 4kb` (budget `anyComponentStyle`).
- [ ] `[cmd]` executar `ng g @angular/core:control-flow` — migra automaticamente `*ngIf`/`*ngFor` remanescentes (rede de segurança).
- [ ] `[verificação]` garantir que **nenhum** resquício do fallback de dados falsos permaneceu (A8): sem "Tarefa offline", sem `fakeTodo`/`Math.random`; erro vira estado real na UI.

### Bloco 5 — Specs + verificação
- [ ] `[edição]` `src/app/todo.service.spec.ts` (`HttpTestingController`): GET em `apiUrl`; POST `{ title }`; PATCH `${apiUrl}/${id}` `{ completed }`; DELETE; usar `expectOne` + `flush` + `afterEach(() => httpMock.verify())`.
- [ ] `[edição]` `src/app/todo-form/todo-form.component.spec.ts`: título válido emite `add` (com trim); título vazio **não** emite.
- [ ] `[cmd]` executar `ng test --watch=false --browsers=ChromeHeadless` — 0 falhas.
- [ ] `[cmd]` executar `ng build` — sem estouro de budget.
- [ ] `[verificação]` E2E manual contra o backend da Fase 1: lista carrega de `/api/tarefas`; criar persiste; checkbox dispara PATCH e persiste após reload; remover apaga; backend down → estado de erro real (sem "Tarefa offline"); estados loading/vazio corretos.

## Comandos a executar (consolidado)
`npm ci` · `ng generate environments` · `ng generate service todo` · `ng generate component todo-form` · `ng generate component todo-list` · `ng generate component todo-item` · `ng g @angular/core:control-flow` · `ng test --watch=false --browsers=ChromeHeadless` · `ng build`

## Critério de aceite (Fase 2)
1. `ng test` verde (spec do `TodoService` validando GET/POST/PATCH/DELETE em `/api/tarefas` + spec de 1 componente);
2. fluxo E2E manual contra o backend — listar / adicionar / **concluir (PATCH, persiste após reload)** / remover;
3. backend derrubado → erro real, sem dados fake, com loading/erro/vazio distintos;
4. `ng build` de produção sem erro/budget;
5. zero `any` (`interface Todo` em todo o fluxo), `HttpClientModule` trocado por `provideHttpClient(withFetch())`, sem `*ngIf`/`*ngFor` nem estilos inline, estado em `signal` imutável com OnPush + `inject()` + `takeUntilDestroyed`.

## Riscos
- **Dependência do contrato (Fase 1):** se o `TarefaResource` renomear campos, o binding da `interface Todo` quebra silenciosamente; o toggle depende do `PATCH /api/tarefas/{id}`.
- **CORS/preflight:** PATCH/POST com JSON disparam OPTIONS; o `config/cors.php` (Fase 1) já permite PATCH e a origem `:4200`. Falha só aparece no browser (curl ignora CORS).
- **Prefixo `/api`:** esquecer o `/api` reproduz 404; em dev (4200 × 8000) a `apiUrl` precisa ser absoluta.
- **Ordem:** migrar `todos` para `signal` imutável **antes** de ligar OnPush (o `push` in-place do baseline quebra com OnPush).
- `@for` exige `track` obrigatório — usar `track todo.id` (não `$index`).
- `takeUntilDestroyed` precisa de contexto de injeção (campo/constructor) ou de um `DestroyRef` explícito.
- Só remover `HttpClientModule` do componente **depois** de `provideHttpClient` estar nos providers.
- `resource()`/`httpResource` **não existem no 17.3** (v19+) — usar `signal` + `subscribe` (ou `toSignal`).
