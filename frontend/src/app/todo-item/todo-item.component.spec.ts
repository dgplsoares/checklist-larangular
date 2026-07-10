import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Todo } from '../models/todo.model';
import { TodoItemComponent } from './todo-item.component';

describe('TodoItemComponent', () => {
  let fixture: ComponentFixture<TodoItemComponent>;
  let component: TodoItemComponent;
  const todo: Todo = { id: 1, title: 'Tarefa', completed: false };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('todo', todo);
    fixture.detectChanges();
  });

  it('renderiza o título da tarefa', () => {
    expect(fixture.nativeElement.textContent).toContain('Tarefa');
  });

  it('emite toggle ao acionar o checkbox', () => {
    let emitted: Todo | undefined;
    component.toggle.subscribe((t) => (emitted = t));
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    );

    checkbox.dispatchEvent(new Event('change'));

    expect(emitted).toEqual(todo);
  });
});
