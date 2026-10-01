import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { questions } from './asrs/asrs.constants';

describe('AppComponent', () => {
  it('renders the ASRS questionnaire at the root', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(main.textContent).toContain('ASRS');
    expect(main.textContent).toContain(questions[0]);
    expect(main.querySelectorAll('mat-radio-button').length).toBe(5);
    expect(main.querySelectorAll('mat-card-actions button').length).toBe(2);
  });
});
