import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { questions, SEVERITY_LEVELS } from './asrs.constants';
import { getGaugeMarkers, getSeverityCategory } from './asrs.helpers';
import { AsrsComponent } from './asrs.component';
import { AsrsGaugeComponent } from './asrs-gauge.component';
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';

describe('AsrsComponent local assessment flow', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AsrsComponent],
      imports: [
        CommonModule, ReactiveFormsModule, MatCardModule, MatDividerModule,
        MatButtonModule, MatRadioModule, MatProgressBarModule,
        AsrsGaugeComponent, LatinToPersianNumbersPipe, NoopAnimationsModule,
      ],
    }).compileComponents();
  });

  it('starts with one required, unanswered control per question without a session', () => {
    const getItem = spyOn(localStorage, 'getItem').and.callThrough();
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.answers.length).toBe(questions.length);
    expect(component.answers.controls.every(control => control.invalid && control.value === null)).toBeTrue();
    expect(component.asrsForm.invalid).toBeTrue();
    expect(component.currentStep).toBe(0);
    expect(fixture.nativeElement.querySelector('mat-radio-group')).not.toBeNull();
    expect(getItem).not.toHaveBeenCalledWith('asrs_session_id');
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('keeps the first question unanswered and prevents moving before or past the questionnaire', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const buttons = () => fixture.nativeElement.querySelectorAll('.button-group button') as NodeListOf<HTMLButtonElement>;

    expect(questions.length).toBe(18);
    expect(component.getCurrentControl().value).toBeNull();
    expect(buttons().length).toBe(2);
    expect(buttons()[0].disabled).toBeTrue();
    expect(buttons()[1].disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('button[color="primary"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[color="accent"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.result-card')).toBeNull();
    component.prev();
    component.next();
    expect(component.currentStep).toBe(0);

    component.answers.controls.forEach(control => control.setValue(0));
    for (let step = 0; step < questions.length - 1; step++) component.next();
    fixture.detectChanges();
    expect(component.currentStep).toBe(17);
    expect(buttons().length).toBe(2);
    expect(fixture.nativeElement.querySelector('button[color="primary"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[color="accent"]')).not.toBeNull();
    component.next();
    expect(component.currentStep).toBe(17);
  });

  it('accepts every response including zero, retains revisions, and tracks displayed progress', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const buttons = () => fixture.nativeElement.querySelectorAll('.button-group button') as NodeListOf<HTMLButtonElement>;
    const progress = () => Number(fixture.nativeElement.querySelector('mat-progress-bar').getAttribute('aria-valuenow'));

    expect(progress()).toBeCloseTo(100 / 18, 4);
    for (let choice = 0; choice < 5; choice++) {
      component.getCurrentControl().setValue(choice);
      fixture.detectChanges();
      expect(buttons()[1].disabled).toBeFalse();
    }
    component.getCurrentControl().setValue(0);
    buttons()[1].click();
    fixture.detectChanges();
    expect(component.currentStep).toBe(1);
    expect(progress()).toBeCloseTo(200 / 18, 4);
    buttons()[0].click();
    fixture.detectChanges();
    expect(component.currentStep).toBe(0);
    expect(component.getCurrentControl().value).toBe(0);
    expect(progress()).toBeCloseTo(100 / 18, 4);
    component.getCurrentControl().setValue(4);
    buttons()[1].click();
    fixture.detectChanges();
    buttons()[0].click();
    fixture.detectChanges();
    expect(component.getCurrentControl().value).toBe(4);

    for (let step = 0; step < 9; step++) {
      component.getCurrentControl().setValue(0);
      component.next();
    }
    fixture.detectChanges();
    expect(component.currentStep).toBe(9);
    expect(progress()).toBeCloseTo(1000 / 18, 4);
    component.prev();
    fixture.detectChanges();
    expect(progress()).toBeCloseTo(900 / 18, 4);
  });

  it('shows Submit only on the last question and blocks incomplete forms even through submit()', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const buttons = () => fixture.nativeElement.querySelectorAll('.button-group button') as NodeListOf<HTMLButtonElement>;

    component.answers.controls.slice(0, 17).forEach(control => control.setValue(0));
    for (let step = 0; step < 17; step++) component.next();
    fixture.detectChanges();
    expect(component.currentStep).toBe(17);
    expect(Number(fixture.nativeElement.querySelector('mat-progress-bar').getAttribute('aria-valuenow'))).toBe(100);
    expect(buttons().length).toBe(2);
    expect(fixture.nativeElement.querySelector('button[color="primary"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[color="accent"]')).not.toBeNull();
    expect(buttons()[1].disabled).toBeTrue();
    component.submit();
    expect(component.showResult).toBeFalse();

    component.getCurrentControl().setValue(0);
    component.answers.at(5).reset();
    fixture.detectChanges();
    expect(buttons()[1].disabled).toBeFalse();
    component.submit();
    fixture.detectChanges();
    expect(component.showResult).toBeFalse();
    expect(fixture.nativeElement.querySelector('.result-card')).toBeNull();

    component.answers.at(5).setValue(0);
    buttons()[1].click();
    fixture.detectChanges();
    expect(component.showResult).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.result-card').length).toBe(1);
  });

  it('keeps an incomplete response unsubmitted and displays a locally calculated complete result', () => {
    const getItem = spyOn(localStorage, 'getItem').and.callThrough();
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.at(0).setValue(4);
    component.submit();
    fixture.detectChanges();
    expect(component.showResult).toBeFalse();
    expect(fixture.nativeElement.querySelector('.result-card')).toBeNull();

    component.answers.controls.forEach(control => control.setValue(2));
    component.submit();
    fixture.detectChanges();

    const score = questions.length * 2;
    const severity = SEVERITY_LEVELS.moderate;
    const result = fixture.nativeElement.querySelector('.result-card') as HTMLElement;
    expect(component.showResult).toBeTrue();
    expect(component.totalScore).toBe(score);
    expect(component.gaugeValue).toBe(score);
    expect(component.severityText).toBe(severity.severity);
    expect(component.recommendationText).toBe(severity.recommendation);
    expect(component.gaugeMarkers).toEqual(getGaugeMarkers(score, severity.gaugeColor));
    expect(result.textContent).toContain(severity.severity);
    expect(result.textContent).toContain(severity.recommendation);
    expect(result.querySelector('ngx-gauge svg')).not.toBeNull();
    expect(result.querySelector('.asrs-gauge-marker')?.getAttribute('fill')).toBe(severity.gaugeColor);
    expect(getItem).not.toHaveBeenCalledWith('asrs_session_id');
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('classifies every valid score at the copied ASRS thresholds', () => {
    expect(SEVERITY_LEVELS.minimal.severity).toBe('حداقل نشانه‌های ADHD');
    expect(SEVERITY_LEVELS.mild.severity).toBe('علائم خفیف');
    expect(SEVERITY_LEVELS.moderate.severity).toBe('علائم متوسط');
    expect(SEVERITY_LEVELS.severe.severity).toBe('علائم شدید');
    for (let score = 0; score <= 72; score++) {
      const expected = score <= 17 ? 'minimal'
        : score <= 27 ? 'mild'
        : score <= 36 ? 'moderate' : 'severe';
      expect(getSeverityCategory(score)).withContext(`score ${score}`).toBe(expected);
    }
  });

  [
    { answers: Array(18).fill(0), score: 0, category: 'minimal', emoji: '😊', label: 'حداقل نشانه‌های ADHD', recommendation: 'وضعیت شما طبیعی به نظر می‌رسد، خوش به حالتون!.' },
    { answers: Array(13).fill(0).concat(4, 4, 4, 4, 1), score: 17, category: 'minimal', emoji: '😊', label: 'حداقل نشانه‌های ADHD', recommendation: 'وضعیت شما طبیعی به نظر می‌رسد، خوش به حالتون!.' },
    { answers: Array(14).fill(1).concat(4, 0, 0, 0), score: 18, category: 'mild', emoji: '🙂', label: 'علائم خفیف', recommendation: 'پیگیری علائم توصیه می‌شود. در صورت اختلال در عملکرد روزانه با روانشناس مشورت کنید.' },
    { answers: Array(9).fill(3).concat(Array(9).fill(0)), score: 27, category: 'mild', emoji: '🙂', label: 'علائم خفیف', recommendation: 'پیگیری علائم توصیه می‌شود. در صورت اختلال در عملکرد روزانه با روانشناس مشورت کنید.' },
    { answers: Array(7).fill(4).concat(Array(11).fill(0)), score: 28, category: 'moderate', emoji: '😐', label: 'علائم متوسط', recommendation: 'احتمال وجود ADHD هست. ارزیابی کامل‌تر توسط متخصص توصیه می‌شود.' },
    { answers: Array(18).fill(2), score: 36, category: 'moderate', emoji: '😐', label: 'علائم متوسط', recommendation: 'احتمال وجود ADHD هست. ارزیابی کامل‌تر توسط متخصص توصیه می‌شود.' },
    { answers: Array(17).fill(2).concat(3), score: 37, category: 'severe', emoji: '😟', label: 'علائم شدید', recommendation: 'نیاز به ارزیابی فوری توسط روانشناس یا روانپزشک وجود دارد.' },
    { answers: Array(18).fill(4), score: 72, category: 'severe', emoji: '😟', label: 'علائم شدید', recommendation: 'نیاز به ارزیابی فوری توسط روانشناس یا روانپزشک وجود دارد.' },
  ].forEach(({ answers, score, category, emoji, label, recommendation }) => {
    it(`shows the local total ${score} and copied ${category} guidance after submission`, () => {
      const fixture = TestBed.createComponent(AsrsComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.answers.controls.forEach((control, index) => control.setValue(answers[index]));

      component.submit();
      fixture.detectChanges();

      const result = fixture.nativeElement.querySelector('.result-card') as HTMLElement;
      expect(component.totalScore).toBe(score);
      expect(component.severityText).toBe(SEVERITY_LEVELS[category as keyof typeof SEVERITY_LEVELS].severity);
      expect(result).not.toBeNull();
      expect(result.textContent).toContain(component.severityText);
      const paragraphs = result.querySelectorAll('mat-card-content p');
      expect(paragraphs.length).toBe(4);
      expect(paragraphs[0].textContent).toContain('مجموع امتیاز:');
      expect(paragraphs[0].textContent)
        .toContain(new LatinToPersianNumbersPipe().transform(score) as string);
      expect(paragraphs[1].querySelector('span')?.textContent?.trim().replace(/\s+/g, ' '))
        .toBe(`${emoji} ${label}`);
      expect(paragraphs[2].textContent?.trim()).toBe(`توصیه: ${recommendation}`);
      for (const other of Object.values(SEVERITY_LEVELS)) {
        if (other.severity !== label) {
          expect(result.textContent).not.toContain(other.severity);
          expect(result.textContent).not.toContain(other.recommendation);
        }
      }
    });
  });

  it('includes every answer exactly once when one answer changes by a point', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const mixed = [0, 1, 2, 3, 4, 3, 2, 1, 0, 4, 1, 3, 2, 4, 0, 1, 2, 3];
    const expected = mixed.reduce((sum, value) => sum + value, 0);
    component.answers.controls.forEach((control, index) => control.setValue(mixed[index]));
    component.calculateScore();
    expect(component.totalScore).toBe(expected);

    component.answers.at(0).setValue(1);
    component.calculateScore();
    expect(component.totalScore).toBe(expected + 1);
    component.answers.at(17).setValue(4);
    component.calculateScore();
    expect(component.totalScore).toBe(expected + 2);

    component.answers.controls.forEach(control => control.setValue(0));
    component.answers.controls.forEach((control, index) => {
      control.setValue(1);
      component.calculateScore();
      expect(component.totalScore).withContext(`answer ${index + 1}`).toBe(1);
      control.setValue(0);
    });
  });

  it('hides prior guidance during a retake and replaces it with the new result', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const resultText = () => (fixture.nativeElement.querySelector('.result-card') as HTMLElement | null)?.textContent ?? '';

    expect(fixture.nativeElement.textContent).not.toContain('توصیه:');
    component.answers.controls.forEach(control => control.setValue(4));
    component.submit();
    fixture.detectChanges();
    expect(resultText()).toContain(SEVERITY_LEVELS.severe.recommendation);

    component.restart();
    fixture.detectChanges();
    expect(resultText()).toBe('');
    expect(fixture.nativeElement.textContent).not.toContain('توصیه:');
    expect(fixture.nativeElement.textContent).not.toContain(SEVERITY_LEVELS.severe.recommendation);

    component.answers.controls.forEach(control => control.setValue(0));
    component.submit();
    fixture.detectChanges();
    expect(resultText()).toContain(SEVERITY_LEVELS.minimal.recommendation);
    expect(resultText()).not.toContain(SEVERITY_LEVELS.severe.recommendation);
  });

  it('restarts with a fresh form and leaves the existing session key untouched', () => {
    localStorage.setItem('asrs_session_id', 'existing-session');
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.controls.forEach(control => control.setValue(1));
    component.submit();
    fixture.detectChanges();
    expect(component.showResult).toBeTrue();

    const getItem = spyOn(localStorage, 'getItem').and.callThrough();
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();
    component.restart();
    fixture.detectChanges();

    expect(component.currentStep).toBe(0);
    expect(component.showResult).toBeFalse();
    expect(component.totalScore).toBe(0);
    expect(component.answers.length).toBe(questions.length);
    expect(component.answers.controls.every(control => control.invalid && control.value === null)).toBeTrue();
    expect(fixture.nativeElement.querySelector('.result-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-radio-group')).not.toBeNull();
    expect(getItem).not.toHaveBeenCalledWith('asrs_session_id');
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('asrs_session_id')).toBe('existing-session');
    localStorage.removeItem('asrs_session_id');
  });
});
