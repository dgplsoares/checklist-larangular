# Análise Preliminar — Refatoração Todo App (Laravel 11 + Angular 17.3)

## Resumo

- Backend Laravel 11 com CRUD inteiro em `routes/api.php`, persistindo num arquivo `storage/tarefas.json`; 
- MVC vazio, sem Model, Controller, migration ou validação. Frontend Angular 17.3 standalone com um
único `AppComponent` que faz-tudo inline no mesmo arquivo. 
- O objetivo do teste não é feature nova: é refatorar para qualidade, separação de responsabilidades, arquitetura moderna e responsividade, mantendo a app funcionando. 
- Banco SQLite já está no `.env`, mas não está sendo usado.

## Achados — Laravel

### Achado 1: Registro das rotas em `bootstrap/app.php`:
- Deveria ter: withRouting(api: `routes/api.php`, ...). Deveria ter API com prefixo /api e grupo api; 
- Como está: web.php deveria ter só rotas web. Mas tem withRouting só com `web/commands/health` (sem api:) e web.php faz require de `api.php`.

### Achado 2: Rotas da API em `routes/api.php`:
- Deveria ter: rotas de "tarefas" chamando as classes de controller (`TarefaController::class`), com os verbos REST (`index/store/update/destroy`).
- Como está: Tem lógica inline + funções globais lerTarefas/salvarTarefas; só `GET/POST/DELETE` (sem PUT/PATCH); DELETE devolve 204 mesmo sem existir.

### Achado 3: Validação `app/Http/Requests/`
- Deveria ter: StoreTarefaRequest/UpdateTarefaRequest validando title.
- Como está: A pasta `Requests/` não existe e a validação é `$request->input('title', 'Tarefa sem título')` com default silencioso.

### Achado 4: Controller `app/Http/Controllers/`
- Deveria ter: "TarefaController" (index/store/update/destroy).
- Como está: Só tem `Controller.php` com classe base abstrata, sem nenhum controller de tarefa (a lógica mora inline nas rotas).

### Achado 5: Model + Persistência  `app/Models/ + database/migrations/`
- Deveria ter: "model Tarefa (Eloquent) + migration create_tarefas_table", pouplando dados no banco.
- Como está: Só tem `User.php`; migrations só as 3 default (users/cache/jobs), pois os dados moram em storage/tarefas.json.

### Achado 6: Resposta (contrato de saída) `app/Http/Resources/`
- Deveria ter: "TarefaResource" moldando o JSON.
- Como está: A pasta `Resources/` não existe; O array é devolvido "cru" do arquivo.

### Achado 7: CORS (transversal)  `config/ + CorsMiddleware.php`
Deveria ter: "HandleCors nativo + config/cors.php" com origem restrita.
Não tem `config/cors.php` e o `CorsMiddleware` custom concede Access-Control-Allow-Origin: * global.


## Achados — Angular

### Achado 1: Bootstrap e registro de providers `app.config.ts + main.ts`
- Deveria ter: "ApplicationConfig" reunindo os providers globais da app, incluindo "provideHttpClient(withFetch())" para o HTTP.
- Como está: O `providers` só tem `provideRouter(routes)`; o HTTP é obtido importando o NgModule legado `HttpClientModule` dentro do `AppComponent`.

### Achado 2: Configuração por ambiente `src/environments/`
- Deveria ter: "environment.ts + environment.development.ts" com "apiUrl", trocados no build via "fileReplacements".
- Como está: A pasta `src/environments/` não existe; a URL da API está hardcoded, com `apiUrl = 'http://localhost:8000/tarefas'` no componente.

### Achado 3: Modelo de dados `interface Todo`
- Deveria ter: uma "interface Todo { id: number; title: string; completed: boolean }" tipando os dados em todo o fluxo.
- Como está: Tudo é `any` (`todos: any[]`, `newTodo: any`, callbacks `(data: any)`); nenhum modelo. Desta forma, o compilador não protege o contrato.

### Achado 4: Camada de dados / HTTP `TodoService`
- Deveria ter: um "TodoService" (`@Injectable({ providedIn: 'root' })`, `inject(HttpClient)`) concentrando GET/POST/PATCH/DELETE tipados (`Observable<Todo[]>`).
- Como está: o `HttpClient` é chamado direto no componente (get/post/delete espalhados); nenhum `*.service.ts`.

### Achado 5: Componente raiz — composição e reatividade `app.component.ts`
- Deveria ter: componente raiz fino, injetando via `inject()`, delegando a componentes filhos (form/list/item), estado em "signal" (imutável), `ChangeDetectionStrategy.OnPush` e `subscribe` com `takeUntilDestroyed`.
- Como está: `AppComponent` faz-tudo (HTTP + estado + template + config), sem filhos; injeção via construtor; `ChangeDetection.Default`; estado mutado in-place (`this.todos.push(...)`); `subscribe(next, erro)` sem teardown.

### Achado 6: Template e control flow `app.component.html`
- Deveria ter: control flow embutido "@if/@for" (com "track") e "@empty" para o estado vazio; binding de classe (`[class.completed]`).
- Como está: diretivas antigas `*ngIf`/`*ngFor` (esta sem `trackBy`) e `[style.text-decoration]` inline no template.

### Achado 7: Estilos e responsividade `styles.scss` + `app.component.scss`
- Deveria ter: estilos em SCSS escopado + tokens no ":root"; layout fluido/responsivo (o teste exige responsividade).
- Como está: todo o visual em `style=` inline com larguras fixas em px; `app.component.scss` com 0 byte; `styles.scss` só o placeholder do CLI.

### Achado 8: Tratamento de erro fabrica dados falsos `app.component.ts`
- Deveria ter: em falha de HTTP, exibir estado de erro real (mensagem/retry) e manter a UI fiel ao servidor. Com rollback no erro.
- Como está: cada callback de erro inventa sucesso — GET injeta "Tarefa offline 1/2"; POST cria `fakeTodo` com `Math.random()` e faz `push`; DELETE remove da lista mesmo em falha. Engole o erro em `console.error` e mascara os bugs do backend (419/CORS).

## Achados Infra

### Achado 1: Path descasado no `docker-compose.yml` (serviço laravel)
- Deveria ter: "working_dir", o "WORKDIR" do Dockerfile e o destino do volume no mesmo diretório (convenção Laravel: `/var/www`), para o código montado ao vivo ser o que roda.
- Como está: volume monta `./backend:/var/www`, mas `working_dir: /backend` e o Dockerfile faz `WORKDIR /backend` + `COPY . .`. Com isto, o `php artisan serve` serve o código em `/backend` e ignora edições ao vivo em `/var/www` (sem hot-reload).
