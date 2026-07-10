import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Todo } from '../models/todo.model';

@Component({
  selector: 'app-todo-item',
  standalone: true,
  imports: [],
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoItemComponent {
  todo = input.required<Todo>();
  toggle = output<Todo>();
  remove = output<number>();
}
