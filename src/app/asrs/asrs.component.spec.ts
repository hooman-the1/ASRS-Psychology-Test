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
