import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../environments/environment';
import { Todo } from './models/todo.model';

/**
 * Acesso à API de tarefas. As respostas do backend (Laravel API Resource)
 * vêm envelopadas em `data`; o service desembrulha e expõe `Todo`/`Todo[]`.
 */
@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getTodos(): Observable<Todo[]> {
    return this.http
      .get<{ data: Todo[] }>(this.apiUrl)
      .pipe(map((response) => response.data));
  }

  addTodo(title: string): Observable<Todo> {
    return this.http
      .post<{ data: Todo }>(this.apiUrl, { title })
      .pipe(map((response) => response.data));
  }

  toggleTodo(todo: Todo): Observable<Todo> {
    return this.http
      .patch<{ data: Todo }>(`${this.apiUrl}/${todo.id}`, {
        completed: !todo.completed,
      })
      .pipe(map((response) => response.data));
  }

  removeTodo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
