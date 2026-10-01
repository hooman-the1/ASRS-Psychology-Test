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
import { getGaugeMarkers } from './asrs.helpers';
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
