import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';

import { AsrsComponent } from './asrs.component';
import { AsrsGaugeComponent } from './asrs-gauge.component';
import { ASRS_HISTORY_STORAGE_KEY, AsrsHistoryRecordV1 } from './asrs-history';
import { createAsrsHistoryRecord } from './asrs-history';
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';

describe('ASRS saved history view', () => {
  beforeEach(async () => {
    localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY);
    await TestBed.configureTestingModule({
      declarations: [AsrsComponent],
      imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatDividerModule,
        MatButtonModule, MatRadioModule, MatProgressBarModule, AsrsGaugeComponent,
        LatinToPersianNumbersPipe, NoopAnimationsModule],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY));

  function record(id: string, time: string, answer: number, label: string): AsrsHistoryRecordV1 {
    const saved = createAsrsHistoryRecord(Array(18).fill(answer), new Set(), new Date(time), () => id);
    saved.result.severityText = label;
    return saved;
  }

  it('opens from a partial questionnaire and returns without changing answers or storage', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.at(0).setValue(4);
    component.next();
    component.answers.at(1).setValue(2);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.history-empty').textContent).toContain('تاریخچه');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.currentStep).toBe(1);
    expect(component.answers.at(0).value).toBe(4);
    expect(component.answers.at(1).value).toBe(2);
    expect(fixture.nativeElement.querySelector('.result-card')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('sorts stored snapshots newest first with stable ties and never writes while viewing', () => {
    const older = record('older', '2026-01-01T10:00:00.000Z', 0, 'برچسب قدیمی');
    const tieFirst = record('tie-first', '2026-09-02T10:00:00.000Z', 1, 'برچسب ذخیره‌شده الف');
    const tieSecond = record('tie-second', '2026-09-02T10:00:00.000Z', 4, 'برچسب ذخیره‌شده ب');
    const raw = JSON.stringify({ version: 1, records: [older, tieFirst, tieSecond] });
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const open = () => {
      (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
      fixture.detectChanges();
      return [...fixture.nativeElement.querySelectorAll('.history-item')] as HTMLElement[];
    };
    const items = open();
    expect(items.map(item => item.dataset['recordId'])).toEqual(['tie-first', 'tie-second', 'older']);
    expect(items.map(item => item.textContent)).toEqual([
      jasmine.stringMatching(/۱۸.*برچسب ذخیره‌شده الف/),
      jasmine.stringMatching(/۷۲.*برچسب ذخیره‌شده ب/),
      jasmine.stringMatching(/۰.*برچسب قدیمی/),
    ]);
    expect(items[0].textContent).not.toContain('2026-09-02T');
    expect(items[0].textContent).not.toContain('tie-first');
    expect(items[0].textContent).toMatch(/[۰-۹]{1,2}:[۰-۹]{2}/);
    expect(items[0].querySelector('button')).toBeNull();
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(open().map(item => item.dataset['recordId'])).toEqual(['tie-first', 'tie-second', 'older']);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('shows unavailable history without a partial list or changing the raw value', () => {
    const raw = '{"version":2,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-unavailable')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.history-empty')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.history-item').length).toBe(0);
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('shows a valid empty envelope and keeps its raw value unchanged', () => {
    const raw = '{"version":1,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.history-unavailable')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('loads each saved submission again after a new component instance', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const first = fixture.componentInstance;
    first.answers.controls.forEach(control => control.setValue(1));
    first.submit();
    first.restart();
    first.answers.controls.forEach(control => control.setValue(4));
    first.submit();
    fixture.destroy();

    const refreshed = TestBed.createComponent(AsrsComponent);
    refreshed.detectChanges();
    (refreshed.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    refreshed.detectChanges();
    const items = [...refreshed.nativeElement.querySelectorAll('.history-item')] as HTMLElement[];
    expect(items.length).toBe(2);
    const saved = JSON.parse(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)!) as { records: AsrsHistoryRecordV1[] };
    for (const record of saved.records) {
      const item = items.find(candidate => candidate.dataset['recordId'] === record.id);
      expect(item).toBeDefined();
      expect(item!.querySelector('time')?.getAttribute('datetime')).toBe(record.submittedAt);
      expect(item!.textContent).toContain(record.result.severityText);
      expect(item!.textContent).toContain(record.totalScore === 72 ? '۷۲' : '۱۸');
    }
    expect(items.every(item => item.querySelector('time')?.textContent?.match(/[۰-۹]{1,2}:[۰-۹]{2}/))).toBeTrue();
  });

  it('opens history from a result without replacing the current result, including an unsaved result', () => {
    const raw = '{"version":2,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.controls.forEach(control => control.setValue(4));
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-unsaved-notice')).not.toBeNull();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-unavailable')).not.toBeNull();
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.showResult).toBeTrue();
    expect(component.totalScore).toBe(72);
    expect(fixture.nativeElement.querySelector('.history-unsaved-notice')).not.toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('does not list a result when its storage write failed', () => {
    const setItem = spyOn(localStorage, 'setItem').and.throwError('write failed');
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    fixture.componentInstance.answers.controls.forEach(control => control.setValue(2));
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.history-unsaved-notice')).not.toBeNull();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.history-item').length).toBe(0);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
  });
});
