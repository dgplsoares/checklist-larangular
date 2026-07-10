import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AppComponent } from './app.component';
import { Todo } from './models/todo.model';
import { TodoService } from './todo.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let service: jasmine.SpyObj<TodoService>;

  const todoA: Todo = { id: 1, title: 'A', completed: false };
  const todoB: Todo = { id: 2, title: 'B', completed: true };

  function create(): void {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // dispara ngOnInit -> loadTodos
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<TodoService>('TodoService', [
      'getTodos',
      'addTodo',
      'toggleTodo',
      'removeTodo',
    ]);
    service.getTodos.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: TodoService, useValue: service }],
    });
  });

  it('carrega as tarefas no init (sucesso): popula e encerra o loading', () => {
    service.getTodos.and.returnValue(of([todoA, todoB]));
    create();

    expect(component.todos()).toEqual([todoA, todoB]);
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('erro no load: seta error e encerra o loading', () => {
    service.getTodos.and.returnValue(throwError(() => new Error('falhou')));
    create();

    expect(component.error()).toBe('Não foi possível carregar as tarefas.');
    expect(component.loading()).toBeFalse();
  });

  it('onAdd: faz prepend da nova tarefa', () => {
    service.getTodos.and.returnValue(of([todoA]));
    create();
    const nova: Todo = { id: 3, title: 'Nova', completed: false };
    service.addTodo.and.returnValue(of(nova));

    component.onAdd('Nova');

    expect(component.todos()).toEqual([nova, todoA]);
  });

  it('onAdd erro: seta actionError e mantém a lista', () => {
    service.getTodos.and.returnValue(of([todoA]));
    create();
    service.addTodo.and.returnValue(throwError(() => new Error('falhou')));

    component.onAdd('Nova');

    expect(component.actionError()).toBe('Não foi possível adicionar a tarefa.');
    expect(component.todos()).toEqual([todoA]);
  });

  it('onToggle: aplica otimista e confirma com o retorno do servidor', () => {
    service.getTodos.and.returnValue(of([todoA]));
    create();
    service.toggleTodo.and.returnValue(of({ ...todoA, completed: true }));

    component.onToggle(todoA);

    expect(component.todos()[0].completed).toBeTrue();
  });

  it('onToggle erro: faz rollback ao estado anterior e seta actionError', () => {
    service.getTodos.and.returnValue(of([todoA]));
    create();
    service.toggleTodo.and.returnValue(throwError(() => new Error('falhou')));

    component.onToggle(todoA);

    expect(component.todos()[0].completed).toBeFalse(); // revertido
    expect(component.actionError()).toBe('Não foi possível atualizar a tarefa.');
  });

  it('onRemove: remove apenas o id correto', () => {
    service.getTodos.and.returnValue(of([todoA, todoB]));
    create();
    service.removeTodo.and.returnValue(of(undefined));

    component.onRemove(1);

    expect(component.todos()).toEqual([todoB]);
  });

  it('onRemove erro: mantém a lista e seta actionError', () => {
    service.getTodos.and.returnValue(of([todoA, todoB]));
    create();
    service.removeTodo.and.returnValue(throwError(() => new Error('falhou')));

    component.onRemove(1);

    expect(component.todos()).toEqual([todoA, todoB]);
    expect(component.actionError()).toBe('Não foi possível remover a tarefa.');
  });
});
