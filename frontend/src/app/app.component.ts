import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Todo } from './models/todo.model';
import { TodoService } from './todo.service';
import { TodoFormComponent } from './todo-form/todo-form.component';
import { TodoListComponent } from './todo-list/todo-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoFormComponent, TodoListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly service = inject(TodoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = 'Lista de Tarefas';
  readonly todos = signal<Todo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTodos();
  }

  loadTodos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service
      .getTodos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (todos) => {
          this.todos.set(todos);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar as tarefas.');
          this.loading.set(false);
        },
      });
  }

  onAdd(title: string): void {
    this.actionError.set(null);
    this.service
      .addTodo(title)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (todo) => this.todos.update((list) => [todo, ...list]),
        error: () => this.actionError.set('Não foi possível adicionar a tarefa.'),
      });
  }

  onToggle(todo: Todo): void {
    this.actionError.set(null);
    // Atualização otimista: o checkbox nativo já mudou de posição no clique, então
    // refletimos o novo estado na hora e revertemos se o servidor falhar (evita o
    // checkbox ficar dessincronizado do dado).
    this.replaceTodo({ ...todo, completed: !todo.completed });
    this.service
      .toggleTodo(todo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.replaceTodo(updated),
        error: () => {
          this.replaceTodo(todo); // rollback ao estado anterior
          this.actionError.set('Não foi possível atualizar a tarefa.');
        },
      });
  }

  private replaceTodo(todo: Todo): void {
    this.todos.update((list) =>
      list.map((item) => (item.id === todo.id ? todo : item)),
    );
  }

  onRemove(id: number): void {
    this.actionError.set(null);
    this.service
      .removeTodo(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.todos.update((list) => list.filter((item) => item.id !== id)),
        error: () => this.actionError.set('Não foi possível remover a tarefa.'),
      });
  }
}
