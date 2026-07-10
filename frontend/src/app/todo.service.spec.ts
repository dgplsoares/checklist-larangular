import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../environments/environment';
import { Todo } from './models/todo.model';
import { TodoService } from './todo.service';

describe('TodoService', () => {
  let service: TodoService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TodoService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TodoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getTodos faz GET e desembrulha o envelope `data`', () => {
    const todos: Todo[] = [{ id: 1, title: 'A', completed: false }];
    let result: Todo[] | undefined;

    service.getTodos().subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ data: todos });

    expect(result).toEqual(todos);
  });

  it('addTodo faz POST { title } e desembrulha', () => {
    const created: Todo = { id: 2, title: 'Nova', completed: false };
    let result: Todo | undefined;

    service.addTodo('Nova').subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Nova' });
    req.flush({ data: created });

    expect(result).toEqual(created);
  });

  it('toggleTodo faz PATCH com o completed invertido', () => {
    const todo: Todo = { id: 3, title: 'X', completed: false };

    service.toggleTodo(todo).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/3`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ completed: true });
    req.flush({ data: { ...todo, completed: true } });
  });

  it('removeTodo faz DELETE pelo id', () => {
    service.removeTodo(4).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/4`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
