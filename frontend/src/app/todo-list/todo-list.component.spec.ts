import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Todo } from '../models/todo.model';
import { TodoListComponent } from './todo-list.component';

describe('TodoListComponent', () => {
  let fixture: ComponentFixture<TodoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoListComponent);
  });

  it('mostra o estado vazio (@empty) quando não há tarefas', () => {
    fixture.componentRef.setInput('todos', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma tarefa');
  });

  it('renderiza um app-todo-item por tarefa', () => {
    const todos: Todo[] = [
      { id: 1, title: 'A', completed: false },
      { id: 2, title: 'B', completed: true },
    ];
    fixture.componentRef.setInput('todos', todos);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('app-todo-item').length,
    ).toBe(2);
  });
});
