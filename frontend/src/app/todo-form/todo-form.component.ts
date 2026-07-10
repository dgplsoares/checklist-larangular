import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-todo-form',
  standalone: true,
  imports: [],
  templateUrl: './todo-form.component.html',
  styleUrl: './todo-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoFormComponent {
  add = output<string>();

  onSubmit(input: HTMLInputElement, event: Event): void {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) {
      return;
    }
    this.add.emit(title);
    input.value = '';
  }
}
