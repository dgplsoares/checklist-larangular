import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Todo } from '../models/todo.model';
import { TodoItemComponent } from '../todo-item/todo-item.component';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [TodoItemComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListComponent {
  todos = input.required<Todo[]>();
  toggle = output<Todo>();
  remove = output<number>();
}
