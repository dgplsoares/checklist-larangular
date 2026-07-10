import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoFormComponent } from './todo-form.component';

describe('TodoFormComponent', () => {
  let fixture: ComponentFixture<TodoFormComponent>;
  let component: TodoFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emite add com o título (trim) e limpa o input', () => {
    const emitted: string[] = [];
    component.add.subscribe((v) => emitted.push(v));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = '  Comprar pão  ';

    component.onSubmit(input, new Event('submit'));

    expect(emitted).toEqual(['Comprar pão']);
    expect(input.value).toBe('');
  });

  it('não emite add quando o título é vazio', () => {
    const emitted: string[] = [];
    component.add.subscribe((v) => emitted.push(v));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = '   ';

    component.onSubmit(input, new Event('submit'));

    expect(emitted).toEqual([]);
  });
});
