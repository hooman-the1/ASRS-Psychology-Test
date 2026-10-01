import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { AsrsComponent } from './asrs/asrs.component';
import { questions } from './asrs/asrs.constants';

describe('AppComponent', () => {
  it('lays out the questionnaire from the RTL start edge', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    document.body.appendChild(fixture.nativeElement);
    try {
      fixture.detectChanges();
      const main = fixture.nativeElement.querySelector('main') as HTMLElement;
      const radio = main.querySelector('mat-radio-button') as HTMLElement;
      const circle = radio.querySelector('.mdc-radio') as HTMLElement;
      const label = radio.querySelector('.mdc-label') as HTMLElement;
      const buttons = Array.from(main.querySelectorAll('.button-group button')) as HTMLElement[];
      const progress = main.querySelector('.mdc-linear-progress__primary-bar') as HTMLElement;

      expect(getComputedStyle(main).direction).toBe('rtl');
      expect(circle.getBoundingClientRect().right).toBeGreaterThan(label.getBoundingClientRect().right);
      expect(buttons[0].getBoundingClientRect().right).toBeGreaterThan(buttons[1].getBoundingClientRect().right);
      expect(parseFloat(getComputedStyle(progress).transformOrigin))
        .toBeCloseTo(progress.offsetWidth, 0);
    } finally {
      fixture.destroy();
    }
  });

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
    expect(main.querySelectorAll('.button-group button').length).toBe(2);
    expect(main.querySelector('.open-history-button')).not.toBeNull();
  });

  it('renders all 18 questions in order with the same five labeled numeric choices', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const questionnaire = fixture.debugElement.query(By.directive(AsrsComponent)).componentInstance as AsrsComponent;
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    const labels = ['هرگز', 'به ندرت', 'گاهی اوقات', 'اغلب', 'تقریباً همیشه'];

    expect(questions.length).toBe(18);
    expect(main.querySelector('.intro-text')?.textContent).toContain('6 ماه گذشته');
    expect((main.querySelector('.intro-text') as HTMLElement).innerText).toContain('گذشته،');

    for (let step = 0; step < questions.length; step++) {
      const displayedQuestion = main.querySelector('.question')?.textContent ?? '';
      const radioButtons = Array.from(main.querySelectorAll('mat-radio-button')) as HTMLElement[];
      expect(questionnaire.currentStep).toBe(step);
      expect(displayedQuestion).toContain(questions[step]);
      expect(radioButtons.length).toBe(5);

      for (let value = 0; value < labels.length; value++) {
        expect(radioButtons[value].textContent?.trim()).toBe(labels[value]);
        (radioButtons[value].querySelector('input[type="radio"]') as HTMLInputElement).click();
        fixture.detectChanges();
        expect(questionnaire.answers.at(step).value).toBe(value);
      }

      if (step < questions.length - 1) {
        (main.querySelector('mat-card-actions button:nth-child(2)') as HTMLButtonElement).click();
        fixture.detectChanges();
      }
    }
  });
});
